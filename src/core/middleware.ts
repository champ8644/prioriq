import type { Middleware, MiddlewareContext } from "./types";

/**
 * Composes middleware functions into a single executable function,
 * similar to Koa or Express middleware chains.
 */
export function composeMiddleware(
  middleware: Middleware[]
): (ctx: MiddlewareContext, next: () => Promise<void>) => Promise<void> {
  return function composed(ctx, next) {
    let index = -1;
    return dispatch(0);

    function dispatch(i: number): Promise<void> {
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      index = i;
      const fn = middleware[i] || next;
      return fn(ctx, () => dispatch(i + 1));
    }
  };
}
