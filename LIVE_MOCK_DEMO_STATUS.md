## 2026-05-02T14:49:00+08:00 系統管理員續修復：Prompt Detail 手機排版空間
- 根因：`/prompts/[id]` 手機仍用桌面 3 欄，左圖過大、右側排版空間不足；頂部 CTA 會被右側裁切。
- 修復：手機改 92px 左欄 + 彈性右欄；右側標題/描述/CTA responsive；頂部導覽可換行且 CTA 手機顯示 `Apply`。
- Commit: b8e9f9f；Preview: https://promptforge-studio-ipdew9ax6-sportkk101-5719s-projects.vercel.app
- 驗證：`npm run build` PASS（86/86）；Playwright 390x844 `/prompts/prompt_021` overflow=0、left=92px、right=236px、CTA 未裁切、images loaded；vision 確認通過。
- Gate：showcase detail mobile defect 已修；formal QC 仍維持 returned_for_fix，待 production/preview secrets 後完整 H1-H10。

## 2026-05-02T14:35:30+08:00 系統管理員續修復：Browse 手機版規格
- 根因：`/browse` 使用桌面 flex 版面，手機下品牌/導覽/固定左欄/搜尋列會互相擠壓。
- 修復：導覽改手機橫向 pills、品牌 `whitespace-nowrap`；分類從固定左欄改為手機上方橫向 chips；內容改 `flex-col`、搜尋列滿容器、卡片手機單欄。
- Commit: 64b7b47；Preview: https://promptforge-studio-lpl4do7e4-sportkk101-5719s-projects.vercel.app
- 驗證：`npm run build` PASS（86/86）；Playwright 390x844 `/browse`：body horizontal overflow=0、brand 橫排、aside/main/search/cards 寬度 340px、cards 單欄、images 24/24 ok、0 broken；vision 確認符合手機規格。
- Gate：showcase mobile defect 已修；formal QC 仍維持 returned_for_fix，待 production/preview secrets 後完整 H1-H10。

## 2026-05-02T09:15:14+08:00 系統管理員續修復：首頁真實圖片未上線
- 根因：首頁 hero/featured 仍有漸層展示塊，雖 Browse/Marketplace 已接真實 `/demo-covers/*.jpg`。
- 修復：首頁 hero 主圖、四個小模組、Featured Prompts 全改接真實生成圖 `/demo-covers/prompt_001/002/003/004/011/013/017.jpg`。
- Commit: 51faf7f；Preview: https://promptforge-studio-5sg6e58c9-sportkk101-5719s-projects.vercel.app
- 驗證：`npm run build` PASS（86/86）；HTTP 200 for `/` `/browse` `/marketplace` `/create` and demo-cover jpg assets；首頁 browser images=8/8 ok、0 broken；Marketplace images=12/12 ok、0 broken、0 data URI。
- Gate：showcase 圖片缺陷已修；formal QC 仍維持 returned_for_fix，待 production/preview secrets 後完整 H1-H10。

## 2026-05-02T08:53:56+08:00 Cloud Preview repair verification
- Preview: https://promptforge-studio-n4jtmg8jd-sportkk101-5719s-projects.vercel.app
- Commit: 51adf3c
- Fixed `/create` blank/307 behavior by serving a client fallback page and replacing to `/generator/default-template`.
- Fixed Marketplace broken covers for DB smoke rows by mapping non-`prompt_###` assets to existing `/demo-covers/prompt_###.jpg`.
- Verified: build PASS 86/86; HTTP 200 for `/create`, `/generator/default-template`, `/marketplace`; browser JS marketplace images=12, ok=12, broken=0; browser vision confirms dark professional marketplace.
- Limitation: showcase/mock repair only; formal QC still blocked on required production/preview secrets and full H1-H10 live verification.

# PromptForge Mock / Cloud Showcase 狀態

- updated_at: 2026-05-02T14:49:00+08:00
- mode: Supabase DB-backed Vercel Preview + Mock AI provider
- cloud Preview: https://promptforge-studio-ipdew9ax6-sportkk101-5719s-projects.vercel.app
- GitHub repo: https://github.com/sportkkclaw-gif/web-promptforge-new-design
- PR: https://github.com/sportkkclaw-gif/web-promptforge-new-design/pull/2
- database: Supabase `promptforge-ai-preview` 已 force-reset schema 並 seed；DATABASE_URL 僅存本機安全檔 `/home/sport/.hermes/promptforge.production.env`
- ai_provider: `USE_MOCK_AI=true`；OpenAI/Anthropic 等第三方 key 仍為 Preview placeholder，待 Jason 後續逐步提供真實 key

## 2026-05-01 Supabase Preview DB + H1-H10 Cloud Verification
- Jason 已核准重置 Preview DB。
- `prisma db push --force-reset --skip-generate` PASS。
- `prisma generate` PASS。
- `npm run db:seed` PASS：Plans 4、Users 5、Workspaces 1、Categories 10、Prompts 24、Prompt Assets 72、Marketplace Items 8、Generation Outputs 24。
- Vercel Preview env 已寫入 branch `acceptance/2026-05-01-promptforge-showcase-fix`：DATABASE_URL、AUTH_SECRET/NEXTAUTH_SECRET、AUTH_URL、USE_MOCK_AI/NEXT_PUBLIC_MOCK_AI 與 provider placeholders。
- 最新 Preview： https://promptforge-studio-f4z8uf7k3-sportkk101-5719s-projects.vercel.app
- `npm run verify:cloud` PASS：H1-H10 10/10（H10 無專用 health endpoint，依 harness 規則 SKIP 但通過）。
- Browser `/browse`：24/24 images loaded，0 broken，24 cards，無 app error。
- Browser `/dashboard`：6 module cards，無 `Something went wrong` / `Application error`。

## 目前限制
- Cloud DB foundation 已完成，但 OpenAI、Anthropic、Stripe、Resend、Sentry、Elasticsearch 仍未替換成真實 production keys。
- 生成 AI 目前走 Mock AI，用於 Preview 驗證；正式 provider 驗收需後續逐一接入真實 keys。

## 已修正
- Browse 卡片已改為 24 張本機圖像縮圖：`/demo-covers/prompt_001.jpg` ~ `/demo-covers/prompt_024.jpg`。
- 不再使用只有 PromptForge 文字的漸層佔位圖。
- 不依賴外部圖片 CDN，避免破圖或網路載入失敗。
- Prompt 詳情頁 cover/sample images 也改接本機 demo cover。
- Vercel Preview 無 DATABASE_URL 時，public showcase browse/detail 會使用 read-only fallback，不再 500。

## 已驗證
- local `node --run build` PASS，86/86 routes。
- GitHub PR checks：ESLint / Type Check / Contract Checks / Build / Vercel 皆 PASS。
- Cloud `/browse` HTTP 200，圖片 24/24 loaded，0 broken。
- Cloud `/browse?category=logo` HTTP 200，類別篩選有變更結果。
- Cloud `/prompts/prompt_016` HTTP 200，圖片 4/4 loaded，0 broken。
- Cloud image src 皆為 `/demo-covers/*.jpg`，非 `data:image/svg+xml` 文字佔位。

## 限制
- 此為 Mock/showcase Preview，不是正式 QC/final product。
- 圖片為本機 deterministic SVG demo covers，不是真 AI 生成正式商品圖。
- 未注入真實 Stripe/OpenAI/Anthropic/Elastic/Resend/Sentry/Supabase production secrets。
- 正式 QC 仍需 cloud secrets 與 H1-H10 live verification。

## 2026-05-01 返回首頁按鍵修正
- 修正頁面：`/generator/default-template`（由 `/create` 導入）
- 新增：頁首右上 `← 返回首頁`，連到 `/`
- Preview： https://promptforge-studio-ksounkj3l-sportkk101-5719s-projects.vercel.app/generator/default-template
- 驗證：Vercel READY；PR checks ESLint / Type Check / Contract Checks / Build / Vercel 全部 SUCCESS；Browser 點擊後成功回首頁。

## 2026-05-01 首頁專業深色炫光改版
- 修正頁面：`/` 首頁
- 風格：深色劇院級背景、藍紫 aurora 炫光、玻璃擬態 Prompt Canvas、專業 Prompt Marketplace 展示卡。
- Preview： https://promptforge-studio-ginr84o12-sportkk101-5719s-projects.vercel.app/
- 驗證：本機 typecheck/build PASS；PR checks 全部 SUCCESS；Browser vision 確認已非白底且呈現專業深色提示詞網站風格。

## 2026-05-01 Marketplace 專業深色改版
- 修正頁面：`/marketplace`
- 風格：延續首頁深色劇院級背景、藍紫 aurora 炫光、玻璃擬態導覽與 marketplace cards。
- 圖片：卡片改用 `/demo-covers/prompt_001.jpg` ~ `/demo-covers/prompt_024.jpg`，不再是灰底 placeholder。
- Preview： https://promptforge-studio-8y0fv35yz-sportkk101-5719s-projects.vercel.app/marketplace
- 驗證：本機 typecheck/build PASS；PR checks 全部 SUCCESS；Browser 24/24 images loaded、0 broken；Browser vision 確認已非白底 placeholder。

## 2026-05-01 Dashboard 子頁錯誤修復＋專業深色改版
- 修正頁面：`/dashboard`、`/dashboard/prompts`、`/dashboard/generations`、`/dashboard/collections`、`/dashboard/analytics`、`/dashboard/team`、`/settings/billing`
- 根因：部分 dashboard 子頁直接查 Prisma，cloud/mock preview 無完整 DB 資料時會 500，顯示 `Something went wrong`。
- 修正：Prisma 子頁加入 preview fallback；全部 dashboard/billing 頁統一深色專業控制台風格。
- Preview： https://promptforge-studio-jc00d6ej5-sportkk101-5719s-projects.vercel.app/dashboard
- 驗證：本機 typecheck/build PASS；cloud route audit 7/7 HTTP 200；無 `Something went wrong`；Browser vision 確認 My Prompts 為深色專業控制台。

## 2026-05-01 提示生成器工作區深色專業改版
- 修正頁面：`/generator/default-template`
- 問題：原頁為全白表單，與首頁 / Marketplace / Dashboard 的深色專業風格不一致。
- 修正：改為 `Generate Command Deck` 深色炫光控制台，含玻璃擬態輸入卡、Prompt Quality Stack、Live Preview、Workflow 區塊。
- Preview： https://promptforge-studio-5nwa03plf-sportkk101-5719s-projects.vercel.app/generator/default-template
- 驗證：本機 typecheck/build PASS；cloud HTTP 200；舊白頁 token 不存在；Browser vision 確認已非白底且風格一致。

