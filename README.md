# Annotation Activity Console

A real-time task management and annotation console built with Next.js, Redux Toolkit, and React. Features live WebSocket updates, streaming AI summaries with XSS protection, and IndexedDB persistence.

## Getting Started

### Prerequisites

- Node.js 18+ (we tested on Node 22)
- npm, yarn, or pnpm

### Installation

1. **Install main project dependencies:**

```bash
pnpm install
# or npm install / yarn install
```

2. **Install mock server dependencies:**

```bash
cd mock-server
npm install
cd ..
```

### Running the Application

#### Terminal 1: Start the mock server

```bash
cd mock-server
npm run mock
```

The mock server will start on `http://localhost:4000` with WebSocket on `ws://localhost:4000/ws`.

#### Terminal 2: Start the Next.js dev server

```bash
pnpm dev
# or npm run dev / yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
pnpm test
# or npm test / yarn test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

---

## Architecture Overview

### Type System & Normalization

The backend returns messy data (inconsistent status casing, mixed timestamp formats, unknown task types, string vs. number annotation counts). The normalizer (`lib/normalize.ts`) transforms this into a clean, strictly-typed `Task` model.

**Key features:**
- Discriminated union for task types (with "unknown" fallback)
- Normalized status enum (always lowercase)
- Reliable timestamp parsing (ISO strings and epoch-ms → epoch-ms)
- Defensive annotation count conversion (string → number)
- Warnings logged for data quality issues

### Redux State Management

```
State:
├── tasks (normalized with createEntityAdapter)
│   ├── ids, entities
│   ├── loading, error, totalCount
│   └── currentPage, pageSize
└── ui
    ├── selectedTaskId
    ├── filters: { type?, status?, search }
    ├── sortField, sortDirection
    └── summaryLoading, summaryError
```

**Selectors** compute derived views:
- `selectFilteredTasks`: Apply type, status, search filters
- `selectSortedTasks`: Sort by updatedAt
- `selectPaginatedTasks`: Slice for current page

### Real-Time WebSocket Feed

The `useTaskFeed` hook subscribes to WebSocket events:
- `task.updated`: Status changes
- `task.assigned`: Assignee changes
- `annotation.created`: New annotations

Events are dispatched into Redux state immediately; status values are normalized before store.

### Streamed Markdown Summaries

When a task is selected, the app fetches the summary from `/api/tasks/:id/summary` (Server-Sent Events stream). The markdown is rendered incrementally as chunks arrive.

**Safety:** Markdown is parsed with `markdown-it`, then sanitized with `DOMPurify` to remove XSS vectors (scripts, event handlers, dangerous attributes).

### IndexedDB Persistence

Task lists are cached in IndexedDB via `localforage`. On page reload:
1. Cached tasks are loaded immediately (marked as stale).
2. Fresh data is fetched from the server in parallel.
3. Fresh data overwrites the cache.

Summaries are also cached by task ID for quick revisits.

---

## File Structure

```
app/
├── layout.tsx                 # Server layout with metadata
├── layout-client.tsx          # Client provider (Redux, Analytics)
├── page.tsx                   # Home page (Activity Console)
└── globals.css               # Global styles

lib/
├── types.ts                  # Domain types & discriminated unions
├── normalize.ts              # Data normalization logic
├── markdown.ts               # Markdown rendering with sanitization
├── persistence.ts            # IndexedDB caching layer
└── store/
    ├── index.ts              # Redux store config
    ├── tasks.ts              # Tasks slice & thunks
    ├── ui.ts                 # UI state slice
    └── selectors.ts          # Memoized selectors

components/
├── ActivityConsole.tsx       # Main console layout
├── TaskList.tsx              # Task list with selection
├── TaskFilters.tsx           # Type, status, search filters
├── TaskPagination.tsx        # Pagination controls
├── TaskSummary.tsx           # Streamed summary display
└── TaskTicker.tsx            # (Fixed bug example component)

hooks/
└── useTaskFeed.ts            # WebSocket real-time feed hook

__tests__/
├── normalize.test.ts         # Normalization tests
├── selectors.test.ts         # Selector logic tests
└── TaskList.test.tsx         # Component interaction tests

mock-server/
├── server.js                 # Express + WebSocket + SSE server
└── package.json

DECISIONS.md                  # Implementation decisions & tradeoffs
README.md                     # This file
```

---

## Key Design Decisions

### 1. Why Redux Toolkit with Thunks (not RTK Query)?

We use `createEntityAdapter` for normalized storage and `createAsyncThunk` for API calls. This gives us:
- O(1) task lookups by ID
- Full control over request lifecycle
- Seamless real-time WebSocket integration (dispatch sync actions into the same state)

RTK Query would require careful cache invalidation for every WebSocket event.

### 2. How is XSS Prevention Handled?

All streamed summaries are treated as untrusted. We:
1. Parse markdown with `markdown-it` (safe—just parses, doesn't execute)
2. Sanitize with `DOMPurify` (strips scripts, event handlers, dangerous attributes)
3. Render with `dangerouslySetInnerHTML` (safe because content is already sanitized)

The mock server intentionally includes `<script>` and `<img onerror>` payloads to test this.

### 3. How Does IndexedDB Persistence Work?

- **On mount**: Load cached tasks immediately (non-blocking), fetch fresh data in background
- **On success**: Save fresh data to cache
- **Stale data handling**: UI is interactive immediately; fresh data overwrites cache

This ensures:
- Instant perceived performance (no blank screen on reload)
- No stale data bugs (fresh data always fetches, cache is just a fallback)
- Non-blocking (writes are async)

### 4. How Are Messy API Responses Handled?

The `normalize.ts` module transforms raw, inconsistent data:
- **Task types**: Unknown types preserved as "unknown", not dropped
- **Statuses**: Normalized to lowercase (e.g., "QA" → "qa")
- **Timestamps**: Both ISO strings and epoch-ms parsed to epoch-ms
- **Annotation counts**: Strings converted to numbers, invalid values default to 0
- **Logging**: Data quality issues logged as warnings, never silently dropped

### 5. Why Are WebSocket Events Gracefully Ignored If Task Not Loaded?

If an event references a task beyond the current page, we silently ignore it. The task will be fetched when:
- User navigates to that page
- User searches for or filters to that task
- User selects that task

This avoids loading unrelated tasks into state.

---

## Testing

### Running Tests

```bash
pnpm test                 # Run all tests once
pnpm test:watch          # Run in watch mode
pnpm test -- normalize   # Run specific test file
```

### Test Coverage

- **normalize.test.ts**: Data normalization (inconsistent casing, types, timestamps, annotation counts)
- **selectors.test.ts**: Filtering, sorting, pagination
- **TaskList.test.tsx**: Component rendering and selection

### What's Tested

✓ Messy data normalization
✓ Selector filtering logic
✓ Component interaction and state updates
✓ Loading and empty states

### What's Not Tested (Future Work)

- WebSocket real-time updates (requires mock WS server in test)
- Markdown sanitization in JSDOM (requires browser environment)
- IndexedDB persistence (would need mock localforage or actual storage)
- E2E flows (would benefit from Playwright or Cypress)

---

## Bug Fixes in TaskTicker Component

The `components/TaskTicker.tsx` file contains a corrected version of the buggy component from the exercise. Original bugs:

1. **Missing dependency**: `tick` not in `useEffect` deps → stale closures
2. **Direct mutation**: `prev.push(t)` → use immutable spread `[...prev, t]`
3. **Refetch guard missing**: Fetch runs even if `selectedId` is null
4. **In-place sort**: `tasks.sort()` mutates → use `[...tasks].sort()`
5. **Array index as key**: Using index → use stable `key={t.id}`
6. **Missing error handling**: Fetch errors not caught → add `.catch()`

See `DECISIONS.md` for detailed analysis of each fix.

---

## Environment Variables

The app uses environment variables for API endpoints:

- `NEXT_PUBLIC_API_BASE`: Backend API base URL (default: `http://localhost:4000`)
- `NEXT_PUBLIC_WS_BASE`: WebSocket base URL (default: `ws://localhost:4000`)

You can override these by creating a `.env.local` file:

```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
NEXT_PUBLIC_WS_BASE=ws://localhost:4000
```

---

## Troubleshooting

### Mock server not responding

- Ensure mock server is running in a separate terminal: `cd mock-server && npm run mock`
- Check that it's listening on `http://localhost:4000` and `ws://localhost:4000/ws`

### WebSocket connection failing

- Verify mock server is running
- Check browser console for WebSocket errors (usually due to CORS or incorrect URL)
- Verify `NEXT_PUBLIC_WS_BASE` environment variable is set correctly

### Tests failing with "Cannot find module"

- Ensure all dependencies are installed: `pnpm install`
- Clear Jest cache: `pnpm test -- --clearCache`

### Tasks not loading

- Check browser DevTools Network tab; look for failed API requests
- Verify mock server is returning valid JSON from `GET /api/tasks`

---

## Performance Notes

- **Large task lists** (100+): Consider adding virtualization with `react-window` (future improvement)
- **Memoized selectors**: Prevent unnecessary re-renders
- **Async IndexedDB writes**: Non-blocking, don't freeze main thread
- **Stream cancellation**: Switching tasks mid-stream cancels the old fetch

---

## Known Limitations

1. **No authentication**: Console is open; assumes trusted network
2. **Client-side filtering**: Server doesn't know about filters; all filtering happens in Redux
3. **No optimistic updates**: Changes only reflected after server confirmation
4. **No persistence of UI state**: Filters and sort direction reset on reload
5. **No request timeout**: Long-running requests (e.g., slow streams) may hang indefinitely

---

## Future Improvements

### Short Term

- [ ] Add TTL-based cache invalidation
- [ ] Implement "Assign to Me" optimistic update with rollback
- [ ] Add task count metrics (by status, type)
- [ ] Improve error recovery (retry logic)

### Medium Term

- [ ] Virtualize large task lists
- [ ] Persist filter/sort state
- [ ] Cache streamed summaries
- [ ] Export tasks as CSV/JSON

### Long Term

- [ ] Offline support with sync
- [ ] Collaborative real-time cursors
- [ ] Advanced query builder
- [ ] Analytics dashboard

---

## Contributing

1. Read `DECISIONS.md` for architectural decisions
2. Follow the type-first approach: define types before implementation
3. Use selectors in components; don't access Redux state directly
4. Add tests for new features
5. Keep the normalizer updated if API schema changes

---

## License

MIT

---

## Contact

For questions or issues, refer to `DECISIONS.md` for detailed design rationale.
