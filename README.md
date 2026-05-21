# 41M4

41M4 is a full-stack, authorized web-security training platform: a searchable payload arsenal plus contained vulnerable labs for practicing modern application security testing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` - run the API server
- `pnpm --filter @workspace/41m4 run dev` - run the React frontend
- `pnpm run typecheck` - full typecheck across packages
- `pnpm run build` - typecheck and build packages
- `pnpm --filter @workspace/api-spec run codegen` - regenerate generated API clients and schemas from OpenAPI
- `pnpm --filter @workspace/db run push` - push DB schema changes in development
- `pnpm --filter @workspace/scripts run seed:payloads` - seed the payload arsenal

Required environment:

- `DATABASE_URL` or `SUPABASE_DB_URL` - PostgreSQL connection string for your Supabase database
- `PORT` - API server port
- `SESSION_SECRET` - production session signing secret

## Stack

- Workspace: pnpm, TypeScript, Node.js 24
- Frontend: React 19, Vite, Wouter, TanStack Query, Tailwind CSS, Radix UI
- API: Express 5, Pino logging, session auth
- Database: PostgreSQL, Drizzle ORM, drizzle-zod
- API contracts: OpenAPI 3.1, Orval-generated clients and Zod schemas

## Product

41M4 has three main surfaces:

- Payload Arsenal: searchable, filterable payload database with severity, platform, bypass classification, tags, copy actions, and statistics.
- Attack Box: contained intentionally vulnerable labs for XSS, SQLi, CSRF, LFI, SSRF, and XXE.
- Reference Center: built-in docs and API reference for operators using the training platform.

## Labs

The labs are intentionally vulnerable but scoped to `/api/lab/*` and designed for authorized education only.

- XSS: reflected, stored, and DOM-based targets, plus a frontend XSS sink scanner.
- SQLi: simulated enterprise search target with auth-bypass, UNION, time-based, and error-based feedback.
- CSRF: vulnerable bank-transfer workflow and exploit builder.
- LFI: safe fake-file traversal target with environment and config leak scenarios.
- SSRF: webhook fetcher simulation with internal services, cloud metadata, and canonicalization bypasses.
- XXE: legacy XML parser simulation that resolves fake local files and metadata endpoints.

Logged-in users get progress tracking through `lab_sessions`; successful attempts are recorded by lab type and mode.

## Architecture Decisions

- Dangerous lab behavior is isolated inside the lab namespace and uses fake data for file, metadata, and internal service responses.
- The production app authentication path uses hashed passwords and HttpOnly server-side sessions.
- Payload data lives in PostgreSQL and is seeded from `scripts/src/seed-payloads.ts`.
- The OpenAPI spec in `lib/api-spec/openapi.yaml` is the contract source for generated clients.
- Frontend lab pages use iframes to keep target behavior visually isolated from the operator interface.

## Gotchas

- The labs are meant for local or controlled training environments, not public production exposure without additional sandboxing and rate controls.
- `DATABASE_URL` or `SUPABASE_DB_URL` is required even for API startup because sessions and payload search depend on PostgreSQL.
- Run DB push before seeding payloads on a new database.
