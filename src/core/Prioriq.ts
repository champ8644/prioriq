// src/core/Prioriq.ts
import PQueue from "p-queue";
import mitt from "mitt";
import {
  runWhenIdle,
  withTimeout,
  toNumber,
  type PriorityInput,
} from "./taskUtils";
import { composeMiddleware } from "./middleware";
import { CircuitBreaker } from "./circuitBreaker";
import type {
  RequestOptions,
  Middleware,
  MiddlewareContext,
  Events,
  QueuedTaskOptions,
} from "./types";

/**
 * Prioriq: a robust async task scheduler.
 *
 * Events emitted:
 *  - queued     : when a task is added
 *  - started    : when a task begins running
 *  - fulfilled  : when a task completes successfully
 *  - rejected   : when a task throws an error
 *  - cancelled  : when a task is cancelled
 *  - updated    : when a task's priority is changed
 */
export class Prioriq {
  private queues = new Map<string, PQueue>();
  private pending = new Map<string, NodeJS.Timeout>();
  private deduping = new Set<string>();
  private dedupeKeyMap = new Map<string, string>();
  private everDedupe = new Set<string>();
  private lastRequest = new Map<string, RequestOptions>();
  private abortControllers = new Map<string, AbortController>();
  private middlewares: Middleware[] = [];
  private breaker = new CircuitBreaker();
  private emitter = mitt<Events>();

  /** stores the last full RequestOptions per task for `.refresh()` */
  private taskCache = new Map<string, RequestOptions>();

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
      priority: rawPriority = 0,
      delay = 0,
      debounceMs,
      idle = false,
      autoPriority,
      meta,
      timeoutMs,
    } = options;

    const dedupeKey = options.dedupeKey ?? id;
    if (this.everDedupe.has(dedupeKey)) return;
    const priority = toNumber(rawPriority as PriorityInput);
    if (this.breaker.isOpen(group)) return;

    if (!this.queues.has(group)) this.addQueue(group);
    const queue = this.queues.get(group)!;
    const key = `${group}:${id}`;

    // Fast-path: if task is already pending
    if (this.pending.has(key)) {
      const stored = this.taskCache.get(key);
      if (stored && priority !== undefined) {
        stored.priority = priority;
        this.taskCache.set(key, stored);
      }
      return;
    }

    // Fast-path: if already in queue, reprioritize it
    const queueItems = (queue as any)._queue ?? (queue as any).queue;
    if (queueItems && typeof queueItems[Symbol.iterator] === "function") {
      for (const entry of queueItems) {
        if (entry.options?.id === id) {
          entry.priority = priority;
          this.emitter.emit("updated", { group, id, priority });
          return;
        }
      }
    }

    // Store for refresh()
    const fullOpts: RequestOptions = { ...options, id, group, dedupeKey };
    this.taskCache.set(key, fullOpts);
    this.lastRequest.set(key, fullOpts);

    this.emitter.emit("queued", { group, id });

    const enqueue = () => {
      this.pending.delete(key);
      this.dedupeKeyMap.delete(dedupeKey);

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
      this.dedupeKeyMap.set(dedupeKey, key);
      return;
    }

    if (delay > 0) {
      if (this.pending.has(key)) return;
      this.pending.set(key, setTimeout(enqueue, delay));
      this.dedupeKeyMap.set(dedupeKey, key);
      return;
    }

    enqueue();
  }

  refresh(id: string, group = "default") {
    const key = `${group}:${id}`;
    const prev = this.lastRequest.get(key);
    if (!prev) throw new Error(`No prior request() for id '${id}'`);
    this.cancel({ id });
    this.request(prev);
  }

  prioritize(id: string, newPriorityInput: PriorityInput, group = "default") {
    const queue: any = this.queues.get(group);
    if (!queue) return;

    const rawQueue = queue._queue ?? queue.queue;
    if (!rawQueue || typeof rawQueue[Symbol.iterator] !== "function") return;

    const entry = [...rawQueue].find((t: any) => t.options?.id === id);
    if (!entry) return;

    entry.priority = toNumber(newPriorityInput);
    this.emitter.emit("updated", { group, id, priority: entry.priority });
  }

  cancel(opts: { id?: string; dedupeKey?: string }) {
    let group: string | undefined;
    let id: string | undefined;

    if (opts.id) {
      id = opts.id;
      const controllerId = [...this.abortControllers.keys()].find((k) =>
        k.endsWith(`:${id}`)
      );
      if (controllerId) {
        group = controllerId.split(":")[0];
        this.abortControllers.get(controllerId)?.abort();
        this.abortControllers.delete(controllerId);
      }

      const key = `${group ?? "default"}:${id}`;
      if (this.pending.has(key)) {
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
      }
    }

    if (opts.dedupeKey) {
      const key = this.dedupeKeyMap.get(opts.dedupeKey);
      if (key) {
        [group, id] = key.split(":");
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
        this.dedupeKeyMap.delete(opts.dedupeKey);
        this.deduping.delete(opts.dedupeKey);
      }
    }

    if (group && id) {
      this.emitter.emit("cancelled", { group, id });
      this.taskCache.delete(`${group}:${id}`);
    }
  }

  cancelGroup(group: string) {
    for (const key of this.pending.keys()) {
      if (key.startsWith(`${group}:`)) {
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
        const id = key.split(":")[1];
        this.emitter.emit("cancelled", { group, id });
        this.taskCache.delete(key);
      }
    }
    for (const [key, controller] of this.abortControllers.entries()) {
      if (key.startsWith(`${group}:`)) {
        controller.abort();
        this.abortControllers.delete(key);
        const id = key.split(":")[1];
        this.emitter.emit("cancelled", { group, id });
        this.taskCache.delete(key);
      }
    }
  }

  snapshot(group?: string) {
    const stats: Record<
      string,
      { queued: number; running: number; pending: number }
    > = {};
    for (const [grp, queue] of this.queues.entries()) {
      stats[grp] = {
        queued: queue.size,
        running: queue.pending,
        pending: [...this.pending.keys()].filter((k) => k.startsWith(`${grp}:`))
          .length,
      };
    }
    return group ? stats[group] : stats;
  }

  private enqueueTask(queue: PQueue, opts: QueuedTaskOptions) {
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
    } = opts;
    const finalPriority = autoPriority ? autoPriority() : priority;

    const ctx: MiddlewareContext = {
      id,
      group,
      task,
      dedupeKey,
      meta,
      priority: finalPriority,
      idle,
      autoPriority,
      timeoutMs,
    };
    const runPipeline = composeMiddleware(this.middlewares);

    const controllerId = `${group}:${id}`;
    const abortCtl = new AbortController();
    this.abortControllers.set(controllerId, abortCtl);

    const wrapped = async () => {
      if (this.breaker.isOpen(group)) return;
      this.emitter.emit("started", { group, id });

      try {
        if (idle) await runWhenIdle();
        const result = timeoutMs
          ? await withTimeout(runPipeline(ctx, task), timeoutMs, id)
          : await runPipeline(ctx, task);

        this.breaker.clear(group);
        this.emitter.emit("fulfilled", { group, id, result });
        return result;
      } catch (err) {
        this.emitter.emit("rejected", { group, id, error: err });
        this.breaker.recordFailure(group);
        throw err;
      } finally {
        this.deduping.delete(dedupeKey);
        this.abortControllers.delete(controllerId);
        this.taskCache.delete(`${group}:${id}`);
      }
    };

    this.deduping.add(dedupeKey);
    queue.add(wrapped, { priority: finalPriority }).catch(() => {});
  }
}
