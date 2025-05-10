import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Abort, Idle, and Priority", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("abortController is deleted after task runs", async () => {
    const task = jest.fn().mockResolvedValue("finished");
    prioriq.request({ id: "abort-test", task });

    jest.runAllTimers();
    await Promise.resolve();

    const controllerMap = (prioriq as any)["abortControllers"] as Map<
      string,
      AbortController
    >;
    const hasKey = [...controllerMap.keys()].some((k) =>
      k.endsWith(":abort-test")
    );
    expect(hasKey).toBe(false);
  });

  test("cancel deletes abortController", () => {
    const task = jest.fn().mockResolvedValue("done");
    prioriq.request({ id: "abort-test", task });

    const controllerId = [...(prioriq as any)["abortControllers"].keys()].find(
      (k) => k.endsWith(":abort-test")
    );
    expect(controllerId).toBeDefined();

    prioriq.cancel({ id: "abort-test" });
    expect((prioriq as any)["abortControllers"].has(controllerId!)).toBe(false);
  });

  test("cancelGroup deletes abortControllers", () => {
    const task = jest.fn().mockResolvedValue("done");
    prioriq.request({ id: "g1-item", task, group: "g1" });

    prioriq.cancelGroup("g1");
    const hasAny = [...(prioriq as any)["abortControllers"].keys()].some((k) =>
      k.startsWith("g1:")
    );
    expect(hasAny).toBe(false);
  });

  test("cancel with id clears pending timeout", () => {
    const task = jest.fn();
    prioriq.request({ id: "timeout-test", task, debounceMs: 1000 });

    prioriq.cancel({ id: "timeout-test" });
    expect((prioriq as any).pending.size).toBe(0);
  });

  test("uses runWhenIdle when idle = true", async () => {
    const spy = jest
      .spyOn(global, "requestIdleCallback")
      .mockImplementation((cb) => {
        cb({ didTimeout: false, timeRemaining: () => 50 });
        return 1;
      });

    const task = jest.fn().mockResolvedValue("done");
    prioriq.request({ id: "idle-run", task, idle: true });

    jest.runAllTimers();
    await Promise.resolve();
    expect(task).toHaveBeenCalled();

    spy.mockRestore();
  });

  test("respects autoPriority callback", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    const autoPriority = jest.fn(() => 42);

    prioriq.request({
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
