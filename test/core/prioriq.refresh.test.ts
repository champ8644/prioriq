import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Refresh", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("refresh works even after cancel", async () => {
    const task = jest.fn().mockResolvedValue("done");

    // Log to track when the task is executed
    task.mockImplementation(() => {
      console.log("Task executed");
      return "done";
    });

    // Request a task
    prioriq.request({
      id: "x",
      task,
    });

    // Simulate task being cancelled
    prioriq.cancel({ id: "x" });
    console.log("Task cancelled");

    // Call refresh to trigger the task again
    prioriq.refresh("x");
    console.log("Refresh called");

    // Run all timers to process the task
    jest.runAllTimers();
    await Promise.resolve();

    // The task should be called twice — once initially, and once after the refresh
    expect(task).toHaveBeenCalledTimes(2);

    // Log the calls to the task to verify the flow
    console.log(`Task called ${task.mock.calls.length} times`);
  });

  test("refresh throws if no previous request", () => {
    expect(() => prioriq.refresh("missing")).toThrow(
      "No prior request() for id 'missing'"
    );
  });
});
