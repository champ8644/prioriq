import type { TaskScheduler } from "../scheduler/TaskScheduler";

/**
 * Schedules a task when an element becomes visible (or invisible).
 */
export function scheduleWhenVisible(
  visible: boolean,
  group: string,
  id: string,
  task: () => Promise<any>,
  scheduler: TaskScheduler,
  delay = 300
) {
  const dedupeKey = `viewport:${id}`;
  if (visible) {
    scheduler.request({
      id,
      group,
      task,
      delay,
      dedupeKey,
      priority: 0,
      meta: { source: "viewport" },
    });
  } else {
    scheduler.request({
      id,
      group,
      task,
      delay: 2000,
      dedupeKey,
      priority: 5,
      meta: { source: "background" },
    });
  }
}
