import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Trophy, Medal } from "lucide-react";
import type { Race, SeriesType } from "@/lib/types";

interface RaceCardProps {
  race: Race;
  series: SeriesType;
  season: string;
}

function getPositionStyle(position: number) {
  switch (position) {
    case 1:
      return "text-yellow-500";
    case 2:
      return "text-gray-400";
    case 3:
      return "text-amber-600";
    default:
      return "text-muted-foreground";
  }
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
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
            
            {race.topFinishers && race.topFinishers.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {race.topFinishers.map((finisher) => (
                  <div key={finisher.position} className="flex items-center gap-1 text-sm">
                    {finisher.position === 1 ? (
                      <Trophy className={`h-4 w-4 ${getPositionStyle(finisher.position)}`} />
                    ) : (
                      <Medal className={`h-4 w-4 ${getPositionStyle(finisher.position)}`} />
                    )}
                    <span className="font-medium">{finisher.driverName}</span>
                    {finisher.carNumber && (
                      <span className="text-muted-foreground">(#{finisher.carNumber})</span>
                    )}
                  </div>
                ))}
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
