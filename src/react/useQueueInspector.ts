import { useEffect, useState } from 'react';
import type { TaskScheduler } from '../scheduler/TaskScheduler';

/**
 * Provides a full snapshot of all queues at a set interval.
 */
export function useQueueInspector(scheduler: TaskScheduler, intervalMs = 250) {
  const [snapshot, setSnapshot] = useState(() => scheduler.snapshot());

  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot(scheduler.snapshot());
    }, intervalMs);
    return () => clearInterval(interval);
  }, [scheduler, intervalMs]);

  return snapshot;
}
