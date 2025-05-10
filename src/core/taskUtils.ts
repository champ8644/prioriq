export const PRIORITY = {
  HOT: 1,
  WARM: 5,
  COLD: 10,
} as const;

export type PriorityInput = number | keyof typeof PRIORITY;

export function toNumber(input: PriorityInput): number {
  return typeof input === "number" ? input : PRIORITY[input];
}

export function runWhenIdle(): Promise<void> {
  return new Promise((resolve) =>
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback(() => resolve())
      : setTimeout(resolve, 0)
  );
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "task"
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timeout: ${label}`)),
      ms
    );
    promise
      .then((result) => {
        clearTimeout(timeout);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}
