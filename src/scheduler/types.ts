export type Task = () => Promise<any>;

export interface RequestOptions {
  id: string;
  task: Task;
  group?: string;
  priority?: number;
  delay?: number;
  debounceMs?: number;
  dedupeKey?: string;
  idle?: boolean;
  autoPriority?: () => number;
  meta?: Record<string, any>;
  timeoutMs?: number;
}

export type MiddlewareContext<Meta = Record<string, any>> = {
  id: string;
  group: string;
  task: Task;
  dedupeKey?: string;
  priority?: number;
  meta?: Meta;
};

export type Middleware = (
  ctx: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

export type Events = {
  start: { group: string; id: string };
  finish: { group: string; id: string };
  error: { group: string; id: string; error: any };
};
