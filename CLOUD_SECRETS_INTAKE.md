# Cloud Secrets Intake — PromptForge Studio

> **Purpose:** 運維取得 cloud secrets 後，直接對照本表回填，隨後一行命令啟動全 smoke 驗收。
> 不得修改 `RC.md` / `NEXT_STEP.md` / `TASK_META.json` / `FULL_BUILD_CHECKLIST`。

---

## 一步啟動命令順序

```bash
# 1. 驗證 contract（.env.production.required ↔ REQUIRED_ENV_VARS 的一致性）
node --run cloud:contract

# 2. 讀取 readiness 報告（靜態掃描，無網路呼叫）
node --run cloud:readiness

# 3. 對已部署環境跑 H1–H10 smoke（全 suite）
BASE_URL=https://promptforge.studio npm run verify:cloud

# 或對 localhost：
npm run verify:cloud
```

> **正常流程：`cloud:contract` exit 0 → `cloud:readiness` exit 0 → `verify:cloud` exit 0**  
> `cloud:contract` 或 `cloud:readiness` 失敗時，相關差異會直接印在 stdout，請先修復再繼續。

---

## P0 / H1–H10 對照矩陣

| Priority | ID | Description | Gates (H#) |
|---|---|---|---|
| P0 | — | 全部 10 項必填 env 皆需到位，否則 smoke 會 fail | — |
| H1 | Auth | Register / email-verify / login / session | AUTH_SECRET, AUTH_URL, DATABASE_URL, RESEND_API_KEY |
| H2 | Templates | Create / lint / publish | AUTH_SECRET, DATABASE_URL |
| H3 | Marketplace | Browse / search / preview | ELASTICSEARCH_API_KEY, ELASTICSEARCH_URL |
| H4 | Purchase | Stripe checkout / credits deducted | STRIPE_SECRET_KEY |
| H5 | Generate | AI streaming response / credits | ANTHROPIC_API_KEY, AUTH_SECRET, OPENAI_API_KEY |
| H6 | API Key | Admin key creation / caller usage | AUTH_SECRET, DATABASE_URL |
| H7 | Teams | Invite / accept / RBAC | AUTH_SECRET, DATABASE_URL |
| H8 | Quota | Exhaust / block / upgrade prompt | ELASTICSEARCH_API_KEY, ELASTICSEARCH_URL, STRIPE_SECRET_KEY |
| H9 | Moderation | Flag template / hide from search | *(無 gate — 僅 client-side，無外部依賴)* |
| H10 | Fork | Derivative with attribution | DATABASE_URL |

> H9 為可選（client-side 邏輯，無外部 API dependency）。其他項 failing 皆會阻斷 `verify:cloud` exit 0。

---

## 環境變數填值表（遮罩格式）

> **⚠️ 複製後去掉 `***` 替換為真實值。嚴禁將本檔直接 commit 至 git。**

| # | Key | 範例值（遮罩） | 說明 | Gates |
|---|---|---|---|---|
| 1 | `DATABASE_URL` | `postgresql://user:***@host:5432/promptforge` | PostgreSQL 連線字串（Prisma） | H1, H2, H6, H7, H10 |
| 2 | `AUTH_SECRET` | `***`（最小 32 字隨機字串） | JWT / session  signing 金鑰（jose） | H1, H2, H5, H6, H7 |
| 3 | `AUTH_URL` | `https://promptforge.studio` | Auth 服務基底 URL（email verify / password reset） | H1 |
| 4 | `OPENAI_API_KEY` | `sk-***` | OpenAI API Key（GPT-4o / embeddings） | H5 |
| 5 | `ANTHROPIC_API_KEY` | `sk-ant-***` | Anthropic API Key（Claude alternative） | H5 |
| 6 | `STRIPE_SECRET_KEY` | `sk_live_***` 或 `sk_test_***` | Stripe Secret Key（payments / billing） | H4, H8 |
| 7 | `SENTRY_DSN` | `https://<key>@sentry.io/<project>` | Sentry DSN（error tracking，missing 可 graceful no-op） | — |
| 8 | `ELASTICSEARCH_URL` | `https://search.promptforge.studio:9200` | Elasticsearch URL（搜尋 / autocomplete） | H3, H8 |
| 9 | `ELASTICSEARCH_API_KEY` | `***`（base64-encoded ES API key） | Elasticsearch API Key（cluster 認證） | H3, H8 |
| 10 | `RESEND_API_KEY` | `re_***` | Resend API Key（transactional email） | H1 |

### 建議回填方式

```bash
# 1. 複製 .env.production.required 為 .env.production 並填入真實值
cp .env.production.required .env.production

# 2. 確認 cloud:contract 一致性
node --run cloud:contract

# 3. 確認 readiness 報告
node --run cloud:readiness

# 4. 確認 smoke 可跑（H1–H10）
BASE_URL=https://promptforge.studio npm run verify:cloud
```

### AUTH_SECRET 快速產生方式

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 疑難排解

| 現象 | 原因 | 解法 |
|---|---|---|
| `cloud:contract` exit 1 | `.env.production.required` 與 `REQUIRED_ENV_VARS` 不一致 | 檢查 key 拼寫是否完全一致（大小寫敏感） |
| `cloud:readiness` 顯示 missing 10/10 | 環境變數未載入 | 確認 `.env.production` 或 target/secrets 有正確 export |
| `verify:cloud` exit 1 | 缺少必要 env | 補齊後重跑；`node --run cloud:readiness` 可看詳細清單 |
| `verify:cloud` exit 2 | Smoke check 有一項以上失敗 | 見輸出中的 `❌ HX ...` 並對應修復 |
| `build` fail | Prisma schema / TypeScript 問題 | 先 `npm run db:generate` 再 `node --run build` |

---

## 驗收狀態對照表

| Step | Pass 條件 | fail 条件 |
|---|---|---|
| `node --run cloud:contract` | exit 0 + "keys match" | exit 1 + drift 清單 |
| `node --run cloud:readiness` | exit 0 + 無 missing（H1–H10 全 ✅） | exit 0 + 有 missing（H1–H10 有 ❌） |
| `npm run verify:cloud` | exit 0 + "All smoke checks passed" | exit 1（缺少 env）/ exit 2（smoke 失敗） |

---

*本檔由 SUPAGENT-first（MiniMax-M2.7）產生，對應 `scripts/validate-cloud-env-contract.ts`、`scripts/generate-cloud-readiness-report.ts`、`scripts/verify-cloud-happy-path.ts`。*

---

## 2026-05-01T18:38:15+08:00 — Hermes系統管理員個案處理結果

### 已處理
- 修正 `scripts/verify-cloud-happy-path.ts` 的 false-negative：
  - GET helper 支援 Bearer token。
  - H1 session 改用 register token 驗證。
  - H5 credits/quota、H7 orders 改用 auth token。
  - H9 analytics 改由 `/api/auth/session` 解析 smoke userId 後查詢。
- 重跑驗證：
  - `node --run cloud:contract`：PASS。
  - `node --run build`：PASS，86/86 routes。
  - `node --run cloud:readiness`：仍回報 10/10 production env missing。
  - `node --run verify:cloud`：exit 1，因必填 production env 未注入，尚未進入 H1-H10 live smoke。

### 個案阻塞（非 OP 程式工作）
- 無法由 Hermes 合法自行產生的外部帳密仍缺：`DATABASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `SENTRY_DSN`, `ELASTICSEARCH_URL`, `ELASTICSEARCH_API_KEY`, `RESEND_API_KEY`。
- `AUTH_SECRET` 可由系統管理員生成，但沒有 DB/provider secrets 與最終 `AUTH_URL` 時，單獨注入不構成 QC-ready。
- Supabase：既有 `promptforge-ai-preview` 可 link；新建 project 被 free project 2/2 上限阻擋；DB push 仍需 `SUPABASE_DB_PASSWORD`/可用連線。

### QC 判定
- 未送 Simon/QC：目前若送 `build.ready` 會是 false positive。
- `ready_for_build_ready=false`, `all_must_fix_completed=false`, `remaining_p0_count=17` 維持。

