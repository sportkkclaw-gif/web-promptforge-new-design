# PromptForge Studio — Acceptance Criteria v2
## Final Product Acceptance Gates

**Version:** 2.0  
**Date:** 2026-04-28  
**Purpose:** Define precise acceptance criteria for PromptForge Studio full-product rebuild. All gates must pass before Jason final approval.  

---

## Acceptance Philosophy

> "We accept only what we would ship to a paying customer. No mocks in the happy path. No fallback data. No 'good enough for demo'."

Every acceptance criterion has:
- **Given:** Precondition
- **When:** Action taken
- **Then:** Observable, verifiable outcome

---

## Gate 1: Database & Schema (G1)

**Owner:** Sebastian (implementation), Sophie (verification)  
**Before:** Proceed to Gate 2

### AC-1.1: All 18+ Tables Created
```
Given: Fresh PostgreSQL database with DATABASE_URL set
When: prisma migrate deploy runs
Then: 
  - 18 tables exist: users, accounts, sessions, api_keys, teams, team_members, team_quotas,
    templates, template_versions, taxonomies, orders, order_items, credit_transactions,
    quota_plans, generation_logs, reviews, notifications, audit_logs
  - All foreign keys are enforced
  - All indexes are created
  - Seed data exists: 6+ taxonomy nodes, 4 quota plans, 4 credit packages
```

### AC-1.2: Credit Ledger Integrity
```
Given: User with 100 credits
When: User purchases a template costing 30 credits
Then:
  - credit_transactions table has 2 new rows:
    1. type=PURCHASE (if first purchase) or type=SUBSCRIPTION_INCLUDE, amount=+100, balanceAfter=100
    2. type=TEMPLATE_PURCHASE, amount=-30, balanceAfter=70
  - No rows are updated or deleted
  - Balance cannot go negative (DB constraint or application enforcement)
```

### AC-1.3: Template Versioning
```
Given: User creates template "Test v1.0.0"
When: User edits systemMessage and saves
Then:
  - template_versions has 2 rows (v1.0.0, v1.0.1)
  - templates.version = "1.0.1"
  - Both versions are retrievable independently
```

---

## Gate 2: Authentication (G2)

**Owner:** Sebastian  
**Before:** Proceed to Gate 3

### AC-2.1: Email Registration Flow
```
Given: Unregistered email "newuser@example.com"
When: POST /api/auth/register with { email, password, name }
Then:
  - User record created with emailVerified = null
  - Account record created with type = "credentials"
  - Verification email sent via Resend
  - Response: 201 with { id, email, name, role }
  - Password hash stored (bcrypt, 12 rounds), never stored in plain text
```

### AC-2.2: Email Verification
```
Given: User has unverified email (emailVerified = null)
When: User clicks link in verification email (token-based)
Then:
  - Token validated (not expired, not used)
  - User.emailVerified set to current timestamp
  - Token marked as used
  - Subsequent login works without "verify email" prompt
```

### AC-2.3: OAuth (Google/GitHub)
```
Given: User initiates Google OAuth
When: OAuth callback received with auth code
Then:
  - User created or existing user matched by email
  - Account record created with type="google", provider="google"
  - Session created with JWT
  - Redirected to /dashboard with valid session
```

### AC-2.4: JWT Session
```
Given: Valid login (email/password or OAuth)
When: POST /api/auth/login returns success
Then:
  - HTTP-only cookie set: session_token (JWT, 15min access) + refresh_token (7d)
  - GET /api/auth/me returns current user profile
  - Accessing protected route with valid JWT returns 200
  - Accessing protected route without JWT returns 401
```

### AC-2.5: API Key Authentication
```
Given: User creates an API key via POST /api/users/me/api-keys
When: Caller uses API key in Authorization: Bearer <key> header
Then:
  - Request authenticated as the key's owner
  - keyHash never returned in GET response (only keyPrefix shown)
  - Key can be revoked via DELETE endpoint
  - Revoked key returns 401 on next use
```

---

## Gate 3: Template System (G3)

**Owner:** Sebastian  
**Before:** Proceed to Gate 4

### AC-3.1: Create Template
```
Given: Authenticated user
When: POST /api/templates with valid prompt-as-code structure
Then:
  - Template created with status=DRAFT
  - Slug auto-generated from name (unique)
  - Variables JSON parsed and validated
  - Anti-failure constraints parsed and validated
  - Response: 201 with full template object including id, slug
  - Template appears in GET /api/templates for owner
```

### AC-3.2: Prompt Lint
```
Given: Template with systemMessage + userTemplate containing {{variables}}
When: POST /api/templates/:slug/lint
Then:
  - Returns lint score 0-100
  - Returns array of issues: { rule, severity, message, location }
  - Issues include:
    a) Missing variable spec for {{variable}} in template
    b) Invalid variable type
    c) systemMessage exceeds 10000 chars
    d) Constraint with unsatisfiable value
  - Score = 100 when no issues
```

### AC-3.3: Publish Template
```
Given: Draft template owned by authenticated user
When: POST /api/templates/:slug/publish
Then:
  - Template status changes to PUBLISHED
  - publishedAt set to current timestamp
  - Template appears in GET /api/marketplace/templates
  - Template indexed in Elasticsearch
```

### AC-3.4: Fork with Attribution
```
Given: Published template owned by user A
When: User B forks via POST /api/templates/:slug/fork
Then:
  - New template created for User B with status=DRAFT
  - attribution field set: { upstreamTemplateId, upstreamAuthorId, license }
  - Original template's forkCount incremented
  - Fork tree queryable (upstream → downstream)
```

### AC-3.5: Template Diff
```
Given: Template with 2+ versions
When: GET /api/templates/:slug/diff/:v1/:v2
Then:
  - Structured diff returned: { added: [], removed: [], changed: [] }
  - Diff covers: systemMessage, userTemplate, variables, constraints
```

---

## Gate 4: Search (G4)

**Owner:** Sebastian  
**Before:** Proceed to Gate 5

### AC-4.1: Elasticsearch Index
```
Given: Published template
When: Template is published
Then:
  - Document indexed in Elasticsearch promptforge_templates index
  - Index contains: name, description, taxonomyPath, tags, variables, 
    authorName, pricingType, priceCredits, ratingAverage, usageCount
  - Index updated on template update
  - Index removed on template deprecate/delete
```

### AC-4.2: Full-Text Search
```
Given: 100+ published templates in index
When: GET /api/search/templates?q="customer support"&taxonomy=services&sort=rating
Then:
  - Results returned in < 500ms
  - Results filtered by taxonomy
  - Results sorted by rating (or specified sort)
  - Pagination correct: limit=20, page=1 returns first 20
  - Response includes total count and totalPages
```

### AC-4.3: Autocomplete
```
Given: User types in search bar
When: GET /api/search/autocomplete?q="cust"
Then:
  - Returns top 5 suggestions within 200ms
  - Suggestions include taxonomy names and template names
  - Format: { type: "taxonomy" | "template", value: string, slug: string }
```

---

## Gate 5: Marketplace (G5)

**Owner:** Sebastian  
**Before:** Proceed to Gate 6

### AC-5.1: Browse Marketplace
```
Given: Marketplace page /marketplace
When: GET /api/marketplace/templates
Then:
  - Returns paginated list of PUBLISHED templates
  - Each result includes: id, slug, name, description (truncated), taxonomy,
    author, pricingType, priceCredits, ratingAverage, ratingCount, usageCount
  - Filters applied: taxonomy, price range, rating range
  - Sort applied: relevance, newest, popular, rating, trending
```

### AC-5.2: Template Preview
```
Given: Unpublished/non-purchased template
When: GET /api/marketplace/templates/:slug
Then:
  - Returns public template data (no draft content)
  - Variables listed but values not filled
  - Preview renders template with sample variable placeholders
  - Pricing info shown
  - Purchase CTA shown for non-free templates
```

### AC-5.3: Purchase Template
```
Given: Authenticated user with 50+ credits, template costs 30 credits
When: POST /api/orders/template-purchase with { templateId }
Then:
  - Order created with status=COMPLETED
  - 30 credits deducted (atomic transaction)
  - Template access granted
  - credit_transactions row: { userId, type: TEMPLATE_PURCHASE, amount: -30 }
  - GET /api/templates/:slug returns full template for buyer
```

### AC-5.4: Rate Template
```
Given: User has purchased template
When: POST /api/marketplace/templates/:slug/rate with { rating: 5, title: "Great", body: "..." }
Then:
  - Review created (or updated if already reviewed)
  - Rating reflected in template's ratingAverage
  - ratingCount incremented
```

---

## Gate 6: Credits & Quota (G6)

**Owner:** Sebastian  
**Before:** Proceed to Gate 7

### AC-6.1: Credit Balance
```
Given: Authenticated user
When: GET /api/credits/balance
Then:
  - Returns { balance: number, plan: { name, monthlyCredits, usedCredits }, nextResetAt: Date }
  - Balance matches sum of all credit_transactions amounts for user
```

### AC-6.2: Credit Purchase (Stripe)
```
Given: Authenticated user
When: POST /api/credits/purchase with { packageId: "credits_500" }
Then:
  - Order created with status=PENDING
  - Stripe Checkout session created
  - checkoutUrl returned in response
  - User redirected to Stripe, completes payment
  - Stripe webhook fires: checkout.session.completed
  - Credits deposited to user account
  - Order status updated to COMPLETED
```

### AC-6.3: Overage Block
```
Given: User has 0 credits, attempts generation (costs 1 credit)
When: POST /api/generate
Then:
  - Response: 402 Payment Required
  - Body: { error: "INSUFFICIENT_CREDITS", currentBalance: 0, required: 1, upgradeUrl: "/billing" }
  - No generation log created
  - No credits deducted
```

### AC-6.4: Monthly Quota Reset
```
Given: Pro user with 500 monthly credits, 400 used in current period
When: Monthly billing period elapses (CRON job)
Then:
  - TeamQuota.usedCredits reset to 0
  - TeamQuota.periodStart updated to new month
  - Monthly allocation credited (500 for Pro)
  - Notification sent to user
```

---

## Gate 7: Generation (G7)

**Owner:** Sebastian  
**Before:** Proceed to Gate 8

### AC-7.1: Generate (Real AI)
```
Given: Authenticated user with 50+ credits, owns/purchased template with 3 variables
When: POST /api/generate with { templateId, variables: { name: "John", issue: "late delivery", sentiment: "angry" } }
Then:
  - Variables validated against template VariableSpec
  - Anti-failure constraints checked (error-level constraints block if violated)
  - Credit check: balance >= generationCost (1 credit)
  - AI called with injected systemMessage + userTemplate
  - GenerationLog created: status IN_PROGRESS
  - Response received from AI
  - GenerationLog updated: status COMPLETED, response stored, latencyMs recorded
  - Credits deducted atomically
  - Generation cost deducted from balance
```

### AC-7.2: Streaming Response
```
Given: Authenticated user with sufficient credits
When: POST /api/generate/stream
Then:
  - Response: 200 with Content-Type: text/event-stream
  - Events sent:
    - generation.start: { generationId, status: "IN_PROGRESS" }
    - token: { delta: "...", usage: { completionTokens: N } } (per token)
    - generation.complete: { generationId, status: "COMPLETED", totalTokens, latencyMs }
  - Streaming works with SSE client (fetch, EventSource)
  - Response stored in GenerationLog on completion
```

### AC-7.3: Generation History
```
Given: Authenticated user with 10+ generation logs
When: GET /api/generate/history?page=1&limit=20
Then:
  - Returns paginated list of GenerationLog entries
  - Each entry includes: id, templateId, templateName, variables (snapshot),
    response (truncated preview), status, createdAt, latencyMs
  - Can click to view full generation detail
```

### AC-7.4: Mock Mode Flag (if active)
```
Given: System running with USE_MOCK_AI=true
When: User generates a prompt
Then:
  - Generation log entry has: responseMeta.isMock: true
  - UI shows "DEMO MODE" badge on generation output
  - This is clearly marked as NON-FINAL until Jason approves mock-only mode
```

---

## Gate 8: Teams (G8)

**Owner:** Sebastian  
**Before:** Proceed to Gate 9

### AC-8.1: Create Team
```
Given: Authenticated user
When: POST /api/teams with { name: "Acme AI Team", plan: "PRO" }
Then:
  - Team created with slug auto-generated
  - User added as OWNER in TeamMember
  - TeamQuota created for current period
  - Team appears in GET /api/teams for owner
```

### AC-8.2: Invite Member
```
Given: Team owner
When: POST /api/teams/:slug/members/invite with { email: "teammate@example.com", role: "MEMBER" }
Then:
  - Invite token generated and stored
  - Invite email sent to teammate@example.com
  - Pending invite visible in team members list (status: PENDING)
```

### AC-8.3: Accept Invite
```
Given: teammate@example.com has invite token
When: POST /api/teams/:slug/members/accept with invite token
Then:
  - TeamMember created for teammate
  - Invite token consumed
  - teammate can see team in GET /api/teams
  - teammate's quota allocation enforced
```

### AC-8.4: Team Quota Enforcement
```
Given: Team with 1000 monthly credits, allocated 200 to each of 3 members
When: Member A uses 200 credits (generations)
Then:
  - TeamQuota.usedCredits = 200
  - Member A blocked at 200 (quotaAlloc exceeded)
  - Team owner sees aggregate usage in team dashboard
```

---

## Gate 9: Admin (G9)

**Owner:** Sebastian  
**Before:** Proceed to Gate 10 (Simon Review)

### AC-9.1: User Management
```
Given: Admin role user
When: GET /api/admin/users?page=1&limit=20
Then:
  - Returns paginated user list (all users)
  - Each user: id, email, name, role, createdAt, lastLoginAt
  - Can filter by role, search by email
```

### AC-9.2: Suspend User
```
Given: Admin role user
When: PATCH /api/admin/users/:id with { suspended: true, reason: "TOS violation" }
Then:
  - User record updated: suspendedAt set
  - User cannot log in (session invalidated)
  - AuditLog entry created
  - Notification sent to user email
```

### AC-9.3: Flag Template
```
Given: Admin role user
When: PATCH /api/admin/templates/:slug/flag with { reason: "Inappropriate content" }
Then:
  - Template.status = FLAGGED
  - Template removed from marketplace immediately (ES index updated)
  - Template.flaggedAt set
  - Template.flagReason set
  - AuditLog entry created
  - Owner notified via email
```

### AC-9.4: Manual Credit Grant
```
Given: Admin role user
When: POST /api/admin/credits/grant with { userId, amount: 100, reason: "Goodwill compensation" }
Then:
  - credit_transactions row created: type=GRANT, amount=+100
  - User balance updated
  - AuditLog entry created with reason
```

---

## Gate 10: Browser Happy Paths (G10)

**Owner:** Sebastian + Simon (joint verification)  
**Before:** Proceed to Gate 11

### G10: All 10 Happy Paths Must Pass

| # | Happy Path | Acceptance Criteria | Verified By | Cloud |
|---|------------|---------------------|-------------|-------|
| H1 | Register → Email Verify → Login → Dashboard | Account active, JWT issued, dashboard renders with real user data | Simon | Required |
| H2 | Create Template → Fill Fields → Lint → Save → Publish | Template persisted, indexed, appears in marketplace search | Simon | Required |
| H3 | Browse Marketplace → Filter → Click Template → Preview | Search results paginated correctly, preview renders variables | Simon | Required |
| H4 | Purchase Template → Credits Deducted → Access Gained | Order created, credits ledger updated atomically, full template accessible | Simon | Required |
| H5 | Generate Prompt → Streaming Response → Credits Deducted | Generation log entry, credits deducted, response stored, streaming works | Simon | Required |
| H6 | Admin Creates API Key → Caller Uses Key → Works | API auth succeeds, request logged, generation returned | Simon | Required |
| H7 | Team Invite → Accept → Member Sees Quota | Member added, RBAC applied, quota enforced | Simon | Required |
| H8 | Exhaust Quota → Block → Upgrade Prompt → Purchase Credits | 402 returned, upgrade CTA works, Stripe checkout works, credits replenished | Simon | Required |
| H9 | Admin Flags Template → Template Hidden | Search updated immediately, flag reason recorded, owner notified | Simon | Required |
| H10 | Fork Template → Derivative Created with Attribution | Fork tree accurate, attribution displayed, fork count incremented | Simon | Required |

**Verification method:** Simon must personally run each path in a browser against the cloud deployment, documenting screenshots at each step.

---

## Gate 11: Simon Code Review (G11)

**Owner:** Simon  
**Before:** Proceed to Gate 12

### AC-11.1: Security
- [ ] No SQL injection vulnerabilities (parameterized queries via Prisma)
- [ ] No XSS vulnerabilities (React auto-escaping + sanitize-html for user content)
- [ ] No CSRF (SameSite cookies + CSRF tokens for state-changing GETs)
- [ ] No IDOR (ownership checks on all resource endpoints)
- [ ] Rate limiting on auth endpoints (5 attempts/minute)
- [ ] API keys hashed with SHA-256

### AC-11.2: Code Quality
- [ ] No `// TODO: fix later` in production code
- [ ] All error responses use consistent format: `{ error: string, code: string, details?: any }`
- [ ] All async functions have try/catch with proper error propagation
- [ ] No secret values in code (all in environment variables)
- [ ] TypeScript strict mode enabled

### AC-11.3: Performance
- [ ] Database queries use appropriate indexes (verified with EXPLAIN)
- [ ] Elasticsearch queries have timeout (5s)
- [ ] No N+1 query patterns in list endpoints
- [ ] Pagination on all list endpoints (max 100 items/request)
- [ ] Redis caching for frequently accessed, rarely changed data (taxonomy, quota plans)

---

## Gate 12: Final Jason Approval (G12)

**Owner:** Jason  
**Before:** Production Release

### Pre-Jason Checklist
- [ ] All 10 browser happy paths passed (Gate G10)
- [ ] Simon code review complete with no blocking issues (Gate G11)
- [ ] All P0 checklist items marked DONE
- [ ] All P1 checklist items marked DONE
- [ ] AI integration is REAL (OpenAI + Anthropic) OR Jason has explicitly approved mock mode in writing
- [ ] Payment integration is REAL (Stripe) OR Jason has explicitly approved mock mode in writing
- [ ] No mock data masquerading as real data in any flow
- [ ] All 18+ DB tables have production-quality seed data
- [ ] All 14+ API endpoints have real handlers
- [ ] All 16+ pages render with real data

### Jason Approval Actions
1. Review proposal_full.md against delivered product
2. Review SPEC.md against delivered product
3. Review acceptance criteria one by one
4. Sign off on each gate in writing (Slack/email confirmation)
5. Issue final approval to proceed to release

---

## Test Scripts for Verification

### Credit Ledger Atomicity Test
```bash
# Run this to verify credit transactions are never negative
curl -X POST http://localhost:3000/api/generate \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"templateId": "tmpl_xxx", "variables": {...}}'

# Check balance before and after
curl http://localhost:3000/api/credits/balance \
  -H "Authorization: Bearer $USER_TOKEN"

# Verify transaction log
curl http://localhost:3000/api/credits/transactions \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Search Index Verification
```bash
# Check Elasticsearch index count
curl -X GET "http://localhost:9200/promptforge_templates/_count"

# Verify published template is indexed
curl -X GET "http://localhost:9200/promptforge_templates/_search" \
  -H "Content-Type: application/json" \
  -d '{"query": {"term": {"slug": "my-template-slug"}}}'
```

---

*This acceptance document is the contract between Sophie, Sebastian, Simon, and Jason. No feature is complete until all acceptance criteria are met and verified.*
