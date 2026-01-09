import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERIES_MAP: Record<string, number> = { cup: 1, xfinity: 2, trucks: 3 };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { season, series, league_id } = await req.json();

    if (!season || !series) {
      throw new Error('season and series are required');
    }

    console.log(`Repairing driver names for season=${season}, series=${series}, league_id=${league_id || 'all'}`);

    // Step 1: Build driver directory from NASCAR API
    const seriesId = SERIES_MAP[series.toLowerCase()] || 1;
    const driverDirectory: Record<number, string> = {};

    // Try DriverPoints endpoint first
    try {
      const driverPointsUrl = `https://feed.nascar.com/api/DriverPoints?season=${season}&series_id=${seriesId}`;
      const dpResponse = await fetch(driverPointsUrl);
      if (dpResponse.ok) {
        const dpData = await dpResponse.json();
        for (const d of dpData || []) {
          if (d.driver_id && d.full_name) {
            driverDirectory[d.driver_id] = d.full_name;
          }
        }
      }
    } catch (e) {
      console.log('DriverPoints fetch failed, trying race results:', e);
    }

    // If we didn't get many drivers, supplement from race results
    if (Object.keys(driverDirectory).length < 30) {
      try {
        const raceListUrl = `https://cf.nascar.com/cacher/${season}/${seriesId}/race_list_basic.json`;
        const rlResponse = await fetch(raceListUrl);
        if (rlResponse.ok) {
          const races = await rlResponse.json();
          // Get drivers from last completed race
          const completedRace = races?.find((r: any) => r.winner_driver_id);
          if (completedRace) {
            const detailUrl = `https://cf.nascar.com/cacher/${season}/${seriesId}/${completedRace.race_id}/weekend-feed.json`;
            const detailResponse = await fetch(detailUrl);
            if (detailResponse.ok) {
              const detailData = await detailResponse.json();
              const results = detailData?.weekend_race?.[0]?.results || [];
              for (const r of results) {
                if (r.driver_id) {
                  const name = r.driver_fullname || 
                    `${r.driver_first_name || r.driver_firstname || ''} ${r.driver_last_name || r.driver_lastname || ''}`.trim();
                  if (name && !name.includes('undefined') && name !== '') {
                    driverDirectory[r.driver_id] = name;
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('Race results fetch failed:', e);
      }
    }

    console.log(`Built driver directory with ${Object.keys(driverDirectory).length} drivers`);

    const stats = {
      race_scores_updated: 0,
      driver_picks_updated: 0,
      user_race_scores_updated: 0,
      unmapped_driver_ids: [] as number[],
    };

    // Helper to check if name is invalid
    const isInvalidName = (name: string | null | undefined): boolean => {
      if (!name) return true;
      const lower = name.toLowerCase().trim();
      return lower === '' || lower.startsWith('undefined') || lower === 'unknown' || lower === 'unknown driver';
    };

    // Step 2: Fix race_scores table
    const { data: badRaceScores } = await supabase
      .from('race_scores')
      .select('id, driver_id, driver_name')
      .eq('season', season)
      .eq('series', series)
      .or('driver_name.is.null,driver_name.ilike.undefined%,driver_name.eq.Unknown Driver');

    for (const row of badRaceScores || []) {
      const newName = driverDirectory[row.driver_id];
      if (newName) {
        await supabase.from('race_scores').update({ driver_name: newName }).eq('id', row.id);
        stats.race_scores_updated++;
      } else if (!stats.unmapped_driver_ids.includes(row.driver_id)) {
        stats.unmapped_driver_ids.push(row.driver_id);
      }
    }

    // Step 3: Fix driver_picks for specific league
    if (league_id) {
      const { data: badPicks } = await supabase
        .from('driver_picks')
        .select('id, driver_id, driver_name')
        .eq('league_id', league_id)
        .or('driver_name.is.null,driver_name.ilike.undefined%,driver_name.eq.Unknown Driver');

      for (const row of badPicks || []) {
        const newName = driverDirectory[row.driver_id];
        if (newName) {
          await supabase.from('driver_picks').update({ driver_name: newName }).eq('id', row.id);
          stats.driver_picks_updated++;
        } else if (!stats.unmapped_driver_ids.includes(row.driver_id)) {
          stats.unmapped_driver_ids.push(row.driver_id);
        }
      }

      // Step 4: Fix user_race_scores for specific league
      const { data: badScores } = await supabase
        .from('user_race_scores')
        .select('id, driver_id, driver_name')
        .eq('league_id', league_id)
        .or('driver_name.is.null,driver_name.ilike.undefined%,driver_name.eq.Unknown Driver');

      for (const row of badScores || []) {
        if (!row.driver_id) continue;
        const newName = driverDirectory[row.driver_id];
        if (newName) {
          await supabase.from('user_race_scores').update({ driver_name: newName }).eq('id', row.id);
          stats.user_race_scores_updated++;
        } else if (!stats.unmapped_driver_ids.includes(row.driver_id)) {
          stats.unmapped_driver_ids.push(row.driver_id);
        }
      }
    }

    console.log('Repair complete:', stats);

    return new Response(JSON.stringify({ 
      success: true,
      ...stats,
      driver_directory_size: Object.keys(driverDirectory).length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Repair error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
