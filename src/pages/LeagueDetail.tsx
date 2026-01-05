import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Copy, Check, ArrowLeft, Loader2, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface League {
  id: string;
  name: string;
  description: string | null;
  season: number;
  series: string;
  invite_code: string;
  owner_id: string;
}

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  profile: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  pickCount: number;
  total_points: number;
}

export default function LeagueDetail() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && leagueId) {
      fetchLeagueDetails();
    }
  }, [user, leagueId]);

  async function fetchLeagueDetails() {
    setLoading(true);

    // Fetch league
    const { data: leagueData, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .maybeSingle();

    if (leagueError || !leagueData) {
      toast.error('League not found');
      navigate('/leagues');
      return;
    }
    setLeague(leagueData);

    // Fetch members with profiles
    const { data: membersData, error: membersError } = await supabase
      .from('league_members')
      .select('id, user_id, joined_at')
      .eq('league_id', leagueId);

    if (membersError) {
      toast.error('Failed to load members');
      setLoading(false);
      return;
    }

    // Fetch profiles and scores for each member
    const membersWithDetails = await Promise.all(
      (membersData || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', member.user_id)
          .maybeSingle();

        // Count picks
        const { count: pickCount } = await supabase
          .from('driver_picks')
          .select('*', { count: 'exact', head: true })
          .eq('league_id', leagueId)
          .eq('user_id', member.user_id)
          .eq('season', leagueData.season);

        // Calculate total points from user_race_scores
        const { data: scores } = await supabase
          .from('user_race_scores')
          .select('points_earned')
          .eq('league_id', leagueId)
          .eq('user_id', member.user_id);

        const totalPoints = scores?.reduce((sum, s) => sum + (s.points_earned || 0), 0) || 0;

        return {
          ...member,
          profile,
          pickCount: pickCount || 0,
          total_points: totalPoints
        };
      })
    );

    // Sort by points descending
    membersWithDetails.sort((a, b) => b.total_points - a.total_points);
    setMembers(membersWithDetails);
    setLoading(false);
  }

  function copyInviteCode() {
    if (league) {
      navigator.clipboard.writeText(league.invite_code);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const seriesLabels: Record<string, string> = {
    cup: 'NASCAR Cup Series',
    xfinity: 'Xfinity Series',
    trucks: 'Craftsman Truck Series'
  };

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

  const isOwner = league.owner_id === user?.id;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-6 px-4 sm:py-8 sm:px-6">
        <Button variant="ghost" onClick={() => navigate('/leagues')} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <span className="break-words">{league.name}</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {seriesLabels[league.series]} • {league.season} Season
            </p>
            {league.description && (
              <p className="text-sm text-muted-foreground mt-2">{league.description}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Users className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-4 sm:mx-0">
                <DialogHeader>
                  <DialogTitle>Invite Friends</DialogTitle>
                  <DialogDescription>
                    Share this code with friends to let them join your league
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <Label>Invite Code</Label>
                  <div className="flex gap-2 mt-2">
                    <Input value={league.invite_code} readOnly className="font-mono text-lg" />
                    <Button onClick={copyInviteCode} variant="outline" size="icon">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button onClick={() => navigate(`/leagues/${leagueId}/picks`)} className="w-full sm:w-auto">
              Manage Picks
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 overflow-hidden">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Standings</CardTitle>
              <CardDescription>Current season rankings</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 sm:w-12 pl-4 sm:pl-4">#</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Picks</TableHead>
                      <TableHead className="text-right pr-4 sm:pr-4">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member, index) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium pl-4 sm:pl-4">
                          {index === 0 && members.length > 1 && member.total_points > 0 ? (
                            <span className="text-yellow-500">🏆</span>
                          ) : (
                            index + 1
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <span className="truncate max-w-[120px] sm:max-w-none">{member.profile?.display_name || 'Unknown'}</span>
                            {member.user_id === league.owner_id && (
                              <span title="League Owner">
                                <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center hidden sm:table-cell">
                          <Badge variant="outline">{member.pickCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold pr-4 sm:pr-4">
                          {member.total_points}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>League Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Members</Label>
                <p className="font-semibold">{members.length}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Season</Label>
                <p className="font-semibold">{league.season}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Series</Label>
                <p className="font-semibold">{seriesLabels[league.series]}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Invite Code</Label>
                <p className="font-mono font-semibold">{league.invite_code}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
