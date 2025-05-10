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
  /** store last full RequestOptions for refresh() */
  private lastRequest = new Map<string, RequestOptions>();
  private abortControllers = new Map<string, AbortController>();
  private middlewares: Middleware[] = [];
  private breaker = new CircuitBreaker();
  private emitter = mitt<Events>();

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

    const dedupeKey = options.dedupeKey ?? id;
    if (this.deduping.has(dedupeKey)) return;
    const priority = toNumber(rawPriority as PriorityInput);
    if (this.breaker.isOpen(group)) return;

    if (!this.queues.has(group)) this.addQueue(group);
    const queue = this.queues.get(group)!;
    const key = `${group}:${id}`;

    // Fast‐path: bump priority if already pending
    if (this.pending.has(key)) {
      if (priority !== undefined) {
        const prev = this.lastRequest.get(key)!;
        prev.priority = priority;
        this.lastRequest.set(key, prev);
        this.emitter.emit("updated", { group, id, priority });
      }
      return;
    }

    // Fast‐path: bump priority if already enqueued
    const items: any[] = (queue as any)._queue || (queue as any).queue;
    if (Array.isArray(items)) {
      const idx = items.findIndex((t) => t.options?.id === id);
      if (idx !== -1) {
        const [entry] = items.splice(idx, 1);
        // re-enqueue with new priority
        queue.add(entry.run, { priority });
        this.emitter.emit("updated", { group, id, priority });
        return;
      }
    }

    // Remember this request for refresh()
    const full: RequestOptions = { ...options, id, group, dedupeKey };
    this.lastRequest.set(key, full);

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
    const prev = this.lastRequest.get(key);
    if (!prev) throw new Error(`No prior request() for id '${id}'`);
    this.cancel({ id });
    this.request(prev);
  }

  /** Adjust priority of a queued task */
  prioritize(id: string, newPrioInput: PriorityInput, group = "default") {
    const queue = this.queues.get(group);
    if (!queue) return;

    // [1] Grab the underlying array (either ._queue or .queue)
    const items: any[] = (queue as any)._queue || (queue as any).queue;
    if (!Array.isArray(items)) return;

    // [2] Find & remove the existing entry
    const idx = items.findIndex((t) => t.options?.id === id);
    if (idx === -1) return;
    const entry = items.splice(idx, 1)[0];

    // [3] Re-enqueue it via PQueue’s public API
    const newPriority = toNumber(newPrioInput);
    queue.add(entry.task, { priority: newPriority });

    // [4] Fire our event
    this.emitter.emit("updated", { group, id, priority: newPriority });
  }

  /** Cancel tasks by id or dedupeKey */
  cancel(opts: { id?: string; dedupeKey?: string }) {
    let emitGroup: string | undefined;
    let emitId: string | undefined;

    if (opts.id) {
      const id = opts.id;
      const key = `default:${id}`;
      if (this.pending.has(key)) {
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
        [emitGroup, emitId] = key.split(":");
      }
      const ctrl = [...this.abortControllers.keys()].find((k) =>
        k.endsWith(`:${id}`)
      );
      if (ctrl) {
        this.abortControllers.get(ctrl)?.abort();
        this.abortControllers.delete(ctrl);
        [emitGroup, emitId] = ctrl.split(":");
      }
    }

    if (opts.dedupeKey) {
      const key = this.dedupeKeyMap.get(opts.dedupeKey);
      if (key) {
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
        this.dedupeKeyMap.delete(opts.dedupeKey);
        this.deduping.delete(opts.dedupeKey);
        [emitGroup, emitId] = key.split(":");
      }
    }

    if (emitGroup && emitId) {
      this.emitter.emit("cancelled", {
        group: emitGroup,
        id: emitId,
      });
    }
  }

  /** Cancel all tasks in a group */
  cancelGroup(group: string) {
    for (const key of this.pending.keys()) {
      if (key.startsWith(`${group}:`)) {
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
        const id = key.split(":")[1];
        this.emitter.emit("cancelled", { group, id });
      }
    }
    for (const [key, ctrl] of this.abortControllers.entries()) {
      if (key.startsWith(`${group}:`)) {
        ctrl.abort();
        this.abortControllers.delete(key);
        const id = key.split(":")[1];
        this.emitter.emit("cancelled", { group, id });
      }
    }
  }

  /** Snapshot queue state */
  snapshot(group?: string) {
    const stats: Record<
      string,
      { queued: number; running: number; pending: number }
    > = {};
    for (const [grp, q] of this.queues.entries()) {
      stats[grp] = {
        queued: q.size,
        running: q.pending,
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
      }
    };

    this.deduping.add(dedupeKey);
    queue.add(wrapped, { priority: finalPriority }).catch(() => {});
  }
}
