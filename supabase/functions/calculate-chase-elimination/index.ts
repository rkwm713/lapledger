import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChasePlayer {
  user_id: string;
  playoff_points: number;
  race_wins: number;
  stage_wins: number;
  top_5s: number;
  top_10s: number;
  top_15s: number;
  top_20s: number;
  regular_season_points: number;
  is_wild_card: boolean;
}

const CHASE_QUALIFIERS = 23; // Top 20 + 3 wild cards
const ROUND_1_REMAINING = 16;
const ROUND_2_REMAINING = 10;
const ROUND_3_REMAINING = 4;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { league_id, action, round_number } = await req.json();

    if (!league_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing chase action: ${action} for league ${league_id}`);

    // Fetch league info
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("season, series")
      .eq("id", league_id)
      .single();

    if (leagueError || !league) {
      throw new Error("League not found");
    }

    const season = league.season;

    // Fetch all standings for this league
    const { data: standings, error: standingsError } = await supabase
      .from("user_season_standings")
      .select("*")
      .eq("league_id", league_id)
      .eq("season", season);

    if (standingsError) throw standingsError;

    const players: ChasePlayer[] = standings.map(s => ({
      user_id: s.user_id,
      playoff_points: s.playoff_points || 0,
      race_wins: s.race_wins || 0,
      stage_wins: s.stage_wins || 0,
      top_5s: s.top_5s || 0,
      top_10s: s.top_10s || 0,
      top_15s: s.top_15s || 0,
      top_20s: s.top_20s || 0,
      regular_season_points: s.regular_season_points || 0,
      is_wild_card: s.is_wild_card || false,
    }));

    // Sort players by tiebreaker rules
    const sortPlayers = (a: ChasePlayer, b: ChasePlayer) => {
      if (b.playoff_points !== a.playoff_points) return b.playoff_points - a.playoff_points;
      if (b.race_wins !== a.race_wins) return b.race_wins - a.race_wins;
      if (b.top_5s !== a.top_5s) return b.top_5s - a.top_5s;
      if (b.top_10s !== a.top_10s) return b.top_10s - a.top_10s;
      if (b.top_15s !== a.top_15s) return b.top_15s - a.top_15s;
      return b.top_20s - a.top_20s;
    };

    if (action === "qualify_for_chase") {
      // Determine top 20 by regular season points
      const sortedByRegular = [...players].sort((a, b) => 
        b.regular_season_points - a.regular_season_points
      );

      const top20 = sortedByRegular.slice(0, 20);
      const outsideTop20 = sortedByRegular.slice(20);

      // Sort outside top 20 by wins for wild card selection
      const wildCardCandidates = outsideTop20
        .filter(p => p.race_wins > 0)
        .sort(sortPlayers);

      const wildCards = wildCardCandidates.slice(0, 3);

      console.log(`Top 20 qualifiers: ${top20.length}, Wild cards: ${wildCards.length}`);

      // Update standings
      for (const player of players) {
        const isTop20 = top20.some(p => p.user_id === player.user_id);
        const isWildCard = wildCards.some(p => p.user_id === player.user_id);
        const qualifies = isTop20 || isWildCard;

        // Wild cards lose their playoff points when entering Chase
        const newPlayoffPoints = isWildCard ? 0 : player.playoff_points;

        await supabase
          .from("user_season_standings")
          .update({
            is_wild_card: isWildCard,
            is_eliminated: !qualifies,
            elimination_round: qualifies ? null : 0,
            playoff_points: qualifies ? newPlayoffPoints : player.playoff_points,
          })
          .eq("league_id", league_id)
          .eq("user_id", player.user_id)
          .eq("season", season);
      }

      // Create chase round 1
      await supabase
        .from("chase_rounds")
        .upsert({
          league_id,
          season,
          round_number: 1,
          players_remaining: ROUND_1_REMAINING + 7, // 23 entering round 1
          is_active: true,
          started_at: new Date().toISOString(),
        }, { onConflict: "league_id,season,round_number" });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `${top20.length + wildCards.length} players qualified for Chase`,
          top20Count: top20.length,
          wildCardCount: wildCards.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "process_elimination") {
      const roundNum = round_number || 1;
      let remainingCount: number;

      switch (roundNum) {
        case 1: remainingCount = ROUND_1_REMAINING; break;
        case 2: remainingCount = ROUND_2_REMAINING; break;
        case 3: remainingCount = ROUND_3_REMAINING; break;
        default: remainingCount = players.length;
      }

      // Get non-eliminated players and sort
      const activePlayers = players.filter(p => {
        const standing = standings.find(s => s.user_id === p.user_id);
        return !standing?.is_eliminated;
      });

      activePlayers.sort(sortPlayers);

      const advancing = activePlayers.slice(0, remainingCount);
      const eliminated = activePlayers.slice(remainingCount);

      console.log(`Round ${roundNum}: ${advancing.length} advancing, ${eliminated.length} eliminated`);

      // Update eliminated players
      for (let i = 0; i < eliminated.length; i++) {
        const player = eliminated[i];
        const finalPosition = remainingCount + i + 1;

        await supabase
          .from("user_season_standings")
          .update({
            is_eliminated: true,
            elimination_round: roundNum,
          })
          .eq("league_id", league_id)
          .eq("user_id", player.user_id)
          .eq("season", season);

        // Record elimination
        await supabase
          .from("chase_eliminations")
          .upsert({
            league_id,
            user_id: player.user_id,
            season,
            eliminated_round: roundNum,
            final_position: finalPosition,
            playoff_points_at_elimination: player.playoff_points,
          }, { onConflict: "league_id,user_id,season" });
      }

      // Reset playoff points for advancing players at start of new round
      for (const player of advancing) {
        await supabase
          .from("user_season_standings")
          .update({ playoff_points: 0 })
          .eq("league_id", league_id)
          .eq("user_id", player.user_id)
          .eq("season", season);
      }

      // Complete current round and start next
      await supabase
        .from("chase_rounds")
        .update({ is_active: false, completed_at: new Date().toISOString() })
        .eq("league_id", league_id)
        .eq("season", season)
        .eq("round_number", roundNum);

      if (roundNum < 4) {
        await supabase
          .from("chase_rounds")
          .upsert({
            league_id,
            season,
            round_number: roundNum + 1,
            players_remaining: remainingCount,
            is_active: true,
            started_at: new Date().toISOString(),
          }, { onConflict: "league_id,season,round_number" });
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Round ${roundNum} complete. ${eliminated.length} players eliminated.`,
          advancingCount: advancing.length,
          eliminatedCount: eliminated.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "finalize_championship") {
      // Get Final Four and rank by championship race finish
      const activePlayers = players.filter(p => {
        const standing = standings.find(s => s.user_id === p.user_id);
        return !standing?.is_eliminated;
      });

      activePlayers.sort(sortPlayers);

      // Top player is champion
      for (let i = 0; i < activePlayers.length; i++) {
        const player = activePlayers[i];
        const finalPosition = i + 1;

        await supabase
          .from("chase_eliminations")
          .upsert({
            league_id,
            user_id: player.user_id,
            season,
            eliminated_round: 4,
            final_position: finalPosition,
            playoff_points_at_elimination: player.playoff_points,
          }, { onConflict: "league_id,user_id,season" });
      }

      // Mark championship round as complete
      await supabase
        .from("chase_rounds")
        .update({ is_active: false, completed_at: new Date().toISOString() })
        .eq("league_id", league_id)
        .eq("season", season)
        .eq("round_number", 4);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Championship finalized",
          champion: activePlayers[0]?.user_id || null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in calculate-chase-elimination:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
