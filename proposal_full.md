# PromptForge Studio — Full-Product Rebuild v2
## Proposal (Final Product, Not MVP)

**Version:** 2.0 (Full Product)  
**Date:** 2026-04-28  
**Author:** Sophie Planning Agent  
**Status:** Ready for Sebastian Development Handoff  
**Product Type:** AI Prompt-as-Code / Productized Prompt Template SaaS  

---

## 1. Executive Summary

PromptForge Studio is a cloud-native SaaS platform enabling teams and individuals to create, version, validate, share, and generate AI prompts using a structured "prompt-as-code" methodology. Unlike ad-hoc prompt management, PromptForge treats prompts as versioned, typed, variable-driven templates with linting, attribution, and marketplace distribution.

This document constitutes the **full-product proposal v2**, superseding all MVP/prototype submissions. The product encompasses all layers: database persistence, authentication/authorization, full-text search, template lifecycle management, marketplace with order/quota economics, prompt generation (real AI or Jason-approved mocks), admin controls, and a dashboard with analytics. No core path may ship as mock-only without explicit Jason approval.

**Key Principle:** Every user-facing flow must have a verified cloud happy path before review. No "HTTP 200 with fallback data" substitutions.

---

## 2. Product Vision

> "PromptForge Studio: The GitHub of AI Prompts — versioned, collaborative, auditable, and monetizable prompt templates for professional AI engineering teams."

**Core Values:**
- **Prompt-as-Code:** Prompts are typed artifacts with variables, constraints, metadata, versioning, and CI-style linting.
- **Marketplace Economy:** creators monetize templates; buyers acquire validated, high-quality prompts with quota credits.
- **Enterprise-Ready:** RBAC, audit logs, team workspaces, usage analytics, quota enforcement.
- **Interoperable:** REST API, webhooks, API key management, and future CLI tooling.

---

## 3. Target Users

| Persona | Description | Primary Flows |
|---------|-------------|---------------|
| **Prompt Engineer** | Creates and maintains prompt templates with versioning and linting | Create → Version → Lint → Publish |
| **Team Lead** | Manages team quotas, members, and shared template libraries | Invite → Assign Quota → Dashboard |
| **AI Consumer** | Browses marketplace, purchases/download templates, generates outputs | Browse → Purchase → Generate → Rate |
| **Enterprise Admin** | Full system oversight: users, quotas, revenue, content moderation | Admin Panel → Users → Analytics |
| **API Caller** | Integrates PromptForge generation into external pipelines via REST API | API Key → Generate → Webhook |

---

## 4. Feature Overview (Final Product)

### 4.1 Authentication & Authorization
- **Email/Password + OAuth (Google, GitHub)** registration and login
- **JWT-based session management** with access/refresh token rotation
- **Role-Based Access Control (RBAC):** `owner`, `admin`, `editor`, `viewer`, `api_caller`
- **Team workspaces** with member management and per-member quota allocation
- **API key management** for programmatic access (hashed storage, scoped permissions)

### 4.2 Template Lifecycle Management
- **Create prompts** from scratch or fork existing templates
- **Prompt-as-Code structure:**
  - `name`, `description`, `taxonomy` (category/subcategory)
  - `variables[]` with name, type, required flag, default, validation rules
  - `system_message`, `user_template` (Templated string with `{{variable}}` syntax)
  - `anti_failure_constraints[]` (e.g., max output tokens, forbidden topics)
  - `attribution_metadata` (author, license, upstream fork reference)
  - `version` (semver), `changelog`
- **Prompt Lint:** structural validation, variable resolution check, constraint sanity check
- **Versioning:** every save creates a new version; diff view between versions
- **Fork/Attribution:** fork a public template → creates attributed derivative; fork tree view
- **Publishing workflow:** draft → review (optional) → published → deprecated

### 4.3 Full-Text Search
- **Elasticsearch-backed** search over template names, descriptions, taxonomy, variable names, full prompt content
- **Filters:** taxonomy, author, price range, rating, tags, variables count, creation date
- **Sort:** relevance, newest, most purchased, highest rated, trending
- **Autocomplete** on search bar with taxonomy suggestions
- **Search analytics** (logged for marketplace trending)

### 4.4 Marketplace & Commerce
- **Template listing** with rich preview (rendered prompt preview with sample variables)
- **Pricing models:** Free, One-time Purchase, Subscription (monthly/annual)
- **Credit system:** PromptForge Credits (PPC) — purchased via Stripe
- **Order flow:** Add to Cart → Checkout → Credits deposited → Download/Access granted
- **Revenue share:** 70% to creator, 20% to platform, 10% operational (configurable)
- **Ratings & Reviews:** 1-5 stars + written review; displayed on template page
- **Featured/Promoted** templates via admin boost (no SEO manipulation)

### 4.5 Quota & Credit System
- **Quota plans:** Free tier (50 credits/month), Pro ($29/mo, 500 credits), Enterprise (custom)
- **Credit deduction:** per-generation (real AI) or per-template-purchase (marketplace)
- **Overage handling:** hard block with upgrade prompt vs. graceful queue
- **Credit purchase:** Stripe Checkout integration (real payment; mock mode requires Jason approval)
- **Credit ledger:** immutable transaction log per user/team
- **Admin quota override:** manual credit grant/revoke with audit reason

### 4.6 Prompt Generation (AI)
- **Real AI integration:** OpenAI GPT-4 / Anthropic Claude (production path)
- **Mock mode (NON-FINAL):** Deterministic placeholder responses; must be flagged in UI; NOT acceptable for final review unless Jason explicitly approves mock-only mode
- **Generation request:** template ID + variable values → validated → credits checked → AI called → response stored → credits deducted
- **Streaming responses** via Server-Sent Events (SSE)
- **Generation history:** paginated log with template version snapshot, variables used, response, latency
- **Regenerate:** same variables → new AI call; or modify variables and regenerate

### 4.7 Admin Panel
- **User management:** list, suspend, delete, impersonate (audit logged)
- **Template moderation:** flag, hide, remove templates; content policy enforcement
- **Transaction log:** all credit purchases, template sales, credit grants
- **System health:** API latency, error rates, credit ledger consistency, DB health
- **Feature flags:** toggle features on/off per user/team/tier
- **Announcements:** system-wide or targeted notifications

### 4.8 Dashboard
- **Usage overview:** generations today/this month, credits used, remaining quota
- **Template performance:** views, purchases, revenue, ratings over time
- **Team activity:** member usage table, quota consumption bar chart
- **Revenue report:** gross sales, net revenue, payout history (Stripe Connect)
- **API key usage:** call counts, error rates, latency percentiles
- **Notifications:** credit low, payout processed, template flagged

### 4.9 Browser Happy Paths (Critical — All Must Pass)
All paths below must be verified on cloud deployment (not local mock):

| # | Path | Success Criteria |
|---|------|-----------------|
| H1 | User registers → email verify → logs in → sees dashboard | Account active, JWT issued, dashboard loads with user data |
| H2 | User creates template → fills all fields → lints → saves as draft → publishes | Template persisted in DB, appears in search, correct taxonomy |
| H3 | User browses marketplace → applies filters → clicks template → sees preview | Search results paginated, preview renders variables correctly |
| H4 | User purchases template → credits deducted → gains access → can generate | Order record created, credits ledger updated atomically, access granted |
| H5 | User generates prompt (real AI or Jason-approved mock) → response shown → credits deducted | Generation log entry, credits deducted, response stored |
| H6 | Admin creates API key → caller uses key → makes generation request → gets response | API auth works, request logged, response returned |
| H7 | Team owner invites member → invite accepted → member sees team quota | Member list updated, RBAC applied, quota enforced |
| H8 | User exhausts quota → attempts generation → sees upgrade prompt → purchases credits | Overage block active, Stripe checkout opens, credits replenished |
| H9 | Admin flags template → template hidden → users no longer see it | Moderation takes effect immediately, audit log entry |
| H10 | User forks template → derivative created with attribution | Fork tree accurate, attribution link displayed, author notified |

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Browser / Mobile                     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────┐
│              Next.js App (SSR + API)                 │
│  Pages: Landing, Auth, Dashboard, Templates,        │
│  Marketplace, Admin, API Docs                       │
└──────┬──────────────────────┬───────────────────────┘
       │                      │
┌──────▼──────┐        ┌──────▼──────┐
│  PostgreSQL  │        │ Elasticsearch│
│  (primary DB)│        │ (search index) │
└─────────────┘        └──────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Redis (cache,   │
                    │   sessions, rate  │
                    │   limiting)       │
                    └───────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼────────┐  ┌────────▼────────┐  ┌──────▼──────┐
│ OpenAI / Claude │  │ Stripe (payments)│  │ SendGrid /  │
│ (AI Generation) │  │ (credits, payouts│  │ Resend      │
│ [MOCK if no     │  │  real or mock    │  │ (email)     │
│  Jason approval] │  │  requires Jason) │  │             │
└─────────────────┘  └──────────────────┘  └─────────────┘
```

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI, React Query, Zod
- **Backend:** Next.js API Routes (Route Handlers), Node.js
- **Database:** PostgreSQL 15 (via Prisma ORM)
- **Search:** Elasticsearch 8 (or Algolia as fallback)
- **Cache/Sessions:** Redis 7
- **Auth:** NextAuth.js v5 (JWT + OAuth)
- **Payments:** Stripe (real; mock requires explicit Jason approval)
- **AI:** OpenAI GPT-4 / Anthropic Claude (real; mock requires explicit Jason approval)
- **Email:** Resend or SendGrid
- **Storage:** S3-compatible (template asset uploads)
- **Hosting:** Vercel (frontend) + Railway/Render (background workers)

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Availability** | 99.5% uptime SLA |
| **Latency (p95)** | API responses < 500ms; generation < 30s (excluding AI latency) |
| **Concurrency** | 500 concurrent users; 100 concurrent generations |
| **Security** | OWASP Top 10 mitigated; SOC 2 Type II readiness |
| **Data retention** | Generation logs retained 90 days (configurable); full audit logs 2 years |
| **GDPR** | User data export, deletion, consent management |
| **Accessibility** | WCAG 2.1 AA (product page, dashboard, admin) |

---

## 7. Out of Scope (Requires explicit separate approval; not part of this complete web product delivery)

- Mobile native apps (iOS/Android)
- CLI tooling
- VS Code extension
- SSO/SAML for enterprise
- White-label / multi-tenant SaaS
- Prompt evaluation / A/B testing framework
- Multi-language prompt support (i18n prompts)

---

## 8. Approval & Handoff Gates

| Gate | Owner | Criteria |
|------|-------|----------|
| G1: Planning Complete | Sophie | All 6 planning docs written and verified |
| G2: DB Schema Approved | Sophie + Sebastian | 18+ tables spec'd, Prisma schema generated |
| G3: API Contract Approved | Sophie + Sebastian | 14+ API endpoints with request/response contracts |
| G4: Frontend Pages Approved | Sophie + Sebastian | 16+ pages with component specs |
| G5: Cloud Happy Paths Verified | Sebastian | All 10 browser happy paths pass on cloud |
| G6: Simon Review | Simon | Code review + browser walkthrough |
| G7: Jason Final Approval | Jason | Only after Simon approves all Gates |

---

*This proposal represents the final product specification. Any deviation from full implementation must be explicitly approved by Jason before being marked as complete.*
