// API Response helpers

export function ok<T>(data: T, status = 200, cookies?: [string, string][]): Response {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (cookies?.length) {
    for (const [, value] of cookies) {
      headers.append('Set-Cookie', value);
    }
  }
  return new Response(JSON.stringify({ ok: true, data, error: null }), { status, headers });
}

export function error(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return Response.json({ ok: false, data: extra ?? null, error: message }, { status });
}

// SSE helpers for streaming endpoints
export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function sseComment(comment: string): string {
  return `: ${comment}\n\n`;
}

/**
 * Safely parse a JSON string. Returns the parsed object or null on error.
 */
export function parseJSON(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
