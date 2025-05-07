import { TaskScheduler } from "../src/scheduler/TaskScheduler";

jest.useFakeTimers();

describe("TaskScheduler - Circuit Breaker", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
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

    jest.runAllTimers();
    await new Promise((r) => setImmediate(r));

    expect(fail).toHaveBeenCalledTimes(2);
  });

  test("request is skipped if circuit breaker is open", async () => {
    scheduler.configureGroup("cb-test", { maxFailures: 1, cooldownMs: 1000 });

    const failingTask = () => Promise.reject("fail");
    scheduler.request({ id: "fail1", group: "cb-test", task: failingTask });

    jest.runAllTimers();
    await Promise.resolve();

    const task = jest.fn();
    scheduler.request({ id: "shouldSkip", group: "cb-test", task });

    jest.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });
});

describe("TaskScheduler - Cancellation", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  test("cancelGroup aborts all pending tasks", () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "x1", task, group: "g", debounceMs: 300 });
    scheduler.request({ id: "x2", task, group: "g", debounceMs: 300 });

    scheduler.cancelGroup("g");
    jest.advanceTimersByTime(400);

    expect(task).not.toHaveBeenCalled();
  });

  test("cancel deletes abortController", () => {
    const task = jest.fn().mockResolvedValue("done");
    scheduler.request({ id: "abort-test", task });

    const controllerId = [...scheduler["abortControllers"].keys()].find((k) =>
      k.endsWith(":abort-test")
    );
    expect(controllerId).toBeDefined();

    scheduler.cancel({ id: "abort-test" });
    expect(scheduler["abortControllers"].has(controllerId!)).toBe(false);
  });

  test("cancelGroup deletes abortControllers", () => {
    const task = jest.fn().mockResolvedValue("done");
    scheduler.request({ id: "g1-item", task, group: "g1" });

    scheduler.cancelGroup("g1");
    const hasAny = [...scheduler["abortControllers"].keys()].some((k) =>
      k.startsWith("g1:")
    );
    expect(hasAny).toBe(false);
  });

  test("cancel with non-matching ID should not crash", () => {
    expect(() => {
      scheduler.cancel({ id: "nonexistent-id" });
    }).not.toThrow();
  });

  test("cancel using only dedupeKey clears deduping set", () => {
    scheduler.request({
      id: "d1",
      task: async () => {},
      dedupeKey: "dedupe-test",
    });

    expect((scheduler as any).deduping.has("dedupe-test")).toBe(true);

    scheduler.cancel({ dedupeKey: "dedupe-test" });
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

  test("handles abortControllers entry with undefined value", () => {
    scheduler["abortControllers"].set("default:test", undefined as any);

    expect(() => scheduler.cancel({ id: "test" })).not.toThrow();
    expect(scheduler["abortControllers"].has("default:test")).toBe(false);
  });
});
