# PRODUCT_SPEC.md — PromptForge Studio Full-Product Rebuild v2

- 產品名稱：PromptForge Studio
- 規格版本：2.1（PM compatibility canonical）
- 更新時間：2026-04-30T03:14:59+08:00
- Canonical implementation detail reference：`SPEC.md`
- 本文件目的：補齊 QC 固定流程要求的正式 `PRODUCT_SPEC.md`，並將既有 `SPEC.md` 的 technical spec 收斂成 OP/Sebastian 可直接執行、QC/Simon 可驗收的產品規格。

## 1. 這是什麼
PromptForge Studio 是一個 prompt-as-code marketplace + generation studio：使用者可建立、版本化、發布、購買與執行結構化 prompt template；團隊可用共享 quota、成員權限與 billing 管理生成成本；管理者可審核模板、處理用戶/訂單/稽核紀錄。

## 2. 目標使用者
1. AI power users / prompt creators：需要把 prompt 產品化、版本化、上架與被購買。
2. 團隊管理者：需要集中管理模板、成員、額度、發票與使用紀錄。
3. 一般使用者：需要搜尋可信模板並在生成工作台中快速套用。
4. 平台管理者：需要審核模板、管理用戶/交易/稽核、安全與內容品質。

## 3. 核心痛點
- Prompt 分散在文字檔/聊天紀錄，難以搜尋、複用、版本管理與商業化。
- Template 變數、限制、輸出品質缺乏結構化驗證，造成生成失敗或成本浪費。
- 團隊生成成本與 quota 難追蹤，缺少成員級分配與超額處理。
- Marketplace 缺少完整購買、評價、創作者、分類與審核流程。

## 4. 功能範圍
### 4.1 必做 P0 / Final-product scope
- Auth：email/password register/login/logout、session cookie/JWT、email verification、forgot/reset password、OAuth hook compatibility、current user profile。
- User/Profile/API keys：profile CRUD、GDPR export/delete、API key create/list/revoke。
- Template authoring：create/edit/delete/publish/deprecate/fork、versions、diff、lint、variable schema、anti-failure constraints、pricing。
- Marketplace：browse/search/filter/sort、template detail、creator profile、featured/trending、ratings。
- Orders/Credits/Billing：credit package purchase、template purchase、atomic credit deduction、invoice、Stripe webhook/mock-payment test boundary、credit ledger、quota plan。
- Generation：template resolution、variable injection、constraint validation、OpenAI/Anthropic real provider wiring with controlled fallback only where explicitly configured、streaming SSE、full-fidelity generation log、deduct credits only on COMPLETED、cancel/history/detail。
- Teams：team CRUD、members/invite/roles、team quota pool、member allocation persistence、team dashboard/overage UX。
- Admin：users/templates/orders/credits/audit/health/announcements moderation console。
- Search：taxonomy, autocomplete, template full-text search; Elasticsearch can be replaced by local indexed search if API contract remains compatible.
- Delivery evidence：`README.md`、`PRODUCT_SPEC.md`、`SPEC.md`、`TEST_RESULT.md`、`FULL_BUILD_CHECKLIST.md`、RC/NEXT_STEP/TASK_META all aligned.

### 4.2 P1 / 可在 P0 通過後增強
- Advanced analytics dashboards, creator revenue reporting, saved collections beyond core save/purchase flows, richer visual polish, multi-provider admin tuning UI.

## 5. 頁面結構
1. `/` Landing：hero、features、pricing、CTA、public marketplace links。
2. `/login`、`/register`、`/forgot-password`、reset/verify flows。
3. `/dashboard`：quota、usage、recent activity、owned templates、generation summary。
4. `/templates`：user template library。
5. `/templates/new`、`/templates/:slug/edit`：prompt-as-code editor。
6. `/templates/:slug`：published/draft-aware template preview。
7. `/marketplace`：public browse/search/filter。
8. `/marketplace/:slug`、`/marketplace/items/:id`：template detail + purchase/use CTA。
9. `/creators/:username`：creator profile + templates。
10. `/generate/:templateSlug` or `/generator/[templateId]`：generation studio with variable form, streaming result, copy/regenerate/history/quality flag。
11. `/history`、`/result/:sessionId`：generation history/detail。
12. `/billing` or `/settings/billing`：credit balance、packages、orders、invoices、quota upgrade。
13. `/team/:slug` or `/dashboard/team`：team members、roles、quota pool/allocation、overage。
14. `/settings`：profile、security、API keys。
15. `/admin`、`/admin/users`、`/admin/templates`、`/admin/orders`、`/admin/credits`、`/admin/audit-log`、`/admin/health`：admin console。
16. `/api-docs`：developer API docs。

## 6. 使用流程
### 6.1 Creator publishes template
1. Creator registers/logs in.
2. Creates template with name, taxonomy, description, system message, user template, variables, constraints, tags, pricing.
3. Runs lint and preview generation.
4. Publishes template; version snapshot is created.
5. Template appears in marketplace if moderation checks pass.

### 6.2 Buyer searches, purchases, generates
1. Visitor browses/searches marketplace and opens template detail.
2. User logs in and purchases paid template or uses free template.
3. Opens generation studio, fills variables, starts generation.
4. System validates constraints/quota, streams result, writes generation log, deducts credits on COMPLETED only.
5. User copies/regenerates/rates template.

### 6.3 Team quota management
1. Owner creates team and invites members.
2. Owner buys/assigns quota plan or credit pool.
3. Owner allocates member quotas from pool.
4. Members generate within allocated quota; overage shows upgrade/add-credit CTA.
5. Owner reviews team dashboard and allocation usage.

### 6.4 Admin moderation
1. Admin reviews flagged/new templates/users/orders.
2. Admin flags/removes templates, grants/revokes credits, views audit log/health.
3. All admin actions write audit events.

## 7. 資料欄位
Implementation must map to `SPEC.md` schema sections 1.1–1.11. Required domain objects:
- User：id, email, passwordHash, emailVerified, name, avatarUrl, role, createdAt, updatedAt, deletedAt。
- Account/Session/APIKey：provider credentials/sessionToken/keyHash/keyPrefix/scopes/lastUsed/expires/revoked。
- Team/TeamMember/TeamQuota：name, slug, plan, members, roles, quotaAlloc/member allocation, totalCredits, usedCredits, purchasedCredits, resetAt。
- Template/TemplateVersion：name, slug, description, taxonomy, owner/team, status, systemMessage, userTemplate, variables, antiFailureConstraints, tags, version, changelog, lint score, usage/fork counts, pricing, attribution, moderation fields。
- Taxonomy：name, slug, parent, icon, sort, active。
- Order/OrderItem：orderNumber, user/team, status, subtotal/discount/total credits, line items, invoice info。
- CreditTransaction/QuotaPlan：ledger type, amount, balanceAfter, package/plan, source, period reset。
- GenerationRun/GenerationLog：template/version, variables, provider/model, prompt, response, status, token usage, latency, cost, error, timestamps, streaming chunks sufficient for full-fidelity audit。
- Review/Notification/AuditLog/SearchIndex：rating/comment, notification type/read state, actor/action/resource metadata, denormalized searchable template fields。

## 8. API/API contract requirements
- Auth endpoints：`POST /api/auth/register`, `POST /api/auth/login`, logout/refresh/session, verify/forgot/reset password; protected happy path must work with the same cookie jar/token used after login。
- Users：`GET/PATCH/DELETE /api/users/me`, API keys, export。
- Templates：CRUD, publish/deprecate/fork, versions/diff/lint。
- Marketplace/Search：templates browse/detail/taxonomy/featured/trending/rating/creator, `/api/search/templates`, `/api/search/autocomplete`, `/api/search/taxonomy`。
- Orders/Credits：credit purchase, Stripe webhook, template purchase, invoice, balance/transactions/quota, admin grant/revoke。
- Generation：`POST /api/generate`, `POST /api/generate/stream`, history/detail/cancel; validate quota/variables/constraints before provider call。
- Teams：teams CRUD, members invite/accept/role, team quota get/update/allocation。
- Admin：users/templates/orders/credits/audit/health/announcements。

## 9. UI/UX 要求
- Professional SaaS marketplace style; not a toy MVP landing-only demo.
- Clear navigation between marketplace, user dashboard, editor, generation, billing/team/admin areas.
- Generation studio must show variable form, validation errors, streaming progress, result actions, history/sidebar or equivalent persistent history.
- Billing/quota states must be explicit: balance, plan, usage, overage, purchase/upgrade CTA.
- Team quota UI must show pool, used amount, allocation per member, remaining amount, and failure states.
- Admin tables must support search/filter/status actions and visible audit-sensitive outcomes.
- Empty/loading/error/unauthorized states must be handled for core pages.

## 10. 技術限制
- Framework/package boundaries follow current repository implementation and `SPEC.md`; do not replace the stack without explicit truth-pack note.
- Secrets must not be hardcoded. Provider/Stripe/OAuth/S3/Redis/DB values must come from environment variables or safe test mocks.
- Mock-only happy paths are prohibited for final QC unless explicitly marked as configurable fallback and real provider path is implemented/testable.
- Credit deduction must be atomic and must not deduct on failed/cancelled/in-progress generation.
- Protected APIs must consistently accept the auth/session mechanism established by login.
- `next_event` may only be dispatcher events (`topic.created`, `plan.ready`, `build.ready`, `null`); verdicts stay out of `next_event`.

## 11. Phase 拆分、完成定義與 QC 驗收標準
### Phase 0 — Truth-pack/spec compatibility
- Scope：`PRODUCT_SPEC.md`、`SPEC.md`、README、TEST_RESULT、FULL_BUILD_CHECKLIST、RC/NEXT_STEP/TASK_META 一致；QC 固定檔案名稱可讀。
- Done：`PRODUCT_SPEC.md` 包含產品/使用者/痛點/功能/頁面/流程/資料欄位/UI/技術限制/phase/QC/禁止事項；TASK_META 記錄 spec compatibility closure。
- QC：Simon 固定讀檔不再因 PRODUCT_SPEC 缺失或 shim-only 規格退回。

### Phase 1 — Foundation/Auth/Profile
- Scope：DB schema/migrations/seed baseline、auth register/login/logout/session、users/me、profile/API key basics。
- Done：auth and profile tests pass; live cookie-jar login → protected route 200。
- QC：browser/API live probe demonstrates register/login/current-user/quota protected route using same session。

### Phase 2 — Template + Marketplace
- Scope：template CRUD/version/lint/publish/fork、taxonomy、marketplace browse/detail/search/creator/rating。
- Done：creator can publish a template; public user can find it; paid/free state visible。
- QC：routes/API probes and screenshots cover template creation, publish, marketplace search/detail。

### Phase 3 — Credits/Billing/Orders
- Scope：credit plans/packages, Stripe/mock-payment boundary, order/invoice, template purchase, ledger/quota。
- Done：purchase updates ledger/quota atomically; failed transaction does not mutate balance。
- QC：tests cover success/fail/idempotency and UI shows balance/order history。

### Phase 4 — Generation Studio
- Scope：variable injection, constraint validation, real AI provider path, streaming, logs, credit deduction on completion, history/regenerate/copy/quality flag。
- Done：generation from purchased/free template streams and persists full result/log; failures preserve credits。
- QC：unit/API/live evidence for provider success/failure, streaming chunks, history detail, deduction timing。

### Phase 5 — Teams/Quota
- Scope：team CRUD, invites/members/roles, pool quota, member allocation persistence, dashboard, overage UX。
- Done：owner allocates member quota from pool; member generation consumes allocation; overage blocked with CTA。
- QC：API tests + browser/live evidence for allocation persistence and quota enforcement。

### Phase 6 — Admin/Operational hardening
- Scope：admin user/template/order/credit/audit/health, notifications, security/error states, final packaging to D drive.
- Done：admin actions work and write audit logs; README/TEST_RESULT contain build/test/API/live/browser evidence; D drive product package ready.
- QC：`node --run build`, focused tests, production server route probes, browser smoke, truth-pack gates: remaining P0=0, all_must_fix_completed=true, ready_for_build_ready=true before `build.ready`.

## 12. QC 驗收標準（全域）
- Required files exist and are substantive: `PRODUCT_SPEC.md`, `SPEC.md`, `README.md`, `TEST_RESULT.md`, `FULL_BUILD_CHECKLIST.md`, `RC.md`, `NEXT_STEP.md`, `TASK_META.json`.
- `FULL_BUILD_CHECKLIST.md` has no unchecked P0 unless formally downgraded with reason in truth pack.
- `TASK_META.json` status/lane/gates match actual state; no false `ready_for_build_ready` while remaining P0 > 0.
- Build/test evidence is current and reproducible: focused tests for changed modules plus full `node --run build`.
- Production live probe covers public routes, auth flow, protected routes, generation, marketplace, billing/quota/team/admin as applicable.
- Browser evidence or screenshots cover final-product core flows, not only API responses.
- D-drive product package and review report paths are present before Simon review.

## 13. 禁止事項
- 禁止把 landing page/mock-only demo 當 final product。
- 禁止用 shim-only `PRODUCT_SPEC.md` 取代實質產品規格。
- 禁止未清 P0、未跑 build/test/live probe 就宣稱 ready。
- 禁止 mock AI/mock Stripe 作為 final happy path，除非明確寫入使用者核准與測試邊界。
- 禁止 protected routes login 後仍 401 卻送驗。
- 禁止 `review.done`/`review.rejected` 寫入 `next_event`。
- 禁止 Sophie 宣稱 Sebastian 或 Simon 已完成；Sophie 只負責規格收斂與 truth-pack 同步。
