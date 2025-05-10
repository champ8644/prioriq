import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Snapshot & Group Behavior", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("snapshot reflects pending debounce and delay", () => {
    prioriq.request({
      id: "t1",
      task: async () => {},
      group: "snap",
      debounceMs: 100,
    });

    prioriq.request({
      id: "t2",
      task: async () => {},
      group: "snap",
      delay: 50,
    });

    const snapshot = prioriq.snapshot("snap");
    expect(snapshot).toEqual({
      queued: 0,
      running: 0,
      pending: 2,
    });
  });

  test("snapshot after timers process tasks", () => {
    prioriq.request({
      id: "x",
      task: async () => {},
      group: "g1",
      delay: 200,
    });

    jest.advanceTimersByTime(200);
    expect(prioriq.snapshot("g1").pending).toBe(0);
  });

  test("addQueue does not override existing concurrency", () => {
    prioriq.addQueue("custom", 1);
    const before = prioriq.snapshot("custom");

    prioriq.addQueue("custom", 999);
    const after = prioriq.snapshot("custom");

    expect(after).toEqual(before);
  });

  test("handles abortControllers entry with undefined value", () => {
    prioriq["abortControllers"].set("snap:test", undefined as any);

    expect(() => prioriq.cancel({ id: "test" })).not.toThrow();
    expect(prioriq["abortControllers"].has("snap:test")).toBe(false);
  });
});
