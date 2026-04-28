# PLAN — PromptForge Studio 全新 AI提示詞產品開發案

- task_id: 20260427_ai_promptforge_new_design_plan_mockups
- trace_id: 20260427_ai_promptforge_new_design_plan_mockups-1777290861
- updated_at: 2026-04-27T20:03:09+08:00
- owner: Sophie
- target: Sebastian
- revision: new_design_plan_mockups_user_gate_v1
- 產品類型：大型 WEB / SaaS / Prompt Marketplace + AI Generation Workspace

---

# 0. 題目基本資訊

**產品名稱：** PromptForge Studio  
**一句話：** 專業級 AI Prompt 創作、探索、版本管理、交易與一鍵生成平台。  
**不是：** 不是單純 prompt 靈感牆、不是 landing page、不是舊 PromptForge 修補案。  
**核心閉環：** 使用者探索 prompt / 建立 prompt → 管理模型與參數 → 一鍵生成 / 版本迭代 → 收藏、分享、上架交易 → 分析成效與團隊協作。

---

# 1. 市場研究摘要

## 1.1 市場熱度
1. Civitai 證明 AI 圖像模型/素材/生成結果有強社群與 marketplace 型需求，卡片流、模型 detail、創作者互動是高頻瀏覽模式。
2. PromptHero 證明 prompt gallery、分類搜尋、prompt detail 是使用者尋找靈感與學習 prompt 的既有行為。
3. Leonardo.ai 證明單純看圖不夠，使用者需要生成工作台、模型/風格/參數控制與結果管理。

## 1.2 高頻痛點
- Prompt 靈感分散在社群、圖片站、文件與個人筆記，難以搜尋、重用、比較。
- 生成參數常被截斷或無標準格式，無法一鍵套用到工作流。
- 團隊缺少共享 prompt library、版本管理、使用成效與權限治理。
- 創作者很難把 prompt pack 包裝成可交易商品並追蹤銷售/評價。

## 1.3 替代方案與抱怨
- Civitai：強在模型與圖像社群，但 prompt 工程化、團隊協作、版本治理較弱。
- PromptHero：強在搜尋靈感，但偏 gallery，缺少完整生成工作台與交易/授權流程。
- Leonardo.ai：強在生成，但不是中立 prompt 市集，也缺少跨工具 prompt pack 交易與團隊庫。

## 1.4 缺口判斷
市場缺口不是「更多圖片卡片」，而是：可搜尋的 prompt marketplace + 可套用的生成參數 + 可協作的團隊 prompt library + 可變現的創作者商品系統。

## 1.5 成立結論
成立。此題具備明確客群、可量化痛點、付費動機、可做 MVP、可驗收、可由現有 agent 開發，且能延展成 SaaS / marketplace / creator economy 產品線。

---

# 2. 產品一句話定義

PromptForge Studio 是一個讓 AI 創作者與團隊把 prompt 從「散落靈感」變成「可搜尋、可生成、可版本控管、可交易資產」的 Web SaaS。

---

# 3. 不可偏移核心原則

1. **Prompt 必須可執行，不只是文字展示**：每個 prompt detail 必須保存 engine、model、negative prompt、seed、steps、style、aspect ratio 等參數。
2. **Marketplace 與 Workspace 必須整合**：探索頁看到的 prompt 必須能直接套用到生成工作台，不可只做 gallery。
3. **版本與成效是核心資產**：每次修改 prompt 要形成 version record，保留輸出樣張與使用數據。
4. **團隊治理不可缺席**：Pro/Team workspace 必須有角色、共享庫、權限與審核狀態。
5. **Mock fallback 必須完整跑通**：沒有 AI key / payment key 時仍可用 mock generation、mock checkout、seed data 完成驗收。
6. **新案不得沿用舊 PromptForge 視覺與流程**：本案 UI 以 Civitai/PromptHero/Leonardo.ai 的參考模式重構，但不複製任一競品。

---

# 4. 題目成立理由

AI 圖像與多模態工具普及後，prompt 由一次性文字變成可重用資產；個人創作者需要展示與變現，團隊需要治理與複用，市場上現有工具分別解決社群、搜尋或生成，但尚未把三者串成完整產品閉環。

---

# 5. 產品定位

- **核心付費客群：** AI 創作者、Prompt 工程師、行銷/電商/遊戲/設計團隊。
- **次要客群：** AI 學習者、內容創作者、小型 agency。
- **付費理由：** 節省 prompt 搜尋與試錯時間、保留可重用資產、創作者可銷售 prompt pack、團隊可治理 prompt 品質。

高價值場景：
1. 行銷團隊管理 campaign prompt pack，統一品牌風格。
2. 遊戲美術團隊建立角色/場景生成 prompt library。
3. 創作者販售高品質 prompt + 參數組合。
4. AI 學習者從公開 prompt detail 一鍵套用與改寫。

---

# 6. 角色 / 權限 / 使用結構

| 角色 | 代碼 | 權限 |
|---|---|---|
| Visitor | visitor | 瀏覽公開 prompt、搜尋、查看部分參數 |
| Member | member | 收藏、評論、免費生成、建立私人 prompt |
| Pro Creator | creator | 上架 prompt pack、定價、看 analytics、管理版本 |
| Team Admin | team_admin | 建 workspace、邀請成員、共享庫、權限與審核 |
| Platform Admin | admin | 內容審核、分類管理、交易/檢舉/精選管理 |

---

# 7. 最終交付內容

## 7.1 前端頁面 / 功能區（20）
1. `/` 首頁：hero、搜尋、精選卡片、top creators。
2. `/browse` 探索瀑布流：搜尋、篩選、排序。
3. `/prompts/[id]` Prompt detail：參數、樣張、購買/套用。
4. `/create` 生成工作台：prompt editor、參數、preview。
5. `/editor/[id]` Prompt 編輯器：版本與發布設定。
6. `/marketplace` 市集首頁：付費 prompt pack。
7. `/marketplace/[category]` 分類市集。
8. `/marketplace/items/[id]` 商品詳情。
9. `/dashboard` 個人 dashboard。
10. `/dashboard/prompts` 我的 prompts。
11. `/dashboard/collections` 收藏與集合。
12. `/dashboard/generations` 生成歷史。
13. `/dashboard/analytics` 創作者分析。
14. `/dashboard/team` 團隊管理。
15. `/settings/billing` 訂閱與 credits。
16. `/user/[username]` 創作者公開頁。
17. `/leaderboard` 排行榜。
18. `/admin` 平台管理後台。
19. `/admin/moderation` 內容審核。
20. `/help/api-docs` API/使用說明。

## 7.2 API 端點（18）
1. `GET /api/prompts`
2. `POST /api/prompts`
3. `GET /api/prompts/:id`
4. `PATCH /api/prompts/:id`
5. `POST /api/prompts/:id/publish`
6. `POST /api/prompts/:id/generate`
7. `GET /api/prompts/:id/versions`
8. `POST /api/prompts/:id/versions`
9. `GET /api/search`
10. `POST /api/collections`
11. `POST /api/collections/:id/items`
12. `GET /api/generations`
13. `POST /api/marketplace/orders`
14. `GET /api/marketplace/items`
15. `POST /api/reviews`
16. `GET /api/analytics/creator`
17. `POST /api/team/invite`
18. `POST /api/admin/moderation/:id/decision`

## 7.3 資料庫（20）
`users`, `workspaces`, `workspace_members`, `plans`, `subscriptions`, `credits_ledger`, `prompts`, `prompt_versions`, `prompt_assets`, `generation_runs`, `generation_outputs`, `categories`, `tags`, `prompt_tags`, `collections`, `collection_items`, `marketplace_items`, `orders`, `reviews`, `moderation_events`。

---

# 8. TypeScript 資料模型正式規格

```ts
export type Role = 'visitor'|'member'|'creator'|'team_admin'|'admin'
export type PromptStatus = 'draft'|'private'|'published'|'marketplace'|'archived'
export type GenerationStatus = 'queued'|'running'|'succeeded'|'failed'|'mocked'
export interface User { id:string; email:string; username:string; role:Role; avatarUrl?:string; credits:number; createdAt:Date; updatedAt:Date }
export interface Workspace { id:string; name:string; ownerId:string; planId:string; createdAt:Date; updatedAt:Date }
export interface WorkspaceMember { id:string; workspaceId:string; userId:string; role:'owner'|'admin'|'member'|'viewer'; createdAt:Date; updatedAt:Date }
export interface Plan { id:string; code:'FREE'|'PRO'|'TEAM'|'ENTERPRISE'; monthlyPrice:number; creditQuota:number; maxSeats:number; createdAt:Date; updatedAt:Date }
export interface Subscription { id:string; workspaceId:string; planId:string; status:'active'|'trialing'|'past_due'|'canceled'; currentPeriodEnd:Date; createdAt:Date; updatedAt:Date }
export interface CreditsLedger { id:string; userId:string; workspaceId?:string; delta:number; reason:string; refType?:string; refId?:string; createdAt:Date; updatedAt:Date }
export interface Prompt { id:string; ownerId:string; workspaceId?:string; title:string; slug:string; summary:string; content:string; negativePrompt?:string; engine:string; model:string; parameters:Record<string,unknown>; status:PromptStatus; priceCredits:number; createdAt:Date; updatedAt:Date }
export interface PromptVersion { id:string; promptId:string; version:number; content:string; negativePrompt?:string; parameters:Record<string,unknown>; changelog:string; createdAt:Date; updatedAt:Date }
export interface PromptAsset { id:string; promptId:string; type:'cover'|'sample'|'attachment'; url:string; alt:string; createdAt:Date; updatedAt:Date }
export interface GenerationRun { id:string; promptId:string; userId:string; engine:string; parameters:Record<string,unknown>; status:GenerationStatus; error?:string; createdAt:Date; updatedAt:Date }
export interface GenerationOutput { id:string; runId:string; url:string; mimeType:string; width:number; height:number; seed?:string; createdAt:Date; updatedAt:Date }
export interface Category { id:string; name:string; slug:string; parentId?:string; sort:number; createdAt:Date; updatedAt:Date }
export interface Tag { id:string; name:string; slug:string; createdAt:Date; updatedAt:Date }
export interface PromptTag { id:string; promptId:string; tagId:string; createdAt:Date; updatedAt:Date }
export interface Collection { id:string; ownerId:string; workspaceId?:string; name:string; visibility:'private'|'workspace'|'public'; createdAt:Date; updatedAt:Date }
export interface CollectionItem { id:string; collectionId:string; promptId:string; note?:string; createdAt:Date; updatedAt:Date }
export interface MarketplaceItem { id:string; promptId:string; sellerId:string; priceCredits:number; license:'personal'|'commercial'|'extended'; salesCount:number; ratingAvg:number; createdAt:Date; updatedAt:Date }
export interface Order { id:string; buyerId:string; sellerId:string; marketplaceItemId:string; amountCredits:number; status:'paid'|'refunded'|'failed'; createdAt:Date; updatedAt:Date }
export interface Review { id:string; userId:string; promptId:string; rating:number; content:string; createdAt:Date; updatedAt:Date }
export interface ModerationEvent { id:string; targetType:string; targetId:string; status:'pending'|'approved'|'rejected'; reason?:string; moderatorId?:string; createdAt:Date; updatedAt:Date }
```

---

# 9. 核心業務流程

1. 探索：首頁 / browse → filter/search → prompt detail。
2. 套用：detail → 一鍵套用 → create workspace 帶入 prompt/params → mock/real generation。
3. 創作：create → save draft → version → publish/free or marketplace。
4. 交易：marketplace item → checkout credits → order → unlock full params。
5. 團隊：team admin invite → member save prompt to workspace → review → publish。

---

# 10. 系統模組拆解

1. Browse/Search Module：全文搜尋、tag/category、排序、瀑布流。
2. Prompt Workspace Module：editor、version、params schema。
3. Generation Adapter Module：mock + AI provider adapter。
4. Marketplace Module：listing、order、credits ledger、license。
5. Team Governance Module：workspace、members、roles、shared library。
6. Analytics Module：views、saves、generations、sales funnel。
7. Admin Moderation Module：內容審核、檢舉、精選。

---

# 11. API 端點正式規格（摘要）

每組 API 必須回傳 `ok/data/error` 結構；完整實作時需依第 7.2 全部 18 組 API 建 route、mock data 與測試。

範例：
```json
{
  "endpoint": "POST /api/prompts/:id/generate",
  "request": {"versionId":"string","parameters":{},"mock":true},
  "response": {"ok":true,"data":{"runId":"string","status":"mocked","outputs":[{"url":"string","seed":"string"}]},"error":null}
}
```

---

# 12. Mock Service / Fallback 規格

- `MOCK_AI=true` 時 `/generate` 不呼叫外部 API，依 prompt/category 回傳 seed image placeholders、參數摘要與假 runId。
- `MOCK_PAYMENTS=true` 時 order 直接扣 seed credits ledger，不接 Stripe。
- Mock generation 必須包含：runId、status、outputs[4]、seed、engine、model、parameters、elapsedMs。

---

# 13. Seed Data 完整規格

方案：Free、Pro Creator、Team、Enterprise。  
分類：行銷、電商、遊戲、角色設計、攝影、建築、Logo、短影音、文案、教育。  
Demo users：visitor demo、member demo、creator demo、team admin demo、platform admin demo。  
示範資料：至少 24 筆 prompt cards、8 筆 marketplace items、6 筆 generation runs、6 筆 reviews、4 個 collections。

---

# 14. 配額與訂閱邏輯

- Free：每月 50 credits、最多 20 private prompts、不可上架付費商品。
- Pro Creator：每月 1,000 credits、可上架、看 analytics、平台抽佣。
- Team：每月 5,000 credits、10 seats、workspace library、審核流。
- Enterprise：客製 credits、SSO、審計與私有部署選項。

---

# 15. Analytics 埋點

`prompt_viewed`, `prompt_saved`, `prompt_applied`, `generation_started`, `generation_succeeded`, `generation_failed`, `marketplace_item_viewed`, `order_completed`, `creator_followed`, `team_member_invited`, `prompt_published`。

---

# 16. 錯誤處理

AI provider timeout、Credits insufficient、Unauthorized workspace access、Marketplace order duplicate、Prompt moderation rejected 均需有 UI 訊息、API error code 與補救動作。

---

# 17. 測試要求

Unit（10）：quota、credits ledger、prompt version、params validation、search filter、order idempotency、role guard、mock generation、analytics event、moderation state。  
API（10）：prompts CRUD、generate、search、collections、orders、reviews、analytics、team invite、admin decision、billing quota。  
E2E（4）：探索到套用、創作到發布、市集購買、團隊共享與審核。

---

# 18. 驗收標準

1. 20 個頁面/功能區可進入。
2. 瀑布流探索與 filter 正常。
3. Prompt detail 顯示完整參數與樣張。
4. 一鍵套用到 create 工作台。
5. Mock generation 完整跑通。
6. Prompt 可儲存、版本化、發布。
7. Marketplace 可下單並扣 credits。
8. Collections 可新增/收藏。
9. Team admin 可邀請與共享。
10. Creator analytics 有 seed 指標。
11. Admin moderation 可 approve/reject。
12. 無 API key 時仍可驗收核心流程。
13. 主要路由 responsive。
14. README 有啟動與 mock 說明。
15. Unit/API/E2E 測試達最低數量。

紅線：不得使用 C:\WORK 或 /mnt/c/WORK；不得把本案做成純 landing page；不得缺 mock fallback；不得沿用舊案名稱/流程聲稱完成。

---

# 19. 開發順序（8 Phase）

1. 專案初始化、路由、UI theme、seed data。
2. 資料模型與 mock database/service。
3. Browse/Search + prompt card grid。
4. Prompt detail + one-click apply。
5. Create/editor + generation mock adapter。
6. Dashboard/collections/generation history。
7. Marketplace/order/credits/subscription UI。
8. Team/admin/analytics/moderation。
9. 測試、README、驗收腳本、D槽成品輸出。

---

# 20. 建議目錄結構

```txt
promptforge-studio/
  app/(public)/ app/(dashboard)/ app/api/
  components/cards components/editor components/marketplace components/admin
  lib/auth lib/mock lib/quota lib/analytics
  services/generation services/marketplace services/search
  prisma/schema.prisma prisma/seed.ts
  tests/unit tests/api tests/e2e
  README.md .env.example
```

---

# 21. README 必含

產品定位、技術棧、環境變數、mock mode、seed 帳號、啟動指令、測試指令、頁面清單、API 清單、D:\WORK 成品輸出注意、驗收腳本。

---

# 22. 驗收操作腳本

A. 遊客探索：首頁 → browse → 篩選 → detail。  
B. 一鍵生成：detail → apply → create → mock generate → save。  
C. Marketplace：item → buy → credits ledger → unlocked prompt。  
D. Team/Admin：invite → shared collection → moderation approve。

---

# 23. 給 Sebastian 的最終指令

你要開發的是 PromptForge Studio：大型 WEB/SaaS AI Prompt marketplace + generation workspace 原型。它不是舊 PromptForge 修補，也不是單頁展示站。最低完成標準：16+頁面、14+API、18+資料表、mock generation、mock payment、seed data、unit/api/e2e tests、README、驗收腳本、D槽 Windows 可見成品。完成後只可依真實 build/test/curl/browser 證據送下一站。

---

# 24. 商業化與延展

訂閱（Pro/Team）+ credits + marketplace 抽佣。可延展 creator profile、API access、enterprise workspace、私有模型 adapter、prompt performance benchmark。

---

# 25. 最終結論

推薦立項：是。推薦等級：P0 大型 WEB。核心理由：市場已有明確 demand signals，但競品各自分散於模型社群、prompt gallery、生成工具；本案以可執行 prompt 資產為核心，具 SaaS 留存與 marketplace 變現路徑。

---

# 26. 自我檢查

- [x] 市場研究在先
- [x] 3+ 競品/市場信號
- [x] 16+ 頁面
- [x] 14+ API
- [x] 18+ 資料表
- [x] TypeScript 模型
- [x] Mock fallback
- [x] Seed data
- [x] 10+ Unit / 10+ API / 4 E2E
- [x] 8+ Phase
- [x] 4+ 驗收腳本
- [x] 給開發 Agent 指令
