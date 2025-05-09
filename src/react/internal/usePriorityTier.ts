import { PRIORITY } from "../../core/taskUtils";

/**
 * Maps a symbolic priority tier ('HOT' | 'WARM' | 'COLD') to its numeric value.
 * Can be used to bind UI components to user-friendly labels.
 *
 * @example
 *   const p = usePriorityTier("HOT") // returns 1
 */
export function usePriorityTier(tier: keyof typeof PRIORITY): number {
  return PRIORITY[tier];
}
