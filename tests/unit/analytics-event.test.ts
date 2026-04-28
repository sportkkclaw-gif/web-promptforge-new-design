// Analytics Event Unit Tests

import { trackEvent, getEvents, clearEvents } from '@/lib/analytics';

describe('Analytics Events', () => {
  beforeEach(() => {
    clearEvents();
  });

  it('should track prompt_viewed event', () => {
    trackEvent('prompt_viewed', { promptId: 'prompt_001', userId: 'user_001' });
    const events = getEvents('prompt_viewed');
    expect(events.length).toBe(1);
    expect(events[0].event).toBe('prompt_viewed');
  });

  it('should track prompt_saved event', () => {
    trackEvent('prompt_saved', { promptId: 'prompt_001', userId: 'user_001' });
    const events = getEvents('prompt_saved');
    expect(events.length).toBe(1);
  });

  it('should track generation_started and generation_succeeded', () => {
    trackEvent('generation_started', { promptId: 'prompt_001', userId: 'user_001' });
    trackEvent('generation_succeeded', { promptId: 'prompt_001', userId: 'user_001', metadata: { runId: 'run_123' } });
    const all = getEvents();
    expect(all.length).toBe(2);
  });

  it('should track order_completed event', () => {
    trackEvent('order_completed', { userId: 'user_001', metadata: { orderId: 'order_001', amount: 50 } });
    const events = getEvents('order_completed');
    expect(events.length).toBe(1);
    expect(events[0].payload.metadata?.orderId).toBe('order_001');
  });

  it('should clear all events', () => {
    trackEvent('prompt_viewed', { promptId: 'p1' });
    trackEvent('prompt_viewed', { promptId: 'p2' });
    clearEvents();
    expect(getEvents().length).toBe(0);
  });

  it('should return empty array for unknown event type', () => {
    const events = getEvents('order_completed');
    expect(events.length).toBe(0);
  });
});
