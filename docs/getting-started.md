# 🚀 Getting Started with prioriq

**prioriq** is a TypeScript-first task scheduling utility designed to coordinate async operations in a React application. It supports intelligent task queues, debouncing, deduplication, cancellation, circuit breakers, and more.

---

## 📦 Installation

```bash
npm install prioriq
```

Or using yarn:

```bash
yarn add prioriq
```

---

## 🧠 Basic Usage

```ts
import { TaskScheduler } from "prioriq";

const scheduler = new TaskScheduler();

// Create a queue with concurrency 3
scheduler.addQueue("visits", 3);

// Request a task
scheduler.request({
  id: "v123",
  task: () => fetchVisit(123),
  group: "visits",
  delay: 300,
  dedupeKey: "visit:123",
});
```

This will schedule `fetchVisit(123)` into the `visits` queue after 300ms, and will ignore further requests with the same `dedupeKey` if already queued or running.

---

## 🧩 Features in One Glance

| Feature           | Usage Example                                |
| ----------------- | -------------------------------------------- |
| `delay`           | Waits N ms before adding to the queue        |
| `debounceMs`      | Ignores repeated requests within N ms        |
| `dedupeKey`       | Ensures only one active task per key         |
| `timeoutMs`       | Aborts if task exceeds time limit            |
| `idle: true`      | Waits for `requestIdleCallback` availability |
| `meta`            | Pass additional context to middleware/events |
| `cancel()`        | Cancel by `id` or `dedupeKey`                |
| `cancelGroup()`   | Cancel all scheduled in a queue              |
| `Circuit Breaker` | Prevents task flood after N failures         |

---

## 🧩 React Usage (Optional)

```tsx
import { useTaskScheduler } from "prioriq/react";

const { queued, running, pending } = useTaskScheduler(scheduler, "visits");
```

---

## 🧪 Testing and Debugging

Enable full tracing:

```ts
scheduler.on("start", (e) => console.log("Start:", e));
scheduler.on("finish", (e) => console.log("Finish:", e));
scheduler.on("error", (e) => console.error("Error:", e));
```

---

## 🛠 Best Practices

- Use `dedupeKey` for fetches tied to IDs or queries
- Wrap retry logic inside the task function (middleware supported too)
- Avoid unnecessary debounce or delay combinations
- Set per-group concurrency via `addQueue(group, concurrency)`

---

Next: [API Reference →](https://champ8644.github.io/prioriq/api-reference)
