// test/core/prioriq.cancel.test.ts
import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Cancellation", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("cancel by id aborts the task and clears timeout", () => {
    const task = jest.fn();
    scheduler.request({ id: "x", task, debounceMs: 100 });

    scheduler.cancel({ id: "x" });

    const key = "default:x";
    expect((scheduler as any).pending.has(key)).toBe(false);
    expect((scheduler as any).abortControllers.size).toBe(0);
  });

  test("cancel by dedupeKey clears deduping state", () => {
    scheduler.request({
      id: "a",
      task: async () => {},
      dedupeKey: "k",
      debounceMs: 100,
    });

    scheduler.cancel({ dedupeKey: "k" });

    expect((scheduler as any)["deduping"].has("k")).toBe(false);
    expect((scheduler as any)["dedupeKeyMap"].has("k")).toBe(false);
  });

  test("cancelGroup clears all pending timers", () => {
    scheduler.request({
      id: "a",
      task: async () => {},
      group: "g1",
      debounceMs: 300,
    });

    scheduler.request({
      id: "b",
      task: async () => {},
      group: "g1",
      debounceMs: 300,
    });

    scheduler.cancelGroup("g1");

    expect((scheduler as any).pending.size).toBe(0);
  });

  test("cancelGroup removes abortControllers", () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "t", task, group: "g1" });

    scheduler.cancelGroup("g1");

    const keys = [...(scheduler as any)["abortControllers"].keys()] as string[];
    expect(keys.some((k) => k.startsWith("g1:"))).toBe(false);
  });

  test("handles abortControllers entry with undefined safely", () => {
    (scheduler as any)["abortControllers"].set("default:x", undefined);

    expect(() => scheduler.cancel({ id: "x" })).not.toThrow();
    expect((scheduler as any)["abortControllers"].has("default:x")).toBe(false);
  });

  test("cancel with non-existent ID does not throw", () => {
    expect(() => {
      scheduler.cancel({ id: "nonexistent" });
    }).not.toThrow();
  });
});
