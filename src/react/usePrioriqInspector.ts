import { useEffect, useState } from "react";
import type { Prioriq } from "../core/Prioriq";

interface QueueStats {
  queued: number;
  running: number;
  pending: number;
}

/**
 * React hook to observe the state of a Prioriq queue or all queues.
 * Useful for building dev tools or status indicators.
 *
 * @param prioriq - The scheduler instance
 * @param group - (Optional) If specified, only that group's stats are returned
 * @param intervalMs - Polling interval in milliseconds (default: 250ms)
 */
export function usePrioriqInspector(
  prioriq: Prioriq,
  group?: string,
  intervalMs = 250
): Record<string, QueueStats> | QueueStats | undefined {
  const getSnapshot = () => prioriq.snapshot(group);

  const [state, setState] = useState(getSnapshot);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(getSnapshot());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [prioriq, group, intervalMs]);

  return state;
}
