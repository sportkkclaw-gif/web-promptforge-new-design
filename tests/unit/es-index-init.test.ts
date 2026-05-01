/**
 * tests/unit/es-index-init.test.ts
 *
 * Deterministic unit tests for scripts/init-elasticsearch-index.ts.
 * No real network calls; all ES client scenarios are exercised as subprocesses.
 *
 * Run: node --experimental-vm-modules node_modules/.bin/jest tests/unit/es-index-init.test.ts
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const SCRIPT = '/home/sport/WORK/AGENTS/04_打回修改/sebastian/20260428_promptforge_full_product_rebuild_v2/scripts/init-elasticsearch-index.ts';

/** Strip ANSI colour codes for clean string comparisons */
function stripAnsi(s) {
  return (s || '').replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Run the script in a subprocess.  Resolves with { stdout, stderr } even when
 * the script exits non-zero (the exec callback receives both on error).
 */
function runScript(extraEnv = {}) {
  return new Promise((resolve) => {
    const env = { ...process.env, NODE_ENV: 'test', ...extraEnv };
    exec(
      `node --experimental-vm-modules "${SCRIPT}"`,
      { env, timeout: 15_000 },
      (err, stdout, stderr) => {
        resolve({ stdout, stderr, exitCode: err ? (err.code ?? 1) : 0 });
      }
    );
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Elasticsearch index initialization script', () => {
  // -------------------------------------------------------------------------
  test('exits 0 and no-ops when ELASTICSEARCH_URL is not set', async () => {
    const { stdout, stderr, exitCode } = await runScript(
      { ELASTICSEARCH_URL: undefined }
    );
    const out = stripAnsi(stdout) + stripAnsi(stderr);
    expect(exitCode).toBe(0);
    expect(out).toContain('ELASTICSEARCH_URL is not set');
    expect(out).toContain('skipping index creation');
  }, 30_000);

  // -------------------------------------------------------------------------
  test('exits 1 with clear error when ELASTICSEARCH_URL is set but package is missing', async () => {
    const { stdout, stderr, exitCode } = await runScript({
      ELASTICSEARCH_URL: 'https://mock-es:9200',
    });
    const out = stripAnsi(stdout) + stripAnsi(stderr);
    expect(exitCode).toBe(1);
    expect(out).toContain('Failed to initialise ES client');
    expect(out).toContain('@elastic/elasticsearch');
  }, 30_000);

  // -------------------------------------------------------------------------
  test('script file exists and is a non-empty TypeScript file', () => {
    const { existsSync, statSync } = require('fs');
    expect(existsSync(SCRIPT)).toBe(true);
    const stats = statSync(SCRIPT);
    expect(stats.size).toBeGreaterThan(100);
  });

  // -------------------------------------------------------------------------
  test('package.json includes es:init script pointing at init-elasticsearch-index', () => {
    const pkg = require('../../package.json');
    expect(pkg.scripts).toHaveProperty('es:init');
    expect(pkg.scripts['es:init']).toContain('init-elasticsearch-index');
  });

  // -------------------------------------------------------------------------
  test('script prints guidance to set ELASTICSEARCH_URL when not set', async () => {
    const { stdout, stderr } = await runScript({ ELASTICSEARCH_URL: undefined });
    const out = stripAnsi(stdout) + stripAnsi(stderr);
    expect(out).toContain('Set ELASTICSEARCH_URL to create the ES index on deployment');
  }, 30_000);
});