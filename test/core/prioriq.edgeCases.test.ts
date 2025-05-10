import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Edge Cases & Regression", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("cancelling nonexistent ID does not throw", () => {
    expect(() => {
      scheduler.cancel({ id: "nonexistent" });
    }).not.toThrow();
  });

  test("cancel using only dedupeKey removes from deduping set", () => {
    scheduler.request({
      id: "x1",
      task: async () => {},
      dedupeKey: "dedupe-test",
      debounceMs: 100,
    });

    scheduler.cancel({ dedupeKey: "dedupe-test" });
    expect((scheduler as any).deduping.has("dedupe-test")).toBe(false);
  });

  test("cancel using only dedupeKey prevents execution", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    scheduler.request({
      id: "x2",
      task,
      dedupeKey: "cancelled-task",
      debounceMs: 100,
    });

    scheduler.cancel({ dedupeKey: "cancelled-task" });
    jest.advanceTimersByTime(200);
    await Promise.resolve();

    expect(task).not.toHaveBeenCalled();
  });

  test("request skips enqueue if delay is already pending", () => {
    const task = jest.fn();
    scheduler.request({ id: "delay-test", task, delay: 100 });
    scheduler.request({ id: "delay-test", task, delay: 100 }); // ignored

    jest.advanceTimersByTime(100);
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("request is blocked if circuit breaker is open", async () => {
    scheduler.configureGroup("breaker", { maxFailures: 1, cooldownMs: 500 });

    scheduler.request({
      id: "fail1",
      group: "breaker",
      task: () => Promise.reject("fail"),
    });

    jest.runAllTimers();
    await Promise.resolve();

    const task = jest.fn();
    scheduler.request({ id: "blocked", group: "breaker", task });

    jest.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });

  test("handles abortController map with undefined entry", () => {
    (scheduler as any).abortControllers.set("default:test", undefined);

    expect(() => scheduler.cancel({ id: "test" })).not.toThrow();
    expect((scheduler as any).abortControllers.has("default:test")).toBe(false);
  });
});
