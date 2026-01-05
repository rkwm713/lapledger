import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getSeasonRaces } from '@/lib/nascar';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Check, X, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { SeriesType, RaceResult } from '@/lib/types';

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
  id?: string;
  driver_id: number;
  driver_name: string;
  car_number: string | null;
  team_name: string | null;
  pick_order: number;
}

export default function DriverPicks() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockDate, setLockDate] = useState<Date | null>(null);

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

    if (picksData) {
      setPicks(picksData.map(p => ({
        id: p.id,
        driver_id: p.driver_id,
        driver_name: p.driver_name,
        car_number: p.car_number,
        team_name: p.team_name,
        pick_order: p.pick_order
      })));
    }

    // Fetch drivers from race results
    await fetchDrivers(leagueData.series as SeriesType, leagueData.season);

    // Check if picks are locked (first race started)
    const races = await getSeasonRaces(leagueData.series as SeriesType, leagueData.season.toString());
    const firstRace = races.find(r => r.raceDate);
    if (firstRace?.raceDate) {
      const raceDate = new Date(firstRace.raceDate);
      setLockDate(raceDate);
      setIsLocked(new Date() >= raceDate);
    }

    setLoading(false);
  }

  async function fetchDrivers(series: SeriesType, season: number) {
    try {
      const races = await getSeasonRaces(series, season.toString());
      const completedRace = races.find(r => r.isComplete);
      
      if (!completedRace) {
        // No completed races yet, try to get drivers from proxy directly
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nascar-proxy?action=racedetails&series=${series}&season=${season}&raceId=${races[0]?.raceId || 1}`
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
        return;
      }

      // Fetch results from a completed race to get driver list
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nascar-proxy?action=racedetails&series=${series}&season=${season}&raceId=${completedRace.raceId}`
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

  async function selectDriver(driver: DriverOption, slot: number) {
    if (isLocked) {
      toast.error('Picks are locked for this season');
      return;
    }

    // Check if driver already picked
    if (picks.some(p => p.driver_id === driver.driver_id)) {
      toast.error('You already picked this driver');
      return;
    }

    const existingPick = picks.find(p => p.pick_order === slot);

    setSaving(true);

    if (existingPick?.id) {
      // Update existing pick
      const { error } = await supabase
        .from('driver_picks')
        .update({
          driver_id: driver.driver_id,
          driver_name: driver.driver_name,
          car_number: driver.car_number,
          team_name: driver.team_name
        })
        .eq('id', existingPick.id);

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
          driver_id: driver.driver_id,
          driver_name: driver.driver_name,
          car_number: driver.car_number,
          team_name: driver.team_name,
          pick_order: slot,
          season: league!.season
        });

      if (error) {
        toast.error('Failed to save pick');
        setSaving(false);
        return;
      }
    }

    // Refresh picks
    const { data } = await supabase
      .from('driver_picks')
      .select('*')
      .eq('league_id', leagueId)
      .eq('user_id', user!.id)
      .eq('season', league!.season);

    if (data) {
      setPicks(data.map(p => ({
        id: p.id,
        driver_id: p.driver_id,
        driver_name: p.driver_name,
        car_number: p.car_number,
        team_name: p.team_name,
        pick_order: p.pick_order
      })));
    }

    toast.success('Pick saved!');
    setSelectingSlot(null);
    setSaving(false);
  }

  async function removePick(slot: number) {
    if (isLocked) {
      toast.error('Picks are locked for this season');
      return;
    }

    const pick = picks.find(p => p.pick_order === slot);
    if (!pick?.id) return;

    setSaving(true);
    const { error } = await supabase
      .from('driver_picks')
      .delete()
      .eq('id', pick.id);

    if (error) {
      toast.error('Failed to remove pick');
    } else {
      setPicks(picks.filter(p => p.pick_order !== slot));
      toast.success('Pick removed');
    }
    setSaving(false);
  }

  const filteredDrivers = drivers.filter(d =>
    d.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.car_number.includes(searchQuery) ||
    d.team_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const pick1 = picks.find(p => p.pick_order === 1);
  const pick2 = picks.find(p => p.pick_order === 2);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8">
        <Button variant="ghost" onClick={() => navigate(`/leagues/${leagueId}`)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {league.name}
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold">Select Your Drivers</h1>
          <p className="text-muted-foreground mt-1">
            Choose 2 drivers for the {league.season} season
          </p>
          {isLocked && (
            <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
              <AlertCircle className="h-5 w-5" />
              <span>Picks are locked for this season. The first race has already started.</span>
            </div>
          )}
          {!isLocked && lockDate && (
            <p className="text-sm text-muted-foreground mt-2">
              Picks lock on {lockDate.toLocaleDateString()} at {lockDate.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {[1, 2].map((slot) => {
            const pick = slot === 1 ? pick1 : pick2;
            const isSelecting = selectingSlot === slot;

            return (
              <Card key={slot} className={isSelecting ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <CardTitle>Driver {slot}</CardTitle>
                  <CardDescription>
                    {pick ? 'Your selected driver' : 'Select a driver'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pick ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">#{pick.car_number} {pick.driver_name}</p>
                        <p className="text-muted-foreground">{pick.team_name}</p>
                      </div>
                      {!isLocked && (
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectingSlot(slot)}
                            disabled={saving}
                          >
                            Change
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => removePick(slot)}
                            disabled={saving}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setSelectingSlot(isSelecting ? null : slot)}
                      variant={isSelecting ? 'secondary' : 'default'}
                      disabled={isLocked}
                    >
                      {isSelecting ? 'Cancel' : 'Select Driver'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {selectingSlot !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Available Drivers</CardTitle>
              <CardDescription>
                Select a driver for slot {selectingSlot}
              </CardDescription>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drivers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {drivers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No driver data available yet. Check back when the season starts.
                </p>
              ) : (
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {filteredDrivers.map((driver) => {
                    const isAlreadyPicked = picks.some(p => p.driver_id === driver.driver_id);
                    return (
                      <Button
                        key={driver.driver_id}
                        variant="outline"
                        className="justify-between h-auto py-3"
                        onClick={() => selectDriver(driver, selectingSlot)}
                        disabled={isAlreadyPicked || saving}
                      >
                        <div className="text-left">
                          <span className="font-semibold">#{driver.car_number} {driver.driver_name}</span>
                          <span className="block text-sm text-muted-foreground">{driver.team_name}</span>
                        </div>
                        {isAlreadyPicked ? (
                          <Badge variant="secondary">Already Picked</Badge>
                        ) : (
                          <Check className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
