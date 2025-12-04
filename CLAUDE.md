# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumina is a Next.js 16 application for AI-powered video and image generation. It features a task processing system that handles async/sync AI tasks (video motion, lipsync, image generation) with a prepaid billing model.

## Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix linting issues

# Database (PostgreSQL with Drizzle ORM)
pnpm db:push          # Setup DB and push schema
pnpm db:studio        # Open Drizzle Studio
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:reset         # Reset database and push schema
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router, React 19)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT sessions with jose (stored in HTTP-only cookies)
- **UI**: Radix UI primitives + Tailwind CSS v4 + shadcn/ui
- **State**: Zustand + React Query
- **Validation**: Zod + @t3-oss/env-nextjs for env vars

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `app/(main)/` - Authenticated app pages (dashboard, video-studio, image-studio, billing)
- `app/api/` - API routes for auth, payments (Alipay, WeChat Pay), tasks, uploads
- `db/` - Drizzle schema and relations
- `lib/` - Core business logic
- `lib/tasks/` - Task processing system (scheduler, executor, providers, billing)
- `lib/volcengine/` - Volcengine API client for video/image generation
- `lib/auth/` - Authentication (session, service, DAL pattern)
- `components/ui/` - shadcn/ui components (excluded from linting)

### Task System Architecture

The task system uses a **dual-loop scheduler** design with **Provider/Handler separation**:

1. **Main Loop** (5s interval): Claims pending tasks using `FOR UPDATE SKIP LOCKED`, executes sync tasks, submits async tasks, recovers timeout tasks
2. **Async Query Loop** (30s interval): Polls status of processing async tasks with external task IDs

**Provider/Handler Pattern**:
- **Provider** (`lib/tasks/core/provider.ts`): Only handles third-party API integration (submit, query). Extends `BaseProvider`.
- **Handler** (`lib/tasks/core/handler.ts`): Handles business logic (resource upload to TOS, billing settlement, DB updates). Extends `BaseHandler` or `DefaultHandler`.
- Both are registered in `lib/tasks/init.ts` at startup via `initTaskSystem()`.

**Billing Flow**: Prepaid model - estimate cost upfront, charge on task creation (`chargeForTask`), refund difference on completion (`settleTask` - no additional charge if actual > estimated), full refund on failure (`refundTask`).

**Concurrency Safety**: Uses `FOR UPDATE SKIP LOCKED` for multi-replica deployment, conditional updates (`WHERE id = ? AND status = ?`) to prevent state overwrites.

### Database Schema

Core tables: `users`, `accounts` (balance), `tasks`, `task_resources`, `task_logs`, `transactions`, `charge_orders`, `pricing`, `payment_configs`

Key relationships:
- `users` 1:1 `accounts` 1:N `tasks`
- `tasks` 1:N `task_resources` (input/output), `task_logs`
- `accounts` 1:N `transactions` (links to tasks for charge/refund)

**Important Indexes**:
- `idx_task_pending` ON (status, priority, created_at) - For scheduler task claiming
- `idx_task_processing_async` ON (status, mode, external_task_id) - For async polling
- `idx_task_timeout` ON (status, mode, updated_at) - For timeout recovery

### Path Alias
Use `@/*` for absolute imports from project root (e.g., `@/db`, `@/lib/auth`).

### Environment Variables
Defined in `lib/env.ts` using @t3-oss/env-nextjs. Required: `DATABASE_URL`, `AUTH_SECRET`. Optional integrations: GitHub OAuth, Alipay, WeChat Pay, Volcengine (TOS storage, video APIs).

### API Response Format

All API routes follow the `ApiResponse<T>` format defined in `lib/api-response.ts`:

**Success**: `{ success: true, data: T, message?: string }`
**Error**: `{ success: false, error: string, details?: unknown }`

Frontend should use `lib/api-client.ts` (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) which auto-handles 401 redirects and provides type-safe responses.

### Authentication System

- **Session**: JWT stored in HTTP-only cookies (7-day expiry)
- **Security**: Data Access Layer (DAL) pattern in `lib/auth/dal.ts` - always call `verifySession()` in API routes, never trust middleware alone
- **Flows**: Unified login/register at `/login` - checks user existence first (`/api/auth/check`), then authenticates (`/api/auth/authenticate`)

### Import Sorting
ESLint enforces import order via `eslint-plugin-simple-import-sort`:
1. React and external packages
2. Internal packages (@/*)
3. Parent imports
4. Sibling imports
5. Style imports

### Adding New Task Types

1. Add enum to `db/schema.ts` (`taskTypeEnum`, `TaskConfig` interface)
2. Create Provider in `lib/tasks/providers/impl/` (extend `BaseProvider`)
3. Create Handler in `lib/tasks/handlers/impl/` (extend `DefaultHandler`)
4. Register in `lib/tasks/providers/impl/index.ts` and `lib/tasks/handlers/impl/index.ts`
5. Add pricing config to `pricing` table

See `docs/task-system-design.md` for detailed architecture and extension guide.
