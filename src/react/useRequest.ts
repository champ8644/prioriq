import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseQueryResult,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback } from "react";
import type { Prioriq } from "../core/Prioriq";
import { fetchCoordinator } from "./internal/fetchCoordinator";

interface UseRequestOptions<T>
  extends Omit<UseQueryOptions<T>, "queryKey" | "queryFn"> {
  id: string;
  queryKey: QueryKey;
  fetchFn: () => Promise<T>;
  scheduler: Prioriq;
  group?: string;
  priority?: number | "HOT" | "WARM" | "COLD";
  delay?: number;
  debounceMs?: number;
  dedupeKey?: string;
  idle?: boolean;
  timeoutMs?: number;
  meta?: Record<string, any>;
}

/**
 * React hook for fetching data via Prioriq and React Query.
 *
 * Supports all scheduling features: priority, delay, debounce, dedupe, and timeout.
 */
export function useRequest<T>(
  options: UseRequestOptions<T>
): UseQueryResult<T> {
  const {
    id,
    queryKey,
    fetchFn,
    scheduler,
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

  const queryClient = useQueryClient();

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
