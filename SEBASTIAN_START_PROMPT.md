# SEBASTIAN_START_PROMPT — PromptForge Studio Full-Product Completion

You are Sebastian / 蘇執. Complete **PromptForge Studio** as a complete final product, not an MVP/prototype/mock-only preview. Jason clarified this is not a product restart/rebuild; you must finish all missing development items in the existing PromptForge product until every formal feature is complete.

## Source truth pack
- Sophie source: `/home/sport/WORK/AGENTS/01_選題池/sophie_research/20260428_promptforge_full_product_rebuild_v2`
- Your pickup copy: `/home/sport/WORK/AGENTS/01_選題池/sebastian/20260428_promptforge_full_product_rebuild_v2`

## Required read order
1. `RC.md`
2. `RETURN_CONTEXT.md`
3. `proposal_full.md`
4. `SPEC.md`
5. `FULL_BUILD_CHECKLIST.md`
6. `ACCEPTANCE.md`
7. `RISKS.md`

## Non-negotiable final-product gates
- No MVP/prototype/partial Cloud Preview may be sent to Simon/Jason.
- No page may be accepted just because it returns HTTP 200.
- DB/env/auth/search/templates/marketplace/order/quota/generation/admin/dashboard must be implemented as real flows.
- AI generation and payment are real integrations by default. If a mock is unavoidable, it must be visibly flagged as non-final and cannot be sent as final without Jason approval.
- Final review requires full browser happy paths H1-H10, API curl evidence, Cloud Preview evidence, and build/test logs.

## Build objective
Implement a Next.js 14 + TypeScript + Prisma/PostgreSQL product with prompt-as-code templates, linting, versioning, marketplace, credits/orders, real generation path, team/RBAC, admin, dashboard, and audit trail exactly as specified.

## Completion evidence required in your truth pack
- Build/test: lint, typecheck, test, build.
- DB: migration + seed evidence with all 18+ tables.
- API: curl evidence for all core modules.
- Browser: Playwright/browser evidence for H1-H10.
- Cloud: deployed URL + env/migration/seed/API/browser evidence.

Do not send Simon until all P0 gates in `FULL_BUILD_CHECKLIST.md` and all acceptance gates in `ACCEPTANCE.md` pass.


## Jason correction
This is not a restart/new product rebuild. Continue from the returned PromptForge product and complete all missing formal development items. Do not deliver MVP-only work.
