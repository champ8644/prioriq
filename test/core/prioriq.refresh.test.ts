import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Refresh", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("refresh re-runs a task with the same id", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    prioriq.request({ id: "x", task });
    jest.runAllTimers();
    await Promise.resolve();

    prioriq.refresh("x");
    jest.runAllTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(2);
  });

  test("refresh works even after cancel", async () => {
    const task = jest.fn().mockResolvedValue("ok");

    prioriq.request({ id: "x", task });
    prioriq.cancel({ id: "x" });

    prioriq.refresh("x");
    jest.runAllTimers();
    await Promise.resolve();

    expect(task).toHaveBeenCalledTimes(2);
  });

  test("refresh throws if no previous request", () => {
    expect(() => prioriq.refresh("missing")).toThrow(
      "No prior request() for id 'missing'"
    );
  });
});
