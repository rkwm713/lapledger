// Chase/Playoff related types

export interface ChaseRound {
  id: string;
  league_id: string;
  season: number;
  round_number: number; // 0=regular, 1-3=chase rounds, 4=championship
  start_race_number: number | null;
  end_race_number: number | null;
  players_remaining: number;
  is_active: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ChaseElimination {
  id: string;
  league_id: string;
  user_id: string;
  season: number;
  eliminated_round: number;
  final_position: number | null;
  playoff_points_at_elimination: number;
  eliminated_at: string;
  created_at: string;
}

export interface ChasePlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  playoff_points: number;
  race_wins: number;
  stage_wins: number;
  top_5s: number;
  top_10s: number;
  top_15s: number;
  top_20s: number;
  regular_season_points: number;
  is_eliminated: boolean;
  elimination_round: number | null;
  is_wild_card: boolean;
  position: number;
}

export type EliminationStatus = 'safe' | 'at-risk' | 'eliminated' | 'advancing';

export const CHASE_ROUND_NAMES: Record<number, string> = {
  0: 'Regular Season',
  1: 'Round of 16',
  2: 'Round of 10',
  3: 'Final Four Qualifier',
  4: 'Championship',
};

export const CHASE_ROUND_ELIMINATIONS: Record<number, number> = {
  1: 7,  // 23 -> 16
  2: 6,  // 16 -> 10
  3: 6,  // 10 -> 4
  4: 0,  // Championship - no eliminations, just final order
};

export const CHASE_ROUND_REMAINING: Record<number, number> = {
  0: 23, // All qualifiers
  1: 16,
  2: 10,
  3: 4,
  4: 4, // Final Four compete
};
