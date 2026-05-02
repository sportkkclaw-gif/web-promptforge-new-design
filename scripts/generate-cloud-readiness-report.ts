/**
 * scripts/generate-cloud-readiness-report.ts
 *
 * Cloud Readiness Report Generator
 * ====================================
 * Scans the runtime environment and produces a report of:
 *   1. Missing required env vars
 *   2. Their purpose / what they gate
 *   3. Which H1–H10 happy-path checks they are required for
 *
 * Does NOT call any APIs or touch the network — purely static env scan.
 *
 * Usage:
 *   node --run cloud:readiness
 *   # or
 *   npx tsx scripts/generate-cloud-readiness-report.ts
 *
 * Exit codes:
 *   0 — report printed (always; even if all env vars are present, report is still useful)
 *   1 — never (this script never throws/fails fatally)
 */

// ─── Env-var registry ────────────────────────────────────────────────────────

interface EnvEntry {
  key: string;
  purpose: string;
  gatedH: number[]; // e.g. [1, 2, 6] means H1, H2, H6
  exampleHint: string;
}

const ENV_REGISTRY: EnvEntry[] = [
  {
    key: 'DATABASE_URL',
    purpose: 'PostgreSQL connection string — used by Prisma for all DB operations',
    gatedH: [1, 2, 6, 7, 10],
    exampleHint: 'postgresql://user:pass@host:5432/promptforge',
  },
  {
    key: 'AUTH_SECRET',
    purpose: 'Secret key for signing JWT / session tokens (jose)',
    gatedH: [1, 2, 5, 6, 7],
    exampleHint: 'minimum 32-char random string',
  },
  {
    key: 'AUTH_URL',
    purpose: 'Base URL of the auth service (email verify, password reset flows)',
    gatedH: [1],
    exampleHint: 'https://promptforge.studio  or  http://localhost:3000',
  },
  {
    key: 'OPENAI_API_KEY',
    purpose: 'OpenAI API key — used for prompt generation (GPT-4o, embeddings)',
    gatedH: [5],
    exampleHint: 'sk-...',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    purpose: 'Anthropic API key — used as alternative AI provider for generation',
    gatedH: [5],
    exampleHint: 'sk-ant-...',
  },
  {
    key: 'STRIPE_SECRET_KEY',
    purpose: 'Stripe secret key — used for payments, credits purchase, billing',
    gatedH: [4, 8],
    exampleHint: 'sk_live_...  or  sk_test_...',
  },
  {
    key: 'SENTRY_DSN',
    purpose: 'Sentry DSN — error tracking & performance monitoring in production',
    gatedH: [], // Sentry is non-blocking (graceful no-op when missing)
    exampleHint: 'https://<key>@sentry.io/<project>',
  },
  {
    key: 'ELASTICSEARCH_URL',
    purpose: 'Elasticsearch URL — used for marketplace search & autocomplete',
    gatedH: [3, 8],
    exampleHint: 'https://<region>.elastic.cloud:9243',
  },
  {
    key: 'ELASTICSEARCH_API_KEY',
    purpose: 'Elasticsearch API key — authenticates to ES cluster',
    gatedH: [3, 8],
    exampleHint: 'base64-encoded ES API key',
  },
  {
    key: 'RESEND_API_KEY',
    purpose: 'Resend API key — transactional email (verify, reset, notifications)',
    gatedH: [1],
    exampleHint: 're_...',
  },
];

// ─── Report generation ────────────────────────────────────────────────────────

function generateReport(): void {
  const present = new Set(
    ENV_REGISTRY.filter((e) => process.env[e.key]).map((e) => e.key)
  );
  const missing = ENV_REGISTRY.filter((e) => !present.has(e.key));

  const hLabels: Record<number, string> = {
    1: 'H1 — Auth: Register / email-verify / login / session',
    2: 'H2 — Templates: create / lint / publish',
    3: 'H3 — Marketplace: browse / search / preview',
    4: 'H4 — Purchase: Stripe checkout / credits deducted',
    5: 'H5 — Generate: AI streaming response / credits',
    6: 'H6 — API key: admin key creation / caller usage',
    7: 'H7 — Teams: invite / accept / RBAC',
    8: 'H8 — Quota: exhaust / block / upgrade prompt',
    9: 'H9 — Moderation: flag template / hide from search',
    10: 'H10 — Fork: derivative with attribution',
  };

  // ── Header ──────────────────────────────────────────────────────────────────
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║        🔍  Cloud Readiness Report  —  promptforge-studio         ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Generated at : ${new Date().toISOString()}`);
  console.log(`  NODE_ENV    : ${process.env.NODE_ENV ?? '(not set)'}`);
  console.log(`  BASE_URL    : ${process.env.BASE_URL ?? 'http://localhost:3000 (default)'}`);
  console.log('');

  // ── Missing env vars section ────────────────────────────────────────────────
  if (missing.length === 0) {
    console.log('  ✅  All registered env vars are present.');
    console.log('');
  } else {
    console.log(`  ⚠️  Missing ${missing.length} of ${ENV_REGISTRY.length} required env vars:`);
    console.log('');
    for (const entry of missing) {
      const hList =
        entry.gatedH.length > 0
          ? entry.gatedH.map((h) => `H${h}`).join(', ')
          : 'none (optional)';
      console.log(`  ── ${entry.key}`);
      console.log(`      Purpose : ${entry.purpose}`);
      console.log(`      Gates   : ${hList}`);
      console.log(`      Example : ${entry.exampleHint}`);
      console.log('');
    }
  }

  // ── Present env vars section ────────────────────────────────────────────────
  console.log('  ── Present env vars ─────────────────────────────────────────────');
  const presentEntries = ENV_REGISTRY.filter((e) => present.has(e.key));
  if (presentEntries.length === 0) {
    console.log('      (none)');
  } else {
    for (const entry of presentEntries) {
      const hList =
        entry.gatedH.length > 0
          ? entry.gatedH.map((h) => `H${h}`).join(', ')
          : 'none (optional)';
      console.log(`  ✅  ${entry.key}  →  ${hList}`);
    }
  }
  console.log('');

  // ── H1–H10 gate matrix ─────────────────────────────────────────────────────
  console.log('  ── H1–H10 Gate Matrix ───────────────────────────────────────────');
  for (let h = 1; h <= 10; h++) {
    const required = ENV_REGISTRY.filter(
      (e) => present.has(e.key) && e.gatedH.includes(h)
    ).map((e) => e.key);
    const missingForH = ENV_REGISTRY.filter(
      (e) => !present.has(e.key) && e.gatedH.includes(h)
    ).map((e) => e.key);

    const label = hLabels[h] ?? `H${h}`;
    const icon = missingForH.length === 0 ? '✅' : '❌';
    console.log(`  ${icon}  ${label}`);
    if (missingForH.length > 0) {
      for (const k of missingForH) {
        console.log(`      missing: ${k}`);
      }
    }
  }
  console.log('');

  // ── Next steps ─────────────────────────────────────────────────────────────
  console.log('  ── Next Steps ───────────────────────────────────────────────────');
  console.log('');
  console.log('  1.  Populate missing env vars in your target/secrets or .env file.');
  console.log('      See the Missing env vars section above for the full list.');
  console.log('');
  console.log('  2.  Once all H1–H10 show ✅, run the full smoke harness:');
  console.log('');
  console.log('        # Against localhost:');
  console.log('        npm run verify:cloud');
  console.log('');
  console.log('        # Against a deployed environment:');
  console.log('        BASE_URL=https://promptforge.studio npm run verify:cloud');
  console.log('');
  console.log('  3.  To re-run this report after updating env vars:');
  console.log('');
  console.log('        node --run cloud:readiness');
  console.log('');
  console.log('  ── Individual H1–H10 test commands (for targeted re-runs) ───────');
  console.log('');
  console.log('      The smoke harness runs all H1–H10 sequentially.');
  console.log('      No individual per-H commands are needed — H1 must pass before H2, etc.');
  console.log('');

  // ── Footer ──────────────────────────────────────────────────────────────────
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  This report is deterministic — re-run anytime with:               ║');
  console.log('║    node --run cloud:readiness                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

generateReport();