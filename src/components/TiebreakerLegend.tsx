import { Info, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

export function TiebreakerLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Info className="h-4 w-4" />
        <span>Tiebreaker Rules</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
          <p className="font-medium">When points are tied, standings are determined by:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Most Race Wins</li>
            <li>Most Top 5 Finishes</li>
            <li>Most Top 10 Finishes</li>
            <li>Most Top 15 Finishes</li>
            <li>Most Top 20 Finishes</li>
          </ol>
          <p className="text-xs text-muted-foreground italic">
            * Going past Top 5's is rare
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
