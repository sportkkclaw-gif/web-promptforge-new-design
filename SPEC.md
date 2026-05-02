# PromptForge Studio — Full-Product Specification v2
## Technical Specification (Final Product)

**Version:** 2.0  
**Date:** 2026-04-28  
**Status:** Developer-Ready Spec  

---

## 1. Database Schema (18+ Tables)

### 1.1 Users & Auth

```prisma
// Table: users
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerified   DateTime?
  passwordHash    String?   // null if OAuth-only
  name            String?
  avatarUrl       String?
  role            Role      @default(USER)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?

  // Relations
  accounts        Account[]
  sessions        Session[]
  apiKeys         ApiKey[]
  teams           TeamMember[]
  templates       Template[]
  purchases       Order[]
  creditLedger    CreditTransaction[]
  generationLogs  GenerationLog[]
  reviews         Review[]
  notifications   Notification[]

  @@index([email])
  @@index([role])
}

enum Role {
  USER
  EDITOR    // can create/edit own templates
  ADMIN     // full system access
  SUPERADMIN // platform owner
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "google" | "github" | "credentials"
  provider          String
  providerAccountId  String
  refresh_token     String? // encrypted
  access_token      String? // encrypted
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? // encrypted
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ApiKey {
  id           String    @id @default(cuid())
  name         String    // e.g., "Production API Key"
  keyHash      String    // SHA-256 of actual key
  keyPrefix    String    // first 8 chars shown in UI
  scopes       String[]  // ["generation:read", "generation:write", "templates:read"]
  userId       String
  lastUsedAt   DateTime?
  expiresAt    DateTime?
  createdAt    DateTime  @default(now())
  revokedAt    DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([keyHash])
}
```

### 1.2 Teams & Workspaces

```prisma
model Team {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  plan        TeamPlan  @default(FREE)
  logoUrl     String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  members     TeamMember[]
  quotas      TeamQuota[]
  templates   Template[]
  orders      Order[]
}

enum TeamPlan {
  FREE       // 500 credits/month
  PRO        // 5000 credits/month
  ENTERPRISE // unlimited, custom
}

model TeamMember {
  id        String      @id @default(cuid())
  teamId    String
  userId    String
  role      TeamRole    @default(MEMBER)
  quotaAlloc Int        @default(0) // credits allocated to this member
  joinedAt  DateTime    @default(now())

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamId, userId])
  @@index([userId])
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

model TeamQuota {
  id              String    @id @default(cuid())
  teamId          String
  periodStart     DateTime  // monthly billing period start
  totalCredits    Int       // total allocated to team this period
  usedCredits     Int       @default(0)
  purchasedCredits Int      @default(0) // credits bought (not from plan)
  resetAt         DateTime  // when usedCredits resets (if recurring plan)

  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)

  @@unique([teamId, periodStart])
}
```

### 1.3 Templates (Prompt-as-Code)

```prisma
model Template {
  id               String         @id @default(cuid())
  name             String         // e.g., "Customer Support Reply v2"
  slug             String         @unique
  description      String         @db.Text
  taxonomyId       String
  userId           String         // creator
  teamId           String?        // null = personal, non-null = team-owned
  status           TemplateStatus @default(DRAFT)

  // Prompt-as-Code fields
  systemMessage    String         @db.Text
  userTemplate     String         @db.Text  // with {{variable}} placeholders
  variables        Json           // Array<VariableSpec>
  antiFailureConstraints Json     // Array<ConstraintSpec>
  attribution      Json?          // { upstreamTemplateId, upstreamAuthorId, license }

  // Metadata
  tags             String[]
  version          String         @default("1.0.0") // semver
  changelog        String?        @db.Text
  promptLintScore  Int?           // 0-100
  usageCount       Int            @default(0)
  forkCount        Int            @default(0)

  // Pricing
  pricingType      PricingType
  priceCredits     Int            @default(0) // credits cost (0 = free)

  // Timestamps
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  publishedAt      DateTime?
  deprecatedAt     DateTime?

  // Soft delete
  deletedAt        DateTime?
  flaggedAt        DateTime?      // admin flagged
  flagReason       String?

  // Relations
  taxonomy         Taxonomy       @relation(fields: [taxonomyId], references: [id])
  user             User           @relation(fields: [userId], references: [id])
  team             Team?          @relation(fields: [teamId], references: [id])
  versions         TemplateVersion[]
  reviews          Review[]
  orderItems       OrderItem[]
  generationLogs   GenerationLog[]

  @@index([userId])
  @@index([teamId])
  @@index([status])
  @@index([taxonomyId])
}

enum TemplateStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  DEPRECATED
  FLAGGED
  DELETED
}

enum PricingType {
  FREE
  ONE_TIME_PURCHASE
  SUBSCRIPTION
}

model TemplateVersion {
  id           String   @id @default(cuid())
  templateId  String
  version      String   // semver
  systemMessage String  @db.Text
  userTemplate  String  @db.Text
  variables     Json
  antiFailureConstraints Json
  changelog     String?
  createdAt    DateTime @default(now())

  template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, version])
}

model VariableSpec {
  name:        string
  type:        "string" | "number" | "boolean" | "enum" | "json"
  required:    boolean
  default?:    any
  description?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string // regex
    enumValues?: string[]
  }
}

model ConstraintSpec {
  type:   "max_tokens" | "temperature" | "banned_topics" | "required_facts" | "output_format"
  value:  any
  severity: "error" | "warning"
}
```

### 1.4 Taxonomy

```prisma
model Taxonomy {
  id          String   @id @default(cuid())
  name        String   // e.g., "Customer Service"
  slug        String   @unique
  description String?
  parentId    String?  // for subcategories
  iconUrl     String?
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)

  templates   Template[]
  children    Taxonomy[]  @relation("TaxonomyChildren")
  parent      Taxonomy?   @relation("TaxonomyChildren", fields: [parentId], references: [id])

  @@index([parentId])
}
```

### 1.5 Marketplace & Orders

```prisma
model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique // e.g., "PF-2026-000123"
  userId          String
  teamId          String?
  status          OrderStatus @default(PENDING)
  subtotalCredits Int         // credits before discount
  discountCredits Int         @default(0)
  totalCredits    Int         // final credits purchased
  stripePaymentId String?     // null if free
  stripeRefundId  String?
  createdAt       DateTime    @default(now())
  completedAt     DateTime?

  user  User   @relation(fields: [userId], references: [id])
  team  Team?  @relation(fields: [teamId], references: [id])
  items OrderItem[]

  @@index([userId])
  @@index([teamId])
}

enum OrderStatus {
  PENDING
  COMPLETED
  REFUNDED
  FAILED
}

model OrderItem {
  id         String    @id @default(cuid())
  orderId    String
  templateId String?
  itemType   ItemType  // TEMPLATE_PURCHASE | CREDIT_PACKAGE
  credits    Int       // credits purchased (for credit packages)
  priceUsd   Decimal   @db.Decimal(10,2) // USD price at time of purchase
  creditsUsd Decimal   @db.Decimal(10,4) // USD per credit
  quantity   Int       @default(1)

  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  template Template? @relation(fields: [templateId], references: [id])

  @@index([orderId])
}

enum ItemType {
  TEMPLATE_PURCHASE
  CREDIT_PACKAGE
  SUBSCRIPTION_RENEWAL
}
```

### 1.6 Credits & Quotas

```prisma
model CreditTransaction {
  id          String          @id @default(cuid())
  userId      String
  teamId      String?
  amount      Int             // positive = credit, negative = debit
  type        CreditTxType
  description String
  balanceAfter Int             // running balance after transaction
  orderId     String?          // linked order if purchase
  generationLogId String?     // linked generation if consumed
  createdAt   DateTime        @default(now())
  createdBy   String          // admin user if manual grant

  user User @relation(fields: [userId], references: [id])
  order Order? @relation(fields: [orderId], references: [id])

  @@index([userId])
  @@index([teamId])
  @@index([createdAt])
}

enum CreditTxType {
  PURCHASE              // bought credits
  GRANT                 // admin grant
  BONUS                 // promotional bonus
  GENERATION_CONSUME    // used for AI generation
  TEMPLATE_PURCHASE     // bought template
  SUBSCRIPTION_INCLUDE  // monthly allocation from subscription
  REFUND                // refunded
  ADJUSTMENT            // manual correction
}

model QuotaPlan {
  id               String    @id @default(cuid())
  name             String    // e.g., "Free", "Pro", "Enterprise"
  slug             String    @unique
  monthlyCredits   Int       // included per month
  priceUsdMonthly  Decimal   @db.Decimal(10,2)
  priceUsdAnnual   Decimal   @db.Decimal(10,2)
  features         Json      // feature flags array
  maxTeamMembers   Int       @default(1)
  aiProvider       String    @default("openai") // "openai" | "anthropic" | "both"
  isActive         Boolean   @default(true)
  sortOrder        Int       @default(0)

  @@index([slug])
}
```

### 1.7 Generation

```prisma
model GenerationLog {
  id             String    @id @default(cuid())
  userId         String
  templateId     String
  templateVersion String   // snapshot of template version at generation time
  variables      Json      // actual variables passed
  systemMessage  String    @db.Text
  userTemplate   String    @db.Text
  response       String?   @db.Text
  responseMeta   Json?     // { model, tokensUsed, latencyMs, finishReason }
  status         GenStatus @default(PENDING)
  errorMessage   String?
  creditsUsed    Int       @default(0)
  latencyMs      Int?
  createdAt      DateTime  @default(now())

  user    User     @relation(fields: [userId], references: [id])
  template Template @relation(fields: [templateId], references: [id])

  @@index([userId])
  @@index([templateId])
  @@index([createdAt])
}

enum GenStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}
```

### 1.8 Reviews

```prisma
model Review {
  id         String   @id @default(cuid())
  userId     String
  templateId String
  rating     Int      // 1-5
  title      String?
  body       String?  @db.Text
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id])
  template Template @relation(fields: [templateId], references: [id])

  @@unique([userId, templateId])
  @@index([templateId])
}
```

### 1.9 Notifications

```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "credit_low" | "template_published" | "review_received" | "payout_processed"
  title     String
  body      String   @db.Text
  data      Json?    // extra payload
  readAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, readAt])
}
```

### 1.10 Audit Log

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String   // userId or "system" or "cron"
  actorType  String   // "user" | "admin" | "system"
  action     String   // "template.publish" | "user.suspend" | "credit.grant"
  resource   String   // e.g., "template:clxxx123"
  meta       Json?    // before/after values
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([actorId])
  @@index([resource])
  @@index([createdAt])
}
```

### 1.11 Search Index (Elasticsearch)

```typescript
// Elasticsearch Index: promptforge_templates
interface TemplateSearchDoc {
  id: string
  name: string
  description: string
  taxonomyPath: string[]      // ["Customer Service", "Reply Templates"]
  tags: string[]
  authorName: string
  authorId: string
  variables: string[]         // extracted variable names
  pricingType: string
  priceCredits: number
  ratingAverage: number
  ratingCount: number
  usageCount: number
  forkCount: number
  status: string
  createdAt: string           // ISO date
  publishedAt: string | null
  isFeatured: boolean
}
```

---

## 2. API Endpoints (14+ APIs)

Base URL: `/api/v1`

### 2.1 Authentication APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Email/password registration | None |
| POST | `/auth/login` | Email/password login | None |
| POST | `/auth/oauth/:provider` | Initiate OAuth flow (Google, GitHub) | None |
| POST | `/auth/oauth/callback/:provider` | OAuth callback handler | None |
| POST | `/auth/refresh` | Refresh access token | Refresh token |
| POST | `/auth/logout` | Invalidate session | JWT |
| POST | `/auth/verify-email` | Verify email address | Token |
| POST | `/auth/forgot-password` | Send password reset email | None |
| POST | `/auth/reset-password` | Reset password with token | Token |
| GET | `/auth/me` | Get current user profile | JWT |

### 2.2 User & Profile APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user full profile | JWT |
| PATCH | `/users/me` | Update profile (name, avatar) | JWT |
| DELETE | `/users/me` | Delete account (GDPR) | JWT |
| GET | `/users/me/export` | Export all user data (GDPR) | JWT |
| POST | `/users/me/api-keys` | Create new API key | JWT |
| GET | `/users/me/api-keys` | List API keys (no secrets) | JWT |
| DELETE | `/users/me/api-keys/:id` | Revoke API key | JWT |

### 2.3 Template APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/templates` | List user's own templates (paginated) | JWT |
| POST | `/templates` | Create new template | JWT |
| GET | `/templates/:slug` | Get template by slug | JWT (draft) / Public (published) |
| PATCH | `/templates/:slug` | Update template | JWT (owner/editor) |
| DELETE | `/templates/:slug` | Soft-delete template | JWT (owner) |
| POST | `/templates/:slug/publish` | Publish draft template | JWT (owner) |
| POST | `/templates/:slug/deprecate` | Mark template as deprecated | JWT (owner) |
| POST | `/templates/:slug/fork` | Fork a template | JWT |
| GET | `/templates/:slug/versions` | List all versions | JWT (owner) |
| GET | `/templates/:slug/versions/:version` | Get specific version | JWT (owner) |
| POST | `/templates/:slug/lint` | Run prompt lint | JWT |
| GET | `/templates/:slug/diff/:v1/:v2` | Diff between two versions | JWT (owner) |

### 2.4 Marketplace APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/marketplace/templates` | Browse/search marketplace | Public |
| GET | `/marketplace/templates/:slug` | Get marketplace template detail | Public |
| GET | `/marketplace/taxonomy` | List all taxonomy categories | Public |
| GET | `/marketplace/featured` | Featured templates | Public |
| GET | `/marketplace/trending` | Trending templates (7-day) | Public |
| POST | `/marketplace/templates/:slug/rate` | Rate a purchased template | JWT |
| GET | `/marketplace/creator/:userId` | Creator's public profile + templates | Public |

### 2.5 Order & Payment APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/orders/credit-purchase` | Initiate credit purchase (Stripe Checkout) | JWT |
| POST | `/orders/credit-purchase/stripe-webhook` | Stripe webhook handler | Stripe sig |
| GET | `/orders` | List user's order history | JWT |
| GET | `/orders/:id` | Get order detail | JWT |
| POST | `/orders/template-purchase` | Purchase a template (credit deduction) | JWT |
| GET | `/orders/:id/invoice` | Get invoice PDF | JWT |

### 2.6 Credit & Quota APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/credits/balance` | Get current credit balance | JWT |
| GET | `/credits/transactions` | Paginated transaction history | JWT |
| POST | `/credits/purchase` | Purchase credit package | JWT |
| GET | `/credits/quota` | Get current quota plan details | JWT |
| POST | `/admin/credits/grant` | Admin: Grant credits to user | Admin JWT |
| POST | `/admin/credits/revoke` | Admin: Revoke credits | Admin JWT |

### 2.7 Generation APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/generate` | Generate AI response from template | JWT or API Key |
| POST | `/generate/stream` | Streaming generation (SSE) | JWT or API Key |
| GET | `/generate/history` | Paginated generation history | JWT |
| GET | `/generate/:id` | Get specific generation log | JWT |
| POST | `/generate/:id/cancel` | Cancel in-progress generation | JWT |

### 2.8 Team APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/teams` | List user's teams | JWT |
| POST | `/teams` | Create a new team | JWT |
| GET | `/teams/:slug` | Get team details | JWT (member) |
| PATCH | `/teams/:slug` | Update team settings | JWT (owner/admin) |
| GET | `/teams/:slug/members` | List team members | JWT (member) |
| POST | `/teams/:slug/members/invite` | Invite member by email | JWT (owner/admin) |
| POST | `/teams/:slug/members/:userId` | Accept invite / add directly | JWT |
| PATCH | `/teams/:slug/members/:userId` | Update member role/quota | JWT (owner/admin) |
| DELETE | `/teams/:slug/members/:userId` | Remove member | JWT (owner/admin) |
| GET | `/teams/:slug/quota` | Get team quota details | JWT (member) |

### 2.9 Admin APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/admin/users` | Paginated user list | Admin JWT |
| PATCH | `/admin/users/:id` | Update user (suspend, role) | Admin JWT |
| DELETE | `/admin/users/:id` | Delete user | Admin JWT |
| GET | `/admin/templates` | All templates with filters | Admin JWT |
| PATCH | `/admin/templates/:slug/flag` | Flag a template | Admin JWT |
| DELETE | `/admin/templates/:slug` | Remove template | Admin JWT |
| GET | `/admin/orders` | All orders | Admin JWT |
| GET | `/admin/credits` | Credit ledger overview | Admin JWT |
| GET | `/admin/audit-log` | Search audit log | Admin JWT |
| GET | `/admin/health` | System health metrics | Admin JWT |
| POST | `/admin/announcements` | Create announcement | Admin JWT |

### 2.10 Search APIs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/search/templates` | Full-text search templates | Public |
| GET | `/search/autocomplete` | Search autocomplete suggestions | Public |
| GET | `/search/taxonomy` | Search by taxonomy | Public |

---

## 3. Frontend Pages (16+ Pages)

| # | Page | Route | Description | Auth |
|---|------|-------|-------------|------|
| 1 | Landing | `/` | Marketing page, hero, features, pricing, CTA | Public |
| 2 | Login | `/login` | Email/password + OAuth login | Public |
| 3 | Register | `/register` | Email/password registration | Public |
| 4 | Forgot Password | `/forgot-password` | Password reset flow | Public |
| 5 | Dashboard | `/dashboard` | Overview: usage, quota, recent activity | JWT |
| 6 | Templates List | `/templates` | User's template library | JWT |
| 7 | Template Editor | `/templates/new`, `/templates/:slug/edit` | Create/edit prompt-as-code template | JWT |
| 8 | Template Preview | `/templates/:slug` | Public preview of published template | Public |
| 9 | Marketplace Browse | `/marketplace` | Browse/search all templates | Public |
| 10 | Marketplace Template | `/marketplace/:slug` | Template detail + purchase | Public |
| 11 | Creator Profile | `/creators/:username` | Public creator profile + templates | Public |
| 12 | Generation Studio | `/generate/:templateSlug` | Interactive prompt generation | JWT |
| 13 | Generation History | `/history` | Paginated generation logs | JWT |
| 14 | Credits & Billing | `/billing` | Credit balance, purchase, invoices | JWT |
| 15 | Team Settings | `/team/:slug` | Team management, members, quotas | JWT (team) |
| 16 | Account Settings | `/settings` | Profile, API keys, security | JWT |
| 17 | Admin Dashboard | `/admin` | System overview, users, moderation | Admin JWT |
| 18 | Admin Users | `/admin/users` | User management table | Admin JWT |
| 19 | Admin Templates | `/admin/templates` | Template moderation | Admin JWT |
| 20 | Admin Transactions | `/admin/transactions` | Credit/order ledger | Admin JWT |
| 21 | API Docs | `/api-docs` | Developer API documentation | Public |

---

## 4. Key Request/Response Contracts

### 4.1 Create Template

**Request:** `POST /api/v1/templates`
```typescript
interface CreateTemplateRequest {
  name: string            // 3-100 chars
  description: string     // 10-2000 chars
  taxonomyId: string
  systemMessage: string    // 1-10000 chars
  userTemplate: string    // 1-50000 chars, contains {{variable}}
  variables: VariableSpec[]
  antiFailureConstraints: ConstraintSpec[]
  tags: string[]
  pricingType: "FREE" | "ONE_TIME_PURCHASE" | "SUBSCRIPTION"
  priceCredits?: number   // required if not FREE
  attribution?: { upstreamTemplateId: string; license: string }
}
```

**Response:** `201 Created`
```typescript
interface TemplateResponse {
  id: string
  slug: string
  name: string
  description: string
  taxonomy: { id: string; name: string; slug: string }
  status: TemplateStatus
  systemMessage: string
  userTemplate: string
  variables: VariableSpec[]
  antiFailureConstraints: ConstraintSpec[]
  tags: string[]
  version: string
  pricingType: PricingType
  priceCredits: number
  promptLintScore: number | null
  usageCount: number
  forkCount: number
  createdAt: string
  publishedAt: string | null
  user: { id: string; name: string; avatarUrl: string | null }
  // if owner: reviews[], generationLogs[]
}
```

### 4.2 Marketplace Search

**Request:** `GET /api/v1/marketplace/templates`
```
Query params:
  q?: string              // search query
  taxonomy?: string       // taxonomy slug
  minPrice?: number
  maxPrice?: number
  minRating?: number
  sort?: "relevance" | "newest" | "popular" | "rating" | "trending"
  page?: number           // default 1
  limit?: number          // default 20, max 100
```

**Response:** `200 OK`
```typescript
interface MarketplaceSearchResponse {
  templates: TemplateSearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters: {
    taxonomies: { slug: string; name: string; count: number }[]
    priceRanges: { min: number; max: number; count: number }[]
    ratingRanges: { min: number; max: number; count: number }[]
  }
}

interface TemplateSearchResult {
  id: string
  slug: string
  name: string
  description: string    // truncated to 300 chars
  taxonomyPath: string[]
  author: { id: string; name: string; avatarUrl: string | null }
  pricingType: PricingType
  priceCredits: number
  ratingAverage: number
  ratingCount: number
  usageCount: number
  tags: string[]
  isFeatured: boolean
  createdAt: string
  previewVariables: string[] // first 5 variable names
}
```

### 4.3 Generate (Streaming)

**Request:** `POST /api/v1/generate/stream`
```typescript
interface GenerateStreamRequest {
  templateId: string
  variables: Record<string, any>
  options?: {
    temperature?: number
    maxTokens?: number
    stream?: boolean  // default true
  }
}
```

**Response:** `200 OK` (SSE stream)
```
event: generation.start
data: {"generationId": "gen_xxx", "status": "IN_PROGRESS"}

event: token
data: {"delta": "Hello", "usage": {"promptTokens": 50, "completionTokens": 1}}

event: token
data: {"delta": " world", "usage": {"promptTokens": 50, "completionTokens": 2}}

event: generation.complete
data: {"generationId": "gen_xxx", "status": "COMPLETED", "totalTokens": 200, "latencyMs": 3500}

event: error
data: {"message": "AI provider timeout", "code": "AI_TIMEOUT"}
```

### 4.4 Credit Purchase (Stripe)

**Request:** `POST /api/v1/credits/purchase`
```typescript
interface CreditPurchaseRequest {
  packageId: string      // e.g., "credits_100" | "credits_500" | "credits_1000"
  paymentMethodId?: string // if using saved card
}
```

**Response:** `201 Created`
```typescript
interface CreditPurchaseResponse {
  orderId: string
  checkoutUrl: string    // Stripe Checkout URL to redirect user
  orderNumber: string
  credits: number
  priceUsd: number
}
```

---

## 5. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/promptforge?schema=public"

# Auth
NEXTAUTH_URL="https://promptforge.studio"
NEXTAUTH_SECRET="<32-byte-random>"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_SECRET="<32-byte-random>"

# Elasticsearch
ELASTICSEARCH_URL="http://localhost:9200"
ELASTICSEARCH_API_KEY="<api-key>"

# AI Providers (REAL INTEGRATION - NOT MOCK)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
# NOTE: AI is real integration. Mock mode requires Jason approval and must be flagged.

# Stripe (REAL INTEGRATION - NOT MOCK)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CONNECT_CLIENT_ID=""
# NOTE: Stripe is real. Mock mode requires Jason approval and must be flagged.

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM="PromptForge <noreply@promptforge.studio>"

# Storage (S3)
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_BUCKET_NAME="promptforge-assets"
S3_REGION="us-east-1"

# App
NEXT_PUBLIC_APP_URL="https://promptforge.studio"
NEXT_PUBLIC_API_URL="https://api.promptforge.studio"
NODE_ENV="production"
```

---

## 6. Seed Data

### 6.1 Taxonomy (Initial)
```
- Customer Service
  - Reply Templates
  - Escalation Flows
  - FAQ Generation
- Marketing & Copy
  - Ad Copy
  - Email Sequences
  - Social Media
- Code & Dev
  - Code Review
  - Bug Triage
  - Documentation
- Data & Analytics
  - SQL Generation
  - Report Templates
  - Chart Descriptions
- Creative Writing
  - Story Prompts
  - Blog Outlines
  - Product Descriptions
```

### 6.2 Quota Plans (Seed)
| Name | Monthly Credits | Monthly Price (USD) | Annual Price |
|------|-----------------|---------------------|-------------|
| Free | 50 | $0 | $0 |
| Pro | 500 | $29 | $276 |
| Team | 2000 | $99 | $950 |
| Enterprise | 10000 | $299 | $2800 |

### 6.3 Credit Packages
| Package | Credits | Price (USD) | Bonus |
|---------|---------|-------------|-------|
| Starter | 100 | $10 | 0% |
| Growth | 500 | $45 | 10% (550 credits) |
| Scale | 1000 | $80 | 20% (1200 credits) |
| Enterprise | 5000 | $350 | 30% (6500 credits) |

---

## 7. Prompt-as-Code Methodology

### 7.1 Variable Types
```typescript
type VariableType = "string" | "number" | "boolean" | "enum" | "json";

interface VariableSpec {
  name: string;           // e.g., "customerName"
  type: VariableType;
  required: boolean;
  default?: any;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;     // regex
    enumValues?: string[]; // for enum type
  };
}
```

### 7.2 Anti-Failure Constraints
```typescript
type ConstraintType = "max_tokens" | "temperature" | "banned_topics" | "required_facts" | "output_format";

interface ConstraintSpec {
  type: ConstraintType;
  value: any;
  severity: "error" | "warning";  // error blocks generation
}
```

### 7.3 Prompt Lint Rules
1. All `{{variable}}` in `userTemplate` must have a corresponding entry in `variables`
2. Variables used must have valid types and validation rules
3. `systemMessage` must not exceed 10,000 characters
4. `anti_failure_constraints` of type `error` must be satisfiable
5. No hardcoded secrets or API keys in template content
6. Template must have at least one `userTemplate` section

### 7.4 Versioning (Semver)
- Major version bump (`1.0.0 → 2.0.0`): Breaking change to variables, systemMessage, or template structure
- Minor version bump (`1.0.0 → 1.1.0`): New optional variables, added constraints
- Patch version bump (`1.0.0 → 1.0.1`): Description, changelog, taxonomy, tags

---

*This spec is developer-ready. All DB models, APIs, and pages are concrete specifications, not placeholders.*
