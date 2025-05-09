import type { Prioriq } from "../../core/Prioriq";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PriorityInput } from "../../core/taskUtils";

export interface FetchCoordinatorOptions<T> {
  /** Unique identifier within the scheduler for this fetch */
  id: string;
  /** React Query client instance */
  queryClient: QueryClient;
  /** Query key for caching and deduplication */
  queryKey: QueryKey;
  /** Function that performs the fetch */
  fetchFn: () => Promise<T>;
  /** Scheduler group name */
  group?: string;
  /** Task priority (number or 'HOT'|'WARM'|'COLD') */
  priority?: PriorityInput;
  /** Milliseconds to delay execution */
  delay?: number;
  /** Milliseconds to debounce execution */
  debounceMs?: number;
  /** Dedupe key to avoid duplicate tasks */
  dedupeKey?: string;
  /** Wait for idle callback before running */
  idle?: boolean;
  /** Timeout for the task */
  timeoutMs?: number;
  /** Additional metadata */
  meta?: Record<string, any>;
}

/**
 * Orchestrate a data fetch through Prioriq scheduler and React Query.
 * Returns a promise that resolves with the fetched data.
 */
export function fetchCoordinator<T>(
  prioriq: Prioriq,
  options: FetchCoordinatorOptions<T>
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
  } = options;

  const result = prioriq.request({
    id,
    group,
    priority,
    delay,
    debounceMs,
    dedupeKey,
    idle,
    timeoutMs,
    meta,
    task: () => queryClient.fetchQuery({ queryKey, queryFn: fetchFn }),
  });

  return (result ??
    Promise.reject(new Error(`Task '${id}' was not scheduled`))) as Promise<T>;
}
