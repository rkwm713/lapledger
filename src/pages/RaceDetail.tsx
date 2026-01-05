import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { ResultsTable } from "@/components/ResultsTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Trophy, Flag } from "lucide-react";
import { getRaceDetails } from "@/lib/nascar";

const RaceDetail = () => {
  const { raceId } = useParams<{ raceId: string }>();

  const { data: race, isLoading, error } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => getRaceDetails(raceId!),
    enabled: !!raceId,
  });

  const formattedDate = race?.raceDate
    ? new Date(race.raceDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-6 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Link>
        </Button>

        {isLoading && <LoadingSpinner message="Loading race details..." />}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Failed to load race details. Please try again.
            </p>
          </div>
        )}

        {!isLoading && !error && !race && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Race not found.</p>
          </div>
        )}

        {race && (
          <>
            {/* Header */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">{race.raceName}</h1>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {race.trackName}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formattedDate}
                </span>
                {race.actualLaps > 0 && (
                  <span className="flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    {race.actualLaps} / {race.scheduledLaps} laps
                  </span>
                )}
              </div>
            </div>

            {/* Winner Card */}
            {race.winner && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Race Winner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{race.winner.driverName}</span>
                    {race.winner.carNumber && (
                      <Badge variant="secondary">#{race.winner.carNumber}</Badge>
                    )}
                  </div>
                  {race.winner.teamName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {race.winner.teamName}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stage Info */}
            {race.stages.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Stage Lap Counts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {race.stages.map((stage) => (
                      <div key={stage.stageNumber} className="text-center">
                        <div className="text-sm text-muted-foreground">
                          Stage {stage.stageNumber}
                        </div>
                        <div className="text-lg font-semibold">{stage.laps} laps</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Table */}
            {race.results.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Finishing Order</h2>
                <ResultsTable results={race.results} />
              </div>
            )}

            {race.results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Results not available for this race.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default RaceDetail;
