import { TaskScheduler } from "../src/scheduler/TaskScheduler";

jest.useFakeTimers();

describe("TaskScheduler - Abort, Idle, and Priority", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  test("abortController is deleted after task runs", async () => {
    const task = jest.fn().mockResolvedValue("finished");
    scheduler.request({ id: "abort-test", task });

    jest.runAllTimers();
    await Promise.resolve();

    const keys = Array.from(scheduler["abortControllers"].keys());
    expect(keys.find((k) => k.endsWith(":abort-test"))).toBeUndefined();
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

  test("cancel with id clears pending timeout", () => {
    const task = jest.fn();
    scheduler.request({ id: "timeout-test", task, debounceMs: 1000 });

    scheduler.cancel({ id: "timeout-test" }); // will match in pending keys
    expect((scheduler as any).pending.size).toBe(0);
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

    expect(autoPriority).toHaveBeenCalled();
    expect(task).toHaveBeenCalled();
  });
});
