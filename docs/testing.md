# Testing

## What
Vitest + React Testing Library. Tests live in `tests/` alongside the source they cover.

## Why
- Bugs in grocery list aggregation or ingredient scaling affect every user's meal plan silently — unit tests catch regressions before deploy
- API route tests with mocked Prisma let us verify handler logic without a live database, making tests fast and deterministic
- Component tests catch broken UI interactions (form submission, navigation) that TypeScript alone can't catch

## Policy
- **Always write tests alongside implementation** — never as a follow-up; untested code is not done
- **Tests must pass before every commit or PR**
- Write unit tests for all pure functions in `src/lib/`
- Write API tests for every new route handler (Prisma mocked via `vi.mock`)
- Write component tests for every new page or component

## Structure

| Directory | What goes here |
|-----------|---------------|
| `tests/lib/` | Pure function unit tests (grocery list, url-import, etc.) |
| `tests/api/` | Route handler tests — Prisma mocked, no DB required |
| `tests/components/` | React component tests — jsdom, no server required |

## Running Tests

```bash
npm test              # run all tests once
npm run test:watch    # watch mode during development
```

## Patterns

### Component tests — required jsdom docblock
Every component test file must start with this comment or the DOM APIs won't be available:
```ts
// @vitest-environment jsdom
```

### Mocking Next.js navigation
```ts
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));
```

### Mocking fetch
```ts
const mockFetch = vi.fn();
global.fetch = mockFetch;
mockFetch.mockResolvedValue({ json: async () => mockData });
```

### Mocking Prisma (API route tests)
```ts
vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipe: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));
```

## Gotchas

### React 18 StrictMode double-invokes effects
In tests, React 18 StrictMode calls `useEffect` twice. When asserting side-effects like `router.refresh()`, use `toHaveBeenCalled()` not `toHaveBeenCalledOnce()` — the latter will fail intermittently.

```ts
// ✓ correct
expect(mockRefresh).toHaveBeenCalled();

// ✗ will fail under StrictMode
expect(mockRefresh).toHaveBeenCalledOnce();
```

### `waitFor` is required for async state
After rendering a component that fires a `fetch` or `useEffect`, assertions on the resulting state must be wrapped in `waitFor`:

```ts
await waitFor(() => {
  expect(screen.getByText("My Recipe")).toBeInTheDocument();
});
```
