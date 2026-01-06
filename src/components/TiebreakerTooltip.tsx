import { Trophy, Medal, Star, Target, CircleDot } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TiebreakerStats, TiebreakerLevel } from "@/lib/tiebreakers";

interface TiebreakerTooltipProps {
  stats: TiebreakerStats;
  decidingLevel?: TiebreakerLevel;
  children: React.ReactNode;
}

const statConfig = [
  { key: 'race_wins' as const, label: 'Race Wins', icon: Trophy, level: 'wins' as TiebreakerLevel },
  { key: 'top_5s' as const, label: 'Top 5s', icon: Medal, level: 'top5s' as TiebreakerLevel },
  { key: 'top_10s' as const, label: 'Top 10s', icon: Star, level: 'top10s' as TiebreakerLevel },
  { key: 'top_15s' as const, label: 'Top 15s', icon: Target, level: 'top15s' as TiebreakerLevel },
  { key: 'top_20s' as const, label: 'Top 20s', icon: CircleDot, level: 'top20s' as TiebreakerLevel },
];

export function TiebreakerTooltip({ stats, decidingLevel, children }: TiebreakerTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-[200px]">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tiebreaker Stats
            </p>
            <div className="space-y-1">
              {statConfig.map(({ key, label, icon: Icon, level }) => {
                const isDeciding = decidingLevel === level;
                return (
                  <div 
                    key={key} 
                    className={`flex items-center justify-between text-sm ${
                      isDeciding ? 'text-primary font-semibold' : ''
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                    <span className="flex items-center gap-1">
                      {stats[key]}
                      {isDeciding && <Star className="h-3 w-3 fill-primary text-primary" />}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
