# PromptForge Studio — RISKS v2

updated_at: 2026-04-28T21:49:04+08:00
mode: full_product_only

## P0 red-line risks

1. **AI integration risk**
   - Risk: implementation silently falls back to fake responses while UI looks final.
   - Required mitigation: production path must use real OpenAI/Anthropic provider keys; any `USE_MOCK_AI=true` run must show a visible DEMO MODE badge, write `responseMeta.isMock=true`, and is not eligible for Jason final review without explicit approval.

2. **Payment / credits risk**
   - Risk: credits, order, and Stripe checkout appear in UI but are not backed by real webhook-confirmed transactions.
   - Required mitigation: Stripe Checkout + signed webhook must create `Order`, `OrderItem`, and immutable `CreditTransaction` records atomically. Mock payment is non-final unless Jason approves.

3. **Database-backed API risk**
   - Risk: pages return HTTP 200 from seed/fallback arrays while DB APIs fail.
   - Required mitigation: every page must read/write live PostgreSQL through Prisma; API smoke tests must prove templates, search, orders, credits, generations, teams, admin, and dashboard routes work against deployed DB.

4. **Search indexing risk**
   - Risk: marketplace search is only client-side filtering over static JSON.
   - Required mitigation: published templates must be indexed in Elasticsearch/Algolia or a documented production-grade fallback; publish/update/flag/delete must update index state.

5. **Quota ledger consistency risk**
   - Risk: credits can go negative or double-spend during concurrent generation/purchase.
   - Required mitigation: ACID transaction around balance check + ledger insert; tests must simulate concurrent requests.

6. **Template IP / attribution risk**
   - Risk: product copies third-party prompt examples without license trail.
   - Required mitigation: all imported/forked templates require license, upstream URL, attribution metadata, and admin removal workflow.

7. **Auth/RBAC risk**
   - Risk: admin/team-only data leaks through API or page routing.
   - Required mitigation: shared RBAC middleware for pages and API routes; tests for owner/admin/editor/viewer/api_caller permissions.

8. **Cloud parity risk**
   - Risk: local works but Cloud Preview lacks env vars, migrations, webhooks, or external services.
   - Required mitigation: Cloud Preview evidence must include env checklist, migration log, seed log, API curl results, and browser happy paths.

## Acceptable degradation rules

- AI/payment mock is acceptable only for internal development and must be visibly marked non-final.
- If Elasticsearch cannot be provisioned, Sebastian may use a production PostgreSQL full-text fallback only if API contracts, filters, sort, and latency targets are still met and this is documented in RC.md.
- Email delivery may use a captured test inbox during development, but final verification must show token generation and user-visible verify/reset/invite flow.
- Any removed page/API/table from SPEC.md is a P0 fail unless Sophie writes a new approved planning patch.

## Verification evidence Sebastian must return

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` logs.
- Prisma migration/seed evidence listing all 18+ tables.
- API curl pack covering auth, templates, search, marketplace, orders, credits, generation, teams, admin, dashboard.
- Browser happy-path screenshots or Playwright trace for H1-H10.
- Cloud Preview URL and proof no core user-facing page is backed only by fallback data.
