// test/core/prioriq.core.test.ts
import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Core Scheduling", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("executes task immediately when no delay or debounce", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    prioriq.request({ id: "immediate", task });

    jest.runAllTimers();
    await Promise.resolve();
    expect(task).toHaveBeenCalled();
  });

  test("respects delay before enqueueing", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    prioriq.request({ id: "delayed", task, delay: 500 });

    jest.advanceTimersByTime(499);
    expect(task).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(task).toHaveBeenCalled();
  });

  test("debounces correctly", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    prioriq.request({ id: "debounced", task, debounceMs: 300 });
    prioriq.request({ id: "debounced", task, debounceMs: 300 });

    jest.advanceTimersByTime(299);
    expect(task).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await Promise.resolve();
    expect(task).toHaveBeenCalledTimes(1);
  });

  test("deduplicates using dedupeKey", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    prioriq.request({ id: "a", task, dedupeKey: "same" });
    prioriq.request({ id: "b", task, dedupeKey: "same" });

    jest.runAllTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(1);
  });

  test("enforces timeoutMs correctly", async () => {
    const longTask = () => new Promise(() => {});
    const rejectSpy = jest.fn();

    prioriq.on("rejected", rejectSpy);

    prioriq.request({
      id: "timeout",
      task: longTask,
      timeoutMs: 300,
    });

    jest.advanceTimersByTime(301);
    await Promise.resolve();

    expect(rejectSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "timeout",
        error: expect.any(Error),
      })
    );
  });

  test("respects autoPriority callback", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    const autoPriority = jest.fn(() => 42);

    prioriq.request({ id: "auto-pri", task, autoPriority });
    jest.runAllTimers();
    await Promise.resolve();

    expect(autoPriority).toHaveBeenCalled();
    expect(task).toHaveBeenCalled();
  });
});
