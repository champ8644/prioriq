import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Edge Cases & Regression", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("cancelling nonexistent ID does not throw", () => {
    expect(() => {
      prioriq.cancel({ id: "nonexistent" });
    }).not.toThrow();
  });

  test("cancel using only dedupeKey removes from deduping set", () => {
    prioriq.request({
      id: "x1",
      task: async () => {},
      dedupeKey: "dedupe-test",
      debounceMs: 100,
    });

    prioriq.cancel({ dedupeKey: "dedupe-test" });
    expect((prioriq as any).deduping.has("dedupe-test")).toBe(false);
  });

  test("cancel using only dedupeKey prevents execution", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    prioriq.request({
      id: "x2",
      task,
      dedupeKey: "cancelled-task",
      debounceMs: 100,
    });

    prioriq.cancel({ dedupeKey: "cancelled-task" });
    jest.advanceTimersByTime(200);
    await Promise.resolve();

    expect(task).not.toHaveBeenCalled();
  });

  test("request skips enqueue if delay is already pending", () => {
    const task = jest.fn();
    prioriq.request({ id: "delay-test", task, delay: 100 });
    prioriq.request({ id: "delay-test", task, delay: 100 }); // ignored

    jest.advanceTimersByTime(100);
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("request is blocked if circuit breaker is open", async () => {
    prioriq.configureGroup("breaker", { maxFailures: 1, cooldownMs: 500 });

    prioriq.request({
      id: "fail1",
      group: "breaker",
      task: () => Promise.reject("fail"),
    });

    jest.runAllTimers();
    await Promise.resolve();

    const task = jest.fn();
    prioriq.request({ id: "blocked", group: "breaker", task });

    jest.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });

  test("handles abortController map with undefined entry", () => {
    (prioriq as any).abortControllers.set("default:test", undefined);

    expect(() => prioriq.cancel({ id: "test" })).not.toThrow();
    expect((prioriq as any).abortControllers.has("default:test")).toBe(false);
  });
});
