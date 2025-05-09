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
  private abortControllers = new Map<string, AbortController>();
  private middlewares: Middleware[] = [];
  private breaker = new CircuitBreaker();
  private emitter = mitt<Events>();

  /** stores the last full RequestOptions per task for `.refresh()` */
  private taskCache = new Map<string, RequestOptions>();

  constructor(private defaultConcurrency = 4) {}

  /* ------------------------------------------------------------------ */
  /*  Public API                                                        */
  /* ------------------------------------------------------------------ */

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

  /** Main entry — queue or bump a task */
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

    const dedupeKey: string = options.dedupeKey ?? id;
    const priority = toNumber(rawPriority as PriorityInput);
    if (this.breaker.isOpen(group)) return;

    if (!this.queues.has(group)) this.addQueue(group);
    const queue = this.queues.get(group)!;
    const key = `${group}:${id}`;

    /* ---------- queue-or-bump fast path ---------------------------- */
    // 1. If already pending (debounce or delay) → update stored opts & priority
    if (this.pending.has(key)) {
      if (priority !== undefined) {
        // re-store latest options for when timer fires
        const stored = this.taskCache.get(key)!;
        stored.priority = priority;
        this.taskCache.set(key, stored);
      }
      return; // let existing timer fire
    }

    // 2. If already in PQueue → reprioritise and emit 'updated'
    const queuedTask = [...(queue as any).queue].find(
      (t: any) => t.options?.id === id
    );
    if (queuedTask) {
      if (priority !== undefined) {
        queuedTask.priority = priority;
        (queue as any).queue.sort((a: any, b: any) => a.priority - b.priority);
        this.emitter.emit("updated", { group, id, priority });
      }
      return;
    }
    /* -------------------------------------------------------------- */

    /* ---------- store for refresh() ------------------------------- */
    const fullOpts: RequestOptions = { ...options, id, group, dedupeKey };
    this.taskCache.set(key, fullOpts);
    /* -------------------------------------------------------------- */

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

  /** Force re-execution of last recorded task */
  refresh(id: string, group = "default") {
    const key = `${group}:${id}`;
    const prev = this.taskCache.get(key);
    if (!prev) throw new Error(`No prior request() for id '${id}'`);
    this.cancel({ id });
    this.request(prev);
  }

  prioritize(id: string, newPriority: PriorityInput, group = "default") {
    const queue = this.queues.get(group);
    if (!queue) return;
    const n = toNumber(newPriority);
    const task = [...(queue as any).queue].find(
      (t: any) => t.options?.id === id
    );
    if (task) {
      task.priority = n;
      (queue as any).queue.sort((a: any, b: any) => a.priority - b.priority);
      this.emitter.emit("updated", { group, id, priority: n });
    }
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
      // also clear any pending timer
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

  /* ------------------------------------------------------------------ */
  /*  Internals                                                         */
  /* ------------------------------------------------------------------ */

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
