import { composeMiddleware } from "../../src/core/middleware";
import type { MiddlewareContext } from "../../src/core/types";

describe("composeMiddleware", () => {
  test("executes middleware in declared order", async () => {
    const log: string[] = [];

    const composed = composeMiddleware([
      async (ctx, next) => {
        log.push("m1:before");
        await next();
        log.push("m1:after");
      },
      async (ctx, next) => {
        log.push("m2:before");
        await next();
        log.push("m2:after");
      },
    ]);

    await composed({ id: "t" } as MiddlewareContext, async () => {
      log.push("task");
    });

    expect(log).toEqual([
      "m1:before",
      "m2:before",
      "task",
      "m2:after",
      "m1:after",
    ]);
  });

  test("throws if next() is called multiple times", async () => {
    const composed = composeMiddleware([
      async (ctx, next) => {
        await next();
        await next(); // illegal second call
      },
    ]);

    await expect(
      composed({ id: "err" } as MiddlewareContext, async () => {})
    ).rejects.toThrow(/next\(\) called multiple times/);
  });
});
