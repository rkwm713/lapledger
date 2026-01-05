import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { SeriesSelector } from "@/components/SeriesSelector";
import { SeasonSelector } from "@/components/SeasonSelector";
import { RaceCard } from "@/components/RaceCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { getSeasonRaces } from "@/lib/nascar";
import type { SeriesType } from "@/lib/types";

const Index = () => {
  const [series, setSeries] = useState<SeriesType>('cup');
  const [season, setSeason] = useState(new Date().getFullYear().toString());

  const { data: races, isLoading, error } = useQuery({
    queryKey: ['races', series, season],
    queryFn: () => getSeasonRaces(series, season),
  });

  const completedRaces = races?.filter((race) => race.isComplete) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Recent Results</h1>
          <p className="text-muted-foreground">
            Browse completed NASCAR races and view detailed results.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <SeriesSelector value={series} onChange={setSeries} />
          <SeasonSelector value={season} onChange={setSeason} />
        </div>

        {isLoading && <LoadingSpinner message="Loading races..." />}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load races. Please try again.
            </p>
          </div>
        )}

        {!isLoading && !error && completedRaces.length === 0 && (
          <EmptyState
            title="No completed races found"
            description={`There are no completed races for the ${season} ${series.toUpperCase()} series yet.`}
          />
        )}

        {!isLoading && !error && completedRaces.length > 0 && (
          <div className="space-y-3">
            {completedRaces.map((race) => (
              <RaceCard key={race.raceId} race={race} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
