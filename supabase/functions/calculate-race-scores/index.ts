import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SERIES_MAP: Record<string, number> = {
  'cup': 1,
  'xfinity': 2,
  'trucks': 3,
};

// Points system based on finishing position (NASCAR style - top positions get more points)
const POINTS_BY_POSITION: Record<number, number> = {
  1: 40, 2: 35, 3: 34, 4: 33, 5: 32,
  6: 31, 7: 30, 8: 29, 9: 28, 10: 27,
  11: 26, 12: 25, 13: 24, 14: 23, 15: 22,
  16: 21, 17: 20, 18: 19, 19: 18, 20: 17,
  21: 16, 22: 15, 23: 14, 24: 13, 25: 12,
  26: 11, 27: 10, 28: 9, 29: 8, 30: 7,
  31: 6, 32: 5, 33: 4, 34: 3, 35: 2,
  36: 1, 37: 1, 38: 1, 39: 1, 40: 1,
};

// Playoff points for wins and stage wins
const RACE_WIN_PLAYOFF_POINTS = 5;
const STAGE_WIN_PLAYOFF_POINTS = 1;
const FREE_PICK_WIN_REGULAR_POINTS = 10;
const FREE_PICK_WIN_PLAYOFF_POINTS = 1;

interface RaceResult {
  driver_id: number;
  finishing_position: number;
  driver_fullname?: string;
  driver_name?: string;
  car_number?: string;
}

interface StageResult {
  stage_num: number;
  results: Array<{
    driver_id: number;
    finishing_position: number;
    driver_fullname?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { league_id, race_id, series, season } = await req.json();

    if (!league_id || !race_id || !series || !season) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: league_id, race_id, series, season' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating scores for league ${league_id}, race ${race_id}, series ${series}, season ${season}`);

    const seriesId = SERIES_MAP[series.toLowerCase()] || 1;

    // Fetch race results from NASCAR API
    const raceDataUrl = `https://cf.nascar.com/cacher/${season}/${seriesId}/${race_id}/weekend-feed.json`;
    console.log(`Fetching race data from: ${raceDataUrl}`);

    const raceResponse = await fetch(raceDataUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NASCAR-Results-App/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!raceResponse.ok) {
      console.error(`NASCAR API Error: ${raceResponse.status}`);
      return new Response(
        JSON.stringify({ error: 'Race results not available yet', status: raceResponse.status }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const raceData = await raceResponse.json();
    const weekendRace = raceData?.weekend_race?.[0];
    
    if (!weekendRace?.results || weekendRace.results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No race results found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const raceResults: RaceResult[] = weekendRace.results;
    const raceName = weekendRace.race_name || raceData?.weekend_run?.[0]?.race_name || 'Unknown Race';
    const raceDate = weekendRace.race_date || raceData?.weekend_run?.[0]?.race_date || new Date().toISOString();
    const stageResults: StageResult[] = weekendRace.stage_results || [];

    // Determine last place position
    const lastPlacePosition = Math.max(...raceResults.map(r => r.finishing_position));
    const lastPlacePoints = POINTS_BY_POSITION[lastPlacePosition] || 1;

    console.log(`Race: ${raceName}, ${raceResults.length} results, last place position: ${lastPlacePosition}`);

    // Check if this is a free pick race
    const { data: freePickRace } = await supabase
      .from('free_pick_races')
      .select('id')
      .eq('league_id', league_id)
      .eq('race_id', race_id)
      .eq('season', season)
      .maybeSingle();

    // Auto-detect free pick by name pattern
    const lowerRaceName = raceName.toLowerCase();
    const isFreePick = !!freePickRace || lowerRaceName.includes('clash') || lowerRaceName.includes('all-star') || lowerRaceName.includes('all star');

    console.log(`Is free pick race: ${isFreePick}`);

    // Get winner driver_id
    const winner = raceResults.find(r => r.finishing_position === 1);
    const winnerDriverId = winner?.driver_id;

    // Fetch league settings to check payment deadline
    const { data: leagueSettings } = await supabase
      .from('league_settings')
      .select('payment_deadline')
      .eq('league_id', league_id)
      .maybeSingle();

    const paymentDeadline = leagueSettings?.payment_deadline 
      ? new Date(leagueSettings.payment_deadline) 
      : null;
    const isPastDeadline = paymentDeadline ? new Date() > paymentDeadline : false;

    // Fetch all league members with payment status
    const { data: members, error: membersError } = await supabase
      .from('league_members')
      .select('user_id, payment_status')
      .eq('league_id', league_id);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      throw new Error('Failed to fetch league members');
    }

    // Filter out unpaid members if past deadline
    const scoringMembers = isPastDeadline 
      ? members?.filter(m => m.payment_status === 'paid') || []
      : members || [];
    
    const skippedMembers = isPastDeadline 
      ? members?.filter(m => m.payment_status !== 'paid') || []
      : [];

    if (skippedMembers.length > 0) {
      console.log(`Skipping ${skippedMembers.length} unpaid members (past deadline: ${paymentDeadline?.toISOString()})`);
    }

    // Fetch all picks for this race
    const { data: picks, error: picksError } = await supabase
      .from('driver_picks')
      .select('*')
      .eq('league_id', league_id)
      .eq('race_id', race_id)
      .eq('season', season);

    if (picksError) {
      console.error('Error fetching picks:', picksError);
      throw new Error('Failed to fetch picks');
    }

    const picksByUser = new Map(picks?.map(p => [p.user_id, p]) || []);

    // Calculate driver usage for each user (to detect over-usage penalty)
    const { data: allUserPicks } = await supabase
      .from('driver_picks')
      .select('user_id, driver_id, is_free_pick')
      .eq('league_id', league_id)
      .eq('season', season);

    // Count usage per user per driver (excluding free picks)
    const driverUsage: Record<string, Record<number, number>> = {};
    (allUserPicks || []).forEach(p => {
      if (p.is_free_pick) return;
      if (!driverUsage[p.user_id]) driverUsage[p.user_id] = {};
      driverUsage[p.user_id][p.driver_id] = (driverUsage[p.user_id][p.driver_id] || 0) + 1;
    });

    // Build results map by driver_id
    const resultsByDriverId = new Map(raceResults.map(r => [r.driver_id, r]));

    // Get stage winners (position 1 in each stage)
    const stageWinnerDriverIds = new Set<number>();
    stageResults.forEach(stage => {
      const stageWinner = stage.results?.find(r => r.finishing_position === 1);
      if (stageWinner?.driver_id) {
        stageWinnerDriverIds.add(stageWinner.driver_id);
      }
    });

    const userScores: Array<{
      user_id: string;
      points_earned: number;
      finishing_position: number | null;
      is_race_win: boolean;
      stage_wins: number;
      driver_id: number | null;
      driver_name: string | null;
    }> = [];

    // Calculate score for each member (only those eligible for scoring)
    for (const member of scoringMembers) {
      const pick = picksByUser.get(member.user_id);
      
      let pointsEarned = 0;
      let finishingPosition: number | null = null;
      let isRaceWin = false;
      let userStageWins = 0;
      let driverId: number | null = null;
      let driverName: string | null = null;

      if (!pick) {
        // No pick made - assign last place points
        pointsEarned = lastPlacePoints;
        console.log(`User ${member.user_id}: No pick - last place penalty (${lastPlacePoints} pts)`);
      } else {
        driverId = pick.driver_id;
        driverName = pick.driver_name;

        // Check for over-usage penalty (used driver more than 2 times in non-free-pick races)
        const usage = driverUsage[member.user_id]?.[pick.driver_id] || 0;
        if (!pick.is_free_pick && usage > 2) {
          // Over-usage - assign last place points
          pointsEarned = lastPlacePoints;
          console.log(`User ${member.user_id}: Over-usage penalty for ${driverName} (used ${usage} times) - ${lastPlacePoints} pts`);
        } else {
          const result = resultsByDriverId.get(pick.driver_id);
          
          if (isFreePick) {
            // Free pick race - only winner gets points
            if (result && result.finishing_position === 1) {
              pointsEarned = FREE_PICK_WIN_REGULAR_POINTS;
              isRaceWin = true;
              finishingPosition = 1;
              console.log(`User ${member.user_id}: FREE PICK WIN with ${driverName} - ${pointsEarned} pts + ${FREE_PICK_WIN_PLAYOFF_POINTS} playoff pts`);
            } else {
              pointsEarned = 0;
              finishingPosition = result?.finishing_position || null;
              console.log(`User ${member.user_id}: Free pick - ${driverName} finished P${finishingPosition || 'N/A'} - 0 pts`);
            }
          } else {
            // Regular race
            if (result) {
              finishingPosition = result.finishing_position;
              pointsEarned = POINTS_BY_POSITION[finishingPosition] || 1;
              
              // Check for race win
              if (finishingPosition === 1) {
                isRaceWin = true;
              }

              // Check for stage wins
              if (stageWinnerDriverIds.has(pick.driver_id)) {
                userStageWins = stageResults.filter(stage => 
                  stage.results?.find(r => r.finishing_position === 1)?.driver_id === pick.driver_id
                ).length;
              }

              console.log(`User ${member.user_id}: ${driverName} P${finishingPosition} - ${pointsEarned} pts, win: ${isRaceWin}, stages: ${userStageWins}`);
            } else {
              // Driver not found in results (DNQ, etc.) - last place
              pointsEarned = lastPlacePoints;
              console.log(`User ${member.user_id}: ${driverName} not in results - last place (${lastPlacePoints} pts)`);
            }
          }
        }
      }

      userScores.push({
        user_id: member.user_id,
        points_earned: pointsEarned,
        finishing_position: finishingPosition,
        is_race_win: isRaceWin,
        stage_wins: userStageWins,
        driver_id: driverId,
        driver_name: driverName,
      });
    }

    // Save race scores
    const raceScoreInserts = userScores.map(score => ({
      league_id,
      user_id: score.user_id,
      race_id,
      driver_id: score.driver_id,
      driver_name: score.driver_name,
      points_earned: score.points_earned,
    }));

    // Delete existing scores for this race first (idempotent)
    await supabase
      .from('user_race_scores')
      .delete()
      .eq('league_id', league_id)
      .eq('race_id', race_id);

    const { error: insertScoresError } = await supabase
      .from('user_race_scores')
      .insert(raceScoreInserts);

    if (insertScoresError) {
      console.error('Error inserting scores:', insertScoresError);
      throw new Error('Failed to save race scores');
    }

    // Update season standings
    for (const score of userScores) {
      // Fetch or create standings record
      const { data: existingStandings } = await supabase
        .from('user_season_standings')
        .select('*')
        .eq('league_id', league_id)
        .eq('user_id', score.user_id)
        .eq('season', season)
        .maybeSingle();

      const playoffPointsToAdd = 
        (score.is_race_win ? (isFreePick ? FREE_PICK_WIN_PLAYOFF_POINTS : RACE_WIN_PLAYOFF_POINTS) : 0) +
        (score.stage_wins * STAGE_WIN_PLAYOFF_POINTS);

      if (existingStandings) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('user_season_standings')
          .update({
            regular_season_points: existingStandings.regular_season_points + score.points_earned,
            playoff_points: existingStandings.playoff_points + playoffPointsToAdd,
            race_wins: existingStandings.race_wins + (score.is_race_win ? 1 : 0),
            stage_wins: existingStandings.stage_wins + score.stage_wins,
            top_5s: existingStandings.top_5s + (score.finishing_position && score.finishing_position <= 5 ? 1 : 0),
            top_10s: existingStandings.top_10s + (score.finishing_position && score.finishing_position <= 10 ? 1 : 0),
            top_15s: existingStandings.top_15s + (score.finishing_position && score.finishing_position <= 15 ? 1 : 0),
            top_20s: existingStandings.top_20s + (score.finishing_position && score.finishing_position <= 20 ? 1 : 0),
          })
          .eq('id', existingStandings.id);

        if (updateError) {
          console.error('Error updating standings:', updateError);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('user_season_standings')
          .insert({
            league_id,
            user_id: score.user_id,
            season,
            regular_season_points: score.points_earned,
            playoff_points: playoffPointsToAdd,
            race_wins: score.is_race_win ? 1 : 0,
            stage_wins: score.stage_wins,
            top_5s: score.finishing_position && score.finishing_position <= 5 ? 1 : 0,
            top_10s: score.finishing_position && score.finishing_position <= 10 ? 1 : 0,
            top_15s: score.finishing_position && score.finishing_position <= 15 ? 1 : 0,
            top_20s: score.finishing_position && score.finishing_position <= 20 ? 1 : 0,
          });

        if (insertError) {
          console.error('Error inserting standings:', insertError);
        }
      }
    }

    // Also save to race_scores table for general reference
    const raceScoreData = raceResults.map(result => ({
      race_id,
      season,
      series,
      race_name: raceName,
      race_date: raceDate,
      driver_id: result.driver_id,
      driver_name: result.driver_fullname || result.driver_name || 'Unknown',
      finishing_position: result.finishing_position,
      points_earned: POINTS_BY_POSITION[result.finishing_position] || 1,
    }));

    // Delete existing race_scores first
    await supabase
      .from('race_scores')
      .delete()
      .eq('race_id', race_id)
      .eq('season', season)
      .eq('series', series);

    await supabase
      .from('race_scores')
      .insert(raceScoreData);

    console.log(`Successfully calculated scores for ${userScores.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        race_name: raceName,
        is_free_pick: isFreePick,
        scores_calculated: userScores.length,
        winner_driver_id: winnerDriverId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error calculating scores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to calculate scores';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
