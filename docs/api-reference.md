# 📘 API Reference

This document outlines the full API surface of the `prioriq` package.

---

## 📚 Table of Contents

- [🔧 TaskScheduler Class](#-taskscheduler-class)

  - [`constructor`](#constructorconcurrency--4)
  - [`addQueue`](#addqueuegroup-string-concurrency--thisdefaultconcurrency)
  - [`request`](#requestoptions-requestoptions)
  - [`cancel`](#cancel-id-dedupekey)
  - [`cancelGroup`](#cancelgroupgroup-string)
  - [`use`](#usemiddleware-middleware)
  - [`configureGroup`](#configuregroupgroup-string--maxfailures-cooldownms-)
  - [`snapshot`](#snapshot-recordstring--queued-number-running-number-pending-number-)
  - [`on / off`](#oneventtype-handler--offeventtype-handler)

- [📦 RequestOptions Interface](#-requestoptions-interface)
- [📂 MiddlewareContext](#-middlewarecontext)
- [🔔 Events](#-events)

---

## 🔧 `TaskScheduler` Class

### `constructor(concurrency = 4)`

Creates a new scheduler instance with default concurrency (used by groups without explicit settings).

---

### `addQueue(group: string, concurrency = this.defaultConcurrency)`

Registers a queue for a task group.

```ts
scheduler.addQueue("visits", 3);
```

---

### `request(options: RequestOptions)`

Schedules a task. Supports delay, debounce, deduplication, idle, priority, and more.

```ts
scheduler.request({
  id: "fetch-x",
  task: () => fetch("/api/x"),
  group: "data",
  delay: 100,
  debounceMs: 300,
  dedupeKey: "fetch:/api/x",
  timeoutMs: 5000,
  meta: { source: "homepage" },
});
```

---

### `cancel({ id?, dedupeKey? })`

Cancels a task by its `id` or `dedupeKey`.

```ts
scheduler.cancel({ id: "fetch-x" });
scheduler.cancel({ dedupeKey: "fetch:/api/x" });
```

---

### `cancelGroup(group: string)`

Cancels all pending/delayed tasks within a group.

```ts
scheduler.cancelGroup("visits");
```

---

### `use(middleware: Middleware)`

Adds a middleware layer (Express-style).

```ts
scheduler.use(async (ctx, next) => {
  console.log("Before", ctx.id);
  await next();
  console.log("After", ctx.id);
});
```

---

### `configureGroup(group: string, { maxFailures, cooldownMs })`

Enables a circuit breaker for a group. Once a group hits `maxFailures`, all requests will be ignored for `cooldownMs`.

```ts
scheduler.configureGroup("api", {
  maxFailures: 3,
  cooldownMs: 5000,
});
```

---

### `snapshot(): Record<string, { queued: number; running: number; pending: number }>`

Returns internal state of each group (useful for dashboards).

```ts
const state = scheduler.snapshot();
```

---

### `on(eventType, handler) / off(eventType, handler)`

Subscribe/unsubscribe to task lifecycle events.

```ts
scheduler.on("start", ({ id }) => {});
scheduler.on("finish", ({ id }) => {});
scheduler.on("error", ({ id, error }) => {});
```

---

## 📦 RequestOptions Interface

```ts
interface RequestOptions {
  id: string;
  task: () => Promise<any>;
  group?: string;
  priority?: number;
  delay?: number;
  debounceMs?: number;
  dedupeKey?: string;
  timeoutMs?: number;
  autoPriority?: () => number;
  idle?: boolean;
  meta?: Record<string, any>;
}
```

---

## 📂 MiddlewareContext

```ts
interface MiddlewareContext<Meta extends Record<string, any> = any> {
  id: string;
  group: string;
  task: () => Promise<any>;
  dedupeKey?: string;
  meta?: Meta;
}
```

---

## 🔔 Events

- `start`: `{ id: string; group: string }`
- `finish`: `{ id: string; group: string }`
- `error`: `{ id: string; group: string; error: Error }`

---

Next: [React Hooks →](https://champ8644.github.io/prioriq/examples/react-hook-demo)
