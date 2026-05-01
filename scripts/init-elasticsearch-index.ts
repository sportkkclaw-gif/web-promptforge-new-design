/**
 * scripts/init-elasticsearch-index.ts
 *
 * Creates (or recrees) the `promptforge_templates` ES index with proper mappings.
 * Safe to run at deployment time or manually. Reads ELASTICSEARCH_URL from env;
 * if absent, prints a clear no-op message and exits 0.
 *
 * Usage:
 *   npx tsx scripts/init-elasticsearch-index.ts
 *   ELASTICSEARCH_URL=https://... npx tsx scripts/init-elasticsearch-index.ts
 */

// Index name used by lib/services/search.ts
const ES_IDX = 'promptforge_templates';

// Mappings mirror the fields used by lib/services/search.ts
const INDEX_MAPPINGS = {
  properties: {
    id:            { type: 'keyword' },
    title:         { type: 'text', analyzer: 'standard' },
    summary:       { type: 'text', analyzer: 'standard' },
    content:       { type: 'text', analyzer: 'standard' },
    tags:          { type: 'keyword' },
    variableNames: { type: 'keyword' },
    engine:        { type: 'keyword' },
    taxonomyPath:  { type: 'keyword' },
    priceCredits:  { type: 'float' },
    viewCount:     { type: 'integer' },
    status:        { type: 'keyword' },
    createdAt:      { type: 'date' },
    updatedAt:      { type: 'date' },
    owner: {
      type: 'object',
      properties: {
        username:  { type: 'keyword' },
        avatarUrl: { type: 'keyword' },
      },
    },
  },
};

const INDEX_SETTINGS = {
  number_of_shards: 1,
  number_of_replicas: 0,
};

async function initElasticsearchIndex() {
  const url = process.env.ELASTICSEARCH_URL;

  if (!url) {
    console.log('[ES Init] ELASTICSEARCH_URL is not set — skipping index creation.');
    console.log('[ES Init] Set ELASTICSEARCH_URL to create the ES index on deployment.');
    process.exit(0);
    return;
  }

  console.log(`[ES Init] Connecting to: ${url}`);

  let client: any;
  try {
    // Dynamic import so the script works even when @elastic/elasticsearch is not installed.
    // @ts-ignore – package may not be installed; we handle the error gracefully at runtime.
    const elasticModule = await import('@elastic/elasticsearch');
    const Client = elasticModule?.Client ?? elasticModule?.default?.Client;
    if (!Client) {
      throw new Error('@elastic/elasticsearch exports Client not found');
    }
    client = new Client({ node: url });
  } catch (err: any) {
    console.error('[ES Init] Failed to initialise ES client:', err.message);
    console.error('[ES Init] Ensure @elastic/elasticsearch is installed: npm install @elastic/elasticsearch');
    process.exit(1);
  }

  try {
    // Check if index exists
    const indexExists = await client.indices.exists({ index: ES_IDX });

    if (indexExists) {
      console.log(`[ES Init] Index "${ES_IDX}" already exists. Deleting to recreate…`);
      await client.indices.delete({ index: ES_IDX });
    }

    console.log(`[ES Init] Creating index "${ES_IDX}" with mappings…`);
    await client.indices.create({
      index: ES_IDX,
      body: {
        settings: INDEX_SETTINGS,
        mappings: INDEX_MAPPINGS,
      },
    });

    console.log(`[ES Init] ✓ Index "${ES_IDX}" created successfully.`);
    await client.close();
    process.exit(0);
  } catch (err: any) {
    console.error('[ES Init] ✗ Error creating index:', err.meta?.body?.error?.reason ?? err.message);
    await client.close().catch(() => {});
    process.exit(1);
  }
}

initElasticsearchIndex().catch((err) => {
  console.error('[ES Init] Unhandled error:', err);
  process.exit(1);
});