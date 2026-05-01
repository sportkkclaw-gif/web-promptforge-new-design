# PromptForge 正式後續設定步驟

updated_at: 2026-05-01T23:13:21+08:00

## 目前狀態
- GitHub / Vercel CLI 已登入。
- Supabase project：`promptforge-ai-preview` (`cpubglzsevtoqprvilag`, ap-southeast-1, ACTIVE_HEALTHY)。
- Jason 已核准重置 Preview DB。
- Supabase Preview DB 已完成 `prisma db push --force-reset --skip-generate`、`prisma generate`、`npm run db:seed`。
- Vercel Preview branch env 已寫入並重新部署。
- 最新 Preview： https://promptforge-studio-f4z8uf7k3-sportkk101-5719s-projects.vercel.app
- `npm run verify:cloud`：H1-H10 10/10 PASS。

## 已完成 Step 1：Supabase/Postgres DATABASE_URL
- 正確連線模式：Supabase pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432`。
- 正確 user 格式：`postgres.cpubglzsevtoqprvilag`。
- `DATABASE_URL` 僅存本機安全檔：`/home/sport/.hermes/promptforge.production.env`。
- 不在 repo、truth pack、Discord 內保存真實密碼。

## 已完成 Step 2：Vercel Preview env + redeploy
Branch：`acceptance/2026-05-01-promptforge-showcase-fix`

已寫入 Preview env：
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `USE_MOCK_AI=true`
- `NEXT_PUBLIC_MOCK_AI=true`
- OpenAI / Anthropic / Stripe / Sentry / Elasticsearch / Resend placeholders

## 驗證結果
- Prisma reset/push：PASS
- Prisma generate：PASS
- Seed：PASS
  - Plans 4
  - Users 5
  - Workspaces 1
  - Categories 10
  - Prompts 24
  - Prompt Assets 72
  - Marketplace Items 8
  - Generation Outputs 24
- Vercel deployment：READY
- Cloud H1-H10：10/10 PASS
- Browser `/browse`：24/24 images loaded，0 broken，24 cards，無 app error
- Browser `/dashboard`：6 module cards，無 `Something went wrong` / `Application error`

## 剩餘正式 provider keys
下一步再逐一替換 placeholder：
1. OpenAI key
2. Anthropic key
3. Stripe key / webhook secret
4. Resend key
5. Sentry DSN
6. Elasticsearch URL/API key

目前 Cloud DB foundation 已完成；AI 生成仍走 Mock AI，未接真實第三方 provider。
