import type { PriorityInput } from "./taskUtils";

/* =================================================================== *
 *  Fundamental primitives                                             *
 * =================================================================== */

/** Any asynchronous unit of work that Prioriq can execute. */
export type Task = () => Promise<any>;

/**
 * Smallest shared option set.
 * Everything here is framework-agnostic and optional
 * except for the mandatory **id**.
 */
export interface BaseTaskOptions<Meta = Record<string, any>> {
  /* identity ------------------------------------------------------- */
  id: string;

  /* priority ------------------------------------------------------- */
  /** Callback evaluated at enqueue time to determine priority. */
  autoPriority?: () => number;

  /* timing --------------------------------------------------------- */
  delay?: number; // absolute delay before enqueue (ms)
  debounceMs?: number; // debounce window (ms)
  timeoutMs?: number; // hard timeout for the task (ms)

  /* user metadata -------------------------------------------------- */
  meta?: Meta;
}

/**
 * Public-facing scheduling knobs, used by:
 *  • scheduler.request()
 *  • React helpers (useRequest)
 * Extends BaseTaskOptions with queue-specific controls.
 */
export interface ScheduleOptions<Meta = Record<string, any>>
  extends BaseTaskOptions<Meta> {
  /* deduplication -------------------------------------------------- */
  dedupeKey?: string;

  /* queue / priority ---------------------------------------------- */
  group?: string; // logical queue name
  priority?: PriorityInput; // numeric or symbolic
  idle?: boolean; // wait for requestIdleCallback
}

/* =================================================================== *
 *  Core-side shapes                                                   *
 * =================================================================== */

/** Shape accepted by `scheduler.request()`. */
export interface RequestOptions<Meta = Record<string, any>>
  extends ScheduleOptions<Meta> {
  task: Task;
}

/**
 * Fully normalised form used internally:
 *  • all optional fields resolved
 *  • priority is numeric
 *  • dedupeKey is guaranteed
 */
export interface QueuedTaskOptions<Meta = Record<string, any>>
  extends BaseTaskOptions<Meta> {
  group: string;
  priority: number;
  idle: boolean;
  dedupeKey: string;
  task: Task;
}

/* =================================================================== *
 *  Middleware & events                                                *
 * =================================================================== */

export type MiddlewareContext<Meta = Record<string, any>> =
  QueuedTaskOptions<Meta>;

export type Middleware = (
  ctx: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

/** Lifecycle events emitted by Prioriq. */
export type Events = {
  queued: Pick<QueuedTaskOptions, "group" | "id">;
  started: Pick<QueuedTaskOptions, "group" | "id">;
  fulfilled: Pick<QueuedTaskOptions, "group" | "id"> & { result: any };
  rejected: Pick<QueuedTaskOptions, "group" | "id"> & { error: any };
  cancelled: Pick<QueuedTaskOptions, "group" | "id">;
  updated: Pick<QueuedTaskOptions, "group" | "id"> & { priority: number };
};
