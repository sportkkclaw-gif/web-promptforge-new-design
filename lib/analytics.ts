// Analytics Service - tracks events for creator dashboard

export type AnalyticsEvent =
  | 'prompt_viewed'
  | 'prompt_saved'
  | 'prompt_applied'
  | 'generation_started'
  | 'generation_succeeded'
  | 'generation_failed'
  | 'marketplace_item_viewed'
  | 'order_completed'
  | 'creator_followed'
  | 'team_member_invited'
  | 'prompt_published';

interface AnalyticsPayload {
  userId?: string;
  promptId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

const eventLog: Array<{ event: AnalyticsEvent; payload: AnalyticsPayload; timestamp: Date }> = [];

export function trackEvent(event: AnalyticsEvent, payload: AnalyticsPayload = {}): void {
  eventLog.push({ event, payload, timestamp: new Date() });
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${event}`, payload);
  }
}

export function getEvents(event?: AnalyticsEvent): Array<{ event: AnalyticsEvent; payload: AnalyticsPayload; timestamp: Date }> {
  if (event) return eventLog.filter(e => e.event === event);
  return eventLog;
}

export function clearEvents(): void {
  eventLog.length = 0;
}
