import { Badge } from "@/components/ui/badge";
import { TiebreakerLevel, getTiebreakerLabel } from "@/lib/tiebreakers";
import { Equal, Trophy, Medal, Star, Target, CircleDot } from "lucide-react";

interface TiebreakerBadgeProps {
  level: TiebreakerLevel;
  showLabel?: boolean;
  size?: 'sm' | 'default';
}

const levelConfig: Record<TiebreakerLevel, { icon: typeof Trophy; variant: 'default' | 'secondary' | 'outline' }> = {
  points: { icon: Trophy, variant: 'default' },
  wins: { icon: Trophy, variant: 'secondary' },
  top5s: { icon: Medal, variant: 'secondary' },
  top10s: { icon: Star, variant: 'secondary' },
  top15s: { icon: Target, variant: 'outline' },
  top20s: { icon: CircleDot, variant: 'outline' },
  tied: { icon: Equal, variant: 'outline' },
};

export function TiebreakerBadge({ level, showLabel = false, size = 'default' }: TiebreakerBadgeProps) {
  // Don't show badge if decided by points (not a tiebreaker)
  if (level === 'points') return null;

  const config = levelConfig[level];
  const Icon = config.icon;
  const label = getTiebreakerLabel(level);

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1 ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {showLabel && <span>{level === 'tied' ? 'Tied' : `TB: ${label}`}</span>}
      {!showLabel && level !== 'tied' && <span className="text-xs">TB</span>}
    </Badge>
  );
}
