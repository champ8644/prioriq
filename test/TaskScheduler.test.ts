import { TaskScheduler } from "../src/scheduler/TaskScheduler";
import type { MiddlewareContext } from "../src/scheduler/types";

jest.useFakeTimers();

describe("TaskScheduler", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  test("executes task immediately when no delay or debounce", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "immediate", task });

    jest.runAllTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalled();
  });

  test("respects delay before enqueueing", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "delayed", task, delay: 500 });

    jest.advanceTimersByTime(499);
    expect(task).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(task).toHaveBeenCalled();
  });

  test("debounces correctly", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "debounced", task, debounceMs: 300 });
    scheduler.request({ id: "debounced", task, debounceMs: 300 });

    jest.advanceTimersByTime(299);
    expect(task).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("deduplicates using dedupeKey", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "a", task, dedupeKey: "dup" });
    scheduler.request({ id: "b", task, dedupeKey: "dup" });

    jest.runAllTimers();
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("handles timeoutMs properly", async () => {
    jest.useRealTimers();

    const onError = jest.fn();
    scheduler.on("error", onError);

    scheduler.request({
      id: "timeout",
      task: () => new Promise(() => {}),
      timeoutMs: 300,
    });

    // wait for 350ms in real time
    await new Promise((r) => setTimeout(r, 350));

    expect(onError).toHaveBeenCalled();

    jest.useFakeTimers();
  });

  test("cancels debounced task", () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "cancelme", task, debounceMs: 500 });
    scheduler.cancel({ id: "cancelme" });

    jest.advanceTimersByTime(600);
    expect(task).not.toHaveBeenCalled();
  });

  test("middleware is executed before and after task", async () => {
    const logs: string[] = [];
    scheduler.use(async (ctx, next) => {
      logs.push(`before:${ctx.id}`);
      await next();
      logs.push(`after:${ctx.id}`);
    });

    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "m1", task });

    jest.runAllTimers();
    await Promise.resolve();

    expect(logs).toEqual(["before:m1", "after:m1"]);
  });

  test("circuit breaker suppresses requests after threshold", async () => {
    const fail = jest.fn(() =>
      Promise.resolve().then(() => {
        throw new Error("fail");
      })
    );

    scheduler.addQueue("g1", 1); // only one running at once

    scheduler.configureGroup("g1", { maxFailures: 2, cooldownMs: 1000 });

    scheduler.request({ id: "f1", task: fail, group: "g1" });
    scheduler.request({ id: "f2", task: fail, group: "g1" });
    scheduler.request({ id: "f3", task: fail, group: "g1" }); // should be suppressed

    // Run all timers and flush tasks
    jest.runAllTimers();
    await new Promise((r) => setImmediate(r));

    expect(fail).toHaveBeenCalledTimes(2); // f3 should be blocked by circuit breaker
  });

  test("cancelGroup aborts all pending tasks", () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "x1", task, group: "g", debounceMs: 300 });
    scheduler.request({ id: "x2", task, group: "g", debounceMs: 300 });

    scheduler.cancelGroup("g");
    jest.advanceTimersByTime(400);

    expect(task).not.toHaveBeenCalled();
  });

  test("snapshot reflects correct queue state", () => {
    scheduler.request({
      id: "snap1",
      task: async () => {},
      group: "x",
      delay: 100,
    });
    scheduler.request({
      id: "snap2",
      task: async () => {},
      group: "x",
      debounceMs: 200,
    });

    expect(scheduler.snapshot().x).toEqual({
      queued: 0,
      running: 0,
      pending: 2,
    });

    jest.advanceTimersByTime(201);
    expect(scheduler.snapshot().x.queued).toBeGreaterThanOrEqual(0);
  });

  test("addQueue does not overwrite existing queue", () => {
    scheduler.addQueue("test", 2);
    const original = scheduler.snapshot().test;
    scheduler.addQueue("test", 99); // should not change
    const after = scheduler.snapshot().test;
    expect(after).toEqual(original);
  });

  test("dedupeKey is cleared after task finishes", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "d1", task, dedupeKey: "key1" });

    jest.runAllTimers();
    await Promise.resolve();

    expect(scheduler["deduping"].has("key1")).toBe(false); // Internal check
  });

  test("middleware receives meta in context", async () => {
    const seenMeta: string[] = [];

    scheduler.use(async (ctx: MiddlewareContext<Record<string, any>>, next) => {
      seenMeta.push(ctx.meta?.source);
      await next();
    });

    const task = jest.fn().mockResolvedValue("ok");

    scheduler.request({
      id: "meta",
      task,
      meta: { source: "test-suite" },
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(seenMeta).toContain("test-suite");
  });

  test("addQueue does not overwrite existing group queue", () => {
    scheduler.addQueue("repeated", 1);
    const original = scheduler.snapshot()["repeated"];
    scheduler.addQueue("repeated", 99); // Should be ignored
    const after = scheduler.snapshot()["repeated"];
    expect(after).toEqual(original);
  });

  test("dedupeKey is removed after successful task", async () => {
    const task = jest.fn().mockResolvedValue("done");
    scheduler.request({ id: "dedupe-finally", task, dedupeKey: "fkey1" });

    jest.runAllTimers();
    await Promise.resolve();

    expect(scheduler["deduping"].has("fkey1")).toBe(false);
  });

  test("dedupeKey is removed after failed task", async () => {
    const task = jest.fn().mockRejectedValue(new Error("fail"));
    scheduler.request({ id: "dedupe-error", task, dedupeKey: "fkey2" });

    jest.runAllTimers();
    await Promise.resolve();

    expect(scheduler["deduping"].has("fkey2")).toBe(false);
  });

  test("abortController is deleted after task runs", async () => {
    const task = jest.fn().mockResolvedValue("finished");
    scheduler.request({ id: "abort-test", task });

    jest.runAllTimers();
    await Promise.resolve();

    const keys = Array.from(scheduler["abortControllers"].keys());
    expect(keys.find((k) => k.endsWith(":abort-test"))).toBeUndefined();
  });

  test("meta is received by middleware", async () => {
    const seen: string[] = [];
    scheduler.use(async (ctx, next) => {
      if (ctx.meta?.source) seen.push(ctx.meta.source);
      await next();
    });

    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({
      id: "with-meta",
      task,
      meta: { source: "unit-test" },
    });

    jest.runAllTimers();
    await Promise.resolve();
    expect(seen).toContain("unit-test");
  });

  test("can remove event listener with off()", () => {
    const handler = jest.fn();
    scheduler.on("start", handler);
    scheduler.off("start", handler); // Line 51

    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "off-test", task });

    jest.runAllTimers();
    expect(handler).not.toHaveBeenCalled();
  });

  test("request is skipped if circuit breaker is open", async () => {
    scheduler.configureGroup("cb-test", { maxFailures: 1, cooldownMs: 1000 });

    const failingTask = () => Promise.reject("fail");
    scheduler.request({ id: "fail1", group: "cb-test", task: failingTask });

    jest.runAllTimers();
    await Promise.resolve(); // allow task to fail

    // This task should now be skipped due to open circuit
    const task = jest.fn();
    scheduler.request({ id: "shouldSkip", group: "cb-test", task });

    jest.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });

  test("does not enqueue if delay already pending", () => {
    const task = jest.fn();
    scheduler.request({ id: "delay-test", task, delay: 100 });

    scheduler.request({ id: "delay-test", task, delay: 100 }); // Line 99 path
    jest.advanceTimersByTime(100);

    expect(task).toHaveBeenCalledTimes(1);
  });

  test("uses runWhenIdle when idle = true", async () => {
    const spy = jest
      .spyOn(global, "requestIdleCallback")
      .mockImplementation((cb) => {
        cb({ didTimeout: false, timeRemaining: () => 50 });
        return 1;
      });

    const task = jest.fn().mockResolvedValue("done");
    scheduler.request({ id: "idle-run", task, idle: true });

    jest.runAllTimers();
    await Promise.resolve();
    expect(task).toHaveBeenCalled();

    spy.mockRestore();
  });

  test("cancel deletes abortController", () => {
    const task = jest.fn().mockResolvedValue("done");
    scheduler.request({ id: "abort-test", task });

    const controllerId = [...scheduler["abortControllers"].keys()].find((k) =>
      k.endsWith(":abort-test")
    );
    expect(controllerId).toBeDefined();

    scheduler.cancel({ id: "abort-test" }); // Hits 193, 196–197
    expect(scheduler["abortControllers"].has(controllerId!)).toBe(false);
  });

  test("cancelGroup deletes abortControllers", () => {
    const task = jest.fn().mockResolvedValue("done");
    scheduler.request({ id: "g1-item", task, group: "g1" });

    scheduler.cancelGroup("g1"); // Line 212
    const hasAny = [...scheduler["abortControllers"].keys()].some((k) =>
      k.startsWith("g1:")
    );
    expect(hasAny).toBe(false);
  });

  test("cancel with non-matching ID should not crash", () => {
    // Ensure no pending tasks for the ID
    expect(() => {
      scheduler.cancel({ id: "nonexistent-id" });
    }).not.toThrow();
  });

  test("cancel using only dedupeKey clears deduping set", () => {
    // Schedule immediately so dedupeKey is added
    scheduler.request({
      id: "d1",
      task: async () => {},
      dedupeKey: "dedupe-test",
    });

    // At this point, we should be deduping
    expect((scheduler as any).deduping.has("dedupe-test")).toBe(true);

    // Cancel by dedupeKey
    scheduler.cancel({ dedupeKey: "dedupe-test" });

    // Now the dedupeKey should be cleared
    expect((scheduler as any).deduping.has("dedupe-test")).toBe(false);
  });

  test("cancel using only dedupeKey removes task from queue", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({
      id: "x",
      task,
      debounceMs: 1000,
      dedupeKey: "only-key",
    });

    scheduler.cancel({ dedupeKey: "only-key" });
    jest.advanceTimersByTime(1100);
    await Promise.resolve();

    expect(task).not.toHaveBeenCalled();
  });

  test("handles meta without source key", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    scheduler.use(async (ctx, next) => {
      expect(ctx.meta?.note).toBe("branch-test");
      expect(ctx.meta?.source).toBeUndefined(); // This is the key
      await next();
    });

    scheduler.request({
      id: "meta-branch",
      task,
      meta: { note: "branch-test" },
    });

    jest.runAllTimers();
    await Promise.resolve();
    expect(task).toHaveBeenCalled();
  });

  test("handles abortControllers entry with undefined value", () => {
    scheduler["abortControllers"].set("default:test", undefined as any);

    expect(() => scheduler.cancel({ id: "test" })).not.toThrow();
    expect(scheduler["abortControllers"].has("default:test")).toBe(false);
  });

  test("respects autoPriority callback", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    const autoPriority = jest.fn(() => 42);

    scheduler.request({
      id: "auto-pri",
      task,
      autoPriority,
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(autoPriority).toHaveBeenCalled(); // confirms the true branch
    expect(task).toHaveBeenCalled();
  });
});
