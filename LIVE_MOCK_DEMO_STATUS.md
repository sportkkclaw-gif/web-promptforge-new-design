# PromptForge Mock / Cloud Showcase 狀態

- updated_at: 2026-05-01T20:52:00+08:00
- mode: Mock/local + Vercel Preview showcase only
- local URL: http://127.0.0.1:3128/browse
- cloud Preview: https://promptforge-studio-oscnhe2zm-sportkk101-5719s-projects.vercel.app/browse
- GitHub repo: https://github.com/sportkkclaw-gif/web-promptforge-new-design
- PR: https://github.com/sportkkclaw-gif/web-promptforge-new-design/pull/2
- database: local PostgreSQL seeded for local demo; cloud preview uses read-only fallback showcase data when provider DB secrets are absent
- demo_account: jason.mock.demo@promptforge.local / Demo12345!（local only）

## 已修正
- Browse 卡片已改為 24 張本機圖像縮圖：`/demo-covers/prompt_001.svg` ~ `/demo-covers/prompt_024.svg`。
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
- Cloud image src 皆為 `/demo-covers/*.svg`，非 `data:image/svg+xml` 文字佔位。

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
- 圖片：卡片改用 `/demo-covers/prompt_001.svg` ~ `/demo-covers/prompt_024.svg`，不再是灰底 placeholder。
- Preview： https://promptforge-studio-8y0fv35yz-sportkk101-5719s-projects.vercel.app/marketplace
- 驗證：本機 typecheck/build PASS；PR checks 全部 SUCCESS；Browser 24/24 images loaded、0 broken；Browser vision 確認已非白底 placeholder。

## 2026-05-01 Dashboard 子頁錯誤修復＋專業深色改版
- 修正頁面：`/dashboard`、`/dashboard/prompts`、`/dashboard/generations`、`/dashboard/collections`、`/dashboard/analytics`、`/dashboard/team`、`/settings/billing`
- 根因：部分 dashboard 子頁直接查 Prisma，cloud/mock preview 無完整 DB 資料時會 500，顯示 `Something went wrong`。
- 修正：Prisma 子頁加入 preview fallback；全部 dashboard/billing 頁統一深色專業控制台風格。
- Preview： https://promptforge-studio-jc00d6ej5-sportkk101-5719s-projects.vercel.app/dashboard
- 驗證：本機 typecheck/build PASS；cloud route audit 7/7 HTTP 200；無 `Something went wrong`；Browser vision 確認 My Prompts 為深色專業控制台。

