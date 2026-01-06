import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal } from 'lucide-react';

interface PayoutCardProps {
  entryFee: number;
  payoutFirst: number;
  payoutSecond: number;
  payoutThird: number;
  payoutFourth: number;
  membersPaid?: number;
  totalMembers?: number;
}

export function PayoutCard({
  entryFee,
  payoutFirst,
  payoutSecond,
  payoutThird,
  payoutFourth,
  membersPaid,
  totalMembers
}: PayoutCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalPrizePool = payoutFirst + payoutSecond + payoutThird + payoutFourth;

  const payouts = [
    { place: '1st', amount: payoutFirst, icon: Trophy, color: 'text-yellow-500' },
    { place: '2nd', amount: payoutSecond, icon: Medal, color: 'text-gray-400' },
    { place: '3rd', amount: payoutThird, icon: Medal, color: 'text-amber-600' },
    { place: '4th', amount: payoutFourth, icon: Medal, color: 'text-muted-foreground' }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Prize Pool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-2 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Prize Pool</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPrizePool)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {payouts.map(({ place, amount, icon: Icon, color }) => (
            <div 
              key={place}
              className="flex items-center gap-2 p-2 bg-muted/30 rounded-md"
            >
              <Icon className={`h-4 w-4 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{place} Place</p>
                <p className="font-semibold">{formatCurrency(amount)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entry Fee</span>
            <span className="font-medium">{formatCurrency(entryFee)}</span>
          </div>
          {membersPaid !== undefined && totalMembers !== undefined && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payments Received</span>
              <span className="font-medium">{membersPaid} / {totalMembers}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
