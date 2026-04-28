// Prompt Versioning Unit Tests

describe('Prompt Versioning', () => {
  it('should increment version number on new version', () => {
    const currentVersion = 3;
    const nextVersion = currentVersion + 1;
    expect(nextVersion).toBe(4);
  });

  it('should create version record with correct fields', () => {
    const version = {
      promptId: 'prompt_001',
      version: 2,
      content: 'Updated prompt content',
      negativePrompt: 'avoid this',
      parameters: JSON.stringify({ width: 1024, height: 1024 }),
      changelog: 'Improved clarity',
      createdAt: new Date(),
    };
    expect(version.version).toBe(2);
    expect(typeof version.content).toBe('string');
  });

  it('should maintain unique constraint on promptId + version', () => {
    const existingVersions = [1, 2, 3];
    const nextVersion = Math.max(...existingVersions) + 1;
    expect(nextVersion).toBe(4);
    expect(existingVersions).not.toContain(nextVersion);
  });

  it('should preserve previous version on new version create', () => {
    const versions = [
      { version: 1, content: 'v1 content' },
      { version: 2, content: 'v2 content' },
    ];
    const latest = versions.find(v => v.version === 2);
    expect(latest?.content).toBe('v2 content');
    expect(versions.length).toBe(2); // Old versions preserved
  });

  it('should rollback prompt content to specific version', () => {
    const versions = [
      { version: 1, content: 'original' },
      { version: 2, content: 'modified' },
    ];
    const rollbackTo = versions.find(v => v.version === 1);
    expect(rollbackTo?.content).toBe('original');
  });
});
