# PromptForge Studio

> AI Prompt Marketplace + Generation Workspace — Built with Next.js 14 (App Router), Prisma (SQLite), and TypeScript.

## Overview

PromptForge Studio is a professional AI prompt creation, exploration, version management, trading, and one-click generation platform. It enables creators and teams to turn prompts from scattered inspiration into searchable, executable, version-controlled, and tradable assets.

### Next.js Summary (from framework docs)

Next.js 14 (App Router) is a full-stack React framework that extends React with:
- **Server Components**: Default in App Router, components render on the server to reduce client-side JS
- **Layouts**: Nested layouts with `layout.tsx` that persist across page navigations
- **Route Handlers**: `app/api/*/route.ts` files export GET/POST/PATCH/DELETE handlers for HTTP endpoints
- **Server Actions**: `async function` bodies in server components can be directly called from forms/actions
- **Dynamic Segments**: Folders like `[id]` or `[username]` capture URL parameters
- **Parallel Routes**: `@folder` syntax for parallel rendering of multiple routes in one URL
- **Streaming**: ` Suspense` boundaries with `loading.tsx` for progressive loading

Key convention: All files inside `app/` are processed by Next.js build system. Static assets go in `public/`. Server-only code (Prisma, credentials) must never be imported in Client Components (`'use client'`).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2.18 (App Router) |
| Language | TypeScript 5.7 |
| Database | Prisma ORM + SQLite (`dev.db`) |
| Styling | Tailwind CSS 3.4 + PostCSS |
| Testing | Jest 29 + ts-jest |
| Package Manager | npm |

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Application base URL |
| `NEXT_PUBLIC_MOCK_AI` | `true` | Enable mock AI generation (no external API key needed) |
| `NEXT_PUBLIC_MOCK_PAYMENTS` | `true` | Enable mock payment/checkout |
| `DATABASE_URL` | `file:./dev.db` | SQLite database path (relative to project root) |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Push schema to database
npm run db:push

# 4. Seed with demo data
npm run db:seed

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Seed Accounts

| Username | Role | Credits | Email |
|----------|------|---------|-------|
| `visitor` | visitor | 0 | visitor@promptforge.dev |
| `member_demo` | member | 100 | member@promptforge.dev |
| `creator_demo` | creator | 1250 | creator@promptforge.dev |
| `team_admin_demo` | team_admin | 5000 | teamadmin@promptforge.dev |
| `admin_demo` | admin | 99999 | admin@promptforge.dev |

## Mock Mode

When `NEXT_PUBLIC_MOCK_AI=true`:
- Generation endpoints return simulated results with `picsum.photos` placeholder images
- No external AI API key required
- 4 mock outputs per generation run with random seeds

When `NEXT_PUBLIC_MOCK_PAYMENTS=true`:
- Marketplace orders deduct from seed credits ledger
- No real payment processing

## Pages (18 routes)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, search, featured cards, top creators |
| `/browse` | Browse | Waterfall grid, search, filter, sort |
| `/prompts/[id]` | Prompt Detail | Full params, samples, buy/apply |
| `/create` | Create Workspace | Prompt editor, params, preview |
| `/editor/[id]` | Prompt Editor | Version edit, publish settings |
| `/marketplace` | Marketplace | Paid prompt packs |
| `/marketplace/[category]` | Category | Filtered marketplace |
| `/marketplace/items/[id]` | Item Detail | Purchase flow |
| `/dashboard` | Dashboard | Personal overview |
| `/dashboard/prompts` | My Prompts | Manage prompts |
| `/dashboard/collections` | Collections | Saved prompts |
| `/dashboard/generations` | Generations | History |
| `/dashboard/analytics` | Analytics | Creator stats |
| `/dashboard/team` | Team | Workspace members |
| `/settings/billing` | Billing | Subscription & credits |
| `/user/[username]` | User Profile | Public creator page |
| `/leaderboard` | Leaderboard | Top creators ranking |
| `/admin` | Admin | Platform management |
| `/admin/moderation` | Moderation | Content review queue |
| `/help/api-docs` | API Docs | Endpoint documentation |

## API Endpoints (15 routes)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prompts` | List prompts (pagination, filter, sort) |
| POST | `/api/prompts` | Create prompt |
| GET | `/api/prompts/:id` | Get prompt detail |
| PATCH | `/api/prompts/:id` | Update prompt |
| POST | `/api/prompts/:id/publish` | Publish prompt |
| POST | `/api/prompts/:id/generate` | Trigger generation |
| GET | `/api/prompts/:id/versions` | Version history |
| POST | `/api/prompts/:id/versions` | Create new version |
| GET | `/api/search` | Search prompts |
| GET | `/api/collections` | List user collections |
| POST | `/api/collections` | Create collection |
| POST | `/api/collections/:id/items` | Add prompt to collection |
| GET | `/api/generations` | List generation history |
| GET | `/api/marketplace/items` | List marketplace items |
| POST | `/api/marketplace/orders` | Create order |
| POST | `/api/reviews` | Submit review |
| GET | `/api/analytics/creator` | Creator analytics |
| POST | `/api/team/invite` | Invite to workspace |
| POST | `/api/admin/moderation/:id/decision` | Moderation decision |

All responses follow `{ ok: boolean, data: any, error: string|null }` format.

## Database Schema (20 models)

`users`, `workspaces`, `workspace_members`, `plans`, `subscriptions`, `credits_ledger`, `prompts`, `prompt_versions`, `prompt_assets`, `generation_runs`, `generation_outputs`, `categories`, `tags`, `prompt_tags`, `collections`, `collection_items`, `marketplace_items`, `orders`, `reviews`, `moderation_events`

## Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# API tests only
npm run test:api

# E2E/smoke tests only
npm run test:e2e
```

## Build & Verification

```bash
# Generate Prisma client (exit 0 = success)
npm run db:generate && echo "✅ db:generate OK"

# Push schema to database
npm run db:push && echo "✅ db:push OK"

# Seed database
npm run db:seed && echo "✅ db:seed OK"

# Build for production
npm run build && echo "✅ build OK"

# Run tests
npm test && echo "✅ tests OK"
```

## Verification Scripts (D: Drive Output)

The completed project is visible at:
```
D:\WORK\AGENTS\02_開發中\sebastian\20260427_ai_promptforge_new_design_plan_mockups
```

For Windows-accessible output, the project is also accessible at the native path above.

## Minimal Flow Verification

1. **Browse → Detail → Apply → Create → Mock Generate**
   - Visit `/browse` → click any prompt card → `/prompts/[id]` → "Apply" → `/create?prompt=...` → "Generate" (mock) → view generation outputs

2. **Marketplace Mock Order**
   - Visit `/marketplace` → click item → `/marketplace/items/[id]` → "Purchase" → order created → credits deducted

## Seed Data Summary

- 4 Plans (FREE, PRO, TEAM, ENTERPRISE)
- 5 Demo Users
- 1 Team Workspace
- 10 Categories
- 20 Tags
- 24 Prompt cards (with versions, assets, tags)
- 4 Collections
- 8 Marketplace items
- 6 Generation runs (24 outputs)
- 6 Reviews
- Credits ledger entries
