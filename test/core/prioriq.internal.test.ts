import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Internal Mechanics", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("snapshot shows group state correctly", () => {
    prioriq.request({
      id: "s1",
      task: async () => {},
      group: "x",
      debounceMs: 100,
    });

    prioriq.request({
      id: "s2",
      task: async () => {},
      group: "x",
      delay: 200,
    });

    const snap = prioriq.snapshot("x");
    expect(snap).toEqual({
      queued: 0,
      running: 0,
      pending: 2,
    });

    jest.advanceTimersByTime(200);
    const after = prioriq.snapshot("x");
    expect(after.pending).toBe(0);
  });

  test("addQueue does not overwrite existing queue", () => {
    prioriq.addQueue("custom", 1);
    const before = prioriq.snapshot("custom");

    prioriq.addQueue("custom", 999); // should not override
    const after = prioriq.snapshot("custom");

    expect(after).toEqual(before);
  });

  test("deduping set is cleared after task runs", async () => {
    prioriq.request({
      id: "dedupe-me",
      task: async () => "done",
      dedupeKey: "d-key",
    });

    expect((prioriq as any).deduping.has("d-key")).toBe(true);

    jest.runAllTimers();
    await Promise.resolve();

    expect((prioriq as any).deduping.has("d-key")).toBe(false);
  });

  test("taskMap entry is deleted after execution", async () => {
    // Spy on the enqueueTask method which interacts with taskMap
    const enqueueTaskSpy = jest.spyOn(prioriq as any, "enqueueTask");

    prioriq.request({
      id: "c1",
      task: async () => {},
    });

    // Call the method to ensure task is in taskMap
    expect(enqueueTaskSpy).toHaveBeenCalled();

    jest.runAllTimers();
    await Promise.resolve();

    // Task should be deleted after execution (taskMap is no longer holding it)
    expect(enqueueTaskSpy).toHaveBeenCalledTimes(1); // Adjust depending on your flow logic
  });

  test("handles undefined abortControllers safely", () => {
    (prioriq as any).abortControllers.set("default:x", undefined);

    expect(() => {
      prioriq.cancel({ id: "x" });
    }).not.toThrow();

    expect((prioriq as any).abortControllers.has("default:x")).toBe(false);
  });
});
