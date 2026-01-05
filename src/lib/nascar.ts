import { supabase } from "@/integrations/supabase/client";
import type { Race, RaceDetails, RaceResult, StageInfo, SeriesType, SearchFilters } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

async function callProxy(action: string, params: Record<string, string>): Promise<unknown> {
  const searchParams = new URLSearchParams({ action, ...params });
  const url = `${SUPABASE_URL}/functions/v1/nascar-proxy?${searchParams}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }
  
  return response.json();
}

// Transform raw API race data to our Race type
function transformRace(raw: Record<string, unknown>): Race {
  return {
    raceId: Number(raw.race_id || raw.RaceId || 0),
    raceName: String(raw.race_name || raw.RaceName || 'Unknown Race'),
    trackName: String(raw.track_name || raw.TrackName || 'Unknown Track'),
    raceDate: String(raw.race_date || raw.RaceDate || ''),
    winner: raw.winner_name ? String(raw.winner_name) : undefined,
    winnerCarNumber: raw.winner_car_number ? String(raw.winner_car_number) : undefined,
    isComplete: Boolean(raw.is_complete || raw.IsComplete || raw.run_type === 2),
  };
}

// Transform raw result data to our RaceResult type
function transformResult(raw: Record<string, unknown>): RaceResult {
  return {
    position: Number(raw.finishing_position || raw.FinishingPosition || raw.position || 0),
    driverName: String(raw.driver_name || raw.DriverName || raw.full_name || 'Unknown'),
    carNumber: String(raw.car_number || raw.CarNumber || raw.vehicle_number || ''),
    lapsCompleted: Number(raw.laps_completed || raw.LapsCompleted || raw.laps || 0),
    status: String(raw.finishing_status || raw.FinishingStatus || raw.status || 'Running'),
    teamName: raw.team_name ? String(raw.team_name) : undefined,
  };
}

export async function getSeasonRaces(series: SeriesType, season: string): Promise<Race[]> {
  const data = await callProxy('racelist', { series, season }) as Record<string, unknown>[];
  
  if (!Array.isArray(data)) {
    console.warn('Unexpected racelist response format:', data);
    return [];
  }
  
  return data
    .map(transformRace)
    .sort((a, b) => new Date(b.raceDate).getTime() - new Date(a.raceDate).getTime());
}

export async function getRaceDetails(raceId: string): Promise<RaceDetails | null> {
  const data = await callProxy('racedetails', { raceId }) as Record<string, unknown>;
  
  if (!data || typeof data !== 'object') {
    console.warn('Unexpected racedetails response format:', data);
    return null;
  }
  
  // Handle different API response structures
  const raceInfo = (data.race_info || data.RaceInfo || data) as Record<string, unknown>;
  const rawResults = (data.results || data.Results || data.finishing_order || []) as Record<string, unknown>[];
  const stageData = (data.stages || data.Stages || data.stage_results || []) as Record<string, unknown>[];
  
  const results = Array.isArray(rawResults) 
    ? rawResults.map(transformResult).sort((a, b) => a.position - b.position)
    : [];
  
  const stages: StageInfo[] = Array.isArray(stageData)
    ? stageData.map((s, i) => ({
        stageNumber: Number(s.stage_number || s.StageNumber || i + 1),
        laps: Number(s.laps || s.Laps || s.stage_laps || 0),
      }))
    : [];
  
  const winner = results.find(r => r.position === 1);
  
  return {
    raceId: Number(raceInfo.race_id || raceInfo.RaceId || raceId),
    raceName: String(raceInfo.race_name || raceInfo.RaceName || data.race_name || 'Unknown Race'),
    trackName: String(raceInfo.track_name || raceInfo.TrackName || data.track_name || 'Unknown Track'),
    raceDate: String(raceInfo.race_date || raceInfo.RaceDate || data.race_date || ''),
    scheduledLaps: Number(raceInfo.scheduled_laps || raceInfo.ScheduledLaps || data.scheduled_laps || 0),
    actualLaps: Number(raceInfo.actual_laps || raceInfo.ActualLaps || data.actual_laps || 0),
    winner,
    results,
    stages,
  };
}

export async function searchRaces(filters: SearchFilters): Promise<Race[]> {
  // Get all races for the season/series first
  const races = await getSeasonRaces(filters.series, filters.season);
  
  return races.filter(race => {
    // Filter by race name
    if (filters.raceName && !race.raceName.toLowerCase().includes(filters.raceName.toLowerCase())) {
      return false;
    }
    
    // Filter by track name
    if (filters.trackName && !race.trackName.toLowerCase().includes(filters.trackName.toLowerCase())) {
      return false;
    }
    
    // Filter by date range
    if (filters.dateFrom) {
      const raceDate = new Date(race.raceDate);
      const fromDate = new Date(filters.dateFrom);
      if (raceDate < fromDate) return false;
    }
    
    if (filters.dateTo) {
      const raceDate = new Date(race.raceDate);
      const toDate = new Date(filters.dateTo);
      if (raceDate > toDate) return false;
    }
    
    // Filter by winner name (if available)
    if (filters.driverName && race.winner) {
      if (!race.winner.toLowerCase().includes(filters.driverName.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  });
}
