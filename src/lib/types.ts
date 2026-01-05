// UI-facing types for NASCAR data

export type SeriesType = 'cup' | 'xfinity' | 'trucks';

export interface TopFinisher {
  position: number;
  driverName: string;
  carNumber?: string;
}

export interface Race {
  raceId: number;
  raceName: string;
  trackName: string;
  raceDate: string;
  winner?: string;
  winnerCarNumber?: string;
  topFinishers?: TopFinisher[];
  isComplete: boolean;
}

export interface RaceResult {
  position: number;
  driverName: string;
  carNumber: string;
  lapsCompleted: number;
  status: string;
  teamName?: string;
}

export interface StageInfo {
  stageNumber: number;
  laps: number;
}

export interface RaceDetails {
  raceId: number;
  raceName: string;
  trackName: string;
  raceDate: string;
  scheduledLaps: number;
  actualLaps: number;
  winner?: RaceResult;
  results: RaceResult[];
  stages: StageInfo[];
}

export interface SearchFilters {
  series: SeriesType;
  season: string;
  raceName?: string;
  trackName?: string;
  dateFrom?: string;
  dateTo?: string;
  driverName?: string;
}
