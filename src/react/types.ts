import type { ScheduleOptions } from "../core/types";
import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";

/**
 * Options accepted by the React-Query wrapper `useRequest`.
 *
 * Combines:
 *  • TanStack Query’s `UseQueryOptions` (minus key/fn/meta)
 *  • Prioriq’s `ScheduleOptions` (timing, priority, dedupe)
 */
export interface UseRequestOptions<T, Meta = Record<string, any>>
  extends Omit<
      UseQueryOptions<T, Error, T, readonly unknown[]>,
      "queryKey" | "queryFn" | "meta"
    >,
    ScheduleOptions<Meta> {
  /** Cache key required by React-Query. */
  queryKey: QueryKey;

  /** Function performing the actual fetch. */
  fetchFn: () => Promise<T>;

  /** Optional metadata passed through Prioriq. */
  meta?: Meta;
}
