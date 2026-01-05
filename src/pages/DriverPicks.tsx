import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getSeasonRaces } from '@/lib/nascar';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Check, X, Search, AlertCircle, Lock, Calendar, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import type { SeriesType, RaceResult, Race } from '@/lib/types';

interface League {
  id: string;
  name: string;
  season: number;
  series: string;
}

interface DriverOption {
  driver_id: number;
  driver_name: string;
  car_number: string;
  team_name: string;
}

interface Pick {
  id: string;
  race_id: number;
  driver_id: number;
  driver_name: string;
  car_number: string | null;
  team_name: string | null;
}

interface RaceWithPick extends Race {
  pick?: Pick;
  isLocked: boolean;
  points?: number;
}

export default function DriverPicks() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [races, setRaces] = useState<RaceWithPick[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectingRaceId, setSelectingRaceId] = useState<number | null>(null);

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

  // Calculate driver usage (how many times each driver has been picked)
  const driverUsage = picks.reduce((acc, pick) => {
    acc[pick.driver_id] = (acc[pick.driver_id] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  async function fetchData() {
    setLoading(true);

    // Fetch league
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, season, series')
      .eq('id', leagueId)
      .maybeSingle();

    if (leagueError || !leagueData) {
      toast.error('League not found');
      navigate('/leagues');
      return;
    }
    setLeague(leagueData);

    // Fetch existing picks
    const { data: picksData } = await supabase
      .from('driver_picks')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', user!.id)
      .eq('season', leagueData.season);

    const userPicks: Pick[] = (picksData || []).map(p => ({
      id: p.id,
      race_id: p.race_id!,
      driver_id: p.driver_id,
      driver_name: p.driver_name,
      car_number: p.car_number,
      team_name: p.team_name
    }));
    setPicks(userPicks);

    // Fetch race scores for completed races
    const { data: scoresData } = await supabase
      .from('user_race_scores')
      .select('race_id, points_earned')
      .eq('league_id', leagueId)
      .eq('user_id', user!.id);

    const scoresByRace = (scoresData || []).reduce((acc, s) => {
      acc[s.race_id] = s.points_earned || 0;
      return acc;
    }, {} as Record<number, number>);

    // Fetch races for the season
    const raceList = await getSeasonRaces(leagueData.series as SeriesType, leagueData.season.toString());
    const now = new Date();
    
    const racesWithPicks: RaceWithPick[] = raceList.map(race => {
      const raceDate = race.raceDate ? new Date(race.raceDate) : null;
      const isLocked = raceDate ? now >= raceDate : false;
      const pick = userPicks.find(p => p.race_id === race.raceId);
      
      return {
        ...race,
        pick,
        isLocked,
        points: scoresByRace[race.raceId]
      };
    });

    setRaces(racesWithPicks);

    // Fetch drivers from race results
    await fetchDrivers(leagueData.series as SeriesType, leagueData.season, raceList);

    setLoading(false);
  }

  async function fetchDrivers(series: SeriesType, season: number, raceList: Race[]) {
    try {
      // Find a completed race to get driver data from
      let completedRace = raceList.find(r => r.isComplete);
      let targetSeason = season;
      
      // If no completed races in the current season, fetch from previous season
      if (!completedRace) {
        const lastSeasonRaces = await getSeasonRaces(series, String(season - 1));
        completedRace = lastSeasonRaces.find(r => r.isComplete);
        targetSeason = season - 1;
      }
      
      if (!completedRace) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nascar-proxy?action=racedetails&series=${series}&season=${targetSeason}&raceId=${completedRace.raceId}`
      );
      const data = await response.json();
      
      if (data.results) {
        const uniqueDrivers = new Map<number, DriverOption>();
        data.results.forEach((r: RaceResult & { driver_id?: number }) => {
          if (r.driver_id && !uniqueDrivers.has(r.driver_id)) {
            uniqueDrivers.set(r.driver_id, {
              driver_id: r.driver_id,
              driver_name: r.driverName,
              car_number: r.carNumber,
              team_name: r.teamName || ''
            });
          }
        });
        setDrivers(Array.from(uniqueDrivers.values()));
      }
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    }
  }

  async function selectDriver(driver: DriverOption, raceId: number) {
    const race = races.find(r => r.raceId === raceId);
    if (!race || race.isLocked) {
      toast.error('This race is locked');
      return;
    }

    // Check driver usage limit (max 2 per season)
    const currentUsage = driverUsage[driver.driver_id] || 0;
    const existingPickForRace = picks.find(p => p.race_id === raceId);
    
    // If updating pick for this race with same driver, no need to check
    if (existingPickForRace?.driver_id !== driver.driver_id && currentUsage >= 2) {
      toast.error(`You've already used ${driver.driver_name} twice this season`);
      return;
    }

    setSaving(true);

    if (existingPickForRace) {
      // Update existing pick
      const { error } = await supabase
        .from('driver_picks')
        .update({
          driver_id: driver.driver_id,
          driver_name: driver.driver_name,
          car_number: driver.car_number,
          team_name: driver.team_name
        })
        .eq('id', existingPickForRace.id);

      if (error) {
        toast.error('Failed to update pick');
        setSaving(false);
        return;
      }
    } else {
      // Create new pick
      const { error } = await supabase
        .from('driver_picks')
        .insert({
          league_id: leagueId,
          user_id: user!.id,
          race_id: raceId,
          race_name: race.raceName,
          race_date: race.raceDate,
          driver_id: driver.driver_id,
          driver_name: driver.driver_name,
          car_number: driver.car_number,
          team_name: driver.team_name,
          season: league!.season
        });

      if (error) {
        toast.error('Failed to save pick');
        setSaving(false);
        return;
      }
    }

    // Refresh data
    await fetchData();
    toast.success('Pick saved!');
    setSelectingRaceId(null);
    setSaving(false);
  }

  async function removePick(raceId: number) {
    const race = races.find(r => r.raceId === raceId);
    if (!race || race.isLocked) {
      toast.error('This race is locked');
      return;
    }

    const pick = picks.find(p => p.race_id === raceId);
    if (!pick) return;

    setSaving(true);
    const { error } = await supabase
      .from('driver_picks')
      .delete()
      .eq('id', pick.id);

    if (error) {
      toast.error('Failed to remove pick');
    } else {
      await fetchData();
      toast.success('Pick removed');
    }
    setSaving(false);
  }

  const filteredDrivers = drivers.filter(d =>
    d.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.car_number.includes(searchQuery) ||
    d.team_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique drivers that have been picked
  const pickedDriverIds = [...new Set(picks.map(p => p.driver_id))];
  const usedDrivers = drivers.filter(d => pickedDriverIds.includes(d.driver_id));

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

  if (!league) return null;

  const totalPoints = races.reduce((sum, r) => sum + (r.points || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8">
        <Button variant="ghost" onClick={() => navigate(`/leagues/${leagueId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {league.name}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Your Picks - {league.season}</h1>
          <p className="text-muted-foreground mt-1">
            Pick 1 driver per race. Each driver can be used max 2 times per season.
          </p>
        </div>

        {/* Driver Usage Tracker */}
        {usedDrivers.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Driver Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {usedDrivers.map(driver => {
                  const usage = driverUsage[driver.driver_id] || 0;
                  return (
                    <Badge 
                      key={driver.driver_id} 
                      variant={usage >= 2 ? 'destructive' : 'secondary'}
                    >
                      {driver.driver_name} {usage}/2
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Season Total */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Season Total</span>
              <span className="text-2xl font-bold">{totalPoints} pts</span>
            </div>
          </CardContent>
        </Card>

        {/* Race List */}
        <div className="space-y-3">
          {races.map((race) => {
            const isSelecting = selectingRaceId === race.raceId;
            const raceDate = race.raceDate ? new Date(race.raceDate) : null;

            return (
              <Card key={race.raceId} className={isSelecting ? 'ring-2 ring-primary' : ''}>
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{race.raceName}</span>
                        {race.isComplete && <Badge variant="outline">Complete</Badge>}
                        {race.isLocked && !race.isComplete && (
                          <Badge variant="secondary">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      {raceDate && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {raceDate.toLocaleDateString()} at {raceDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {race.pick ? (
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">#{race.pick.car_number} {race.pick.driver_name}</p>
                            <p className="text-sm text-muted-foreground">{race.pick.team_name}</p>
                          </div>
                          {race.isComplete && race.points !== undefined && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Trophy className="h-3 w-3" />
                              {race.points} pts
                            </Badge>
                          )}
                          {!race.isLocked && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectingRaceId(isSelecting ? null : race.raceId)}
                                disabled={saving}
                              >
                                Change
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removePick(race.raceId)}
                                disabled={saving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : race.isLocked ? (
                        <span className="text-muted-foreground text-sm">No pick made</span>
                      ) : (
                        <Button
                          onClick={() => setSelectingRaceId(isSelecting ? null : race.raceId)}
                          variant={isSelecting ? 'secondary' : 'default'}
                          size="sm"
                        >
                          {isSelecting ? 'Cancel' : 'Select Driver'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Driver Selection Panel */}
                  {isSelecting && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search drivers..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {drivers.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No driver data available yet.
                        </p>
                      ) : (
                        <div className="grid gap-2 max-h-64 overflow-y-auto">
                          {filteredDrivers.map((driver) => {
                            const usage = driverUsage[driver.driver_id] || 0;
                            const isMaxedOut = usage >= 2;
                            const isCurrentPick = race.pick?.driver_id === driver.driver_id;
                            
                            return (
                              <Button
                                key={driver.driver_id}
                                variant="outline"
                                className="justify-between h-auto py-2"
                                onClick={() => selectDriver(driver, race.raceId)}
                                disabled={isMaxedOut && !isCurrentPick || saving}
                              >
                                <div className="text-left">
                                  <span className="font-medium">#{driver.car_number} {driver.driver_name}</span>
                                  <span className="block text-xs text-muted-foreground">{driver.team_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={isMaxedOut ? 'destructive' : 'outline'} className="text-xs">
                                    {usage}/2
                                  </Badge>
                                  {isCurrentPick && <Check className="h-4 w-4 text-primary" />}
                                </div>
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
