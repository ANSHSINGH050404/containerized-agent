# 🐛 Logical Error Analysis — containerized-agent

## Bug #1 — Wrong Gemini Model Name
**File:** `agent/src/planner.ts` · Line 17  
**Severity:** Critical

`"gemini-3.1-pro-preview"` does not exist. The API call will always throw a model-not-found error.

Fix:
```diff
- model: "gemini-3.1-pro-preview",
+ model: "gemini-2.5-pro-preview",
```

---

## Bug #2 — `response.text` is a Method, Not a Property
**File:** `agent/src/planner.ts` · Line 27  
**Severity:** Critical

`response.text` is a method in `@google/genai`. Without `()`, you get a function reference, not a string — `JSON.parse` will always fail.

Fix:
```diff
- const text = response.text;
+ const text = response.text();
```

---

## Bug #3 — Port Collision Risk
**File:** `orchestrator/src/docker.ts` · Line 14  
**Severity:** High

`Math.random()` can generate the same port for concurrent jobs. No uniqueness check exists.

Fix: maintain a `Set<number>` of used ports and retry until a free one is found; release the port in `container.wait().then()`.

---

## Bug #4 — Unhandled Promise from `container.remove()`
**File:** `orchestrator/src/docker.ts` · Lines 50–58  
**Severity:** High

`container.remove()` is a Promise that is never `.catch()`-ed. On failure it causes an unhandled rejection. The `.catch()` branch that sets `status = "failed"` never removes the container either (resource leak).

Fix:
```ts
container.remove({ force: true }).catch((e: any) =>
  console.error("[docker] cleanup failed:", e.message)
);
// And add cleanup in the .catch() branch too
```

---

## Bug #5 — Misleading try/catch Indentation
**File:** `orchestrator/src/docker.ts` · Lines 19–65  
**Severity:** Medium

`container.wait()` and `return job` are indented as if they are outside the `try` block, but they are actually inside it. This is a maintenance trap.

Fix: reformat so `container.wait()` and `return job` are clearly inside the `try` body.

---

## Bug #6 — `done` Signal Sent Before Final Logs Are Drained
**File:** `orchestrator/src/stream.ts` · Lines 20–23  
**Severity:** High

When `job.status` becomes `"done"`, the `while` loop may have just exited, missing any logs appended in the same tick. The client gets `{ done: true }` before seeing those final lines.

Fix: add a second drain pass before sending the `done` signal:
```ts
if (job.status === "done" || job.status === "failed") {
  while (lastIndex < job.logs.length) {
    if (job.logs[lastIndex]) ws.send(JSON.stringify({ jobId: id, log: job.logs[lastIndex] }));
    lastIndex++;
  }
  ws.send(JSON.stringify({ jobId: id, done: true, status: job.status }));
  clearInterval(interval);
}
```

---

## Bug #7 — Placeholder Job Duplicates After `refreshJobs()`
**File:** `frontend/src/App.tsx` · Lines 50–58  
**Severity:** Medium

`handleSubmit` inserts a local placeholder job, then immediately calls `refreshJobs()` which returns the same job from the API — resulting in a duplicate entry in the sidebar.

Fix: remove the immediate `refreshJobs()` call, or deduplicate by job ID when merging.

---

## Bug #8 — `formatLog` Creates Unclosed `<span>` Tags + XSS
**File:** `frontend/src/App.tsx` · Lines 245–253  
**Severity:** Medium / Security

If a log line has an ANSI color code but no reset (`\u001b[0m`), an unclosed `<span>` breaks the DOM. Also, agent output is inserted via `dangerouslySetInnerHTML` without HTML escaping — a `<script>` tag in a log line is a live XSS vector.

Fix: escape `<`, `>`, `&` before ANSI substitution; close any residual open `<span>` tags at the end.

---

## Bug #9 — `node:fs/promises` Instead of Bun-native API
**File:** `agent/src/executor.ts` · Line 2 & 22  
**Severity:** Medium (convention violation)

```diff
- import { unlink } from "node:fs/promises";
- await unlink(tempFile);
+ await Bun.file(tempFile).unlink();
```

Project rules (AGENTS.md) mandate Bun-native APIs over Node.js equivalents.

---

## Bug #10 — No Validation of Planner JSON Shape
**File:** `agent/src/planner.ts` · Lines 30–35  
**Severity:** High

After `JSON.parse`, the result is used as `Step[]` with no type guard. If Gemini returns any other shape (single object, nested wrapper, unknown `type`), the executor fails with a cryptic error.

Fix:
```ts
function isValidSteps(data: unknown): data is Step[] {
  return Array.isArray(data) &&
    data.every(s => (s.type === "shell" || s.type === "ts") && typeof s.code === "string");
}
if (!isValidSteps(parsed)) throw new Error("Planner returned invalid step schema");
```

---

## Summary

| # | File | Severity | Issue |
|---|------|----------|-------|
| 1 | `agent/src/planner.ts` | Critical | Invalid Gemini model name |
| 2 | `agent/src/planner.ts` | Critical | `response.text` not called as a function |
| 3 | `orchestrator/src/docker.ts` | High | No port collision guard |
| 4 | `orchestrator/src/docker.ts` | High | `container.remove()` unhandled Promise; no cleanup on failure |
| 5 | `orchestrator/src/docker.ts` | Medium | Misleading indentation hides try/catch scope |
| 6 | `orchestrator/src/stream.ts` | High | `done` sent before final logs drained |
| 7 | `frontend/src/App.tsx` | Medium | Placeholder job duplicates after `refreshJobs()` |
| 8 | `frontend/src/App.tsx` | Medium | Unclosed `<span>` tags + XSS in `formatLog` |
| 9 | `agent/src/executor.ts` | Medium | `node:fs` used instead of Bun-native API |
| 10 | `agent/src/planner.ts` | High | No validation of planner JSON response shape |
