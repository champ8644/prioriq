import { TaskScheduler } from "../src/scheduler/TaskScheduler";

jest.useFakeTimers();

describe("TaskScheduler - Basic Scheduling", () => {
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

    await new Promise((r) => setTimeout(r, 350));
    expect(onError).toHaveBeenCalled();

    jest.useFakeTimers();
  });

  test("respects autoPriority callback", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    const autoPriority = jest.fn(() => 42);

    scheduler.request({ id: "auto-pri", task, autoPriority });
    jest.runAllTimers();
    await Promise.resolve();

    expect(autoPriority).toHaveBeenCalled();
    expect(task).toHaveBeenCalled();
  });
});
