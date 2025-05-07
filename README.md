# 🧠 prioriq

[![CI](https://github.com/champ8644/prioriq/actions/workflows/ci.yml/badge.svg)](https://github.com/champ8644/prioriq/actions)
[![Coverage](https://codecov.io/gh/champ8644/prioriq/branch/main/graph/badge.svg)](https://codecov.io/gh/champ8644/prioriq)
![npm version](https://img.shields.io/npm/v/prioriq)
![bundlephobia](https://badgen.net/bundlephobia/minzip/prioriq)
![MIT License](https://img.shields.io/npm/l/prioriq)

> Intelligent async task coordination for React apps — with queues, debouncing, deduplication, idle handling, and more.

---

## 📦 Install

```bash
npm install prioriq
```

---

## 🚀 Features

- ⏳ Delay & debounce (per task)
- 🧠 Deduplication with \`dedupeKey\`
- 🧩 Express-like middleware
- ⏱ Timeout, \`requestIdleCallback\`, abort/cancel
- 🔄 Circuit breaker & error cooldowns
- 🔍 React hook integration + devtools-ready

---

## 🛠 Quick Example

\`\`\`ts
const scheduler = new TaskScheduler();

scheduler.addQueue('visits', 3);

scheduler.request({
id: 'v123',
task: () => fetchVisit(123),
delay: 200,
dedupeKey: 'visit:123'
});
\`\`\`

---

## 🧩 React Integration

\`\`\`tsx
const { queued, running, pending } = useTaskScheduler(scheduler, 'visits');

scheduleWhenVisible(
entry?.isIntersecting,
'visits',
id,
() => fetchVisit(id),
scheduler
);
\`\`\`

---

## 📚 Documentation

- [Getting Started](https://champ8644.github.io/prioriq/getting-started)
- [API Reference](https://champ8644.github.io/prioriq/api-reference)
- [React Hooks](https://champ8644.github.io/prioriq/examples/react-hook-demo)

> Or explore \`/docs/\` folder for GitHub Pages setup.

---

## 🧪 Test & Build

\`\`\`bash
npm run build
npm test
npm run release # via standard-version
\`\`\`

---

## 🔗 Related Tools

- [\`p-queue\`](https://www.npmjs.com/package/p-queue) — Underlying queue runner
- [\`mitt\`](https://www.npmjs.com/package/mitt\) — Lightweight event system

---

## 📜 License

MIT — Use freely, modify responsibly.
