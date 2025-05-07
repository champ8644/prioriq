import { TaskScheduler } from "../src/scheduler/TaskScheduler";
import type { MiddlewareContext } from "../src/scheduler/types";

jest.useFakeTimers();

describe("TaskScheduler - Middleware", () => {
  let scheduler: TaskScheduler;

  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  test("middleware is executed before and after task", async () => {
    const logs: string[] = [];
    scheduler.use(async (ctx, next) => {
      logs.push(`before:${ctx.id}`);
      await next();
      logs.push(`after:${ctx.id}`);
    });

    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({ id: "m1", task });

    jest.runAllTimers();
    await Promise.resolve();

    expect(logs).toEqual(["before:m1", "after:m1"]);
  });

  test("middleware receives meta in context", async () => {
    const seenMeta: string[] = [];

    scheduler.use(async (ctx: MiddlewareContext<Record<string, any>>, next) => {
      seenMeta.push(ctx.meta?.source);
      await next();
    });

    const task = jest.fn().mockResolvedValue("ok");

    scheduler.request({
      id: "meta",
      task,
      meta: { source: "test-suite" },
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(seenMeta).toContain("test-suite");
  });

  test("meta is received by middleware", async () => {
    const seen: string[] = [];
    scheduler.use(async (ctx, next) => {
      if (ctx.meta?.source) seen.push(ctx.meta.source);
      await next();
    });

    const task = jest.fn().mockResolvedValue("ok");
    scheduler.request({
      id: "with-meta",
      task,
      meta: { source: "unit-test" },
    });

    jest.runAllTimers();
    await Promise.resolve();
    expect(seen).toContain("unit-test");
  });

  test("handles meta without source key", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    scheduler.use(async (ctx, next) => {
      expect(ctx.meta?.note).toBe("branch-test");
      expect(ctx.meta?.source).toBeUndefined();
      await next();
    });

    scheduler.request({
      id: "meta-branch",
      task,
      meta: { note: "branch-test" },
    });

    jest.runAllTimers();
    await Promise.resolve();
    expect(task).toHaveBeenCalled();
  });
});
