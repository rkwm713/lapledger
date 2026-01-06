import { Trophy, Crown, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChasePlayer, CHASE_ROUND_NAMES, CHASE_ROUND_REMAINING } from "@/lib/chase-types";
import { cn } from "@/lib/utils";

interface ChaseBracketProps {
  players: ChasePlayer[];
  currentRound: number;
  eliminations: Map<number, ChasePlayer[]>; // round -> eliminated players
}

export function ChaseBracket({ players, currentRound, eliminations }: ChaseBracketProps) {
  const rounds = [
    { round: 1, title: "Round of 16", spots: 16 },
    { round: 2, title: "Round of 10", spots: 10 },
    { round: 3, title: "Final Four", spots: 4 },
    { round: 4, title: "Champion", spots: 1 },
  ];

  const getPlayersForRound = (roundNumber: number): ChasePlayer[] => {
    // Players who made it to this round (not eliminated before it)
    return players.filter(p => {
      if (!p.is_eliminated) return true;
      return (p.elimination_round ?? 0) >= roundNumber;
    });
  };

  const getRoundStatus = (roundNumber: number) => {
    if (roundNumber < currentRound) return 'completed';
    if (roundNumber === currentRound) return 'active';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      {/* Final Four Spotlight */}
      {currentRound >= 3 && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Final Four
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {players
                .filter(p => !p.is_eliminated || (p.elimination_round ?? 0) >= 4)
                .slice(0, 4)
                .map((player, idx) => (
                  <div
                    key={player.user_id}
                    className={cn(
                      "flex flex-col items-center p-4 rounded-lg border",
                      idx === 0 && currentRound === 4 
                        ? "bg-yellow-500/20 border-yellow-500/50" 
                        : "bg-card/50 border-border/50"
                    )}
                  >
                    <Avatar className="h-12 w-12 mb-2">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback>{player.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm text-center">{player.display_name}</span>
                    <span className="text-xs text-muted-foreground">{player.playoff_points} pts</span>
                    {idx === 0 && currentRound === 4 && (
                      <Crown className="h-4 w-4 text-yellow-500 mt-1" />
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bracket Rounds */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {rounds.map(({ round, title, spots }) => {
          const status = getRoundStatus(round);
          const roundPlayers = getPlayersForRound(round);
          const eliminated = eliminations.get(round) || [];

          return (
            <Card
              key={round}
              className={cn(
                "transition-all",
                status === 'active' && "ring-2 ring-primary",
                status === 'completed' && "opacity-75",
                status === 'upcoming' && "opacity-50"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{title}</CardTitle>
                  <Badge
                    variant={status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {status === 'active' ? 'Current' : status === 'completed' ? 'Done' : 'Upcoming'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{spots} players</p>
              </CardHeader>
              <CardContent className="space-y-1 max-h-48 overflow-y-auto">
                {roundPlayers.slice(0, spots).map((player, idx) => (
                  <div
                    key={player.user_id}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded text-xs",
                      player.is_eliminated && player.elimination_round === round
                        ? "bg-red-500/10 text-red-400"
                        : "bg-muted/30"
                    )}
                  >
                    <span className="w-4 text-muted-foreground">{idx + 1}</span>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {player.display_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1">{player.display_name}</span>
                    {player.is_wild_card && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">WC</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
