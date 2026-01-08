import { Book, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function RulesLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Book className="h-4 w-4" />
          Rules
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="end">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">League Rules</h4>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="scoring">
              <AccordionTrigger className="text-sm py-2">Scoring</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1">
                <p>Points are awarded based on your driver's finishing position:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>1st: 40 pts</li>
                  <li>2nd: 35 pts</li>
                  <li>3rd: 34 pts</li>
                  <li>4th-10th: 33 down to 27 pts</li>
                  <li>11th-40th: 26 down to 0 pts</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="driver-usage">
              <AccordionTrigger className="text-sm py-2">Driver Usage</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1">
                <p>Each driver can only be used <strong>twice</strong> per season.</p>
                <p className="mt-1">Choose wisely! Once you've used a driver 2 times, they're locked out for the rest of the season.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="free-picks">
              <AccordionTrigger className="text-sm py-2">Free Pick Races</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1">
                <p>Two races are designated as <strong>Free Pick Races</strong>:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>The Clash (Exhibition)</li>
                  <li>NASCAR All-Star Race</li>
                </ul>
                <p className="mt-1">Driver picks during these races do <strong>not</strong> count toward your 2-use limit.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="playoff-points">
              <AccordionTrigger className="text-sm py-2">Playoff Points</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1">
                <p>Playoff points carry over into the Chase:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Stage Win: +1 playoff point</li>
                  <li>Race Win: +5 playoff points</li>
                  <li>Regular Season Winner: +15 playoff points</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="chase">
              <AccordionTrigger className="text-sm py-2">Chase Format</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1">
                <p>The Chase playoff consists of 4 rounds:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><strong>Round of 16:</strong> 7 eliminated</li>
                  <li><strong>Round of 10:</strong> 6 eliminated</li>
                  <li><strong>Final Four Qualifier:</strong> 6 eliminated</li>
                  <li><strong>Championship:</strong> Final 4 compete</li>
                </ul>
                <p className="mt-1">Lowest playoff point totals are eliminated after each round.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tiebreakers">
              <AccordionTrigger className="text-sm py-2">Tiebreakers</AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground space-y-1">
                <p>When players are tied on points, tiebreakers apply in order:</p>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  <li>Race Wins</li>
                  <li>Top 5 Finishes</li>
                  <li>Top 10 Finishes</li>
                  <li>Top 15 Finishes</li>
                  <li>Top 20 Finishes</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </PopoverContent>
    </Popover>
  );
}
