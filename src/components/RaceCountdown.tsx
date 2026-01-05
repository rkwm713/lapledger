import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, Tv } from "lucide-react";

interface RaceCountdownProps {
  raceDate: string;
  raceName: string;
  trackName: string;
  televisionBroadcaster?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(raceDate: string): TimeLeft {
  const difference = new Date(raceDate).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }
  
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function RaceCountdown({ raceDate, raceName, trackName, televisionBroadcaster }: RaceCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(raceDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(raceDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [raceDate]);

  const formattedDate = new Date(raceDate).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  if (timeLeft.total <= 0) {
    return (
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5" />
            <span className="text-lg font-semibold">Race Starting!</span>
          </div>
          <h2 className="text-2xl font-bold">{raceName}</h2>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium uppercase tracking-wide">Next Race</span>
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold">{raceName}</h2>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {trackName}
            </span>
            {televisionBroadcaster && (
              <span className="flex items-center gap-1">
                <Tv className="h-4 w-4" />
                {televisionBroadcaster}
              </span>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground">{formattedDate}</div>
          
          <div className="grid grid-cols-4 gap-2 md:gap-4 max-w-md mx-auto">
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold tabular-nums">{timeLeft.days}</div>
              <div className="text-xs text-muted-foreground uppercase">Days</div>
            </div>
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold tabular-nums">{timeLeft.hours}</div>
              <div className="text-xs text-muted-foreground uppercase">Hours</div>
            </div>
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold tabular-nums">{timeLeft.minutes}</div>
              <div className="text-xs text-muted-foreground uppercase">Mins</div>
            </div>
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold tabular-nums">{timeLeft.seconds}</div>
              <div className="text-xs text-muted-foreground uppercase">Secs</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
