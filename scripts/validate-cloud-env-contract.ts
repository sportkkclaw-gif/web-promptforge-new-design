/**
 * scripts/validate-cloud-env-contract.ts
 *
 * Drift guard: ensures the keys listed in `.env.production.required`
 * are exactly the same as REQUIRED_ENV_VARS defined in
 * `scripts/verify-cloud-happy-path.ts`.
 *
 * Exit codes:
 *   0 — contract satisfied (keys match)
 *   1 — drift detected (keys differ); differences printed to stdout
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Resolve paths ────────────────────────────────────────────────────────────

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ENV_REQUIRED_PATH = path.join(PROJECT_ROOT, '.env.production.required');
const VERIFY_SCRIPT_PATH = path.join(PROJECT_ROOT, 'scripts', 'verify-cloud-happy-path.ts');

// ─── Parse keys from .env.production.required ────────────────────────────────

function parseEnvKeys(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .map((l) => l.split('=')[0].trim());
}

// ─── Extract REQUIRED_ENV_VARS from verify-cloud-happy-path.ts ────────────────

function extractScriptKeys(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the REQUIRED_ENV_VARS array definition
  const match = content.match(
    /const\s+REQUIRED_ENV_VARS\s*=\s*\[[\s\S]*?\];/
  );

  if (!match) throw new Error('Could not find REQUIRED_ENV_VARS in verify-cloud-happy-path.ts');

  const arrayStr = match[0];
  const keyMatches = arrayStr.matchAll(/['"`](\w+)['"`]/g);
  const keys: string[] = [];
  for (const m of keyMatches) keys.push(m[1]);

  return keys;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('🔍 Validating cloud env contract…\n');

  const envKeys = parseEnvKeys(ENV_REQUIRED_PATH).sort();
  const scriptKeys = extractScriptKeys(VERIFY_SCRIPT_PATH).sort();

  if (envKeys.length === 0) {
    console.error('❌ No keys found in .env.production.required');
    process.exit(1);
  }

  if (scriptKeys.length === 0) {
    console.error('❌ No keys found in REQUIRED_ENV_VARS in verify-cloud-happy-path.ts');
    process.exit(1);
  }

  const onlyInEnv = envKeys.filter((k) => !scriptKeys.includes(k));
  const onlyInScript = scriptKeys.filter((k) => !envKeys.includes(k));

  if (onlyInEnv.length === 0 && onlyInScript.length === 0) {
    console.log('✅ .env.production.required keys match REQUIRED_ENV_VARS');
    console.log(`   ${envKeys.length} keys: ${envKeys.join(', ')}`);
    process.exit(0);
  }

  console.error('❌ Cloud env contract drift detected!\n');

  if (onlyInEnv.length > 0) {
    console.error('  In .env.production.required but not in REQUIRED_ENV_VARS:');
    for (const k of onlyInEnv) console.error(`    - ${k}`);
    console.error('');
  }

  if (onlyInScript.length > 0) {
    console.error('  In REQUIRED_ENV_VARS but not in .env.production.required:');
    for (const k of onlyInScript) console.error(`    - ${k}`);
    console.error('');
  }

  process.exit(1);
}

main();
