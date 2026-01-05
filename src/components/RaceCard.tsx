import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Trophy } from "lucide-react";
import type { Race, SeriesType } from "@/lib/types";

interface RaceCardProps {
  race: Race;
  series: SeriesType;
  season: string;
}

export function RaceCard({ race, series, season }: RaceCardProps) {
  const formattedDate = race.raceDate
    ? new Date(race.raceDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';

  const detailUrl = `/race/${race.raceId}?series=${series}&season=${season}`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">{race.raceName}</h3>
              {race.isComplete && (
                <Badge variant="secondary" className="text-xs">Complete</Badge>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {race.trackName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formattedDate}
              </span>
            </div>
            
            {race.winner && (
              <div className="flex items-center gap-1 text-sm">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{race.winner}</span>
                {race.winnerCarNumber && (
                  <span className="text-muted-foreground">(#{race.winnerCarNumber})</span>
                )}
              </div>
            )}
          </div>
          
          <Button asChild variant="outline" size="sm">
            <Link to={detailUrl}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
