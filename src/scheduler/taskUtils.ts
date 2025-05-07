/**
 * Wraps a promise with a timeout. If the promise doesn't resolve in time, it will reject.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  id: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Task ${id} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Utility to delay task execution using requestIdleCallback if available.
 */
export function runWhenIdle(): Promise<void> {
  if (typeof requestIdleCallback === "function") {
    return new Promise((resolve) => requestIdleCallback(() => resolve()));
  }
  return Promise.resolve();
}
