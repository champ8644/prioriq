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

export type MiddlewareContext = {
  id: string;
  group: string;
  task: Task;
  dedupeKey?: string;
  meta?: Record<string, any>;
};

export type Middleware = (
  ctx: MiddlewareContext,
  next: () => Promise<any>
) => Promise<any>;

export type Events = {
  start: { group: string; id: string };
  finish: { group: string; id: string };
  error: { group: string; id: string; error: any };
};
