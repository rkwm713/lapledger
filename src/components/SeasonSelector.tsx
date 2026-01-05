import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SeasonSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const currentYear = new Date().getFullYear();
const SEASONS = Array.from({ length: currentYear - 2019 }, (_, i) => (currentYear - i).toString());

export function SeasonSelector({ value, onChange, disabled }: SeasonSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full sm:w-[140px]">
        <SelectValue placeholder="Select season" />
      </SelectTrigger>
      <SelectContent>
        {SEASONS.map((season) => (
          <SelectItem key={season} value={season}>
            {season}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
