import type { Middleware, MiddlewareContext } from "./types";

/**
 * Composes middleware functions into a single executable function,
 * similar to Koa or Express middleware chains.
 */
export function composeMiddleware(
  middlewares: Middleware[],
  ctx: MiddlewareContext
): () => Promise<any> {
  return () => {
    let index = -1;

    const dispatch = (i: number): Promise<any> => {
      if (i <= index) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      index = i;

      const fn = middlewares[i];
      if (!fn) {
        return ctx.task();
      }

      return fn(ctx, () => dispatch(i + 1));
    };

    return dispatch(0);
  };
}
