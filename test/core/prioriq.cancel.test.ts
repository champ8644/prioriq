// test/core/prioriq.cancel.test.ts
import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Cancellation", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("cancel by id aborts the task and clears timeout", () => {
    const task = jest.fn();
    prioriq.request({ id: "x", task, debounceMs: 100 });

    prioriq.cancel({ id: "x" });

    const key = "default:x";
    expect((prioriq as any).pending.has(key)).toBe(false);
    expect((prioriq as any).abortControllers.size).toBe(0);
  });

  test("cancel by dedupeKey clears deduping state", () => {
    prioriq.request({
      id: "a",
      task: async () => {},
      dedupeKey: "k",
      debounceMs: 100,
    });

    prioriq.cancel({ dedupeKey: "k" });

    expect((prioriq as any)["deduping"].has("k")).toBe(false);
    expect((prioriq as any)["dedupeKeyMap"].has("k")).toBe(false);
  });

  test("cancelGroup clears all pending timers", () => {
    prioriq.request({
      id: "a",
      task: async () => {},
      group: "g1",
      debounceMs: 300,
    });

    prioriq.request({
      id: "b",
      task: async () => {},
      group: "g1",
      debounceMs: 300,
    });

    prioriq.cancelGroup("g1");

    expect((prioriq as any).pending.size).toBe(0);
  });

  test("cancelGroup removes abortControllers", () => {
    const task = jest.fn().mockResolvedValue("ok");
    prioriq.request({ id: "t", task, group: "g1" });

    prioriq.cancelGroup("g1");

    const keys = [...(prioriq as any)["abortControllers"].keys()] as string[];
    expect(keys.some((k) => k.startsWith("g1:"))).toBe(false);
  });

  test("handles abortControllers entry with undefined safely", () => {
    (prioriq as any)["abortControllers"].set("default:x", undefined);

    expect(() => prioriq.cancel({ id: "x" })).not.toThrow();
    expect((prioriq as any)["abortControllers"].has("default:x")).toBe(false);
  });

  test("cancel with non-existent ID does not throw", () => {
    expect(() => {
      prioriq.cancel({ id: "nonexistent" });
    }).not.toThrow();
  });
});
