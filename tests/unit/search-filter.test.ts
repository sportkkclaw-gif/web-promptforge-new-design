// Search Filter Unit Tests

describe('Search Filters', () => {
  it('should filter by category slug', () => {
    const prompts = [
      { category: 'gaming' }, { category: 'marketing' }, { category: 'gaming' }
    ];
    const filtered = prompts.filter(p => p.category === 'gaming');
    expect(filtered.length).toBe(2);
  });

  it('should filter by engine', () => {
    const prompts = [
      { engine: 'stable-diffusion' }, { engine: 'dall-e' }, { engine: 'stable-diffusion' }
    ];
    const filtered = prompts.filter(p => p.engine === 'stable-diffusion');
    expect(filtered.length).toBe(2);
  });

  it('should filter by price range', () => {
    const prompts = [
      { priceCredits: 0 }, { priceCredits: 10 }, { priceCredits: 50 }, { priceCredits: 100 }
    ];
    const filtered = prompts.filter(p => p.priceCredits >= 10 && p.priceCredits <= 50);
    expect(filtered.length).toBe(2);
  });

  it('should sort by popularity (viewCount)', () => {
    const prompts = [
      { title: 'a', viewCount: 100 },
      { title: 'b', viewCount: 500 },
      { title: 'c', viewCount: 300 },
    ];
    const sorted = [...prompts].sort((a, b) => b.viewCount - a.viewCount);
    expect(sorted[0].viewCount).toBe(500);
    expect(sorted[2].viewCount).toBe(100);
  });

  it('should sort by recent (createdAt)', () => {
    const prompts = [
      { title: 'old', createdAt: new Date('2024-01-01') },
      { title: 'new', createdAt: new Date('2025-01-01') },
    ];
    const sorted = [...prompts].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    expect(sorted[0].title).toBe('new');
  });

  it('should search by title keyword', () => {
    const prompts = [
      { title: 'Cyberpunk City Nightscape' },
      { title: 'Fantasy Forest' },
      { title: 'Cyberpunk Character' },
    ];
    const results = prompts.filter(p => p.title.toLowerCase().includes('cyberpunk'));
    expect(results.length).toBe(2);
  });
});
