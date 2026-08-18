# 🛡️ `<@deadlock>` Reactive Boundary & Cycle Detection Guide

## Overview

The `<@deadlock>` directive provides compiler-level and runtime protection against **circular reactive update chains** ($A \rightarrow B \rightarrow A$) and infinite state cascades in Avenx.js applications.

When complex reactive graphs, watchers, or shared bridges accidentally trigger each other indefinitely, `<@deadlock>` intercepts the cycle, aborts the microtask queue before the browser thread freezes, logs diagnostic causation traces (`AVX_R18`), and unmounts the deadlocked subtree to display a fallback UI.

---

## 📖 Syntax & Usage

### Basic Usage

```html
<@deadlock name="analytics-dashboard">
  <Sidebar />
  <Content />
  <Stats />
</@deadlock>
```

### With Fallback UI (`<@fallback>`)

```html
<@deadlock name="metrics-panel" action="fallback" maxDepth="10">
  <ChartWidget />
  <DataSummary />

  <@fallback as="err">
    <div class="deadlock-recovery">
      <h3>⚠️ Reactive Cycle Intercepted</h3>
      <p>Boundary: <strong>{{ name }}</strong></p>
      <p>Diagnostic: {{ err.message }}</p>
    </div>
  </@fallback>
</@deadlock>
```

---

## ⚙️ Directive Attributes

| Attribute | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | `"anonymous"` | Identifier for the boundary used in logs and fallback interpolation. |
| `maxDepth` | `number` | `25` (global) | Maximum allowed recursive flush depth before tripping this boundary. |
| `action` | `"abort" \| "fallback" \| "throw"` | `"abort"` | Action taken when a cycle is detected: aborts queue, renders fallback, or raises error. |
| `isolated` | `"true" \| "false"` | `"false"` | If true, isolates the child boundary's bridge access. |

---

## 🔍 Diagnostic Error Codes

### `AVX_R18: REACTIVE_DEADLOCK_DETECTED`

Triggered at runtime when:
1. Microtask scheduler recursion depth exceeds the configured threshold.
2. A single component job is executed repeatedly within one flush cycle.
3. A synchronous watcher cascade loop ($W_1 \rightarrow W_2 \rightarrow W_1$) is detected.

Example Diagnostic Output:
```text
[Avenx Error] [AVX_R18] Circular reactive update chain detected:
  Counter -> Stats -> Counter
Execution aborted to prevent browser freeze.
```

### `AVX_W35: COMPILER_DEADLOCK_PARSE_FAILED`

Triggered during compilation if `<@deadlock>` tags are malformed or missing matching closing tags.

---

## 🛠️ Programmatic Scheduler APIs

```javascript
import {
  setSchedulerMaxFlushCount,
  getSchedulerMaxFlushCount,
  onSchedulerDeadlock,
  resetScheduler,
} from 'avenx-core/runtime';

// Configure global cycle threshold
setSchedulerMaxFlushCount(20);

// Subscribe to deadlock detection events (e.g. for error tracking/telemetry)
const unsubscribe = onSchedulerDeadlock((event) => {
  console.warn('Deadlock intercepted:', event.cyclePath);
});
```
