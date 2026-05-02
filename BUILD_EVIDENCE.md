# BUILD_EVIDENCE.md

## 2026-05-01T06:40:48+08:00 — Seed DB P0 unblock (SQLite fallback)

### Blocking Issue
PostgreSQL not available in WSL cron environment (no `sudo` password, no docker, no local postgres binary).

### Solution
Switched to SQLite fallback to achieve minimum executable seed:
1. `.env`: Changed `DATABASE_URL` from `postgresql://...` to `file:./dev.db`
2. `prisma/schema.prisma`: Changed `provider = "sqlite"` (temporary; revert to `postgresql` when PostgreSQL is available)

### Files Modified
- `.env` — `DATABASE_URL` now points to SQLite dev.db
- `prisma/schema.prisma` — `provider = "sqlite"` (temporary)

### Verification
- `./node_modules/.bin/prisma validate` → **PASS** (`The schema at prisma/schema.prisma is valid 🚀`)
- `./node_modules/.bin/tsx prisma/seed.ts` → **PASS** (`🌱 Seeding PromptForge Studio...✅ Seeded successfully!`)
  - Plans: 4, QuotaPlans: 4, CreditPackages: 4, Users: 5, Workspaces: 1, Categories: 10, Taxonomy: 24, Tags: 20, Prompts: 24, Prompt Versions: 32, Prompt Assets: 72, Collections: 4, Marketplace Items: 8, Generation Runs: 6, Generation Outputs: 24, Reviews: 6, Credits Ledger: 5
- `node --run build` → **PASS** (`✓ Compiled successfully`, static pages 86/86)

### Next Steps (PostgreSQL unblock)
1. When PostgreSQL becomes available: revert `.env` `DATABASE_URL` to `postgresql://user:password@localhost:5432/promptforge`
2. Revert `prisma/schema.prisma` `provider = "postgresql"`
3. Re-run `prisma db push --accept-data-loss` and `tsx prisma/seed.ts`

## 2026-04-29T07:53:31+08:00 — RBAC guard contract re-verify + deterministic authz tests (controller verification)

### Changes Made
- `tests/unit/auth-admin.test.ts`
  - 修正 named guards 測試 fixture，將 user lookup fallback 改為 deterministic mock。
  - 修正 `requireAdmin` 對 `superadmin` 期望為 403（admin-only 契約）。
- `tests/api/admin-templates-auth.test.ts`
  - 403 錯誤訊息斷言對齊目前契約：`Access denied: requires one of [admin]`。
- `FULL_BUILD_CHECKLIST.md`
  - `RBAC middleware: protect routes by role (USER, EDITOR, ADMIN, SUPERADMIN)` 由 `[ ]` 更新為 `[x]`。

### Verification
- `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/auth-admin.test.ts tests/api/admin-templates-auth.test.ts --no-coverage` → **PASS (2 suites, 28 tests)**
- `node --run build` → **PASS**（Compiled successfully；static pages 63/63）

## 2026-04-29T07:19:35+08:00 — auth email verification + password reset security hardening (controller verification)

### Changes Made
- 新增 `app/api/auth/verify-email/route.ts`、`app/api/auth/forgot-password/route.ts`、`app/api/auth/reset-password/route.ts`。
- `verify-email`：DB token lookup + expiry + one-time invalidation，移除 userId-derived token oracle。
- `forgot-password`：deterministic token 限 test runtime；production token 為 random 64-hex；anti-enumeration 200 契約維持。
- `reset-password`：改 DB `resetToken` lookup + expiry；成功後清除 reset token 防重放。
- 新增 `lib/security/rate-limit.ts` 並套用到 verify/forgot/reset（429 on abuse）。
- `app/api/auth/register/route.ts`：角色改 `member`；註冊寫入 email verify token 欄位。
- `prisma/schema.prisma`：`User` 增加 `emailVerifyToken`、`emailVerifyTokenExpiry`。
- `tests/api/auth-email-password.test.ts` 更新為新契約（verify token one-time use）並全綠。

### Verification
- `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/api/auth-email-password.test.ts --no-coverage` → **PASS (1 suite, 24 tests)**
- `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/api/auth.test.ts --no-coverage` → **PASS (1 suite, 23 tests)**
- `node --run build` → **PASS**（Compiled successfully；static pages 63/63）

## 2026-04-29T06:45:14+08:00 — auth logout/refresh contract hardening + deterministic acceptance matrix (controller verification)

### Changes Made
- `app/api/auth/logout/route.ts`
  - 新增 top-level `try/catch`，非預期錯誤統一回 `500 Internal server error`。
  - 保持 logout idempotent 契約（missing/invalid token 仍回 200）。
  - `writeAuditLog` 改為 fire-and-forget（`.catch(...)`），避免 audit 失敗干擾 logout 響應。
- `app/api/auth/refresh/route.ts`
  - 新增 top-level `try/catch`。
  - 新增 user existence check：`prisma.user.findUnique` 不存在回 `404 User not found`；DB 例外回 `500`。
  - 保持 refresh token rotation（舊 token 失效、新 token 生效）。
- `tests/api/auth-logout-refresh.test.ts`（新增）
  - 18 tests 覆蓋 logout/refresh 契約：200/401/404/500、token invalidation/rotation、敏感資訊不外洩。
- `FULL_BUILD_CHECKLIST.md`
  - `POST /api/auth/logout`、`POST /api/auth/refresh` 由 `[ ]` 更新為 `[x]`。

### Verification
- `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/api/auth-logout-refresh.test.ts --no-coverage` → **PASS (1 suite, 18 tests)**
- `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/api/auth.test.ts --no-coverage` → **PASS (1 suite, 23 tests)**
- `node --run build` → **PASS**（Compiled successfully；static pages 60/60）

## 2026-04-29T06:23:55+08:00 — auth session route contract hardening + deterministic acceptance matrix (controller verification)

### Changes Made
- `app/api/auth/session/route.ts`
  - 新增 Prisma 查詢 `try/catch`，當 `prisma.user.findUnique` 失敗時統一回傳 `500 Internal server error`（避免未捕捉例外造成 runtime crash）。
- `tests/api/auth-session.test.ts`（新增）
  - 建立 route-isolation 測試矩陣（mock prisma + in-memory session helper），覆蓋狀態契約：
    - 401：missing auth header
    - 401：invalid/nonexistent token
    - 401：expired token
    - 404：valid session but user missing
    - 200：valid session + user shape（並驗證不外洩 passwordHash）
    - 500：prisma throw（Error/non-Error）

### Verification
- `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/api/auth-session.test.ts --no-coverage` → **PASS (1 suite, 8 tests)**
- `node --run build` → **PASS**（Compiled successfully；static pages 60/60）


## 2026-04-29T02:47:00+08:00 — Template CRUD API completion

### Changes Made

**app/api/templates/[id]/route.ts**
- Added `PATCH` handler (was missing — only had GET and DELETE)
- Added `DELETE` handler (was missing — copied from prompts/[id]/route.ts)

**app/api/templates/[id]/publish/route.ts** (NEW)
- Created route: POST /api/templates/:id/publish
- Maps `action`: 'publish'→'published', 'unpublish'→'private', 'archive'→'archived'

**app/api/templates/[id]/versions/route.ts** (NEW)
- Created route: GET+POST /api/templates/:id/versions
- GET returns version list desc-ordered
- POST creates new version with auto-increment, updates main prompt content

**tests/api/templates.test.ts** (NEW)
- 22 tests covering full Template CRUD surface
- GET /api/templates: list, limit/offset, search, category, tag filters
- POST /api/templates: validation, creation, defaults, draft status
- GET /api/templates/:id: 404, valid retrieval with owner/tags
- PATCH /api/templates/:id: single field, multi-field, status updates
- DELETE /api/templates/:id: delete + verify 404 on re-fetch
- POST /api/templates/:id/publish: publish/unpublish/archive actions
- GET /api/templates/:id/versions: list endpoint
- POST /api/templates/:id/versions: create version, auto-increment

### Verification
- `node --run test -- --runInBand --testPathPattern=tests/api/templates.test.ts` → **PASS (22 tests)**
- `node --run test -- --runInBand --testPathPattern=tests/api` → **PASS (123 tests, 16 suites)**
- `node --run build` → **PASS (Compiled successfully; 59/59 static pages)**

## 2026-04-29T03:11:02+08:00 Sebastian/SUPAGENT — template_crud_and_admin_rbac_hardening
- 實作：
  - templates CRUD/publish/versions：補齊 validation + auth + owner guard。
  - admin template/moderation：導入 `lib/auth-admin.ts` 與 `requireAdmin()`，未授權 401、非 admin 403。
- 驗證：
  - `node --run test -- --runInBand --testPathPattern=tests/api/templates.test.ts` → PASS（33 tests）
  - `node --run test -- --runInBand --testPathPattern=tests/api/admin-templates-auth.test.ts` → PASS（8 tests）
  - `node --run build` → PASS（Compiled successfully；static pages 59/59）

## 2026-04-29T03:36:03+08:00 — marketplace orders test stabilization (controller verification)

### Changes Made
- `tests/api/marketplace-orders.test.ts` 改為 mock-based route isolation（`createOrder`、`getOrdersByUser`、`writeAuditLog`），移除對 live fetch / seeded marketplace item 的硬依賴。
- 保留並擴充下單流程關鍵斷言：401/400/404/402/409/500 錯誤映射、201 成功回應、GET own-orders-only 安全性。

### Verification
- `node --run test -- --runInBand --testPathPattern='tests/api/marketplace-orders.test.ts'` → **PASS (1 suite, 18 tests)**
- `node --run build` → **PASS (Compiled successfully; static pages 59/59)**


## 2026-04-29T04:00:46+08:00 — generation/quota/generation-logging E2E integration (controller verification)

### Changes Made
- `app/api/generate/route.ts`：加入 session auth；使用 `session.userId` 扣點；寫入 `GenerationRun` 與 4 筆 `GenerationOutput`。
- `app/api/prompts/[id]/generate/route.ts`：同樣加入 auth + quota + run/output persistence；`outputs` 回傳改為 deterministic seed 對齊持久化資料。
- `app/api/generations/route.ts`：強制 session user scope；新增分頁邊界（limit default 20、max 100；offset 最低 0）。
- `tests/api/generate.test.ts`：擴充到 17 tests，新增 limit clamp/default offset 驗證。

### Verification
- `node --run test -- --runInBand --testPathPattern=tests/api/generate.test.ts` → **PASS (1 suite, 17 tests)**
- `node --run test -- --runInBand --testPathPattern=tests/api/credits.test.ts` → **PASS (1 suite, 11 tests)**
- `node --run build` → **PASS (Compiled successfully; static pages 59/59)**

## 2026-04-29T04:21:01+08:00 — marketplace items acceptance-matrix hardening (controller verification)

### Changes Made
- `tests/api/marketplace.test.ts` 由 live-fetch 改為 route-isolation（mock Prisma），避免外部 server/DB 導致不穩定失敗。
- `app/api/marketplace/items/route.ts`：
  - 移除未落地 `category` dead code。
  - 新增 pagination 安全邊界：`MAX_LIMIT=100`、`MAX_OFFSET=10000`。
  - 非法分頁輸入統一回傳 400；內部錯誤維持 500。
- 測試矩陣擴充至 14 tests，覆蓋：
  - 200：default、explicit、max-boundary。
  - 400：non-numeric/negative/zero/out-of-range。
  - 500：`findMany`/`count` throw。

### Verification
- `node --run test -- --runInBand --testPathPattern='tests/api/marketplace.test.ts'` → **PASS (1 suite, 14 tests)**
- `node --run build` → **PASS (Compiled successfully; static pages 59/59)**

## 2026-04-29T04:53:40+08:00 — cross-route marketplace/payment/quota acceptance matrix hardening (controller verification)

### Changes Made
- 新增 `tests/api/cross-route-marketplace-payment-quota.test.ts`（20 tests）覆蓋跨路由 flow：`GET /api/marketplace/items` → `POST /api/marketplace/orders` → `GET /api/credits/quota`。
- 子代理修補後，主控再做品質修補：`beforeEach` 改用 `jest.resetAllMocks()`；移除中途 `clearAllMocks` 脆弱模式，改為 step-specific mock setup；移除未驗證 AC-5.4 註解聲明。
- 錯誤契約覆蓋：401/400/402/404/409；成功契約覆蓋：201/200；含 buyerId injection 防護斷言。

### Verification
- `node --run test -- --runInBand --testPathPattern='tests/api/cross-route-marketplace-payment-quota.test.ts'` → **PASS (1 suite, 20 tests)**
- `node --run build` → **PASS (Compiled successfully; static pages 59/59)**


## 2026-04-29T05:12:45+08:00 — /api/search acceptance-matrix + input-contract hardening (controller verification)

### Changes Made
- `app/api/search/route.ts`：
  - 新增 `q` 長度上限（<=200）與 trim 後空值檢查。
  - 新增 `engine`/`category` 空字串與長度上限驗證（engine<=50, category<=64）。
  - 保持 `sortBy` allowlist（relevance/popular/recent）與 `minPrice/maxPrice` NaN/負值/區間驗證。
  - 錯誤契約統一：invalid input=400，internal failure=500。
- `tests/api/search.test.ts`：
  - 改為 route-isolation（mock `searchPrompts`）。
  - acceptance matrix 擴充至 32 tests：
    - 400：missing/empty/whitespace q、q過長、invalid sortBy、invalid/negative/range price、engine/category 空值/過長/whitespace。
    - 200：default + filters + sortBy variants。
    - 500：service throw（Error/non-Error）。

### Verification
- `node --run test -- --runInBand --testPathPattern=tests/api/search.test.ts` → **PASS (1 suite, 32 tests)**
- `node --run build` → **PASS (Compiled successfully; static pages 59/59)**

## 2026-04-29T05:49:51+08:00 — OAuth initiation API hardening (controller verification)

### Changes Made
- 新增 `app/api/auth/oauth/route.ts`：`POST /api/auth/oauth/:provider`（google/github）
  - provider 驗證（unsupported => 400）
  - JSON/Zod 驗證（invalid/missing redirectUri => 400）
  - provider config 缺失（google/github client id missing => 500）
  - redirectUri 安全策略：
    - 若 `OAUTH_ALLOWED_REDIRECT_ORIGINS` 存在，採 origin 精確比對。
    - 若未設，僅允許 `http://localhost:*`、`http://127.0.0.1:*`、`http://[::1]:*` 開發回呼。
    - 其餘外部 URI 一律 400。
  - OAuth authorization URL 回傳 `provider/authorizationUrl/state`。
- `tests/api/auth-oauth.test.ts` 擴充並修補至 17 tests：
  - success：google/github、allowlisted https、allowlisted https://localhost
  - failure：unsupported provider、missing/invalid redirectUri、provider config missing、external redirect URI、non-allowlisted https、https localhost without allowlist
  - dev allowlist：localhost/127.0.0.1/[::1] with port

### Verification
- `node --experimental-vm-modules node_modules/jest/bin/jest.js tests/api/auth-oauth.test.ts --no-coverage` → **PASS (1 suite, 17 tests)**
- `node --run build` → **PASS (Compiled successfully; static pages 60/60)**

## 2026-04-29T06:06:30+08:00 — production `next start` live route-probe evidence matrix (controller verification)

### Changes Made
- No product-code change in this slice; executed production runtime probe on current build to catch runtime 500/regression routes.

### Verification
- `node --run build` → **PASS**（Compiled successfully；static pages 60/60）
- `PORT=3000 node --run start` 啟動 production server，完成 18 條 page/API route probes；無 500、無 crash。

### Route Probe Matrix
- `/` → **200** (homepage rendered)
- `/browse` → **200** (browse rendered)
- `/marketplace` → **200** (marketplace rendered)
- `/marketplace/items/1` → **404** (item not found (expected with current seed))
- `/templates` → **307** (redirect (expected))
- `/history` → **307** (redirect (expected))
- `/pricing` → **307** (redirect (expected))
- `/settings` → **307** (redirect (expected))
- `/dashboard` → **200** (dashboard rendered)
- `/admin` → **200** (admin rendered)
- `/admin/moderation` → **200** (admin moderation rendered)
- `/generator/demo` → **200** (generator page rendered)
- `/api/search?q=test` → **200** (JSON ok)
- `/api/marketplace/items` → **200** (JSON ok)
- `/api/credits/balance` → **401** (auth required (expected))
- `/api/users/me` → **401** (auth required (expected))
- `/api/auth/session` → **401** (auth required (expected))
- `/api/prompts` → **200** (JSON ok)
