import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Tv, CloudRain } from "lucide-react";

interface RaceCountdownProps {
  raceDate: string;
  raceName: string;
  trackName: string;
  televisionBroadcaster?: string;
  isDelayed?: boolean;
  delayReason?: string;
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

export function RaceCountdown({ raceDate, raceName, trackName, televisionBroadcaster, isDelayed, delayReason }: RaceCountdownProps) {
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

  // Show delay banner if race is delayed
  if (isDelayed) {
    return (
      <Card className="bg-blue-600 text-white overflow-hidden">
        <div className="h-1 nascar-stripe" />
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CloudRain className="h-5 w-5" />
            <span className="text-base sm:text-lg font-semibold">{delayReason || 'Race Delayed'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">{raceName}</h2>
          <p className="text-sm mt-2 text-blue-100">Check back for updated start time</p>
        </CardContent>
      </Card>
    );
  }

  if (timeLeft.total <= 0) {
    return (
      <Card className="bg-nascar-red text-white overflow-hidden">
        <div className="h-1 nascar-stripe" />
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="h-5 w-5 animate-pulse" />
            <span className="text-base sm:text-lg font-semibold">Race Starting!</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">{raceName}</h2>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* NASCAR Stripe accent */}
      <div className="h-1 nascar-stripe" />
      
      <CardContent className="p-4 sm:p-6 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex items-center justify-center gap-2 text-primary">
            <Clock className="h-4 w-4" />
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide">Next Race</span>
          </div>
          
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">{raceName}</h2>
          
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
            <span className="flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" />
              {trackName}
            </span>
            {televisionBroadcaster && (
              <span className="flex items-center justify-center gap-1">
                <Tv className="h-4 w-4" />
                {televisionBroadcaster}
              </span>
            )}
          </div>
          
          <div className="text-xs sm:text-sm text-muted-foreground">{formattedDate}</div>
          
          <div className="grid grid-cols-4 gap-2 max-w-sm sm:max-w-md mx-auto">
            <div className="bg-card rounded-lg p-2 sm:p-3 shadow-card border">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums text-primary">{timeLeft.days}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium">Days</div>
            </div>
            <div className="bg-card rounded-lg p-2 sm:p-3 shadow-card border">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums text-primary">{timeLeft.hours}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium">Hours</div>
            </div>
            <div className="bg-card rounded-lg p-2 sm:p-3 shadow-card border">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums text-primary">{timeLeft.minutes}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium">Mins</div>
            </div>
            <div className="bg-card rounded-lg p-2 sm:p-3 shadow-card border">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold tabular-nums text-nascar-red">{timeLeft.seconds}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase font-medium">Secs</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
