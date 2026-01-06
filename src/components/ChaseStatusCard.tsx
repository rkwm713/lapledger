import { Trophy, Users, RefreshCw, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChaseRound, CHASE_ROUND_NAMES } from "@/lib/chase-types";

interface ChaseStatusCardProps {
  currentRound: ChaseRound | null;
  playersRemaining: number;
  userStatus: 'safe' | 'at-risk' | 'eliminated' | 'not-qualified' | null;
  isRoundStart?: boolean;
}

export function ChaseStatusCard({ currentRound, playersRemaining, userStatus, isRoundStart }: ChaseStatusCardProps) {
  const roundName = currentRound 
    ? CHASE_ROUND_NAMES[currentRound.round_number] 
    : 'Regular Season';

  const roundNum = currentRound?.round_number || 0;

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
    <div className="space-y-3">
      {/* Round Start Banner */}
      {isRoundStart && roundNum > 0 && (
        <Alert className="border-primary/50 bg-primary/5">
          <RefreshCw className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>{roundName} has begun!</strong> Players are now sorted by Playoff Points. 
            Standings have been reset based on accumulated playoff points.
          </AlertDescription>
        </Alert>
      )}

      {/* Points Reset Explanation for Chase Rounds */}
      {roundNum > 0 && !isRoundStart && (
        <Alert className="border-muted bg-muted/30">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-xs text-muted-foreground">
            In Chase rounds, players are ranked by Playoff Points. Stage wins earn 1 playoff point, race wins earn 5.
          </AlertDescription>
        </Alert>
      )}

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
    </div>
  );
}
