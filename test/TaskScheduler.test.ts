import { TaskScheduler } from "../src/scheduler/TaskScheduler";

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
    const longTask = jest.fn(() => new Promise((r) => setTimeout(r, 5000)));
    const onError = jest.fn();
    scheduler.on("error", onError);
    scheduler.request({ id: "timeout", task: longTask, timeoutMs: 300 });

    // Advance fake timers by the timeout duration
    jest.advanceTimersByTime(300);
    // Allow the scheduler’s internal promise chain to settle
    await Promise.resolve();

    // The scheduler should have emitted an error event
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        group: "default",
        id: "timeout",
        error: expect.any(Error),
      })
    );
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
    const fail = jest.fn(() => Promise.reject(new Error("fail")));
    scheduler.configureGroup("g1", { maxFailures: 2, cooldownMs: 1000 });

    scheduler.request({ id: "f1", task: fail, group: "g1" });
    scheduler.request({ id: "f2", task: fail, group: "g1" });
    scheduler.request({ id: "f3", task: fail, group: "g1" }); // should be ignored

    jest.runAllTimers();
    await Promise.allSettled([Promise.resolve(), Promise.resolve()]);
    expect(fail).toHaveBeenCalledTimes(2);
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
});
