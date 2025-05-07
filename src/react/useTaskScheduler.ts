import { useEffect, useReducer } from 'react';
import type { TaskScheduler } from '../scheduler/TaskScheduler';

/**
 * Subscribes a component to live updates from a specific task group queue.
 */
export function useTaskScheduler(scheduler: TaskScheduler, group: string) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const onChange = () => forceUpdate();
    scheduler.on('start', onChange);
    scheduler.on('finish', onChange);
    scheduler.on('error', onChange);
    return () => {
      scheduler.off('start', onChange);
      scheduler.off('finish', onChange);
      scheduler.off('error', onChange);
    };
  }, [scheduler]);

  return scheduler.snapshot()[group] ?? { queued: 0, running: 0, pending: 0 };
}
