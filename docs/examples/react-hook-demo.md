# 🧪 React Hook Demo

## `useTaskScheduler()`

```tsx
const { queued, running, pending } = useTaskScheduler(scheduler, 'visits');
```

## `scheduleWhenVisible()`

```tsx
scheduleWhenVisible(
  isVisible,
  'visits',
  visit.id,
  () => fetchVisit(visit.id),
  scheduler
);
```

## `useQueueInspector()`

```tsx
const allQueues = useQueueInspector(scheduler);
```