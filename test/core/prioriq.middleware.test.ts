import { Prioriq } from "../../src/core/Prioriq";
import type { MiddlewareContext } from "../../src/core/types";

jest.useFakeTimers();

describe("Prioriq - Middleware", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("executes middleware before and after the task", async () => {
    const log: string[] = [];

    prioriq.use(async (ctx, next) => {
      log.push(`before:${ctx.id}`);
      await next();
      log.push(`after:${ctx.id}`);
    });

    const task = jest.fn().mockResolvedValue("ok");

    prioriq.request({ id: "m1", task });

    jest.runAllTimers();
    await Promise.resolve();

    expect(log).toEqual(["before:m1", "after:m1"]);
    expect(task).toHaveBeenCalled();
  });

  test("middleware receives meta in context", async () => {
    const seen: string[] = [];

    prioriq.use(async (ctx: MiddlewareContext, next) => {
      if (ctx.meta?.source) seen.push(ctx.meta.source);
      await next();
    });

    const task = jest.fn().mockResolvedValue("ok");

    prioriq.request({
      id: "meta-case",
      task,
      meta: { source: "unit-test" },
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(seen).toContain("unit-test");
    expect(task).toHaveBeenCalled();
  });

  test("handles meta without expected fields safely", async () => {
    prioriq.use(async (ctx, next) => {
      expect(ctx.meta?.note).toBe("branch-test");
      expect(ctx.meta?.source).toBeUndefined();
      await next();
    });

    const task = jest.fn().mockResolvedValue("ok");

    prioriq.request({
      id: "meta-fallback",
      task,
      meta: { note: "branch-test" },
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalled();
  });
});
