# Annotation Activity Console - Implementation Decisions

## Overview

This document outlines the key architectural and implementation decisions made for the annotation activity console, including tradeoffs, edge case handling, and areas for future improvement.

---

## 1. Type System and Data Normalization

### Decision: Discriminated Union with Normalize Function

We use a discriminated union type for `TaskType` (with "unknown" as a fallback) and create a `normalize.ts` module that transforms messy backend data into clean, typed tasks.

### Rationale

- **Type Safety**: The `Task` model is strictly typed with no `any` types. Each field has a reliable type.
- **Data Quality Insight**: By handling normalization explicitly (not silently failing), we log warnings for data quality issues (e.g., invalid statuses, unparseable timestamps).
- **Defensive**: Unknown task types are preserved as "unknown" rather than crashing or dropping data.
- **Consistency**: Status values are normalized to lowercase, handling inconsistent casing ("InProgress" → "in_progress", "QA" → "qa").

### Edge Cases Handled

- **Inconsistent status casing**: Normalized to lowercase. Unknown statuses default to "todo" with a warning.
- **Mixed timestamp formats**: Both ISO strings and epoch milliseconds are parsed to epoch-ms for consistency.
- **String vs. number annotation counts**: Always converted to number; invalid strings default to 0.
- **Null vs. malformed assignees**: Only valid `{ id, name }` objects are kept; invalid assignees become null.
- **Unknown task types**: Preserved as "unknown" rather than dropped or defaulting to a known type.

### What We Didn't Handle

- We don't validate the meta object; it's preserved as-is from the server.
- We don't enforce required fields beyond id and title; missing fields get defaults.
- We assume task ids are always present; if missing, the normalizer would still include the task with its raw id.

---

## 2. Redux Toolkit State Management

### Decision: createEntityAdapter + Thunks (Not RTK Query)

We use Redux Toolkit's `createEntityAdapter` for normalized storage and `createAsyncThunk` for API calls, avoiding RTK Query.

### Rationale

- **Normalized Storage**: `createEntityAdapter` provides O(1) lookups by id and efficient updates.
- **Explicit Control**: Thunks give us full control over request lifecycle and error handling without RTK Query's opinionated caching.
- **Real-time Integration**: WebSocket events dispatch synchronous Redux actions (`updateTaskStatus`, `updateTaskAssignee`, etc.), seamlessly merging real-time data into the same state.
- **Memoized Selectors**: We use `createSelector` to compute filtered, sorted, and paginated views efficiently; components never see stale derived state.

### Alternatives Considered

- **RTK Query**: Would add caching and automatic refetching, but WebSocket events would require careful cache invalidation. Manual thunks give us simpler real-time merge logic.
- **Redux-Saga**: More complex; thunks are sufficient for our use case.
- **Zustand or other state managers**: Redux provides clear separation of concerns and excellent devtools. Stick with the choice.

### State Structure

```
tasks: {
  ids: string[],
  entities: { [id]: Task },
  loading: boolean,
  error: string | null,
  totalCount, currentPage, pageSize
}

ui: {
  selectedTaskId: string | null,
  filters: { type?, status?, search },
  sortField, sortDirection,
  summaryLoading, summaryError
}
```

---

## 3. Real-Time WebSocket Integration

### Decision: Custom Hook with Graceful Reconnect

The `useTaskFeed` hook subscribes to WebSocket events and dispatches Redux actions. It handles reconnection and ignores events for unloaded tasks.

### Rationale

- **Graceful Degradation**: If an event references a task not yet loaded (e.g., from another page), it's silently ignored; we don't crash.
- **Automatic Reconnect**: On disconnect, retry every 3 seconds (configurable). User doesn't need to manual refresh.
- **Event Normalization**: Incoming status values are normalized (e.g., "QA" → "qa") before dispatch, maintaining data consistency.

### Event Handling

- **task.updated**: Normalize status, update task status and `updatedAt` in state.
- **task.assigned**: Normalize assignee object, update task assignee.
- **annotation.created**: Increment annotation count for the referenced task.

### Edge Cases

- **Task not loaded**: Event is silently ignored. The task will be fetched when the page loads or user navigates to it.
- **Malformed event**: Logged to console; doesn't crash.
- **Unplanned event kind**: Logged but ignored.

---

## 4. Streamed Markdown Summary with Sanitization

### Decision: markdown-it + DOMPurify

Summaries are streamed from `/api/tasks/:id/summary` as SSE (Server-Sent Events). We parse markdown with `markdown-it`, then sanitize with DOMPurify.

### Rationale

- **Incremental Rendering**: User sees the summary build in real time, not all at once.
- **Safety First**: DOMPurify strips out script tags, event handlers, and dangerous HTML attributes before we render.
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
- **`<img>` tags**: Removed entirely from `ALLOWED_TAGS`. The server sends `<img src=x onerror="alert('xss-img')">`. DOMPurify strips `onerror`, but the broken `<img>` tag would still render. Because there is no legitimate use of external images in these summaries, we omit `img` from `ALLOWED_TAGS` entirely. This blocks both the `onerror` vector *and* any unintended image network requests.
- **`src` attribute**: Not in `ALLOWED_ATTR` for the same reason.

See `lib/markdown.ts` for `testXSSPrevention()` utility to verify blocks.

### Stream Cancellation

- **Mid-stream task switch**: The old fetch is aborted via `AbortController` when a new task is selected.
- **Stream error**: Error is logged and displayed; user can select another task.

---

## 5. IndexedDB Persistence

### Decision: Localforage with Non-Blocking Writes

We cache the task list in IndexedDB using `localforage`. On mount, we load cached data immediately (mark as "stale"), then fetch fresh data in the background.

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

### What We Cache

- **Task list**: Stored after each successful fetch.
- **Summaries**: Cached by task id; re-visiting a task shows cached summary while fetching fresh.
- **Metadata**: Timestamp of last update for debugging.

### What We Don't Cache

- **UI state** (filters, selected task, sort): Not persisted; resets on page reload.
- **Real-time events**: Not cached; only API state is cached.

### Stale Data Handling

- **Cached data is shown immediately** on mount but is logically "stale" until fresh data arrives.
- **Fresh fetch always runs** in the background.
- **No blocking on stale data**: UI is interactive immediately.

---

## 6. Filtering, Sorting, and Pagination

### Decision: Memoized Selectors with Derived Views

Selectors compute filtered, sorted, and paginated views. Components subscribe to these selectors and re-render only when the view changes.

### Flow

1. `selectAllTasks`: All tasks from the entity adapter.
2. `selectFilteredTasks`: Apply type, status, and search filters.
3. `selectSortedTasks`: Sort by `updatedAt` (ascending or descending).
4. `selectPaginatedTasks`: Slice for the current page.

### Rationale

- **Performance**: Selectors are memoized; redundant computations are skipped.
- **Consistency**: All views are derived from the same normalized state.
- **Flexibility**: Easy to add new filters or sort fields without touching Redux.

### Filtering

- **By type**: Match task type (including "unknown").
- **By status**: Match normalized status.
- **By search**: Case-insensitive substring match in title.

### Pagination

- Stored in Redux UI state: `currentPage` and `pageSize`.
- `selectPaginatedTasks` slices the sorted tasks for display.
- `selectPaginationInfo` computes `totalPages`, `hasNextPage`, etc.

---

## 7. Bug Fixes in TaskTicker Component

Original bugs and fixes:

1. **Stale closure in clock effect (A)**
   - Bug: `setTick(tick + 1)` inside an effect with `[]` deps captures `tick` at its initial value (0) forever — the counter increments once and freezes.
   - Fix: Use functional updater `setTick(prev => prev + 1)`. React guarantees `prev` is always current, so the closure doesn't need to capture `tick`.

2. **Direct array mutation (B1)**
   - Bug: `prev.push(t)` mutates the existing state array. React compares array references; same reference = no re-render.
   - Fix: Immutable spread: `[...prev, t]` produces a new reference.

3. **Refetch without selection guard (B2)**
   - Bug: Effect runs even if `selectedId` is null, sending `GET /api/tasks/null` to the server.
   - Fix: Early return if `!selectedId`.

4. **In-place sort mutation (C1)**
   - Bug: `tasks.sort()` mutates the original state array, corrupting sort order on subsequent renders.
   - Fix: Copy first: `[...tasks].sort()`.

5. **Array index as React key (C2)**
   - Bug: `key={i}` causes incorrect DOM node reuse when items reorder, producing mixed-up displayed content.
   - Fix: Use stable identifier: `key={t.id}`.

6. **`tick` state incremented but never consumed (D)**
   - Bug: `tick` was intended to force a re-render every second so the elapsed-time display stays current. But the render expression `Math.floor((Date.now() - t.updatedAt) / 1000)` never reads `tick`, so React may optimise away the re-render. The "x seconds ago" display does not actually update.
   - Fix: Reference `tick` in the expression as `+ tick * 0`. The numeric value is unchanged (×0), but the render function now reads `tick`, subscribing to its updates and guaranteeing a fresh evaluation every second.

7. **Missing error handling**
   - Bug: Fetch errors are not caught, causing unhandled Promise rejections.
   - Fix: Add `.catch()` to log errors gracefully.

---

## 8. Testing

### Test Coverage

- **normalize.test.ts**: Data normalization (messy → clean types, edge cases).
- **selectors.test.ts**: Filtering, sorting, pagination selectors.
- **TaskList.test.tsx**: Component interaction (selection, rendering).

### Run Tests

```bash
npm test
```

### What We Tested

- Normalization of inconsistent data (casing, types, timestamps).
- Selector logic for filtering and sorting.
- Component rendering and user interactions (selection).

### Not Tested

- WebSocket real-time updates (requires mock WS).
- Markdown sanitization in browser environment (requires JSDOM).
- IndexedDB persistence (requires mock localforage).

These would be valuable additions for full coverage.

---

## 9. Use of AI

We used AI tools to:
- Generate the mock server boilerplate (Express, WebSocket setup).
- Suggest selector patterns and Redux Toolkit idioms.
- Verify XSS prevention logic in markdown rendering.
- Scaffold test cases for normalization and selectors.

All generated code was reviewed, tested, and modified to fit the project's specific needs. No code was used without understanding.

---

## 10. Future Improvements

### Short Term

1. **Cache invalidation strategy**: Add TTL-based expiration for cached data.
2. **Optimistic updates**: "Assign to me" action with rollback on failure.
3. **Virtualization**: Use `react-window` for large lists (100+ tasks).
4. **More comprehensive tests**: Add integration tests for WebSocket, markdown rendering, and persistence.

### Medium Term

1. **Metrics dashboard**: Show task count by status, annotation rate, etc.
2. **Summary caching**: Cache streamed summaries in IndexedDB and serve from cache on revisit.
3. **Undo/redo**: Persist filter and sort state so user can restore previous views.
4. **Export**: Download task list as CSV or JSON.

### Long Term

1. **Offline support**: Full offline mode with sync when back online.
2. **Collaborative features**: See other users' selections and edits in real time.
3. **Advanced querying**: Build a query language for complex filters.
4. **Analytics**: Track user behavior, identify bottlenecks.

---

## 11. Known Limitations

1. **No local auth**: Console is unauthenticated; assumes trusted internal network.
2. **No request cancellation on page unmount**: Summary fetches might continue after component unmounts (minor leak).
3. **Pagination is client-side**: All tasks are fetched and filtered locally; server doesn't know about filters.
4. **No optimistic updates**: Changes reflect only after server confirmation.
5. **Cache not versioned**: If data format changes, old cache might be incompatible.

---

## Conclusion

This implementation prioritizes correctness, safety (XSS prevention), and maintainability. The type system and normalizer ensure data quality; Redux and selectors enable consistent, derivable state; and real-time WebSocket integration provides live updates without compromising stability.
