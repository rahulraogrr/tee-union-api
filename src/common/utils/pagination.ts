/** Maximum number of records that can be requested in a single paginated query. */
export const MAX_PAGE_LIMIT = 100;

/**
 * Clamps a requested `limit` to a safe maximum to prevent DB/memory exhaustion.
 *
 * @param requested - The limit value supplied by the client
 * @param defaultLimit - Default when the client supplies no value (default: 20)
 * @returns A value between 1 and MAX_PAGE_LIMIT (inclusive)
 *
 * @example
 * clampLimit(undefined)   // → 20
 * clampLimit(50)          // → 50
 * clampLimit(999_999)     // → 100
 */
export function clampLimit(requested?: number, defaultLimit = 20): number {
  const value = requested ?? defaultLimit;
  return Math.min(Math.max(1, value), MAX_PAGE_LIMIT);
}
