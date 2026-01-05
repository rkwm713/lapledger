import type { Race, RaceDetails, RaceResult, StageInfo, SeriesType, SearchFilters, TopFinisher } from "./types";

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

// Extract winner name from race_comments field (e.g., "Christopher Bell has won...")
function extractWinnerFromComments(comments: unknown): string | undefined {
  if (!comments || typeof comments !== 'string') return undefined;
  // Match patterns like "Driver Name has won", "Driver Name wins", "Driver Name won"
  const match = comments.match(/^([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+)+)\s+(?:has\s+won|wins|won)/);
  return match?.[1];
}

// Transform raw API race data to our Race type (from race_list_basic.json)
function transformRace(raw: Record<string, unknown>): Race {
  // A race is complete if it has completed laps AND a winner
  const hasCompletedLaps = Number(raw.actual_laps || 0) > 0;
  const hasWinner = Number(raw.winner_driver_id || 0) > 0;
  const isComplete = hasCompletedLaps && hasWinner;
  
  // Try to extract winner from race_comments
  const winner = extractWinnerFromComments(raw.race_comments);
  
  return {
    raceId: Number(raw.race_id || 0),
    raceName: String(raw.race_name || 'Unknown Race'),
    trackName: String(raw.track_name || 'Unknown Track'),
    raceDate: String(raw.race_date || ''),
    winner,
    winnerCarNumber: undefined,
    isComplete,
  };
}

// Transform raw result data to our RaceResult type (from weekend-feed.json)
function transformResult(raw: Record<string, unknown>): RaceResult {
  const rawStatus = String(raw.finishing_status || 'Running');
  // "Running" means completed normally - display as "Finished" for clarity
  const status = rawStatus === 'Running' ? 'Finished' : rawStatus;
  
  return {
    position: Number(raw.finishing_position || 0),
    driverName: String(raw.driver_fullname || 'Unknown'),
    carNumber: String(raw.car_number || raw.official_car_number || ''),
    lapsCompleted: Number(raw.laps_completed || 0),
    status,
    teamName: raw.team_name ? String(raw.team_name) : undefined,
  };
}

// Fetch top 3 finishers for a specific race
async function fetchTopFinishers(raceId: number, series: SeriesType, season: string): Promise<TopFinisher[]> {
  try {
    const data = await callProxy('racedetails', { raceId: String(raceId), series, season }) as Record<string, unknown>;
    
    if (!data || typeof data !== 'object') return [];
    
    const weekendRace = (data.weekend_race as Record<string, unknown>[]) || [];
    const raceData = weekendRace[0] || data;
    
    if (!raceData || typeof raceData !== 'object') return [];
    
    const rawResults = (raceData.results || []) as Record<string, unknown>[];
    
    if (!Array.isArray(rawResults)) return [];
    
    // Get top 3 finishers
    return rawResults
      .map(transformResult)
      .filter(r => r.position > 0 && r.position <= 3)
      .sort((a, b) => a.position - b.position)
      .map(r => ({
        position: r.position,
        driverName: r.driverName,
        carNumber: r.carNumber || undefined,
      }));
  } catch (error) {
    console.warn(`Failed to fetch top finishers for race ${raceId}:`, error);
    return [];
  }
}

export async function getSeasonRaces(series: SeriesType, season: string): Promise<Race[]> {
  const data = await callProxy('racelist', { series, season });
  
  if (!Array.isArray(data)) {
    console.error('Invalid race list response:', data);
    return [];
  }

  const races = data.map((raw: Record<string, unknown>) => transformRace(raw));
  
  // Sort races: upcoming races first (chronologically), then completed races (most recent first)
  const now = new Date();
  races.sort((a, b) => {
    const dateA = new Date(a.raceDate);
    const dateB = new Date(b.raceDate);
    const aIsUpcoming = dateA > now && !a.isComplete;
    const bIsUpcoming = dateB > now && !b.isComplete;
    
    // Both upcoming: sort chronologically (soonest first)
    if (aIsUpcoming && bIsUpcoming) {
      return dateA.getTime() - dateB.getTime();
    }
    // Both completed: sort reverse chronologically (most recent first)  
    if (!aIsUpcoming && !bIsUpcoming) {
      return dateB.getTime() - dateA.getTime();
    }
    // Upcoming races come before completed
    return aIsUpcoming ? -1 : 1;
  });

  // Fetch top finishers for completed races (limit to last 10 for performance)
  const completedRaces = races.filter(r => r.isComplete).slice(0, 10);
  const topFinishersPromises = completedRaces.map(race => 
    fetchTopFinishers(race.raceId, series, season).catch(() => [])
  );
  
  const topFinishersResults = await Promise.all(topFinishersPromises);
  
  completedRaces.forEach((race, index) => {
    race.topFinishers = topFinishersResults[index];
  });

  return races;
}

export async function getRaceDetails(raceId: string, series: SeriesType = 'cup', season: string = new Date().getFullYear().toString()): Promise<RaceDetails | null> {
  const data = await callProxy('racedetails', { raceId, series, season }) as Record<string, unknown>;
  
  if (!data || typeof data !== 'object') {
    console.warn('Unexpected racedetails response format:', data);
    return null;
  }
  
  // Check if this is a "not available yet" response for future races
  const isFutureRace = data.message === 'Race data not available yet - race may not have occurred';
  
  // The weekend-feed.json has a weekend_race array
  const weekendRace = (data.weekend_race as Record<string, unknown>[]) || [];
  const raceData = weekendRace[0] || data;
  
  if (!raceData || typeof raceData !== 'object') {
    console.warn('No race data found in response');
    return null;
  }
  
  const rawResults = (raceData.results || []) as Record<string, unknown>[];
  
  // Transform and sort results by finishing position
  const results = Array.isArray(rawResults) 
    ? rawResults
        .map(transformResult)
        .filter(r => r.position > 0) // Filter out non-finishers (position 0)
        .sort((a, b) => a.position - b.position)
    : [];
  
  // Build stage info from the race data
  const stages: StageInfo[] = [];
  const stage1Laps = Number(raceData.stage_1_laps || 0);
  const stage2Laps = Number(raceData.stage_2_laps || 0);
  const stage3Laps = Number(raceData.stage_3_laps || 0);
  
  if (stage1Laps > 0) stages.push({ stageNumber: 1, laps: stage1Laps });
  if (stage2Laps > 0) stages.push({ stageNumber: 2, laps: stage2Laps });
  if (stage3Laps > 0) stages.push({ stageNumber: 3, laps: stage3Laps });
  
  const winner = results.find(r => r.position === 1);
  
  return {
    raceId: Number(raceData.race_id || raceId),
    raceName: String(raceData.race_name || ''),
    trackName: String(raceData.track_name || ''),
    raceDate: String(raceData.race_date || ''),
    scheduledLaps: Number(raceData.scheduled_laps || 0),
    actualLaps: Number(raceData.actual_laps || 0),
    winner,
    results,
    stages,
    isFutureRace,
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
    
    // Note: Winner name filtering requires fetching each race's details
    // For now, we skip this filter in the basic search
    
    return true;
  });
}
