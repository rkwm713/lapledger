import { AlertTriangle } from "lucide-react";

interface EliminationLineProps {
  position: number;
  totalPlayers: number;
  playersRemaining: number;
}

export function EliminationLine({ position, totalPlayers, playersRemaining }: EliminationLineProps) {
  // Show line after the last safe position
  if (position !== playersRemaining) return null;

  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t-2 border-dashed border-red-500/50" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-3 py-1 text-xs text-red-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Elimination Line
        </span>
      </div>
    </div>
  );
}
