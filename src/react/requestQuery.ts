import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Prioriq } from "../core/Prioriq";
import type { PriorityInput } from "../core/taskUtils";

export interface RequestQueryOptions<T> {
  id: string;
  queryClient: QueryClient;
  queryKey: QueryKey;
  fetchFn: () => Promise<T>;

  /* Prioriq knobs */
  group?: string;
  priority?: PriorityInput;
  delay?: number;
  debounceMs?: number;
  dedupeKey?: string;
  idle?: boolean;
  timeoutMs?: number;
  meta?: Record<string, any>;
}

/**
 * Schedule a fetch through Prioriq and resolve with cached data.
 *
 * Can be used in React-free contexts by importing:
 *   import { requestQuery } from "prioriq/react";
 */
export function requestQuery<T>(
  prioriq: Prioriq,
  opts: RequestQueryOptions<T>
): Promise<T> {
  const {
    id,
    queryClient,
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
  } = opts;

  const promise = prioriq.request({
    id,
    group,
    priority,
    delay,
    debounceMs,
    dedupeKey,
    idle,
    timeoutMs,
    meta,
    task: () =>
      queryClient.fetchQuery({ queryKey, queryFn: fetchFn }).catch((error) => {
        console.error(`Error with task ${id}:`, error);
        throw error; // rethrow after logging
      }),
  });

  return (promise ??
    Promise.reject(new Error(`Task '${id}' was not scheduled`))) as Promise<T>;
}
