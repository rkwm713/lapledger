import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { FiltersForm } from "@/components/FiltersForm";
import { RaceCard } from "@/components/RaceCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { searchRaces } from "@/lib/nascar";
import type { SearchFilters, SeriesType } from "@/lib/types";

function parseFiltersFromParams(params: URLSearchParams): SearchFilters {
  return {
    series: (params.get('series') as SeriesType) || 'cup',
    season: params.get('season') || new Date().getFullYear().toString(),
    raceName: params.get('raceName') || undefined,
    trackName: params.get('trackName') || undefined,
    dateFrom: params.get('dateFrom') || undefined,
    dateTo: params.get('dateTo') || undefined,
    driverName: params.get('driverName') || undefined,
  };
}

function filtersToParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set('series', filters.series);
  params.set('season', filters.season);
  if (filters.raceName) params.set('raceName', filters.raceName);
  if (filters.trackName) params.set('trackName', filters.trackName);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.driverName) params.set('driverName', filters.driverName);
  return params;
}

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<SearchFilters>(() => 
    parseFiltersFromParams(searchParams)
  );
  const [hasSearched, setHasSearched] = useState(false);

  const { data: races, isLoading, error, refetch } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => searchRaces(filters),
    enabled: hasSearched,
  });

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setSearchParams(filtersToParams(newFilters));
    setHasSearched(true);
  };

  // Auto-search if URL has params
  useEffect(() => {
    if (searchParams.has('series') && searchParams.has('season')) {
      setHasSearched(true);
    }
  }, []);

  useEffect(() => {
    if (hasSearched) {
      refetch();
    }
  }, [filters, hasSearched, refetch]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Search Races</h1>
          <p className="text-muted-foreground">
            Find races by series, season, track, or driver.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <FiltersForm
            initialFilters={filters}
            onSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>

        {isLoading && <LoadingSpinner message="Searching races..." />}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">
              Search failed. Please try again.
            </p>
          </div>
        )}

        {hasSearched && !isLoading && !error && races?.length === 0 && (
          <EmptyState
            title="No races found"
            description="Try adjusting your search filters."
          />
        )}

        {!isLoading && !error && races && races.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Found {races.length} race{races.length !== 1 ? 's' : ''}
            </p>
            {races.map((race) => (
              <RaceCard key={race.raceId} race={race} />
            ))}
          </div>
        )}

        {!hasSearched && !isLoading && (
          <EmptyState
            title="Start your search"
            description="Use the filters above to find NASCAR races."
          />
        )}
      </main>
    </div>
  );
};

export default Search;
