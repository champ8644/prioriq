import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - prioritize()", () => {
  let prioriq: Prioriq;

  beforeEach(() => {
    prioriq = new Prioriq();
  });

  test("prioritize updates priority in queue", async () => {
    const task = jest.fn().mockResolvedValue("ok");
    prioriq.addQueue("g1", 1);

    prioriq.request({
      id: "a",
      group: "g1",
      priority: 10,
      task,
      delay: 1000, // stay in pending
    });

    prioriq.prioritize("a", 1, "g1");

    const queue: any = (prioriq as any).queues.get("g1");
    const rawQueue: any[] = Array.from(queue._queue ?? queue.queue ?? []);
    const inQueue = rawQueue.find((t: any) => t.options?.id === "a");

    expect(inQueue?.priority).toBe(1); // Ensure the priority is updated correctly
  });

  test("prioritize emits 'updated' event", () => {
    const updates: any[] = [];

    prioriq.on("updated", (e) => updates.push(e));

    prioriq.addQueue("g", 1);
    prioriq.request({
      id: "x",
      group: "g",
      priority: 5,
      task: async () => {},
      delay: 1000,
    });

    prioriq.prioritize("x", 2, "g");

    expect(updates).toEqual([{ group: "g", id: "x", priority: 2 }]); // Ensure the event is emitted with correct priority
  });

  test("prioritize does nothing if group not found", () => {
    expect(() => prioriq.prioritize("y", 3, "missing")).not.toThrow(); // Ensure no error is thrown for missing group
  });
});
