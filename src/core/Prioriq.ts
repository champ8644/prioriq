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
  Task,
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

  constructor(private defaultConcurrency = 4) {}

  /** Ensure a queue exists for the group */
  addQueue(group: string, concurrency = this.defaultConcurrency) {
    if (!this.queues.has(group)) {
      this.queues.set(group, new PQueue({ concurrency }));
    }
  }

  /** Configure circuit breaker for a group */
  configureGroup(
    group: string,
    config: { maxFailures: number; cooldownMs: number }
  ) {
    this.breaker.configure(group, config);
  }

  /** Add middleware */
  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  /** Subscribe to scheduler events */
  on<K extends keyof Events>(type: K, handler: (e: Events[K]) => void) {
    this.emitter.on(type, handler);
  }

  /** Unsubscribe from events */
  off<K extends keyof Events>(type: K, handler: (e: Events[K]) => void) {
    this.emitter.off(type, handler);
  }

  /** Enqueue a task */
  request(options: RequestOptions) {
    const {
      id,
      task,
      group = "default",
      priority: rawPriority = 0,
      delay = 0,
      debounceMs,
      dedupeKey,
      idle = false,
      autoPriority,
      meta,
      timeoutMs,
    } = options;

    // Convert priority input ('HOT'|'WARM'|'COLD'|number) to numeric
    const priority = toNumber(rawPriority as PriorityInput);

    if (!this.queues.has(group)) this.addQueue(group);
    if (this.breaker.isOpen(group)) return;

    const queue = this.queues.get(group)!;
    const key = `${group}:${id}`;
    if (dedupeKey && this.deduping.has(dedupeKey)) return;

    this.emitter.emit("queued", { group, id });

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
      if (dedupeKey) this.dedupeKeyMap.set(dedupeKey, key);
      return;
    }

    enqueue();
  }

  /** Internal: wrap and add task to PQueue */
  private enqueueTask(queue: PQueue, options: QueuedTaskOptions) {
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
    const runner = composeMiddleware(this.middlewares);

    const signal = new AbortController();
    const controllerId = `${group}:${id}`;
    this.abortControllers.set(controllerId, signal);

    const wrappedTask = async () => {
      if (this.breaker.isOpen(group)) return;
      this.emitter.emit("started", { group, id });

      try {
        if (idle) await runWhenIdle();
        const result = timeoutMs
          ? await withTimeout(runner(ctx, task), timeoutMs, id)
          : await runner(ctx, task);

        this.breaker.clear(group);
        this.emitter.emit("fulfilled", { group, id, result });
        return result;
      } catch (error) {
        this.emitter.emit("rejected", { group, id, error });
        this.breaker.recordFailure(group);
        throw error;
      } finally {
        if (dedupeKey) this.deduping.delete(dedupeKey);
        this.abortControllers.delete(controllerId);
      }
    };

    if (dedupeKey) this.deduping.add(dedupeKey);
    queue.add(wrappedTask, { priority: finalPriority }).catch(() => {});
  }

  /**
   * Change priority of an already-queued task.
   */
  prioritize(id: string, newPriorityInput: PriorityInput, group = "default") {
    const queue = this.queues.get(group);
    if (!queue) return;

    const newPriority = toNumber(newPriorityInput);
    const tasks = [...(queue as any).queue] as Array<{
      options: any;
      priority: number;
    }>;
    for (const task of tasks) {
      if (task.options?.id === id) {
        task.priority = newPriority;
        (queue as any).queue.sort((a: any, b: any) => a.priority - b.priority);
        this.emitter.emit("updated", { group, id, priority: newPriority });
        break;
      }
    }
  }

  /**
   * Cancel a single task by id or dedupeKey.
   */
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
    }
  }

  /**
   * Cancel all tasks in a group.
   */
  cancelGroup(group: string) {
    for (const key of this.pending.keys()) {
      if (key.startsWith(`${group}:`)) {
        clearTimeout(this.pending.get(key)!);
        this.pending.delete(key);
        const id = key.split(":")[1];
        this.emitter.emit("cancelled", { group, id });
      }
    }
    for (const [key, controller] of this.abortControllers.entries()) {
      if (key.startsWith(`${group}:`)) {
        controller.abort();
        this.abortControllers.delete(key);
        const id = key.split(":")[1];
        this.emitter.emit("cancelled", { group, id });
      }
    }
  }

  /**
   * Snapshot queue state.
   * If group is provided, returns stats for that group only.
   * Otherwise returns stats for all groups.
   */
  snapshot(group?: string) {
    const stats: Record<
      string,
      { queued: number; running: number; pending: number }
    > = {};
    for (const [grp, queue] of this.queues.entries()) {
      stats[grp] = {
        queued: queue.size,
        running: queue.pending,
        pending: Array.from(this.pending.keys()).filter((k) =>
          k.startsWith(`${grp}:`)
        ).length,
      };
    }
    return group ? stats[group] : stats;
  }
}
