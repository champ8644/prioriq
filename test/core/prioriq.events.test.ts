import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Event Emission", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("emits 'updated' on priority change", () => {
    const onUpdated = jest.fn();
    scheduler.on("updated", onUpdated);

    scheduler.request({
      id: "prio",
      task: async () => {},
      group: "default",
      delay: 1000, // ensures it's in queue
    });

    scheduler.prioritize("prio", 1);

    expect(onUpdated).toHaveBeenCalledWith({
      group: "default",
      id: "prio",
      priority: 1,
    });
  });

  test("emits 'cancelled' when task is cancelled by ID", () => {
    const onCancelled = jest.fn();
    scheduler.on("cancelled", onCancelled);

    scheduler.request({
      id: "c1",
      task: async () => {},
      group: "default",
      delay: 1000,
    });

    scheduler.cancel({ id: "c1" });

    expect(onCancelled).toHaveBeenCalledWith({
      id: "c1",
      group: "default",
    });
  });

  test("emits 'fulfilled' when task completes", async () => {
    const onFulfilled = jest.fn();
    scheduler.on("fulfilled", onFulfilled);

    scheduler.request({
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
    scheduler.on("rejected", onRejected);

    scheduler.request({
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
