// E2E smoke test
// tests/e2e/smoke.test.ts

/**
 * @jest-environment node
 */

describe('E2E Smoke Tests', () => {
  it('app directory structure is correct', () => {
    const fs = require('fs');
    const path = require('path');
    const appDir = path.join(process.cwd(), 'app');
    
    // Check root page exists
    expect(fs.existsSync(path.join(appDir, 'page.tsx'))).toBe(true);
    
    // Check dashboard pages exist
    expect(fs.existsSync(path.join(appDir, 'dashboard/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(appDir, 'dashboard/prompts/page.tsx'))).toBe(true);
    
    // Check marketplace pages exist
    expect(fs.existsSync(path.join(appDir, 'marketplace/page.tsx'))).toBe(true);
    
    // Check new required pages exist
    expect(fs.existsSync(path.join(appDir, 'editor/[id]/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(appDir, 'user/[username]/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(appDir, 'leaderboard/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(appDir, 'admin/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(appDir, 'admin/moderation/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(appDir, 'help/api-docs/page.tsx'))).toBe(true);
  });

  it('API routes are created', () => {
    const fs = require('fs');
    const path = require('path');
    
    const endpoints = [
      'app/api/prompts/route.ts',
      'app/api/prompts/[id]/route.ts',
      'app/api/prompts/[id]/publish/route.ts',
      'app/api/prompts/[id]/generate/route.ts',
      'app/api/prompts/[id]/versions/route.ts',
      'app/api/search/route.ts',
      'app/api/collections/route.ts',
      'app/api/collections/[id]/items/route.ts',
      'app/api/generations/route.ts',
      'app/api/marketplace/orders/route.ts',
      'app/api/marketplace/items/route.ts',
      'app/api/reviews/route.ts',
      'app/api/analytics/creator/route.ts',
      'app/api/team/invite/route.ts',
      'app/api/admin/moderation/[id]/decision/route.ts',
    ];

    for (const endpoint of endpoints) {
      expect(fs.existsSync(path.join(process.cwd(), endpoint))).toBe(true);
    }
  });

  it('lib files are present', () => {
    const fs = require('fs');
    const path = require('path');
    
    expect(fs.existsSync(path.join(process.cwd(), 'lib/prisma.ts'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'lib/quota.ts'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'lib/api.ts'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'lib/mock/generation.ts'))).toBe(true);
  });

  it('prisma schema and seed exist', () => {
    const fs = require('fs');
    const path = require('path');
    
    expect(fs.existsSync(path.join(process.cwd(), 'prisma/schema.prisma'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'prisma/seed.ts'))).toBe(true);
  });
});
