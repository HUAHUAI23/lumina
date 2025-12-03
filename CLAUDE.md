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

The task system uses a **dual-loop scheduler** design:

1. **Main Loop** (5s interval): Claims pending tasks using `FOR UPDATE SKIP LOCKED`, executes sync tasks, submits async tasks, recovers timeout tasks
2. **Async Query Loop** (30s interval): Polls status of processing async tasks with external task IDs

**Provider Pattern**: Task providers extend `BaseTaskProvider` and implement `execute()` and `query()` methods. Providers are registered in `instrumentation.ts` at startup.

**Billing Flow**: Prepaid model - estimate cost upfront, charge on task creation, refund difference on completion (no additional charge if actual > estimated).

### Database Schema

Core tables: `users`, `accounts` (balance), `tasks`, `task_items`, `task_resources`, `task_logs`, `transactions`, `charge_orders`, `pricing`, `payment_configs`

Key relationships:
- `users` 1:1 `accounts` 1:N `tasks`
- `tasks` 1:N `task_items`, `task_resources`, `task_logs`
- `accounts` 1:N `transactions` (links to tasks for charge/refund)

### Path Alias
Use `@/*` for absolute imports from project root (e.g., `@/db`, `@/lib/auth`).

### Environment Variables
Defined in `lib/env.ts` using @t3-oss/env-nextjs. Required: `DATABASE_URL`, `AUTH_SECRET`. Optional integrations: GitHub OAuth, Alipay, WeChat Pay, Volcengine (TOS storage, video APIs).

### Import Sorting
ESLint enforces import order via `eslint-plugin-simple-import-sort`:
1. React and external packages
2. Internal packages (@/*)
3. Parent imports
4. Sibling imports
5. Style imports
