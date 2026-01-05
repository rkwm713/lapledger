import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeasonSelector } from '@/components/SeasonSelector';
import { Plus, Users, Trophy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface League {
  id: string;
  name: string;
  description: string | null;
  season: number;
  series: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function Leagues() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    season: new Date().getFullYear(),
    series: 'cup'
  });
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLeagues();
    }
  }, [user]);

  async function fetchLeagues() {
    setLoading(true);
    
    // First get leagues where user is a member
    const { data: memberLeagues, error: memberError } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', user!.id);

    if (memberError) {
      toast.error('Failed to fetch leagues');
      setLoading(false);
      return;
    }

    const memberLeagueIds = memberLeagues?.map(m => m.league_id) || [];

    // Get owned leagues
    const { data: ownedLeagues, error: ownedError } = await supabase
      .from('leagues')
      .select('*')
      .eq('owner_id', user!.id);

    if (ownedError) {
      toast.error('Failed to fetch leagues');
      setLoading(false);
      return;
    }

    // Combine and deduplicate
    const allLeagueIds = [...new Set([...memberLeagueIds, ...(ownedLeagues?.map(l => l.id) || [])])];

    if (allLeagueIds.length === 0) {
      setLeagues([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .in('id', allLeagueIds);

    if (error) {
      toast.error('Failed to fetch leagues');
    } else {
      // Get member counts
      const leaguesWithCounts = await Promise.all(
        (data || []).map(async (league) => {
          const { count } = await supabase
            .from('league_members')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', league.id);
          return { ...league, member_count: count || 0 };
        })
      );
      setLeagues(leaguesWithCounts);
    }
    setLoading(false);
  }

  async function handleCreateLeague(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) {
      toast.error('League name is required');
      return;
    }

    setIsSubmitting(true);
    const inviteCode = generateInviteCode();

    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        season: createForm.season,
        series: createForm.series,
        invite_code: inviteCode,
        owner_id: user!.id
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create league');
      setIsSubmitting(false);
      return;
    }

    // Add owner as a member
    await supabase.from('league_members').insert({
      league_id: league.id,
      user_id: user!.id
    });

    toast.success('League created!');
    setIsCreateOpen(false);
    setCreateForm({ name: '', description: '', season: new Date().getFullYear(), series: 'cup' });
    setIsSubmitting(false);
    fetchLeagues();
  }

  async function handleJoinLeague(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error('Invite code is required');
      return;
    }

    setIsSubmitting(true);

    // Use the secure RPC function to join by invite code
    const { data, error } = await supabase
      .rpc('join_league_by_invite_code', { 
        _invite_code: joinCode.trim() 
      })
      .maybeSingle();

    if (error) {
      toast.error('Failed to join league');
      setIsSubmitting(false);
      return;
    }

    if (!data || !data.success) {
      toast.error(data?.message || 'Invalid invite code');
      setIsSubmitting(false);
      return;
    }

    toast.success(`Joined ${data.league_name}!`);
    setIsJoinOpen(false);
    setJoinCode('');
    fetchLeagues();
    setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Leagues</h1>
            <p className="text-muted-foreground">Manage your fantasy leagues</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Join League
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a League</DialogTitle>
                  <DialogDescription>
                    Enter the invite code shared by the league owner
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleJoinLeague} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-code">Invite Code</Label>
                    <Input
                      id="invite-code"
                      placeholder="ABCD1234"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={8}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Join League
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create League
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a New League</DialogTitle>
                  <DialogDescription>
                    Set up a fantasy league and invite your friends
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateLeague} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="league-name">League Name</Label>
                    <Input
                      id="league-name"
                      placeholder="The Racing Buddies"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="league-desc">Description (optional)</Label>
                    <Textarea
                      id="league-desc"
                      placeholder="A friendly fantasy league for NASCAR fans"
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Season</Label>
                      <SeasonSelector
                        value={createForm.season.toString()}
                        onChange={(v) => setCreateForm({ ...createForm, season: parseInt(v) })}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Series</Label>
                      <Select
                        value={createForm.series}
                        onValueChange={(v) => setCreateForm({ ...createForm, series: v })}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cup">Cup Series</SelectItem>
                          <SelectItem value="xfinity">Xfinity Series</SelectItem>
                          <SelectItem value="trucks">Truck Series</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create League
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {leagues.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Leagues Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a league or join one with an invite code
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <Card 
                key={league.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    {league.name}
                  </CardTitle>
                  <CardDescription>
                    {seriesLabels[league.series]} • {league.season}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {league.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {league.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{league.member_count} {league.member_count === 1 ? 'member' : 'members'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
