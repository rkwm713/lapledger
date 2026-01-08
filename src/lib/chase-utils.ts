// Chase utility functions for dynamic calculations

import { CHASE_ROUND_REMAINING } from './chase-types';

/**
 * Calculate the actual players remaining for a chase round based on league size.
 * For leagues smaller than 23 members, we scale down proportionally.
 */
export function getPlayersRemainingForRound(roundNumber: number, totalMembers: number): number {
  // Standard cutoffs are based on 23+ members
  const standardCutoff = CHASE_ROUND_REMAINING[roundNumber] || 23;
  
  // If league has 23 or more members, use standard cutoffs
  if (totalMembers >= 23) {
    return standardCutoff;
  }
  
  // For smaller leagues, scale proportionally but ensure reasonable minimums
  // Round 0 (regular season): all members
  if (roundNumber === 0) {
    return totalMembers;
  }
  
  // For rounds 1-4, calculate proportional cutoffs
  const proportion = standardCutoff / 23;
  const scaledCutoff = Math.max(Math.floor(totalMembers * proportion), 4);
  
  // Round 4 (championship) is always 4 or total members if < 4
  if (roundNumber === 4) {
    return Math.min(4, totalMembers);
  }
  
  // Ensure we don't exceed total members
  return Math.min(scaledCutoff, totalMembers);
}

/**
 * Get the number of eliminations for a round based on league size.
 */
export function getEliminationsForRound(roundNumber: number, totalMembers: number): number {
  const currentRemaining = getPlayersRemainingForRound(roundNumber - 1, totalMembers);
  const nextRemaining = getPlayersRemainingForRound(roundNumber, totalMembers);
  return Math.max(0, currentRemaining - nextRemaining);
}
