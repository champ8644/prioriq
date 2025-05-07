import { TaskScheduler } from '../src/scheduler/TaskScheduler';
jest.useFakeTimers();

describe('TaskScheduler', () => {
  let scheduler: TaskScheduler;
  beforeEach(() => {
    scheduler = new TaskScheduler();
  });

  test('executes task immediately', async () => {
    const task = jest.fn().mockResolvedValue('ok');
    scheduler.request({ id: 't1', task });
    jest.runAllTimers();
    await Promise.resolve();
    expect(task).toHaveBeenCalled();
  });

  // ... (other tests from earlier)
});
