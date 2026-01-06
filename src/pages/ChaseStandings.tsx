import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ChaseBracket } from "@/components/ChaseBracket";
import { ChaseStatusCard } from "@/components/ChaseStatusCard";
import { EliminationLine } from "@/components/EliminationLine";
import { TiebreakerTooltip } from "@/components/TiebreakerTooltip";
import { TiebreakerBadge } from "@/components/TiebreakerBadge";
import { TiebreakerLegend } from "@/components/TiebreakerLegend";
import { sortByTiebreakers, getTiebreakerLevel, wasDecidedByTiebreaker, TiebreakerLevel } from "@/lib/tiebreakers";
import { ChasePlayer, ChaseRound, CHASE_ROUND_NAMES, CHASE_ROUND_REMAINING } from "@/lib/chase-types";
import { cn } from "@/lib/utils";

interface League {
  id: string;
  name: string;
  season: number;
  series: string;
}

export default function ChaseStandings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [league, setLeague] = useState<League | null>(null);
  const [players, setPlayers] = useState<ChasePlayer[]>([]);
  const [currentRound, setCurrentRound] = useState<ChaseRound | null>(null);
  const [eliminations, setEliminations] = useState<Map<number, ChasePlayer[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("standings");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && leagueId) {
      fetchChaseData();
    }
  }, [user, leagueId]);

  const fetchChaseData = async () => {
    if (!leagueId) return;
    setLoading(true);

    try {
      // Fetch league info
      const { data: leagueData } = await supabase
        .from("leagues")
        .select("id, name, season, series")
        .eq("id", leagueId)
        .single();

      if (leagueData) setLeague(leagueData);

      // Fetch current chase round
      const { data: roundData } = await supabase
        .from("chase_rounds")
        .select("*")
        .eq("league_id", leagueId)
        .eq("is_active", true)
        .single();

      if (roundData) {
        setCurrentRound(roundData as ChaseRound);
      }

      // Fetch all members with their standings
      const { data: members } = await supabase
        .from("league_members")
        .select("user_id")
        .eq("league_id", leagueId);

      if (!members) return;

      const playerData: ChasePlayer[] = [];
      const eliminationMap = new Map<number, ChasePlayer[]>();

      for (const member of members) {
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", member.user_id)
          .single();

        // Fetch standings
        const { data: standings } = await supabase
          .from("user_season_standings")
          .select("*")
          .eq("league_id", leagueId)
          .eq("user_id", member.user_id)
          .eq("season", leagueData?.season || 2025)
          .single();

        // Fetch elimination info
        const { data: elimination } = await supabase
          .from("chase_eliminations")
          .select("*")
          .eq("league_id", leagueId)
          .eq("user_id", member.user_id)
          .eq("season", leagueData?.season || 2025)
          .single();

        const player: ChasePlayer = {
          user_id: member.user_id,
          display_name: profile?.display_name || "Unknown",
          avatar_url: profile?.avatar_url || null,
          playoff_points: standings?.playoff_points || 0,
          race_wins: standings?.race_wins || 0,
          stage_wins: standings?.stage_wins || 0,
          top_5s: standings?.top_5s || 0,
          top_10s: standings?.top_10s || 0,
          top_15s: standings?.top_15s || 0,
          top_20s: standings?.top_20s || 0,
          regular_season_points: standings?.regular_season_points || 0,
          is_eliminated: standings?.is_eliminated || false,
          elimination_round: standings?.elimination_round || null,
          is_wild_card: standings?.is_wild_card || false,
          position: 0,
        };

        playerData.push(player);

        // Group eliminated players by round
        if (elimination) {
          const round = elimination.eliminated_round;
          if (!eliminationMap.has(round)) {
            eliminationMap.set(round, []);
          }
          eliminationMap.get(round)!.push(player);
        }
      }

      // Sort using shared tiebreaker utility (for Chase, use playoff points)
      const sortedPlayers = sortByTiebreakers(playerData, true);

      // Assign positions
      sortedPlayers.forEach((p, idx) => {
        p.position = idx + 1;
      });

      setPlayers(sortedPlayers);
      setEliminations(eliminationMap);
    } catch (error) {
      console.error("Error fetching chase data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerStatus = (player: ChasePlayer, position: number): 'safe' | 'at-risk' | 'eliminated' | 'advancing' => {
    if (player.is_eliminated) return 'eliminated';
    const roundNum = currentRound?.round_number || 0;
    const cutoff = CHASE_ROUND_REMAINING[roundNum] || 23;
    if (position <= cutoff - 2) return 'safe';
    if (position <= cutoff) return 'at-risk';
    return 'eliminated';
  };

  const getUserStatus = (): 'safe' | 'at-risk' | 'eliminated' | 'not-qualified' | null => {
    if (!user) return null;
    const userPlayer = players.find(p => p.user_id === user.id);
    if (!userPlayer) return 'not-qualified';
    if (userPlayer.is_eliminated) return 'eliminated';
    const status = getPlayerStatus(userPlayer, userPlayer.position);
    return status === 'advancing' ? 'safe' : status;
  };

  const getStatusBadge = (status: 'safe' | 'at-risk' | 'eliminated' | 'advancing') => {
    switch (status) {
      case 'safe':
      case 'advancing':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Safe</Badge>;
      case 'at-risk':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">At Risk</Badge>;
      case 'eliminated':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Out</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const roundNum = currentRound?.round_number || 0;
  const playersRemaining = CHASE_ROUND_REMAINING[roundNum] || 23;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/leagues/${leagueId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{league?.name} - Chase Standings</h1>
            <p className="text-muted-foreground">
              {CHASE_ROUND_NAMES[roundNum]} • {league?.season} Season
            </p>
          </div>
        </div>

        {/* Status Card */}
        <ChaseStatusCard
          currentRound={currentRound}
          playersRemaining={playersRemaining}
          userStatus={getUserStatus()}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="standings">Current Standings</TabsTrigger>
            <TabsTrigger value="bracket">Full Bracket</TabsTrigger>
          </TabsList>

          <TabsContent value="standings" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Chase Standings
                  </CardTitle>
                  <TiebreakerLegend />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Player</TableHead>
                      <TableHead className="text-center">Playoff Pts</TableHead>
                      <TableHead className="text-center">Wins</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Stage Wins</TableHead>
                      <TableHead className="text-center hidden md:table-cell">Tiebreakers</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {players.map((player, idx) => {
                      const status = getPlayerStatus(player, player.position);
                      const isCurrentUser = player.user_id === user?.id;
                      const showEliminationLine = player.position === playersRemaining;
                      
                      // Calculate tiebreaker level
                      const previousPlayer = idx > 0 ? players[idx - 1] : undefined;
                      const decidedByTB = wasDecidedByTiebreaker(player, previousPlayer, true);
                      const tiebreakerLevel = previousPlayer 
                        ? getTiebreakerLevel(previousPlayer, player, true) 
                        : ('points' as TiebreakerLevel);

                      return (
                        <>
                          <TableRow
                            key={player.user_id}
                            className={cn(
                              isCurrentUser && "bg-primary/5",
                              status === 'eliminated' && "opacity-50"
                            )}
                          >
                            <TableCell className="font-medium">
                              {player.position === 1 && <Crown className="h-4 w-4 text-yellow-500 inline mr-1" />}
                              {player.position}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={player.avatar_url || undefined} />
                                  <AvatarFallback>{player.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className={cn(isCurrentUser && "font-semibold")}>
                                  {player.display_name}
                                </span>
                                {player.is_wild_card && (
                                  <Badge variant="outline" className="text-xs">WC</Badge>
                                )}
                                {/* Show TB badge on mobile */}
                                {decidedByTB && (
                                  <span className="md:hidden">
                                    <TiebreakerBadge level={tiebreakerLevel} size="sm" />
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-semibold">{player.playoff_points}</TableCell>
                            <TableCell className="text-center">{player.race_wins}</TableCell>
                            <TableCell className="text-center hidden sm:table-cell">{player.stage_wins}</TableCell>
                            <TableCell className="text-center hidden md:table-cell">
                              <TiebreakerTooltip
                                stats={{
                                  race_wins: player.race_wins,
                                  top_5s: player.top_5s,
                                  top_10s: player.top_10s,
                                  top_15s: player.top_15s,
                                  top_20s: player.top_20s,
                                }}
                                decidingLevel={decidedByTB ? tiebreakerLevel : undefined}
                              >
                                <button className="cursor-help">
                                  {decidedByTB ? (
                                    <TiebreakerBadge level={tiebreakerLevel} showLabel size="sm" />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      T5: {player.top_5s} | T10: {player.top_10s}
                                    </span>
                                  )}
                                </button>
                              </TiebreakerTooltip>
                            </TableCell>
                            <TableCell className="text-right">{getStatusBadge(status)}</TableCell>
                          </TableRow>
                          {showEliminationLine && idx < players.length - 1 && (
                            <TableRow key={`elimination-${player.user_id}`}>
                              <TableCell colSpan={7} className="p-0">
                                <EliminationLine
                                  position={player.position}
                                  totalPlayers={players.length}
                                  playersRemaining={playersRemaining}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bracket" className="mt-4">
            <ChaseBracket
              players={players}
              currentRound={roundNum}
              eliminations={eliminations}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
