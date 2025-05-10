import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Snapshot & Group Behavior", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("snapshot reflects pending debounce and delay", () => {
    scheduler.request({
      id: "t1",
      task: async () => {},
      group: "snap",
      debounceMs: 100,
    });

    scheduler.request({
      id: "t2",
      task: async () => {},
      group: "snap",
      delay: 50,
    });

    const snapshot = scheduler.snapshot("snap");
    expect(snapshot).toEqual({
      queued: 0,
      running: 0,
      pending: 2,
    });
  });

  test("snapshot after timers process tasks", () => {
    scheduler.request({
      id: "x",
      task: async () => {},
      group: "g1",
      delay: 200,
    });

    jest.advanceTimersByTime(200);
    expect(scheduler.snapshot("g1").pending).toBe(0);
  });

  test("addQueue does not override existing concurrency", () => {
    scheduler.addQueue("custom", 1);
    const before = scheduler.snapshot("custom");

    scheduler.addQueue("custom", 999);
    const after = scheduler.snapshot("custom");

    expect(after).toEqual(before);
  });

  test("handles abortControllers entry with undefined value", () => {
    scheduler["abortControllers"].set("snap:test", undefined as any);

    expect(() => scheduler.cancel({ id: "test" })).not.toThrow();
    expect(scheduler["abortControllers"].has("snap:test")).toBe(false);
  });
});
