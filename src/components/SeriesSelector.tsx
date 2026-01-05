import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SeriesType } from "@/lib/types";

interface SeriesSelectorProps {
  value: SeriesType;
  onChange: (value: SeriesType) => void;
}

const SERIES_OPTIONS = [
  { value: 'cup', label: 'NASCAR Cup Series' },
  { value: 'xfinity', label: 'NASCAR Xfinity Series' },
  { value: 'trucks', label: 'NASCAR Craftsman Truck Series' },
] as const;

export function SeriesSelector({ value, onChange }: SeriesSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SeriesType)}>
      <SelectTrigger className="w-full sm:w-[240px]">
        <SelectValue placeholder="Select series" />
      </SelectTrigger>
      <SelectContent>
        {SERIES_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
