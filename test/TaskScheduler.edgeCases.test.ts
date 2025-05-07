import { TaskScheduler } from "../src/scheduler/TaskScheduler";

jest.useFakeTimers();

describe("TaskScheduler - Edge Cases & Regression", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  test("can remove event listener with off()", () => {
    const handler = jest.fn();
    scheduler.on("start", handler);
    scheduler.off("start", handler);

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
    await Promise.resolve();

    const task = jest.fn();
    scheduler.request({ id: "shouldSkip", group: "cb-test", task });

    jest.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });

  test("does not enqueue if delay already pending", () => {
    const task = jest.fn();
    scheduler.request({ id: "delay-test", task, delay: 100 });
    scheduler.request({ id: "delay-test", task, delay: 100 });

    jest.advanceTimersByTime(100);
    expect(task).toHaveBeenCalledTimes(1);
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

  test("handles meta without source key", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    scheduler.use(async (ctx, next) => {
      expect(ctx.meta?.note).toBe("branch-test");
      expect(ctx.meta?.source).toBeUndefined();
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
});
