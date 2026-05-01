/**
 * Schema Constraint Verification Test
 * Verifies composite unique indexes and foreign key constraints in schema.prisma
 * 
 * Run: node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit/schema-constraints.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const SCHEMA_PATH = path.join(process.cwd(), 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');

describe('Prisma Schema Constraints Verification', () => {
  
  // Count composite @@unique constraints
  const compositeUniqueMatches = schemaContent.match(/@@unique\(\[.*,.*\]\)/g) || [];
  const expectedCompositeUniqueCount = 7;
  
  it('should have expected number of composite unique indexes', () => {
    console.log(`Found ${compositeUniqueMatches.length} composite unique constraints`);
    expect(compositeUniqueMatches.length).toBe(expectedCompositeUniqueCount);
    console.log(`✅ All ${expectedCompositeUniqueCount} composite unique indexes present`);
  });

  // Count FK relations
  const fkMatches = schemaContent.match(/@relation\(/g) || [];
  const expectedFKCount = 40;
  
  it('should have expected number of foreign key relations', () => {
    console.log(`Found ${fkMatches.length} FK relation declarations`);
    expect(fkMatches.length).toBeGreaterThanOrEqual(expectedFKCount - 5); // Allow some tolerance
    console.log(`✅ FK relations verified (${fkMatches.length} found)`);
  });

  // Verify onDelete: Cascade is present for join tables
  const cascadeMatches = schemaContent.match(/onDelete: Cascade/g) || [];
  const expectedCascadeCount = 18;
  
  it('should have onDelete: Cascade for join table foreign keys', () => {
    console.log(`Found ${cascadeMatches.length} onDelete: Cascade declarations`);
    expect(cascadeMatches.length).toBeGreaterThanOrEqual(expectedCascadeCount - 3); // Allow tolerance
    console.log(`✅ Cascade deletes verified (${cascadeMatches.length} found)`);
  });

  // Verify key index directives
  const indexMatches = schemaContent.match(/@@index\(/g) || [];
  
  it('should have supporting indexes for foreign key columns', () => {
    console.log(`Found ${indexMatches.length} @@index directives`);
    expect(indexMatches.length).toBeGreaterThanOrEqual(15);
    console.log(`✅ FK indexes present (${indexMatches.length} found)`);
  });

  // Verify specific critical composite unique constraints exist
  const criticalComposites = [
    '@@unique([workspaceId, userId])',           // WorkspaceMember
    '@@unique([promptId, version])',              // PromptVersion
    '@@unique([promptId, tagId])',               // PromptTag
    '@@unique([collectionId, promptId])',        // CollectionItem
    '@@unique([provider, providerAccountId])',   // Account
    '@@unique([teamId, userId])',                // TeamMember
    '@@unique([templateId, version])',           // TemplateVersion
  ];

  it('should contain all critical composite unique constraints', () => {
    const missing: string[] = [];
    for (const composite of criticalComposites) {
      // Normalize whitespace for comparison
      const normalized = composite.replace(/\s+/g, ' ');
      const schemaNorm = schemaContent.replace(/\s+/g, ' ');
      if (!schemaNorm.includes(normalized)) {
        missing.push(composite);
      }
    }
    expect(missing).toHaveLength(0);
    console.log(`✅ All ${criticalComposites.length} critical composite unique constraints verified`);
  });

  it('schema should pass Prisma validation', () => {
    const { execSync } = require('child_process');
    try {
      execSync('./node_modules/.bin/prisma validate', { 
        cwd: process.cwd(),
        stdio: 'pipe' 
      });
      console.log('✅ Prisma schema validation passed');
    } catch (error: any) {
      throw new Error(`Prisma validate failed: ${error.message}`);
    }
  });

  it('schema should generate valid Prisma client', () => {
    const { execSync } = require('child_process');
    try {
      execSync('./node_modules/.bin/prisma generate', { 
        cwd: process.cwd(),
        stdio: 'pipe' 
      });
      console.log('✅ Prisma client generated successfully');
    } catch (error: any) {
      throw new Error(`Prisma generate failed: ${error.message}`);
    }
  });
});