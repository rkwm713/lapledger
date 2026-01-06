import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Trophy, Calendar, Users, Flag, Star } from 'lucide-react';
import { toast } from 'sonner';

interface RaceScore {
  race_id: number;
  race_name: string;
  race_date: string;
  driver_id: number | null;
  driver_name: string | null;
  points_earned: number;
  finishing_position: number | null;
  is_race_win: boolean;
  stage_wins: number;
  is_free_pick: boolean;
  picked_by: string[];
}

interface League {
  id: string;
  name: string;
  season: number;
  series: string;
  owner_id: string;
}

export default function ScoringHistory() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [league, setLeague] = useState<League | null>(null);
  const [raceScores, setRaceScores] = useState<RaceScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [members, setMembers] = useState<{ user_id: string; display_name: string }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && leagueId) {
      fetchData();
    }
  }, [user, leagueId]);

  async function fetchData() {
    setLoading(true);

    // Fetch league
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, season, series, owner_id')
      .eq('id', leagueId)
      .maybeSingle();

    if (leagueError || !leagueData) {
      toast.error('League not found');
      navigate('/leagues');
      return;
    }
    setLeague(leagueData);

    // Fetch members for filter dropdown
    const { data: membersData } = await supabase
      .from('league_members')
      .select('user_id')
      .eq('league_id', leagueId);

    const memberProfiles = await Promise.all(
      (membersData || []).map(async (m) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', m.user_id)
          .maybeSingle();
        return { user_id: m.user_id, display_name: profile?.display_name || 'Unknown' };
      })
    );
    setMembers(memberProfiles);

    // Set default to current user
    setSelectedMember(user?.id || null);
    
    await fetchScoresForMember(user?.id || null, leagueData);

    setLoading(false);
  }

  async function fetchScoresForMember(memberId: string | null, leagueData: League) {
    if (!memberId || !leagueData) return;

    // Fetch race scores for this member
    const { data: scoresData } = await supabase
      .from('user_race_scores')
      .select('race_id, driver_id, driver_name, points_earned')
      .eq('league_id', leagueId)
      .eq('user_id', memberId);

    // Fetch picks for additional info
    const { data: picksData } = await supabase
      .from('driver_picks')
      .select('race_id, driver_id, driver_name, is_free_pick')
      .eq('league_id', leagueId)
      .eq('user_id', memberId)
      .eq('season', leagueData.season);

    // Fetch race info from race_scores table
    const { data: raceInfo } = await supabase
      .from('race_scores')
      .select('race_id, race_name, race_date, driver_id, finishing_position')
      .eq('series', leagueData.series)
      .eq('season', leagueData.season);

    // Fetch all picks for "picked by" info
    const { data: allPicks } = await supabase
      .from('driver_picks')
      .select('race_id, driver_id, user_id')
      .eq('league_id', leagueId)
      .eq('season', leagueData.season);

    // Build race scores with enriched data
    const picksMap = new Map(picksData?.map(p => [p.race_id, p]));
    const raceMap = new Map<number, { race_name: string; race_date: string }>();
    const positionMap = new Map<string, number>();

    raceInfo?.forEach(r => {
      if (!raceMap.has(r.race_id)) {
        raceMap.set(r.race_id, { race_name: r.race_name, race_date: r.race_date });
      }
      positionMap.set(`${r.race_id}-${r.driver_id}`, r.finishing_position || 0);
    });

    // Group picks by race_id + driver_id to get "picked by"
    const pickedByMap = new Map<string, string[]>();
    for (const pick of allPicks || []) {
      const key = `${pick.race_id}-${pick.driver_id}`;
      if (!pickedByMap.has(key)) pickedByMap.set(key, []);
      const member = members.find(m => m.user_id === pick.user_id);
      if (member) pickedByMap.get(key)!.push(member.display_name);
    }

    const scores: RaceScore[] = (scoresData || []).map(score => {
      const pick = picksMap.get(score.race_id);
      const race = raceMap.get(score.race_id);
      const position = positionMap.get(`${score.race_id}-${score.driver_id}`) || null;
      const pickedByKey = `${score.race_id}-${score.driver_id}`;
      
      return {
        race_id: score.race_id,
        race_name: race?.race_name || `Race ${score.race_id}`,
        race_date: race?.race_date || '',
        driver_id: score.driver_id,
        driver_name: score.driver_name,
        points_earned: score.points_earned || 0,
        finishing_position: position,
        is_race_win: position === 1,
        stage_wins: 0, // Would need additional tracking
        is_free_pick: pick?.is_free_pick || false,
        picked_by: pickedByMap.get(pickedByKey) || [],
      };
    });

    // Sort by race date descending
    scores.sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime());
    setRaceScores(scores);
  }

  useEffect(() => {
    if (selectedMember && league) {
      fetchScoresForMember(selectedMember, league);
    }
  }, [selectedMember]);

  const totalPoints = raceScores.reduce((sum, r) => sum + r.points_earned, 0);
  const totalWins = raceScores.filter(r => r.is_race_win).length;
  const isOwner = league?.owner_id === user?.id;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-6 px-4 sm:py-8 sm:px-6">
        <Button variant="ghost" onClick={() => navigate(`/leagues/${leagueId}`)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to League
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Calendar className="h-7 w-7" />
              Scoring History
            </h1>
            <p className="text-muted-foreground">{league?.name} • {league?.season}</p>
          </div>

          {isOwner && members.length > 0 && (
            <select
              value={selectedMember || ''}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="px-3 py-2 rounded-md border bg-background"
            >
              {members.map(m => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name} {m.user_id === user?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold">{totalPoints}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Races Scored</p>
              <p className="text-2xl font-bold">{raceScores.length}</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">Race Wins</p>
              <p className="text-2xl font-bold">{totalWins}</p>
            </CardContent>
          </Card>
        </div>

        {/* Race by Race Table */}
        <Card>
          <CardHeader>
            <CardTitle>Race Results</CardTitle>
            <CardDescription>
              Points earned for each race this season
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Race</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="text-center">Finish</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Picked By</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raceScores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No scored races yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    raceScores.map((race) => (
                      <TableRow key={race.race_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[150px] sm:max-w-none">
                              {race.race_name}
                            </p>
                            {race.race_date && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(race.race_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {race.driver_name || <span className="text-muted-foreground">No pick</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {race.finishing_position ? (
                            <div className="flex items-center justify-center gap-1">
                              {race.is_race_win && <Trophy className="h-4 w-4 text-yellow-500" />}
                              P{race.finishing_position}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          {race.is_free_pick ? (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                              <Star className="h-3 w-3 mr-1" />
                              Free
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">Regular</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {race.picked_by.length > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{race.picked_by.length}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={race.points_earned > 30 ? 'default' : 'secondary'}
                            className={race.is_race_win ? 'bg-green-600' : ''}
                          >
                            {race.points_earned}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
