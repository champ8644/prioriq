# 📚 API Reference

## TaskScheduler

```ts
new TaskScheduler(defaultConcurrency?: number)
```

### .addQueue(group, concurrency)

Create an isolated task queue.

### .request(options)

Schedule a task. Supports:

- `delay`, `debounceMs`
- `dedupeKey`
- `priority`, `idle`, `timeoutMs`
- `meta`, `autoPriority`

### .cancel({ id?, dedupeKey? })

Cancel a pending task.

### .cancelGroup(group)

Cancel all delayed/debounced tasks in a group.

### .configureGroup(group, { maxFailures, cooldownMs })

Enable circuit breaker logic for the group.

### .use(middleware)

Add a middleware function to wrap all tasks.

### .snapshot()

Get the current state of all queues.
