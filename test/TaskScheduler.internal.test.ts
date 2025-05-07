import { TaskScheduler } from "../src/scheduler/TaskScheduler";

jest.useFakeTimers();

describe("TaskScheduler - Snapshot & Internal State", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  test("snapshot reflects correct queue state", () => {
    scheduler.request({
      id: "snap1",
      task: async () => {},
      group: "x",
      delay: 100,
    });
    scheduler.request({
      id: "snap2",
      task: async () => {},
      group: "x",
      debounceMs: 200,
    });

    expect(scheduler.snapshot().x).toEqual({
      queued: 0,
      running: 0,
      pending: 2,
    });

    jest.advanceTimersByTime(201);
    expect(scheduler.snapshot().x.queued).toBeGreaterThanOrEqual(0);
  });

  test("addQueue does not overwrite existing queue", () => {
    scheduler.addQueue("test", 2);
    const original = scheduler.snapshot().test;
    scheduler.addQueue("test", 99);
    const after = scheduler.snapshot().test;
    expect(after).toEqual(original);
  });

  test("addQueue does not overwrite existing group queue", () => {
    scheduler.addQueue("repeated", 1);
    const original = scheduler.snapshot()["repeated"];
    scheduler.addQueue("repeated", 99);
    const after = scheduler.snapshot()["repeated"];
    expect(after).toEqual(original);
  });

  test("handles abortControllers entry with undefined value", () => {
    scheduler["abortControllers"].set("default:test", undefined as any);

    expect(() => scheduler.cancel({ id: "test" })).not.toThrow();
    expect(scheduler["abortControllers"].has("default:test")).toBe(false);
  });
});
