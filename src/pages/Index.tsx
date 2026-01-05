import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { SeriesSelector } from "@/components/SeriesSelector";
import { SeasonSelector } from "@/components/SeasonSelector";
import { RaceCard } from "@/components/RaceCard";
import { RaceCountdown } from "@/components/RaceCountdown";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { getSeasonRaces } from "@/lib/nascar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SeriesType } from "@/lib/types";

const Index = () => {
  const [series, setSeries] = useState<SeriesType>('cup');
  const [season, setSeason] = useState(new Date().getFullYear().toString());

  const { data: races, isLoading, error } = useQuery({
    queryKey: ['races', series, season],
    queryFn: () => getSeasonRaces(series, season),
  });

  const completedRaces = races?.filter((race) => race.isComplete) || [];
  const upcomingRaces = races?.filter((race) => !race.isComplete) || [];
  const nextRace = upcomingRaces[0];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-6 md:py-8 space-y-6 md:space-y-8 px-4">
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Race Schedule</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Browse NASCAR races and view detailed results.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <SeriesSelector value={series} onChange={setSeries} />
          <SeasonSelector value={season} onChange={setSeason} />
        </div>

        {isLoading && <LoadingSpinner message="Loading races..." />}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load races. Please try again.
            </p>
          </div>
        )}

        {!isLoading && !error && (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingRaces.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedRaces.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6 space-y-6">
              {nextRace && (
                <RaceCountdown
                  raceDate={nextRace.raceDate}
                  raceName={nextRace.raceName}
                  trackName={nextRace.trackName}
                  televisionBroadcaster={nextRace.televisionBroadcaster}
                />
              )}
              {upcomingRaces.length === 0 ? (
                <EmptyState
                  title="No upcoming races"
                  description={`All races for the ${season} ${series.toUpperCase()} series have been completed.`}
                />
              ) : (
                <div className="space-y-4">
                  {upcomingRaces.map((race) => (
                    <RaceCard key={race.raceId} race={race} series={series} season={season} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedRaces.length === 0 ? (
                <EmptyState
                  title="No completed races found"
                  description={`There are no completed races for the ${season} ${series.toUpperCase()} series yet.`}
                />
              ) : (
                <div className="space-y-4">
                  {completedRaces.map((race) => (
                    <RaceCard key={race.raceId} race={race} series={series} season={season} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;
