import { withTimeout, runWhenIdle } from "../../src/core/taskUtils";

jest.useFakeTimers();

describe("taskUtils", () => {
  test("withTimeout resolves if task completes in time", async () => {
    const task = new Promise((res) => setTimeout(() => res("ok"), 10));
    const resultPromise = withTimeout(task, 100, "fast");

    jest.advanceTimersByTime(11);
    await expect(resultPromise).resolves.toBe("ok");
  });

  test("withTimeout rejects if task exceeds timeout", async () => {
    const task = new Promise((res) => setTimeout(() => res("slow"), 100));
    const resultPromise = withTimeout(task, 50, "timeout");
    jest.advanceTimersByTime(51);
    await expect(resultPromise).rejects.toThrow(/Timeout: timeout/);
  });

  test("runWhenIdle uses requestIdleCallback if available", async () => {
    const spy = jest.fn((cb) =>
      cb({ didTimeout: false, timeRemaining: () => 50 })
    );
    global.requestIdleCallback = spy;
    await runWhenIdle();
    expect(spy).toHaveBeenCalled();
  });

  test("runWhenIdle falls back to setTimeout if requestIdleCallback is not available", async () => {
    const original = global.requestIdleCallback;
    // @ts-ignore
    delete global.requestIdleCallback;
    const setTimeoutSpy = jest.spyOn(global, "setTimeout");
    await runWhenIdle();
    expect(setTimeoutSpy).toHaveBeenCalled();
    global.requestIdleCallback = original;
  }, 10000);
});
