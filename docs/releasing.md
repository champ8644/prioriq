# 🛠 Releasing with Standard Version

This guide explains how to version and release the `prioriq` package using `standard-version`.

---

## ✅ Prerequisites

Install `standard-version`:

```bash
npm install --save-dev standard-version
```

Add this script to your `package.json`:

```json
"scripts": {
  "release": "standard-version"
}
```

Optional: Customize release sections by adding this:

```json
"standard-version": {
  "types": [
    { "type": "feat", "section": "✨ Features" },
    { "type": "fix", "section": "🐛 Bug Fixes" },
    { "type": "docs", "section": "📝 Documentation" },
    { "type": "refactor", "section": "♻️ Code Refactoring" },
    { "type": "test", "section": "✅ Tests" },
    { "type": "chore", "section": "🔧 Chores" }
  ],
  "commitAll": true
}
```

---

## 📐 Conventional Commit Format

Use the following format for commit messages to ensure changelogs are generated correctly:

| Type       | Purpose                               | Example                                            |
| ---------- | ------------------------------------- | -------------------------------------------------- |
| `feat`     | New feature                           | `feat: add autoPriority callback support`          |
| `fix`      | Bug fix                               | `fix: cancel() now respects dedupeKeyMap properly` |
| `docs`     | Documentation updates                 | `docs: finalize API reference`                     |
| `refactor` | Code refactoring (no behavior change) | `refactor: split TaskScheduler tests`              |
| `test`     | Adding or improving tests             | `test: add circuit breaker coverage`               |
| `chore`    | Build process or tool changes         | `chore: configure release script`                  |

---

## 🚀 Release Workflow

1. **Stage your changes:**

```bash
git add .
```

2. **Commit using conventional message:**

```bash
git commit -m "feat: add new scheduling strategy"
```

3. **Trigger release:**

```bash
npm run release
```

> This will:
>
> - Bump the version
> - Update `CHANGELOG.md`
> - Create a Git tag

4. **Push changes and tags:**

```bash
git push --follow-tags origin main
```

---

## 🧩 Manual Version Bump

If needed:

```bash
npm run release -- --release-as patch
npm run release -- --release-as minor
npm run release -- --release-as major
```

---

## 🗃 Example Changelog Output

```md
## [1.2.0] - 2025-05-08

### ✨ Features

- feat: introduce `autoPriority` API

### 📝 Documentation

- docs: restructure `api-reference.md`
- docs: add GitHub Pages badge and link

### ✅ Tests

- test: add timeout and dedupe cleanup tests
```
