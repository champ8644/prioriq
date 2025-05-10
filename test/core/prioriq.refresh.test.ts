import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Refresh", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("refresh re-runs a task with the same id", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    scheduler.request({ id: "x", task });
    jest.runAllTimers();
    await Promise.resolve();

    scheduler.refresh("x");
    jest.runAllTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(2);
  });

  test("refresh works even after cancel", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    scheduler.request({ id: "x", task });
    scheduler.cancel({ id: "x" });

    scheduler.refresh("x");
    jest.runAllTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(2);
  });

  test("refresh throws if no previous request", () => {
    expect(() => scheduler.refresh("missing")).toThrow(
      "No prior request() for id 'missing'"
    );
  });
});
