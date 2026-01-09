import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { league_id, season = 2025 } = await req.json();

    if (!league_id) {
      throw new Error('league_id is required');
    }

    console.log('Calculating standings for league:', league_id);

    // Get all user race scores
    const { data: scores, error: scoresError } = await supabase
      .from('user_race_scores')
      .select('user_id, points_earned, driver_id, driver_name')
      .eq('league_id', league_id);

    if (scoresError) throw scoresError;

    // Get race results to determine wins
    const { data: raceScores, error: raceScoresError } = await supabase
      .from('race_scores')
      .select('race_id, driver_id, finishing_position')
      .eq('series', 'cup')
      .eq('season', season);

    if (raceScoresError) throw raceScoresError;

    // Build lookup for winning drivers per race
    const raceWinners: Record<number, number> = {};
    raceScores?.forEach(rs => {
      if (rs.finishing_position === 1) {
        raceWinners[rs.race_id] = rs.driver_id;
      }
    });

    // Calculate stats per user
    const userStats: Record<string, {
      regular_season_points: number;
      playoff_points: number;
      race_wins: number;
      stage_wins: number;
      top_5s: number;
      top_10s: number;
      top_15s: number;
      top_20s: number;
    }> = {};

    // Get picks to match up with results
    const { data: picks, error: picksError } = await supabase
      .from('driver_picks')
      .select('user_id, race_id, driver_id')
      .eq('league_id', league_id);

    if (picksError) throw picksError;

    // Build user stats from picks and race results
    picks?.forEach(pick => {
      if (!userStats[pick.user_id]) {
        userStats[pick.user_id] = {
          regular_season_points: 0, playoff_points: 0, race_wins: 0,
          stage_wins: 0, top_5s: 0, top_10s: 0, top_15s: 0, top_20s: 0
        };
      }

      // Find the race result for this driver
      const result = raceScores?.find(rs => rs.race_id === pick.race_id && rs.driver_id === pick.driver_id);
      if (result) {
        const pos = result.finishing_position;
        if (pos === 1) {
          userStats[pick.user_id].race_wins++;
          userStats[pick.user_id].playoff_points += 5;
        }
        if (pos <= 5) userStats[pick.user_id].top_5s++;
        if (pos <= 10) userStats[pick.user_id].top_10s++;
        if (pos <= 15) userStats[pick.user_id].top_15s++;
        if (pos <= 20) userStats[pick.user_id].top_20s++;
      }
    });

    // Sum up points from user_race_scores
    scores?.forEach(score => {
      if (!userStats[score.user_id]) {
        userStats[score.user_id] = {
          regular_season_points: 0, playoff_points: 0, race_wins: 0,
          stage_wins: 0, top_5s: 0, top_10s: 0, top_15s: 0, top_20s: 0
        };
      }
      userStats[score.user_id].regular_season_points += score.points_earned || 0;
    });

    // Insert standings
    const standingsInserts = Object.entries(userStats).map(([userId, stats]) => ({
      league_id,
      user_id: userId,
      season,
      ...stats,
      is_eliminated: false,
      is_wild_card: false,
      is_regular_season_winner: false
    }));

    console.log('Inserting standings for', standingsInserts.length, 'users');

    const { error: insertError } = await supabase
      .from('user_season_standings')
      .upsert(standingsInserts, { onConflict: 'league_id,user_id,season' });

    if (insertError) throw insertError;

    // Mark top scorer as regular season winner
    let topScorer = '';
    let topPoints = 0;
    Object.entries(userStats).forEach(([userId, stats]) => {
      if (stats.regular_season_points > topPoints) {
        topPoints = stats.regular_season_points;
        topScorer = userId;
      }
    });

    if (topScorer) {
      await supabase
        .from('user_season_standings')
        .update({ 
          is_regular_season_winner: true, 
          playoff_points: userStats[topScorer].playoff_points + 15 
        })
        .eq('league_id', league_id)
        .eq('user_id', topScorer);
    }

    console.log('Standings created successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      users_processed: standingsInserts.length,
      top_scorer: topScorer,
      top_points: topPoints
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Fix standings error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
