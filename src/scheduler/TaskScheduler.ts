import PQueue from "p-queue";
import mitt from "mitt";
import { withTimeout, runWhenIdle } from "./taskUtils";
import { composeMiddleware } from "./middleware";
import { CircuitBreaker } from "./circuitBreaker";
import type {
  Task,
  RequestOptions,
  Middleware,
  MiddlewareContext,
  Events,
} from "./types";

/**
 * A robust async task scheduler with concurrency, debouncing, deduplication,
 * middleware support, timeout enforcement, and circuit breaker protection.
 */
export class TaskScheduler {
  private queues = new Map<string, PQueue>();
  private pending = new Map<string, NodeJS.Timeout>();
  private deduping = new Set<string>();
  private dedupeKeyMap: Map<string, string> = new Map();
  private abortControllers = new Map<string, AbortController>();
  private middlewares: Middleware[] = [];
  private breaker = new CircuitBreaker();
  private emitter = mitt<Events>();

  constructor(private defaultConcurrency = 4) {}

  addQueue(group: string, concurrency = this.defaultConcurrency) {
    if (!this.queues.has(group)) {
      this.queues.set(group, new PQueue({ concurrency }));
    }
  }

  configureGroup(
    group: string,
    config: { maxFailures: number; cooldownMs: number }
  ) {
    this.breaker.configure(group, config);
  }

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  on<K extends keyof Events>(type: K, handler: (e: Events[K]) => void) {
    this.emitter.on(type, handler);
  }

  off<K extends keyof Events>(type: K, handler: (e: Events[K]) => void) {
    this.emitter.off(type, handler);
  }

  request(options: RequestOptions) {
    const {
      id,
      task,
      group = "default",
      priority = 0,
      delay = 0,
      debounceMs,
      dedupeKey,
      idle = false,
      autoPriority,
      meta,
      timeoutMs,
    } = options;

    if (!this.queues.has(group)) this.addQueue(group);
    if (this.breaker.isOpen(group)) return;

    const queue = this.queues.get(group)!;
    const key = `${group}:${id}`;

    if (dedupeKey && this.deduping.has(dedupeKey)) return;

    const enqueue = () => {
      this.pending.delete(key);
      if (dedupeKey) this.dedupeKeyMap.delete(dedupeKey);
      this.enqueueTask(queue, {
        id,
        task,
        group,
        priority,
        idle,
        autoPriority,
        dedupeKey,
        meta,
        timeoutMs,
      });
    };

    if (debounceMs) {
      if (this.pending.has(key)) clearTimeout(this.pending.get(key)!);
      this.pending.set(key, setTimeout(enqueue, debounceMs));
      if (dedupeKey) this.dedupeKeyMap.set(dedupeKey, key);
      return;
    }

    if (delay > 0) {
      if (this.pending.has(key)) return;
      this.pending.set(key, setTimeout(enqueue, delay));
      return;
    }

    enqueue();
  }

  private enqueueTask(
    queue: PQueue,
    options: {
      id: string;
      task: Task;
      group: string;
      priority: number;
      idle: boolean;
      autoPriority?: () => number;
      dedupeKey?: string;
      meta?: Record<string, any>;
      timeoutMs?: number;
    }
  ) {
    const {
      id,
      task,
      group,
      priority,
      idle,
      autoPriority,
      dedupeKey,
      meta,
      timeoutMs,
    } = options;

    const finalPriority = autoPriority ? autoPriority() : priority;
    const ctx: MiddlewareContext<{ source?: string }> = {
      id,
      group,
      task,
      dedupeKey,
      meta,
    };
    const runner = composeMiddleware(this.middlewares);

    const signal = new AbortController();
    const controllerId = `${group}:${id}`;
    this.abortControllers.set(controllerId, signal);

    const wrappedTask = async () => {
      // ** Circuit-breaker at execution time **
      if (this.breaker.isOpen(group)) {
        // silently skip running the task
        return;
      }
      this.emitter.emit("start", { group, id });

      try {
        if (idle) await runWhenIdle();
        const result = timeoutMs
          ? await withTimeout(runner(ctx, task), timeoutMs, id)
          : await runner(ctx, task);

        this.breaker.clear(group);
        this.emitter.emit("finish", { group, id });
        return result;
      } catch (error) {
        this.emitter.emit("error", { group, id, error });
        this.breaker.recordFailure(group);
        throw error;
      } finally {
        if (dedupeKey) this.deduping.delete(dedupeKey);
        this.abortControllers.delete(controllerId);
      }
    };

    if (dedupeKey) this.deduping.add(dedupeKey);
    const p = queue.add(wrappedTask, { priority: finalPriority });
    p.catch(() => {
      /* already emitted 'error', so just swallow it */
    });
  }

  cancel(opts: { id?: string; dedupeKey?: string }) {
    // Cancel by ID
    const key = opts.id
      ? [...this.pending.keys()].find((k) => k.endsWith(`:${opts.id}`))
      : null;
    if (key) {
      clearTimeout(this.pending.get(key)!);
      this.pending.delete(key);
    }

    // Cancel by dedupeKey
    if (opts.dedupeKey) {
      const pendingKey = this.dedupeKeyMap.get(opts.dedupeKey);
      if (pendingKey && this.pending.has(pendingKey)) {
        clearTimeout(this.pending.get(pendingKey)!);
        this.pending.delete(pendingKey);
      }
      this.dedupeKeyMap.delete(opts.dedupeKey);
      this.deduping.delete(opts.dedupeKey);
    }

    // Abort controller cleanup
    if (opts.id) {
      const controllerId = [...this.abortControllers.keys()].find((k) =>
        k.endsWith(`:${opts.id}`)
      );
      if (controllerId) {
        this.abortControllers.get(controllerId)?.abort();
        this.abortControllers.delete(controllerId);
      }
    }
  }

  cancelGroup(group: string) {
    for (const key of this.pending.keys()) {
      if (key.startsWith(`${group}:`)) {
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
      }
    }
    for (const [key, controller] of this.abortControllers.entries()) {
      if (key.startsWith(`${group}:`)) {
        controller.abort();
        this.abortControllers.delete(key);
      }
    }
  }

  snapshot() {
    const result: Record<
      string,
      { queued: number; running: number; pending: number }
    > = {};
    for (const [group, queue] of this.queues.entries()) {
      result[group] = {
        queued: queue.size,
        running: queue.pending,
        pending: Array.from(this.pending.keys()).filter((k) =>
          k.startsWith(`${group}:`)
        ).length,
      };
    }
    return result;
  }
}
