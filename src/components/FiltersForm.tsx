import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SeriesSelector } from "./SeriesSelector";
import { SeasonSelector } from "./SeasonSelector";
import type { SearchFilters, SeriesType } from "@/lib/types";

interface FiltersFormProps {
  initialFilters: SearchFilters;
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

export function FiltersForm({ initialFilters, onSearch, isLoading }: FiltersFormProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handleReset = () => {
    const defaultFilters: SearchFilters = {
      series: 'cup',
      season: new Date().getFullYear().toString(),
    };
    setFilters(defaultFilters);
    onSearch(defaultFilters);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Series *</Label>
          <SeriesSelector
            value={filters.series}
            onChange={(series) => setFilters((f) => ({ ...f, series }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Season *</Label>
          <SeasonSelector
            value={filters.season}
            onChange={(season) => setFilters((f) => ({ ...f, season }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Race Name</Label>
          <Input
            placeholder="e.g. Daytona 500"
            value={filters.raceName || ''}
            onChange={(e) => setFilters((f) => ({ ...f, raceName: e.target.value || undefined }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Track Name</Label>
          <Input
            placeholder="e.g. Daytona"
            value={filters.trackName || ''}
            onChange={(e) => setFilters((f) => ({ ...f, trackName: e.target.value || undefined }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Date From</Label>
          <Input
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Date To</Label>
          <Input
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Winner Name</Label>
          <Input
            placeholder="e.g. Kyle Larson"
            value={filters.driverName || ''}
            onChange={(e) => setFilters((f) => ({ ...f, driverName: e.target.value || undefined }))}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}
