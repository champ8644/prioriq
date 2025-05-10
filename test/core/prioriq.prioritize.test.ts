import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - prioritize()", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });
  test("prioritize updates priority in queue", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    scheduler.addQueue("g1", 1);

    scheduler.request({
      id: "a",
      group: "g1",
      priority: 10,
      task,
      delay: 1000, // stay in pending
    });

    scheduler.prioritize("a", 1, "g1");

    const queue: any = (scheduler as any)["queues"].get("g1");
    const rawQueue: any[] = Array.from(queue._queue ?? queue.queue ?? []);
    const inQueue = rawQueue.find((t: any) => t.options?.id === "a");

    expect(inQueue?.priority).toBe(1);
  });

  test("prioritize emits 'updated' event", () => {
    const updates: any[] = [];

    scheduler.on("updated", (e) => updates.push(e));

    scheduler.addQueue("g", 1);
    scheduler.request({
      id: "x",
      group: "g",
      priority: 5,
      task: async () => {},
      delay: 1000,
    });

    scheduler.prioritize("x", 2, "g");

    expect(updates).toEqual([{ group: "g", id: "x", priority: 2 }]);
  });

  test("prioritize does nothing if group not found", () => {
    expect(() => scheduler.prioritize("y", 3, "missing")).not.toThrow();
  });
});
