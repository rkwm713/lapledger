import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Settings, DollarSign, Users, Save, CreditCard, RefreshCw, Calendar, Crown, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MemberPaymentRow } from '@/components/MemberPaymentRow';
import { PayoutCard } from '@/components/PayoutCard';

interface LeagueSettings {
  id: string;
  league_id: string;
  entry_fee: number;
  payment_deadline: string | null;
  payout_first: number;
  payout_second: number;
  payout_third: number;
  payout_fourth: number;
  payment_paypal: string | null;
  payment_venmo: string | null;
  payment_instructions: string | null;
}

interface Member {
  id: string;
  user_id: string;
  display_name: string;
  payment_status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
  isOwner: boolean;
  isAdmin: boolean;
}

export default function LeagueSettings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [leagueName, setLeagueName] = useState('');
  const [leagueSeason, setLeagueSeason] = useState<number>(new Date().getFullYear());
  const [leagueSeries, setLeagueSeries] = useState<string>('cup');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [isCurrentUserOwner, setIsCurrentUserOwner] = useState(false);
  const [settings, setSettings] = useState<LeagueSettings | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [completedRaces, setCompletedRaces] = useState<{ race_id: number; race_name: string; race_date: string }[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<string>('');
  
  // Form state - default to blank
  const [entryFee, setEntryFee] = useState('');
  const [paymentDeadline, setPaymentDeadline] = useState('');
  const [payoutFirst, setPayoutFirst] = useState('');
  const [payoutSecond, setPayoutSecond] = useState('');
  const [payoutThird, setPayoutThird] = useState('');
  const [payoutFourth, setPayoutFourth] = useState('200');
  const [paymentPaypal, setPaymentPaypal] = useState('');
  const [paymentVenmo, setPaymentVenmo] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

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
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, name, owner_id, season, series')
      .eq('id', leagueId)
      .maybeSingle();

    if (leagueError || !league) {
      toast.error('League not found');
      navigate('/leagues');
      return;
    }

    // Check ownership or admin status
    const { data: memberData } = await supabase
      .from('league_members')
      .select('is_admin')
      .eq('league_id', leagueId)
      .eq('user_id', user?.id)
      .maybeSingle();

    const isOwner = league.owner_id === user?.id;
    const isAdmin = memberData?.is_admin === true;

    if (!isOwner && !isAdmin) {
      toast.error('Only league owners and admins can access settings');
      navigate(`/leagues/${leagueId}`);
      return;
    }

    setLeagueName(league.name);
    setOwnerId(league.owner_id);
    setIsCurrentUserOwner(isOwner);
    setLeagueSeason(league.season);
    setLeagueSeries(league.series);

    // Fetch completed races that have been scored
    try {
      // @ts-ignore - Supabase type instantiation depth issue
      const result = await supabase.from('race_scores').select('race_id').eq('league_id', leagueId);
      const scoredRaces = result.data as { race_id: number }[] | null;

      if (scoredRaces && scoredRaces.length > 0) {
        // Get unique race IDs and build race info
        const uniqueRaceIds = [...new Set(scoredRaces.map(r => r.race_id))];
        
        // Build race list
        const races = uniqueRaceIds.map(id => ({
          race_id: id,
          race_name: `Race ${id}`,
          race_date: ''
        }));
        
        setCompletedRaces(races);
      }
    } catch (e) {
      console.error('Error fetching scored races:', e);
    }

    // Fetch settings
    const { data: settingsData } = await supabase
      .from('league_settings')
      .select('*')
      .eq('league_id', leagueId)
      .maybeSingle();

    if (settingsData) {
      setSettings(settingsData as LeagueSettings);
      setEntryFee(settingsData.entry_fee.toString());
      setPaymentDeadline(settingsData.payment_deadline || '');
      setPayoutFirst(settingsData.payout_first.toString());
      setPayoutSecond(settingsData.payout_second.toString());
      setPayoutThird(settingsData.payout_third.toString());
      setPayoutFourth(settingsData.payout_fourth.toString());
      setPaymentPaypal(settingsData.payment_paypal || '');
      setPaymentVenmo(settingsData.payment_venmo || '');
      setPaymentInstructions(settingsData.payment_instructions || '');
    }

    // Fetch members with payment status and admin status
    const { data: membersData } = await supabase
      .from('league_members')
      .select('id, user_id, payment_status, payment_date, is_admin')
      .eq('league_id', leagueId);

    if (membersData) {
      const membersWithProfiles = await Promise.all(
        membersData.map(async (member) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', member.user_id)
            .maybeSingle();

          // Check if payment is overdue
          let status = member.payment_status as 'pending' | 'paid' | 'overdue';
          if (status === 'pending' && settingsData?.payment_deadline) {
            const deadline = new Date(settingsData.payment_deadline);
            if (new Date() > deadline) {
              status = 'overdue';
            }
          }

          return {
            id: member.id,
            user_id: member.user_id,
            display_name: profile?.display_name || 'Unknown',
            payment_status: status,
            payment_date: member.payment_date,
            isOwner: member.user_id === league.owner_id,
            isAdmin: member.is_admin || false
          };
        })
      );

      // Sort: owners first, then admins, then by name
      membersWithProfiles.sort((a, b) => {
        if (a.isOwner && !b.isOwner) return -1;
        if (!a.isOwner && b.isOwner) return 1;
        if (a.isAdmin && !b.isAdmin) return -1;
        if (!a.isAdmin && b.isAdmin) return 1;
        return a.display_name.localeCompare(b.display_name);
      });

      setMembers(membersWithProfiles);
    }

    setLoading(false);
  }

  async function handleSaveSettings() {
    if (!leagueId) return;
    
    setSaving(true);

    const settingsData = {
      league_id: leagueId,
      entry_fee: parseFloat(entryFee) || 0,
      payment_deadline: paymentDeadline || null,
      payout_first: parseInt(payoutFirst) || 0,
      payout_second: parseInt(payoutSecond) || 0,
      payout_third: parseInt(payoutThird) || 0,
      payout_fourth: 200, // Fixed at $200
      payment_paypal: paymentPaypal || null,
      payment_venmo: paymentVenmo || null,
      payment_instructions: paymentInstructions || null,
    };

    if (settings?.id) {
      // Update existing
      const { error } = await supabase
        .from('league_settings')
        .update(settingsData)
        .eq('id', settings.id);

      if (error) {
        toast.error('Failed to save settings');
        setSaving(false);
        return;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('league_settings')
        .insert(settingsData);

      if (error) {
        toast.error('Failed to save settings');
        setSaving(false);
        return;
      }
    }

    toast.success('Settings saved!');
    setSaving(false);
    fetchData();
  }

  async function handleTogglePayment(memberId: string, currentStatus: string) {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const paymentDate = newStatus === 'paid' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('league_members')
      .update({ 
        payment_status: newStatus,
        payment_date: paymentDate
      })
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to update payment status');
      return;
    }

    toast.success(`Payment marked as ${newStatus}`);
    fetchData();
  }

  async function handleToggleAdmin(memberId: string, currentIsAdmin: boolean) {
    const newIsAdmin = !currentIsAdmin;

    const { error } = await supabase
      .from('league_members')
      .update({ is_admin: newIsAdmin })
      .eq('id', memberId);

    if (error) {
      toast.error('Failed to update admin status');
      return;
    }

    toast.success(newIsAdmin ? 'Member promoted to Admin' : 'Admin demoted to Member');
    fetchData();
  }

  async function handleRecalculateScores() {
    if (!selectedRaceId || !leagueId) {
      toast.error('Please select a race');
      return;
    }

    setRecalculating(selectedRaceId);

    try {
      const { error } = await supabase.functions.invoke('calculate-race-scores', {
        body: {
          league_id: leagueId,
          race_id: selectedRaceId,
          series: leagueSeries,
          season: leagueSeason.toString()
        }
      });

      if (error) throw error;

      toast.success('Scores recalculated! Any Monday penalties are now reflected.');
      setSelectedRaceId('');
    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast.error('Failed to recalculate scores');
    } finally {
      setRecalculating(null);
    }
  }

  const paidCount = members.filter(m => m.payment_status === 'paid').length;

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

        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">League Settings</h1>
            <p className="text-muted-foreground">{leagueName}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Entry Fee & Payouts */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Entry Fee & Payouts
                </CardTitle>
                <CardDescription>
                  Configure the financial structure of your league
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entryFee">Entry Fee ($)</Label>
                    <Input
                      id="entryFee"
                      type="number"
                      value={entryFee}
                      onChange={(e) => setEntryFee(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadline">Payment Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={paymentDeadline}
                      onChange={(e) => setPaymentDeadline(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Payout Structure</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="payout1" className="text-xs text-muted-foreground">1st Place</Label>
                      <Input
                        id="payout1"
                        type="number"
                        value={payoutFirst}
                        onChange={(e) => setPayoutFirst(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payout2" className="text-xs text-muted-foreground">2nd Place</Label>
                      <Input
                        id="payout2"
                        type="number"
                        value={payoutSecond}
                        onChange={(e) => setPayoutSecond(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payout3" className="text-xs text-muted-foreground">3rd Place</Label>
                      <Input
                        id="payout3"
                        type="number"
                        value={payoutThird}
                        onChange={(e) => setPayoutThird(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payout4" className="text-xs text-muted-foreground">4th Place (Fixed)</Label>
                      <Input
                        id="payout4"
                        type="text"
                        value="$200"
                        disabled
                        className="mt-1 bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">4th place is always $200</p>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            {/* Payment Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Information
                </CardTitle>
                <CardDescription>
                  Enter your payment details for members to see
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="paypal">PayPal (email or phone)</Label>
                    <Input
                      id="paypal"
                      type="text"
                      value={paymentPaypal}
                      onChange={(e) => setPaymentPaypal(e.target.value)}
                      placeholder="Brandiwall77@gmail.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="venmo">Venmo Username</Label>
                    <Input
                      id="venmo"
                      type="text"
                      value={paymentVenmo}
                      onChange={(e) => setPaymentVenmo(e.target.value)}
                      placeholder="@Brandi-Fields-1"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="instructions">Additional Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={paymentInstructions}
                    onChange={(e) => setPaymentInstructions(e.target.value)}
                    placeholder="e.g., Include your league name in the payment note"
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Payment Info
                </Button>
              </CardContent>
            </Card>

            {/* Member Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Member Payments
                </CardTitle>
                <CardDescription>
                  {paidCount} of {members.length} members have paid
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Paid On</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <MemberPaymentRow
                          key={member.id}
                          member={member}
                          canEdit={true}
                          onTogglePayment={handleTogglePayment}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Member Roles - Only visible to owner */}
            {isCurrentUserOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Member Roles
                  </CardTitle>
                  <CardDescription>
                    Admins can manage settings and payments, but cannot delete the league or change roles
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="text-right">Admin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{member.display_name}</span>
                                {member.isOwner && (
                                  <Crown className="h-4 w-4 text-yellow-500" />
                                )}
                                {member.isAdmin && !member.isOwner && (
                                  <Shield className="h-4 w-4 text-blue-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {member.isOwner ? (
                                <Badge variant="default" className="bg-yellow-500">Owner</Badge>
                              ) : member.isAdmin ? (
                                <Badge variant="secondary" className="bg-blue-500 text-white">Admin</Badge>
                              ) : (
                                <Badge variant="outline">Member</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {member.isOwner ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <Switch
                                  checked={member.isAdmin}
                                  onCheckedChange={() => handleToggleAdmin(member.id, member.isAdmin)}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Race Management - Recalculate Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Race Management
                </CardTitle>
                <CardDescription>
                  Recalculate scores after NASCAR's Monday penalty adjustments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  NASCAR sometimes adjusts finishing positions on Monday due to post-race penalties. 
                  Select a race and click Recalculate to update scores based on the latest official results.
                </p>
                
                {completedRaces.length > 0 ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={selectedRaceId} onValueChange={setSelectedRaceId}>
                      <SelectTrigger className="w-full sm:w-[250px]">
                        <SelectValue placeholder="Select a race..." />
                      </SelectTrigger>
                      <SelectContent>
                        {completedRaces.map((race) => (
                          <SelectItem key={race.race_id} value={String(race.race_id)}>
                            {race.race_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      onClick={handleRecalculateScores}
                      disabled={!selectedRaceId || recalculating !== null}
                      variant="outline"
                    >
                      {recalculating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Recalculate Scores
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No completed races to recalculate yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payout Summary Sidebar */}
          <div>
            <PayoutCard
              entryFee={parseFloat(entryFee) || 100}
              payoutFirst={parseInt(payoutFirst) || 2200}
              payoutSecond={parseInt(payoutSecond) || 800}
              payoutThird={parseInt(payoutThird) || 400}
              payoutFourth={parseInt(payoutFourth) || 200}
              membersPaid={paidCount}
              totalMembers={members.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
