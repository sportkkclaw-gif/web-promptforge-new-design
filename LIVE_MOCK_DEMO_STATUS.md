# PromptForge Mock 展示狀態

- updated_at: 2026-05-01T20:10:33+08:00
- mode: Mock/local demo only
- URL: http://127.0.0.1:3128/browse
- process_session: proc_727c6500dd3f
- port: 3128
- database: local PostgreSQL promptforge, seeded
- demo_account: jason.mock.demo@promptforge.local / Demo12345!

## 已修正
- Browse 卡片已改為 24 張本機圖像縮圖：`/demo-covers/prompt_001.svg` ~ `/demo-covers/prompt_024.svg`。
- 不再使用只有 PromptForge 文字的漸層佔位圖。
- 不依賴外部圖片 CDN，避免破圖或網路載入失敗。
- Prompt 詳情頁 cover/sample images 也改接本機 demo cover。
- 左側類別為 server-rendered links，點擊後 URL 與結果集會變。

## 已驗證
- `node --run build` PASS，86/86 routes。
- `/browse` HTTP 200。
- `/browse` 圖片：24/24 loaded，0 broken。
- `/browse` 圖片 src 皆為 `/demo-covers/*.svg`，非 `data:image/svg+xml` 文字佔位。
- `/prompts/prompt_016` 詳情頁圖片：3/3 loaded，0 broken。
- Windows browser 已重新開啟 `http://127.0.0.1:3128/browse`。

## 限制
- 此為 Mock/local 展示，不是正式 QC/final product。
- 這些是本機 mock/demo cover，不是真 AI 生成或正式商品圖。
- 未注入真實 Stripe/OpenAI/Anthropic/Elastic/Resend/Sentry/Supabase production secrets。
- 不能送 Simon/QC；正式 QC 仍需 cloud secrets 與 H1-H10 live verification。
