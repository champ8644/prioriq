# 🚀 Getting Started

## Installation

```bash
npm install prioriq
```

## Basic Usage

```ts
import { TaskScheduler } from 'prioriq';

const scheduler = new TaskScheduler();
scheduler.addQueue('visits', 3);

scheduler.request({
  id: 'v1',
  group: 'visits',
  task: () => fetchVisit(),
  delay: 200,
});
```

## With React

```tsx
const { queued, running, pending } = useTaskScheduler(scheduler, 'visits');
```