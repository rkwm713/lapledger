import { Trophy, Users, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChaseRound, CHASE_ROUND_NAMES } from "@/lib/chase-types";

interface ChaseStatusCardProps {
  currentRound: ChaseRound | null;
  playersRemaining: number;
  userStatus: 'safe' | 'at-risk' | 'eliminated' | 'not-qualified' | null;
}

export function ChaseStatusCard({ currentRound, playersRemaining, userStatus }: ChaseStatusCardProps) {
  const roundName = currentRound 
    ? CHASE_ROUND_NAMES[currentRound.round_number] 
    : 'Regular Season';

  const getStatusBadge = () => {
    switch (userStatus) {
      case 'safe':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Safe</Badge>;
      case 'at-risk':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">At Risk</Badge>;
      case 'eliminated':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Eliminated</Badge>;
      case 'not-qualified':
        return <Badge variant="secondary">Not Qualified</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chase Status</p>
              <p className="font-semibold">{roundName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm">{playersRemaining} remaining</span>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
