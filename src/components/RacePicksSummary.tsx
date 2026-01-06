import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2 } from 'lucide-react';

interface PickWithMember {
  driver_id: number;
  driver_name: string;
  car_number: string | null;
  members: { display_name: string; user_id: string }[];
}

interface RacePicksSummaryProps {
  leagueId: string;
  raceId: number;
  season: number;
}

export function RacePicksSummary({ leagueId, raceId, season }: RacePicksSummaryProps) {
  const [picks, setPicks] = useState<PickWithMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPicks();
  }, [leagueId, raceId, season]);

  async function fetchPicks() {
    setLoading(true);

    // Fetch all picks for this race
    const { data: picksData } = await supabase
      .from('driver_picks')
      .select('driver_id, driver_name, car_number, user_id')
      .eq('league_id', leagueId)
      .eq('race_id', raceId)
      .eq('season', season);

    if (!picksData || picksData.length === 0) {
      setPicks([]);
      setLoading(false);
      return;
    }

    // Fetch profiles for all users
    const userIds = [...new Set(picksData.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

    // Group by driver
    const driverMap = new Map<number, PickWithMember>();
    for (const pick of picksData) {
      if (!driverMap.has(pick.driver_id)) {
        driverMap.set(pick.driver_id, {
          driver_id: pick.driver_id,
          driver_name: pick.driver_name,
          car_number: pick.car_number,
          members: [],
        });
      }
      driverMap.get(pick.driver_id)!.members.push({
        display_name: profileMap.get(pick.user_id) || 'Unknown',
        user_id: pick.user_id,
      });
    }

    // Sort by number of picks (most popular first)
    const sortedPicks = Array.from(driverMap.values()).sort(
      (a, b) => b.members.length - a.members.length
    );

    setPicks(sortedPicks);
    setLoading(false);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (picks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            League Picks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No picks have been made for this race yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Who Picked Who
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead className="text-center">Count</TableHead>
              <TableHead>Picked By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {picks.map((pick) => (
              <TableRow key={pick.driver_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {pick.car_number && (
                      <Badge variant="outline">#{pick.car_number}</Badge>
                    )}
                    <span className="font-medium">{pick.driver_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{pick.members.length}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {pick.members.map((m, idx) => (
                      <Badge key={m.user_id} variant="outline" className="text-xs">
                        {m.display_name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
