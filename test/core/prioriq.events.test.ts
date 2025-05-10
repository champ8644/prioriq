import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Event Emission", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("emits 'updated' on priority change", () => {
    const onUpdated = jest.fn();
    prioriq.on("updated", onUpdated);

    // Request the task to be added to the queue
    prioriq.request({
      id: "prio",
      task: async () => {},
      group: "default",
      delay: 1000, // ensures it's in queue
    });

    // Ensure the task has been queued and processed before prioritizing
    jest.runAllTimers(); // Ensure the task is enqueued before prioritizing

    // Prioritize the task
    prioriq.prioritize("prio", 1);

    // Check if the updated event was emitted
    expect(onUpdated).toHaveBeenCalledWith({
      group: "default",
      id: "prio",
      priority: 1,
    });
  });

  test("emits 'cancelled' when task is cancelled by ID", () => {
    const onCancelled = jest.fn();
    prioriq.on("cancelled", onCancelled);

    prioriq.request({
      id: "c1",
      task: async () => {},
      group: "default",
      delay: 1000,
    });

    jest.runAllTimers(); // Ensure the task is queued

    prioriq.cancel({ id: "c1" });

    expect(onCancelled).toHaveBeenCalledWith({
      id: "c1",
      group: "default",
    });
  });

  test("emits 'fulfilled' when task completes", async () => {
    const onFulfilled = jest.fn();
    prioriq.on("fulfilled", onFulfilled);

    prioriq.request({
      id: "done",
      task: async () => "ok",
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(onFulfilled).toHaveBeenCalledWith({
      id: "done",
      group: "default",
      result: "ok",
    });
  });

  test("emits 'rejected' when task throws", async () => {
    const onRejected = jest.fn();
    prioriq.on("rejected", onRejected);

    prioriq.request({
      id: "fail",
      task: async () => {
        throw new Error("fail");
      },
    });

    jest.runAllTimers();
    await Promise.resolve();

    expect(onRejected).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "fail",
        group: "default",
        error: expect.any(Error),
      })
    );
  });
});
