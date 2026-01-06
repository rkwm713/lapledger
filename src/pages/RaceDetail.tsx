import { Link, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { ResultsTable } from "@/components/ResultsTable";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { RacePicksSummary } from "@/components/RacePicksSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Trophy, Flag, Clock, Users } from "lucide-react";
import { getRaceDetails, getSeasonRaces } from "@/lib/nascar";
import type { SeriesType, Race } from "@/lib/types";

const RaceDetail = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const series = (searchParams.get('series') as SeriesType) || 'cup';
  const season = searchParams.get('season') || new Date().getFullYear().toString();
  const leagueId = searchParams.get('leagueId');
  
  // Get race info from navigation state if available
  const stateRace = location.state?.race as Race | undefined;

  const { data: raceDetails, isLoading, error } = useQuery({
    queryKey: ['race', raceId, series, season],
    queryFn: () => getRaceDetails(raceId!, series, season),
    enabled: !!raceId,
  });

  // Fallback: fetch race list if we don't have state data
  const { data: racesForFallback } = useQuery({
    queryKey: ['races', series, season],
    queryFn: () => getSeasonRaces(series, season),
    enabled: !stateRace && !!raceId,
  });

  // Find race info from fallback list
  const fallbackRace = racesForFallback?.find(r => r.raceId === Number(raceId));
  const raceInfo = stateRace || fallbackRace;

  // Merge data: prefer raceDetails if it has valid data, otherwise use raceInfo
  const raceName = (raceDetails?.raceName && raceDetails.raceName !== '') 
    ? raceDetails.raceName 
    : raceInfo?.raceName || 'Unknown Race';
  
  const trackName = (raceDetails?.trackName && raceDetails.trackName !== '') 
    ? raceDetails.trackName 
    : raceInfo?.trackName || 'Unknown Track';
  
  const raceDate = raceDetails?.raceDate || raceInfo?.raceDate || '';
  
  const isFutureRace = raceDetails?.isFutureRace || (!raceInfo?.isComplete && new Date(raceDate) > new Date());

  const formattedDateTime = raceDate
    ? new Date(raceDate).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
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

        {!isLoading && !error && !raceDetails && !raceInfo && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Race not found.</p>
          </div>
        )}

        {(raceDetails || raceInfo) && (
          <>
            {/* Header */}
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">{raceName}</h1>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {trackName}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formattedDateTime}
                </span>
                {raceDetails && raceDetails.actualLaps > 0 && (
                  <span className="flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    {raceDetails.actualLaps} / {raceDetails.scheduledLaps} laps
                  </span>
                )}
              </div>
            </div>

            {/* Future Race Notice */}
            {isFutureRace && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="py-6">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">Upcoming Race</p>
                      <p className="text-sm text-muted-foreground">
                        Results will be available after the race is complete. Check back after the race on {formattedDateTime}.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Winner Card */}
            {raceDetails?.winner && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Race Winner
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">{raceDetails.winner.driverName}</span>
                    {raceDetails.winner.carNumber && (
                      <Badge variant="secondary">#{raceDetails.winner.carNumber}</Badge>
                    )}
                  </div>
                  {raceDetails.winner.teamName && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {raceDetails.winner.teamName}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stage Info */}
            {raceDetails && raceDetails.stages.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Stage Lap Counts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {raceDetails.stages.map((stage) => (
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
            {raceDetails && raceDetails.results.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Finishing Order</h2>
                <ResultsTable results={raceDetails.results} />
              </div>
            )}

            {!isFutureRace && raceDetails?.results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Results not available for this race.</p>
              </div>
            )}

            {/* League Picks Summary */}
            {leagueId && raceId && !isFutureRace && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    League Picks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RacePicksSummary
                    leagueId={leagueId}
                    raceId={parseInt(raceId)}
                    season={parseInt(season)}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default RaceDetail;
