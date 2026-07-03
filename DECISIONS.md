# Annotation Activity Console - Implementation Decisions

## Overview

This document outlines the key architectural and implementation decisions made for the annotation activity console, including tradeoffs, edge case handling, and areas for future improvement.


---

## 1. Type System and Data Normalization

### Decision: Discriminated Union with Normalize Function

I use a discriminated union type for `TaskType` (with "unknown" as a fallback) and create a `normalize.ts` module that transforms messy backend data into clean, typed tasks.

### Rationale

- **Type Safety**: The `Task` model is strictly typed with no `any` types. Each field has a reliable type.
- **Data Quality Insight**: By handling normalization explicitly (not silently failing), I log warnings for data quality issues (e.g., invalid statuses, unparseable timestamps).
- **Defensive**: Unknown task types are preserved as "unknown" rather than crashing or dropping data.
- **Consistency**: Status values are normalized to lowercase, handling inconsistent casing ("InProgress" → "in_progress", "QA" → "qa").

### Edge Cases Handled

- **Inconsistent status casing**: Normalized to lowercase. Unknown statuses default to "todo" with a warning.
- **Mixed timestamp formats**: Both ISO strings and epoch milliseconds are parsed to epoch-ms for consistency.
- **String vs. number annotation counts**: Always converted to number; invalid strings default to 0.
- **Null vs. malformed assignees**: Only valid `{ id, name }` objects are kept; invalid assignees become null.
- **Unknown task types**: Preserved as "unknown" rather than dropped or defaulting to a known type.

### What I Didn't Handle

- I don't validate the meta object; it's preserved as-is from the server.
- I don't enforce required fields beyond id and title; missing fields get defaults.
- I assume task ids are always present; if missing, the normalizer would still include the task with its raw id.

---

## 2. Redux Toolkit State Management vs other tools

### Decision: createEntityAdapter + Thunks (Not RTK Query)

I use Redux Toolkit's `createEntityAdapter` for normalized storage and `createAsyncThunk` for API calls, avoiding RTK Query.

### Rationale

- **Normalized Storage**: `createEntityAdapter` provides O(1) lookups by id and efficient updates.
- **Explicit Control**: Thunks give us full control over request lifecycle and error handling without RTK Query's opinionated caching.
- **Real-time Integration**: WebSocket events dispatch synchronous Redux actions (`updateTaskStatus`, `updateTaskAssignee`, etc.), seamlessly merging real-time data into the same state.
- **Memoized Selectors**: I use `createSelector` to compute filtered, sorted, and paginated views efficiently; components never see stale derived state.

### Alternatives Considered

- **RTK Query**: Would add caching and automatic refetching, but WebSocket events would require careful cache invalidation. Manual thunks give us simpler real-time merge logic.

---

## 3. Streamed Markdown Summary with Sanitization

### Decision: markdown-it + DOMPurify

Summaries are streamed from `/api/tasks/:id/summary` as SSE (Server-Sent Events). I parse markdown with `markdown-it`, then sanitize with DOMPurify.

### Rationale

- **Incremental Rendering**: User sees the summary build in real time, not all at once.
- **Safety First**: DOMPurify strips out script tags, event handlers, and dangerous HTML attributes before I render.
- **Markdown Support**: Links, code blocks, lists, and other markdown elements are preserved and rendered safely.

### Sanitization Approach

```javascript
// Step 1: markdown-it parses markdown to HTML
const html = md.render(rawMarkdown);

// Step 2: DOMPurify removes unsafe elements
const sanitized = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'h1', ...],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
  KEEP_CONTENT: true, // preserve text even if tags stripped
});

// Step 3: Render the sanitized HTML
<div dangerouslySetInnerHTML={{ __html: sanitized }} />
```

### XSS Prevention

- **Script tags**: Removed entirely by DOMPurify; text content preserved via `KEEP_CONTENT: true`.
- **Event handlers**: Attributes like `onclick`, `onerror` are stripped.
- **`<img>` tags**: Removed entirely from `ALLOWED_TAGS`. The server sends `<img src=x onerror="alert('xss-img')">`. DOMPurify strips `onerror`, but the broken `<img>` tag would still render. Because there is no legitimate use of external images in these summaries, I omit `img` from `ALLOWED_TAGS` entirely. This blocks both the `onerror` vector _and_ any unintended image network requests.
- **`src` attribute**: Not in `ALLOWED_ATTR` for the same reason.

See `lib/markdown.ts` for `testXSSPrevention()` utility to verify blocks.

### Stream Cancellation

- **Mid-stream task switch**: The old fetch is aborted via `AbortController` when a new task is selected.
- **Stream error**: Error is logged and displayed; user can select another task.

---

## 4. IndexedDB Persistence

### Decision: Localforage with Non-Blocking Writes

I cache the task list in IndexedDB using `localforage`. On mount, I load cached data immediately (mark as "stale"), then fetch fresh data in the background.

### Rationale

- **Instant Perceived Performance**: Show cached data immediately, even if the server is slow.
- **Non-Blocking**: Writes are async and don't block the main thread.
- **Transparency**: Cached data is loaded but not marked as authoritative. Fresh fetches overwrite it.

### Caching Strategy

```
Save:
  - Task list: { tasks, timestamp, page, pageSize, total }
  - Summary: { taskId → { content, timestamp } }
  - Metadata: { lastUpdated, version }

Load:
  - On mount, load tasks cache if available
  - Fetch fresh data in parallel
  - Fresh data overwrites cache

Invalidation:
  - No automatic expiration; fetch always revalidates
  - User can manually clear caches
```

### What I Cache

- **Task list**: Stored after each successful fetch.
- **Summaries**: Cached by task id; re-visiting a task shows cached summary while fetching fresh.
- **Metadata**: Timestamp of last update for debugging.

### What I Don't Cache

- **UI state** (filters, selected task, sort): Not persisted; resets on page reload.
- **Real-time events**: Not cached; only API state is cached.

### Stale Data Handling

- **Cached data is shown immediately** on mount but is logically "stale" until fresh data arrives.
- **Fresh fetch always runs** in the background.
- **No blocking on stale data**: UI is interactive immediately.

---


## 5. Use of AI

I used AI tools to:

- Generate the mock server boilerplate (Express, WebSocket setup).
- Suggest selector patterns and Redux Toolkit idioms.
- Verify XSS prevention logic in markdown rendering.
- Scaffold test cases for normalization and selectors.

How I verified it ?
- I reviewed the generated code and framed it to adapt the requirements of the project,
- I verified it by running test cases with `npm test -- --runInBand` and it succesfully passed 3/3 , 23/23 tests
- Then i checked the files manually to  verify normalization, markdown sanitizationanc caching logic works correctly.

All generated code was reviewed, tested, and modified to fit the project's specific needs. No code was used without understanding.

---

## 6. Future Improvements

1. **Cache invalidation strategy**: Add TTL-based expiration for cached data.
2. **Optimistic updates**: "Assign to me" action with rollback on failure.
3. **Virtualization**: Use `react-window` for large lists (100+ tasks).
4. **More comprehensive tests**: Add integration tests for WebSocket, markdown rendering, and persistence.
5. **Metrics dashboard**: Show task count by status, annotation rate, etc.
6. **Summary caching**: Cache streamed summaries in IndexedDB and serve from cache on revisit.
7. **Undo/redo**: Persist filter and sort state so user can restore previous views.
4. **Export**: Download task list as CSV or JSON.


---


## Conclusion

This implementation prioritizes correctness, safety (XSS prevention), and maintainability. The type system and normalizer ensure data quality; Redux and selectors enable consistent, derivable state; and real-time WebSocket integration provides live updates without compromising stability.
