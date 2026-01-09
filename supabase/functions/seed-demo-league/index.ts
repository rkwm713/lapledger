import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Points by position (same as calculate-race-scores)
const POINTS_BY_POSITION: Record<number, number> = {
  1: 40, 2: 35, 3: 34, 4: 33, 5: 32, 6: 31, 7: 30, 8: 29, 9: 28, 10: 27,
  11: 26, 12: 25, 13: 24, 14: 23, 15: 22, 16: 21, 17: 20, 18: 19, 19: 18, 20: 17,
  21: 16, 22: 15, 23: 14, 24: 13, 25: 12, 26: 11, 27: 10, 28: 9, 29: 8, 30: 7,
  31: 6, 32: 5, 33: 4, 34: 3, 35: 2, 36: 1,
};

const FAKE_NAMES = [
  'Mike Johnson', 'Sarah Williams', 'Chris Davis', 'Emily Brown', 'David Miller',
  'Jessica Wilson', 'Matt Anderson', 'Ashley Taylor', 'Josh Thomas', 'Amanda Jackson',
  'Ryan White', 'Brittany Harris', 'Brandon Martin', 'Stephanie Thompson', 'Kevin Garcia',
  'Lauren Martinez', 'Justin Robinson', 'Megan Clark', 'Tyler Rodriguez', 'Samantha Lewis',
  'Nick Lee', 'Rachel Walker', 'Jake Hall', 'Michelle Allen', 'Derek Young',
  'Heather King', 'Scott Wright', 'Kristen Scott', 'Eric Green', 'Lisa Adams',
  'Travis Baker', 'Christina Nelson'
];

const SERIES_MAP: Record<string, number> = { cup: 1, xfinity: 2, trucks: 3 };

interface RaceResult {
  driver_id: number;
  driver_name: string;
  finishing_position: number;
  team_name?: string;
  car_number?: string;
}

interface Race {
  race_id: number;
  race_name: string;
  race_date: string;
  results: RaceResult[];
  winner_name?: string;
  is_free_pick?: boolean;
}

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

    const { owner_id, season = 2025, series = 'cup', league_name = '2025 Demo League', cleanup = false } = await req.json();

    if (!owner_id) {
      throw new Error('owner_id is required');
    }

    // Cleanup mode - delete all demo data
    if (cleanup) {
      console.log('Cleaning up demo data...');
      
      // Find demo league
      const { data: demoLeague } = await supabase
        .from('leagues')
        .select('id')
        .eq('name', league_name)
        .eq('owner_id', owner_id)
        .single();

      if (demoLeague) {
        // Delete related data
        await supabase.from('user_season_standings').delete().eq('league_id', demoLeague.id);
        await supabase.from('user_race_scores').delete().eq('league_id', demoLeague.id);
        await supabase.from('driver_picks').delete().eq('league_id', demoLeague.id);
        await supabase.from('league_settings').delete().eq('league_id', demoLeague.id);
        await supabase.from('free_pick_races').delete().eq('league_id', demoLeague.id);
        await supabase.from('chase_rounds').delete().eq('league_id', demoLeague.id);
        await supabase.from('chase_eliminations').delete().eq('league_id', demoLeague.id);
        
        // Get fake members to delete (exclude owner)
        const { data: members } = await supabase
          .from('league_members')
          .select('user_id')
          .eq('league_id', demoLeague.id)
          .neq('user_id', owner_id);

        await supabase.from('league_members').delete().eq('league_id', demoLeague.id);
        await supabase.from('leagues').delete().eq('id', demoLeague.id);

        // Delete fake users
        if (members) {
          for (const member of members) {
            await supabase.from('profiles').delete().eq('id', member.user_id);
            await supabase.auth.admin.deleteUser(member.user_id);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Demo data cleaned up' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting demo league seed...');

    // Step 1: Create 32 fake users
    console.log('Creating fake users...');
    const fakeUserIds: string[] = [];
    
    for (let i = 0; i < 32; i++) {
      const email = `fake_user_${i + 1}_${Date.now()}@demo.local`;
      const password = `DemoPass${i + 1}!`;
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: FAKE_NAMES[i] }
      });

      if (authError) {
        console.error(`Error creating user ${i + 1}:`, authError);
        continue;
      }

      if (authUser.user) {
        fakeUserIds.push(authUser.user.id);
        
        // Create profile
        await supabase.from('profiles').upsert({
          id: authUser.user.id,
          display_name: FAKE_NAMES[i],
        });
      }
    }

    console.log(`Created ${fakeUserIds.length} fake users`);

    // Step 2: Create league
    console.log('Creating league...');
    const inviteCode = `DEMO${Date.now().toString(36).toUpperCase()}`;
    
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        name: league_name,
        season,
        series,
        owner_id,
        invite_code: inviteCode,
        description: 'Demo league with fake players and real 2025 race results for review'
      })
      .select()
      .single();

    if (leagueError || !league) {
      throw new Error(`Failed to create league: ${leagueError?.message}`);
    }

    console.log('League created:', league.id);

    // Step 3: Add owner and fake users as members
    console.log('Adding members...');
    const memberInserts = [
      { league_id: league.id, user_id: owner_id, payment_status: 'paid' },
      ...fakeUserIds.map(userId => ({
        league_id: league.id,
        user_id: userId,
        payment_status: 'paid'
      }))
    ];

    await supabase.from('league_members').insert(memberInserts);

    // Step 4: Create league settings
    console.log('Creating league settings...');
    await supabase.from('league_settings').insert({
      league_id: league.id,
      entry_fee: 100,
      payout_first: 2200,
      payout_second: 800,
      payout_third: 400,
      payout_fourth: 200,
      payment_deadline: '2025-02-01',
      payment_paypal: 'demo@paypal.com',
      payment_venmo: '@demo-venmo',
      payment_instructions: 'Demo league - no payment required'
    });

    // Step 5: Fetch 2025 race data from NASCAR API
    console.log('Fetching 2025 race data...');
    const seriesId = SERIES_MAP[series];
    const raceListUrl = `https://cf.nascar.com/cacher/${season}/${seriesId}/race_list_basic.json`;
    
    const raceListResponse = await fetch(raceListUrl);
    if (!raceListResponse.ok) {
      throw new Error(`Failed to fetch race list: ${raceListResponse.status}`);
    }
    
    const raceListData = await raceListResponse.json();
    
    // Filter to completed races (those with winner)
    const completedRaces: Race[] = [];
    
    for (const race of raceListData) {
      if (race.winner_driver_id) {
        // Fetch race details to get full results
        try {
          const detailUrl = `https://cf.nascar.com/cacher/${season}/${seriesId}/${race.race_id}/weekend-feed.json`;
          const detailResponse = await fetch(detailUrl);
          
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            const weekend = detailData.weekend_race || [];
            const raceResults = weekend[0]?.results || [];
            
            const results: RaceResult[] = raceResults.map((r: any) => ({
              driver_id: r.driver_id,
              driver_name: r.driver_fullname || `${r.driver_firstname || ''} ${r.driver_lastname || ''}`.trim() || 'Unknown Driver',
              finishing_position: r.finishing_position,
              team_name: r.team_name,
              car_number: r.car_number?.toString()
            }));

            // Check if free pick race
            const raceName = race.race_name?.toLowerCase() || '';
            const isFreePick = raceName.includes('clash') || raceName.includes('all-star') || raceName.includes('all star');

            completedRaces.push({
              race_id: race.race_id,
              race_name: race.race_name,
              race_date: race.race_date,
              results,
              winner_name: results.find((r: RaceResult) => r.finishing_position === 1)?.driver_name,
              is_free_pick: isFreePick
            });
          }
        } catch (e) {
          console.error(`Error fetching race ${race.race_id}:`, e);
        }
      }
    }

    console.log(`Found ${completedRaces.length} completed races`);

    // Step 6: Populate race_scores table
    console.log('Populating race scores...');
    for (const race of completedRaces) {
      const raceScoreInserts = race.results.map((result: RaceResult) => ({
        race_id: race.race_id,
        race_name: race.race_name,
        race_date: race.race_date,
        driver_id: result.driver_id,
        driver_name: result.driver_name,
        finishing_position: result.finishing_position,
        points_earned: POINTS_BY_POSITION[result.finishing_position] || 0,
        season,
        series
      }));

      await supabase.from('race_scores').upsert(raceScoreInserts, { 
        onConflict: 'race_id,driver_id'
      });
    }

    // Step 7: Randomly assign driver picks and calculate scores
    console.log('Assigning picks and calculating scores...');
    const allMemberIds = [owner_id, ...fakeUserIds];
    
    // Track driver usage per user (max 2 uses normally, but we'll be flexible for demo)
    const driverUsage: Record<string, Record<number, number>> = {};
    allMemberIds.forEach(userId => { driverUsage[userId] = {}; });

    // Season standings accumulator
    const seasonStats: Record<string, {
      regular_season_points: number;
      playoff_points: number;
      race_wins: number;
      stage_wins: number;
      top_5s: number;
      top_10s: number;
      top_15s: number;
      top_20s: number;
    }> = {};
    
    allMemberIds.forEach(userId => {
      seasonStats[userId] = {
        regular_season_points: 0,
        playoff_points: 0,
        race_wins: 0,
        stage_wins: 0,
        top_5s: 0,
        top_10s: 0,
        top_15s: 0,
        top_20s: 0
      };
    });

    for (const race of completedRaces) {
      // Skip races with no results
      if (!race.results || race.results.length === 0) {
        console.log(`Skipping race ${race.race_id} - no results`);
        continue;
      }

      const pickInserts: any[] = [];
      const scoreInserts: any[] = [];

      // Get top 20 drivers for weighted random selection
      const topDrivers = race.results
        .filter((r: RaceResult) => r.finishing_position <= 20)
        .sort(() => Math.random() - 0.5);

      for (const userId of allMemberIds) {
        // Select a random driver (weighted toward top 20)
        let selectedDriver: RaceResult;
        
        if (topDrivers.length > 0 && Math.random() > 0.1) {
          // 90% chance to pick from top 20
          selectedDriver = topDrivers[Math.floor(Math.random() * topDrivers.length)];
        } else {
          // 10% chance to pick from all drivers
          selectedDriver = race.results[Math.floor(Math.random() * race.results.length)];
        }

        // Track usage
        const currentUsage = driverUsage[userId][selectedDriver.driver_id] || 0;
        driverUsage[userId][selectedDriver.driver_id] = currentUsage + 1;

        pickInserts.push({
          league_id: league.id,
          user_id: userId,
          race_id: race.race_id,
          race_name: race.race_name,
          race_date: race.race_date,
          driver_id: selectedDriver.driver_id,
          driver_name: selectedDriver.driver_name,
          team_name: selectedDriver.team_name,
          car_number: selectedDriver.car_number,
          season,
          is_free_pick: race.is_free_pick || false,
          locked_at: new Date().toISOString()
        });

        // Calculate points
        const position = selectedDriver.finishing_position;
        let points = POINTS_BY_POSITION[position] || 0;
        
        // Add playoff points for wins
        if (position === 1) {
          seasonStats[userId].race_wins++;
          seasonStats[userId].playoff_points += 5; // Race win playoff bonus
        }

        // Update stats
        seasonStats[userId].regular_season_points += points;
        if (position <= 5) seasonStats[userId].top_5s++;
        if (position <= 10) seasonStats[userId].top_10s++;
        if (position <= 15) seasonStats[userId].top_15s++;
        if (position <= 20) seasonStats[userId].top_20s++;

        scoreInserts.push({
          league_id: league.id,
          user_id: userId,
          race_id: race.race_id,
          driver_id: selectedDriver.driver_id,
          driver_name: selectedDriver.driver_name,
          points_earned: points
        });
      }

      // Insert picks
      await supabase.from('driver_picks').insert(pickInserts);
      
      // Insert user race scores
      await supabase.from('user_race_scores').insert(scoreInserts);
    }

    // Step 8: Create season standings
    console.log('Creating season standings...');
    const standingsInserts = allMemberIds.map(userId => ({
      league_id: league.id,
      user_id: userId,
      season,
      ...seasonStats[userId],
      is_eliminated: false,
      is_wild_card: false,
      is_regular_season_winner: false
    }));

    await supabase.from('user_season_standings').insert(standingsInserts);

    // Mark the top scorer as regular season winner
    const topScorer = allMemberIds.reduce((best, userId) => {
      if (!best || seasonStats[userId].regular_season_points > seasonStats[best].regular_season_points) {
        return userId;
      }
      return best;
    }, '' as string);

    if (topScorer) {
      await supabase
        .from('user_season_standings')
        .update({ is_regular_season_winner: true, playoff_points: seasonStats[topScorer].playoff_points + 15 })
        .eq('league_id', league.id)
        .eq('user_id', topScorer);
    }

    console.log('Demo league seeding complete!');

    return new Response(JSON.stringify({ 
      success: true, 
      league_id: league.id,
      invite_code: inviteCode,
      members_created: fakeUserIds.length + 1,
      races_processed: completedRaces.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Seed error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
