import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { usePrioriq } from "./PrioriqProvider";
import { fetchCoordinator } from "./internal/fetchCoordinator";
import { UseRequestOptions } from "./types";

/**
 * React hook for fetching data via Prioriq and React Query.
 *
 * Scheduler instance is pulled from PrioriqContext (required).
 * Supports all scheduling features: priority, delay, debounce, dedupe, and timeout.
 */
export function useRequest<T>(
  options: UseRequestOptions<T>
): UseQueryResult<T> {
  const scheduler = usePrioriq();
  const queryClient = useQueryClient();

  const {
    id,
    queryKey,
    fetchFn,
    group,
    priority,
    delay,
    debounceMs,
    dedupeKey,
    idle,
    timeoutMs,
    meta,
    ...queryOptions
  } = options;

  const coordinator = useCallback(() => {
    return fetchCoordinator(scheduler, {
      id,
      queryKey,
      fetchFn,
      queryClient,
      group,
      priority,
      delay,
      debounceMs,
      dedupeKey,
      idle,
      timeoutMs,
      meta,
    });
  }, [
    scheduler,
    id,
    queryKey,
    fetchFn,
    group,
    priority,
    delay,
    debounceMs,
    dedupeKey,
    idle,
    timeoutMs,
    meta,
    queryClient,
  ]);

  return useQuery({
    ...queryOptions,
    queryKey,
    queryFn: coordinator,
  });
}
