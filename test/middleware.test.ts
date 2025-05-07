import { composeMiddleware } from "../src/scheduler/middleware";
import type { MiddlewareContext } from "../src/scheduler/types";

describe("middleware", () => {
  test("composes middleware in order", async () => {
    const calls: string[] = [];

    const composed = composeMiddleware([
      async (ctx, next) => {
        calls.push("m1:before");
        await next();
        calls.push("m1:after");
      },
      async (ctx, next) => {
        calls.push("m2:before");
        await next();
        calls.push("m2:after");
      },
    ]);

    await composed({ id: "test" } as MiddlewareContext, async () => {
      calls.push("task");
    });
    expect(calls).toEqual([
      "m1:before",
      "m2:before",
      "task",
      "m2:after",
      "m1:after",
    ]);
  });

  test("throws if next() is called multiple times", async () => {
    const badMiddleware = composeMiddleware([
      async (ctx, next) => {
        await next();
        await next();
      },
    ]);

    await expect(
      badMiddleware({ id: "x" } as MiddlewareContext, () => Promise.resolve())
    ).rejects.toThrow(/next\(\) called multiple times/);
  });
});
