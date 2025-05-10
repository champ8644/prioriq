import { Prioriq } from "../../src/core/Prioriq";

jest.useFakeTimers();

describe("Prioriq - Circuit Breaker", () => {
  let scheduler: Prioriq;

  beforeEach(() => {
    scheduler = new Prioriq();
  });

  test("circuit breaker suppresses requests after threshold", async () => {
    const fail = jest.fn(() =>
      Promise.resolve().then(() => {
        throw new Error("fail");
      })
    );

    scheduler.addQueue("g1", 1);
    scheduler.configureGroup("g1", { maxFailures: 2, cooldownMs: 1000 });

    scheduler.request({ id: "f1", task: fail, group: "g1" });
    scheduler.request({ id: "f2", task: fail, group: "g1" });
    scheduler.request({ id: "f3", task: fail, group: "g1" });

    jest.runAllTimers();
    await new Promise((r) => setImmediate(r));

    expect(fail).toHaveBeenCalledTimes(2);
  });

  test("request is skipped if circuit breaker is open", async () => {
    scheduler.configureGroup("cb-test", { maxFailures: 1, cooldownMs: 1000 });

    const failingTask = () => Promise.reject("fail");
    scheduler.request({ id: "fail1", group: "cb-test", task: failingTask });

    jest.runAllTimers();
    await Promise.resolve();

    const task = jest.fn();
    scheduler.request({ id: "shouldSkip", group: "cb-test", task });

    jest.runAllTimers();
    expect(task).not.toHaveBeenCalled();
  });
});
