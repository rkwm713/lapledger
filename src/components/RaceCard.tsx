import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Trophy, Medal, Tv } from "lucide-react";
import type { Race, SeriesType } from "@/lib/types";

interface RaceCardProps {
  race: Race;
  series: SeriesType;
  season: string;
}

function getPositionStyle(position: number) {
  switch (position) {
    case 1:
      return "text-nascar-yellow";
    case 2:
      return "text-gray-400";
    case 3:
      return "text-amber-600";
    default:
      return "text-muted-foreground";
  }
}

export function RaceCard({ race, series, season }: RaceCardProps) {
  const formattedDateTime = race.raceDate
    ? new Date(race.raceDate).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : 'Date TBD';

  const detailUrl = `/race/${race.raceId}?series=${series}&season=${season}`;

  return (
    <Card className="group card-hover overflow-hidden">
      {/* Hover accent stripe */}
      <div className="h-0.5 nascar-stripe opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="space-y-2 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base sm:text-lg leading-tight">{race.raceName}</h3>
              {race.isComplete && (
                <Badge variant="default" className="text-xs bg-success hover:bg-success/90 shrink-0">
                  Complete
                </Badge>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">{race.trackName}</span>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 shrink-0" />
                <span className="truncate">{formattedDateTime}</span>
              </span>
              {race.televisionBroadcaster && (
                <span className="flex items-center gap-1">
                  <Tv className="h-4 w-4 shrink-0" />
                  {race.televisionBroadcaster}
                </span>
              )}
            </div>
            
            {race.topFinishers && race.topFinishers.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                {race.topFinishers.map((finisher) => (
                  <div key={finisher.position} className="flex items-center gap-1 text-sm">
                    {finisher.position === 1 ? (
                      <Trophy className={`h-4 w-4 shrink-0 ${getPositionStyle(finisher.position)}`} />
                    ) : (
                      <Medal className={`h-4 w-4 shrink-0 ${getPositionStyle(finisher.position)}`} />
                    )}
                    <span className="font-medium truncate">{finisher.driverName}</span>
                    {finisher.carNumber && (
                      <span className="text-muted-foreground">(#{finisher.carNumber})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto sm:self-end group-hover:border-primary group-hover:text-primary transition-colors">
            <Link to={detailUrl} state={{ race, series, season }}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
