# ⚛️ React Hook Integration Demo

This page demonstrates how to integrate `prioriq` with React apps using `useTaskScheduler`.

---

## 🧩 `useTaskScheduler(scheduler, group)`

This hook allows you to observe queue state reactively in a component.

```tsx
import { useTaskScheduler } from "prioriq/react";

const VisitLoader = ({
  id,
  scheduler,
}: {
  id: string;
  scheduler: TaskScheduler;
}) => {
  const { queued, running, pending } = useTaskScheduler(scheduler, "visits");

  return (
    <div>
      <p>Queued: {queued}</p>
      <p>Running: {running}</p>
      <p>Pending: {pending}</p>
    </div>
  );
};
```

---

## 👀 Lazy Scheduling with `scheduleWhenVisible`

This helper schedules a task when an element becomes visible (IntersectionObserver-based).

```tsx
import { scheduleWhenVisible } from "prioriq/react";

const handleVisibility = (
  entry: IntersectionObserverEntry | null,
  id: string
) => {
  scheduleWhenVisible(
    entry?.isIntersecting,
    "visits",
    id,
    () => fetch(`/api/visit/${id}`),
    scheduler
  );
};
```

You can integrate this with libraries like `react-intersection-observer` or `react-virtual`.

---

## ✅ React Example Recap

- `useTaskScheduler(scheduler, group)` provides reactive queue state.
- `scheduleWhenVisible(...)` lets you queue tasks when content scrolls into view.
- All task states (`queued`, `pending`, `running`) update live per group.

---

## 📚 See Also

- [API Reference →](../api-reference)
- [Getting Started →](../getting-started)
