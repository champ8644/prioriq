import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Internal Mechanics", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("snapshot shows group state correctly", () => {
    scheduler.request({
      id: "s1",
      task: async () => {},
      group: "x",
      debounceMs: 100,
    });

    scheduler.request({
      id: "s2",
      task: async () => {},
      group: "x",
      delay: 200,
    });

    const snap = scheduler.snapshot("x");
    expect(snap).toEqual({
      queued: 0,
      running: 0,
      pending: 2,
    });

    jest.advanceTimersByTime(200);
    const after = scheduler.snapshot("x");
    expect(after.pending).toBe(0);
  });

  test("addQueue does not overwrite existing queue", () => {
    scheduler.addQueue("custom", 1);
    const before = scheduler.snapshot("custom");

    scheduler.addQueue("custom", 999); // should not override
    const after = scheduler.snapshot("custom");

    expect(after).toEqual(before);
  });

  test("deduping set is cleared after task runs", async () => {
    scheduler.request({
      id: "dedupe-me",
      task: async () => "done",
      dedupeKey: "d-key",
    });

    expect((scheduler as any).deduping.has("d-key")).toBe(true);

    jest.runAllTimers();
    await Promise.resolve();

    expect((scheduler as any).deduping.has("d-key")).toBe(false);
  });

  test("taskCache entry is deleted after execution", async () => {
    scheduler.request({
      id: "c1",
      task: async () => {},
    });

    const key = "default:c1";
    expect((scheduler as any).taskCache.has(key)).toBe(true);

    jest.runAllTimers();
    await Promise.resolve();

    expect((scheduler as any).taskCache.has(key)).toBe(false);
  });

  test("handles undefined abortControllers safely", () => {
    (scheduler as any).abortControllers.set("default:x", undefined);

    expect(() => {
      scheduler.cancel({ id: "x" });
    }).not.toThrow();

    expect((scheduler as any).abortControllers.has("default:x")).toBe(false);
  });
});
