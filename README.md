# Annotation Activity Console

A real-time task management and annotation console built with Next.js, Redux Toolkit, and React. Features live WebSocket updates, streaming AI summaries with XSS protection, and IndexedDB persistence.

## Getting Started

### Prerequisites

- Node.js 18+ (we tested on Node 22)
- npm, yarn, or pnpm

### Installation

1. **Install main project dependencies:**

```bash
npm install
# or pnpm install / yarn install
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
npm dev
# or pnpm run dev / yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
npm test
# or pnpm test / yarn test
```

Run tests in watch mode:

```bash
npm test:watch
```

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

## Read more

For questions or issues, refer to [DECISIONS Page](DECISIONS.md) for detailed design rationale.
