// Tiebreaker utility functions for consistent sorting across the app

export interface TiebreakerStats {
  race_wins: number;
  top_5s: number;
  top_10s: number;
  top_15s: number;
  top_20s: number;
}

export interface PlayerWithStats extends TiebreakerStats {
  regular_season_points?: number;
  playoff_points?: number;
  total_points?: number;
}

export type TiebreakerLevel = 'points' | 'wins' | 'top5s' | 'top10s' | 'top15s' | 'top20s' | 'tied';

/**
 * Compares two players and returns which tiebreaker level determined the order
 */
export function getTiebreakerLevel<T extends PlayerWithStats>(
  playerA: T,
  playerB: T,
  usePlayoffPoints = false
): TiebreakerLevel {
  const pointsA = usePlayoffPoints 
    ? (playerA.playoff_points ?? 0) 
    : (playerA.regular_season_points ?? playerA.total_points ?? 0);
  const pointsB = usePlayoffPoints 
    ? (playerB.playoff_points ?? 0) 
    : (playerB.regular_season_points ?? playerB.total_points ?? 0);

  if (pointsA !== pointsB) return 'points';
  if (playerA.race_wins !== playerB.race_wins) return 'wins';
  if (playerA.top_5s !== playerB.top_5s) return 'top5s';
  if (playerA.top_10s !== playerB.top_10s) return 'top10s';
  if (playerA.top_15s !== playerB.top_15s) return 'top15s';
  if (playerA.top_20s !== playerB.top_20s) return 'top20s';
  return 'tied';
}

/**
 * Returns the human-readable label for a tiebreaker level
 */
export function getTiebreakerLabel(level: TiebreakerLevel): string {
  switch (level) {
    case 'points': return 'Points';
    case 'wins': return 'Race Wins';
    case 'top5s': return 'Top 5s';
    case 'top10s': return 'Top 10s';
    case 'top15s': return 'Top 15s';
    case 'top20s': return 'Top 20s';
    case 'tied': return 'Tied';
  }
}

/**
 * Checks if two players are tied at all tiebreaker levels
 */
export function arePlayersTied<T extends PlayerWithStats>(
  playerA: T,
  playerB: T,
  usePlayoffPoints = false
): boolean {
  return getTiebreakerLevel(playerA, playerB, usePlayoffPoints) === 'tied';
}

/**
 * Sorts players using the full tiebreaker cascade
 * Order: Points → Wins → Top 5s → Top 10s → Top 15s → Top 20s
 */
export function sortByTiebreakers<T extends PlayerWithStats>(
  players: T[],
  usePlayoffPoints = false
): T[] {
  return [...players].sort((a, b) => {
    // Primary: Points
    const pointsA = usePlayoffPoints 
      ? (a.playoff_points ?? 0) 
      : (a.regular_season_points ?? a.total_points ?? 0);
    const pointsB = usePlayoffPoints 
      ? (b.playoff_points ?? 0) 
      : (b.regular_season_points ?? b.total_points ?? 0);
    if (pointsB !== pointsA) return pointsB - pointsA;

    // Tiebreaker 1: Race Wins
    if (b.race_wins !== a.race_wins) return b.race_wins - a.race_wins;

    // Tiebreaker 2: Top 5s
    if (b.top_5s !== a.top_5s) return b.top_5s - a.top_5s;

    // Tiebreaker 3: Top 10s
    if (b.top_10s !== a.top_10s) return b.top_10s - a.top_10s;

    // Tiebreaker 4: Top 15s
    if (b.top_15s !== a.top_15s) return b.top_15s - a.top_15s;

    // Tiebreaker 5: Top 20s
    return b.top_20s - a.top_20s;
  });
}

/**
 * Determines if a position was decided by tiebreaker (not points)
 */
export function wasDecidedByTiebreaker<T extends PlayerWithStats>(
  currentPlayer: T,
  previousPlayer: T | undefined,
  usePlayoffPoints = false
): boolean {
  if (!previousPlayer) return false;
  
  const pointsCurrent = usePlayoffPoints 
    ? (currentPlayer.playoff_points ?? 0) 
    : (currentPlayer.regular_season_points ?? currentPlayer.total_points ?? 0);
  const pointsPrevious = usePlayoffPoints 
    ? (previousPlayer.playoff_points ?? 0) 
    : (previousPlayer.regular_season_points ?? previousPlayer.total_points ?? 0);

  return pointsCurrent === pointsPrevious;
}
