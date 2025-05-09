import type { PriorityInput } from "./taskUtils";

export type Task = () => Promise<any>;

/** Minimal base type shared by all task descriptors */
export interface BaseTaskOptions<Meta = Record<string, any>> {
  id: string;
  autoPriority?: () => number;
  dedupeKey?: string;
  timeoutMs?: number;
  meta?: Meta;
}

/** Public-facing API for scheduling a task */
export interface RequestOptions<Meta = Record<string, any>>
  extends BaseTaskOptions<Meta> {
  task: Task;
  group?: string;
  priority?: PriorityInput;
  delay?: number;
  debounceMs?: number;
  idle?: boolean;
}

/** Normalized internal task form used after parsing */
export interface QueuedTaskOptions<Meta = Record<string, any>>
  extends BaseTaskOptions<Meta> {
  group: string;
  priority: number;
  idle: boolean;
  task: Task;
}

export type MiddlewareContext<Meta = Record<string, any>> =
  QueuedTaskOptions<Meta>;

export type Middleware = (
  ctx: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

export type Events = {
  queued: Pick<QueuedTaskOptions, "group" | "id">;
  started: Pick<QueuedTaskOptions, "group" | "id">;
  fulfilled: Pick<QueuedTaskOptions, "group" | "id"> & { result: any };
  rejected: Pick<QueuedTaskOptions, "group" | "id"> & { error: any };
  cancelled: Pick<QueuedTaskOptions, "group" | "id">;
  updated: Pick<QueuedTaskOptions, "group" | "id"> & { priority: number };
};
