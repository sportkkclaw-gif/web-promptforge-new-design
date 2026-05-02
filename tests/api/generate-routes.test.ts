// API Tests: Generation API missing routes (stream, history, id, cancel)
// tests/api/generate-routes.test.ts

/** @jest-environment node */

let generateStreamRoute: typeof import('../../app/api/generate/stream/route');
let generateHistoryRoute: typeof import('../../app/api/generate/history/route');
let generateIdRoute: typeof import('../../app/api/generate/[id]/route');
let generateRoute: typeof import('../../app/api/generate/route');
let promptsRoute: typeof import('../../app/api/prompts/route');
let generationsRoute: typeof import('../../app/api/generations/route');
let registerRoute: typeof import('../../app/api/auth/register/route');

beforeAll(async () => {
  [generateStreamRoute, generateHistoryRoute, generateIdRoute, generateRoute, promptsRoute, generationsRoute, registerRoute] =
    await Promise.all([
      import('../../app/api/generate/stream/route'),
      import('../../app/api/generate/history/route'),
      import('../../app/api/generate/[id]/route'),
      import('../../app/api/generate/route'),
      import('../../app/api/prompts/route'),
      import('../../app/api/generations/route'),
      import('../../app/api/auth/register/route'),
    ]);
});

function makeRequest(
  method: string,
  url: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const absoluteUrl = url.startsWith('/') ? BASE_URL + url : url;
  return new Request(absoluteUrl, init) as unknown as import('next/server').NextRequest;
}

function makeAuthorizedRequest(method: string, url: string, token: string, body?: unknown) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  return makeRequest(method, url, body, headers);
}

async function registerUser(email: string, username: string) {
  const req = makeRequest('POST', '/api/auth/register', { email, username, password: 'password123' });
  const res = await registerRoute.POST(req);
  const json = await res.json();
  return json.data.token as string;
}

async function createPrompt(token: string, title: string) {
  const req = makeAuthorizedRequest('POST', '/api/prompts', token, {
    title,
    content: 'test prompt content',
    engine: 'midjourney',
    model: 'midjourney-v6',
    parameters: { subject: 'test subject', style: 'cinematic' },
  });
  const res = await promptsRoute.POST(req);
  const json = await res.json();
  if (!json.ok || !json.data?.prompt) throw new Error(`createPrompt failed: ${json.error ?? JSON.stringify(json)}`);
  return json.data.prompt.id as string;
}

// Create a generation run and return its ID for use as test fixture
async function createGeneration(token: string, promptId: string) {
  const req = makeAuthorizedRequest('POST', '/api/generate', token, { promptId });
  const res = await generateRoute.POST(req);
  const json = await res.json();
  if (!json.ok) throw new Error(`createGeneration failed: ${json.error}`);
  return json.data.runId as string;
}

async function waitForStreamEnd(stream: import('next/server').NextRequest): Promise<string> {
  // Read the response body to consume the stream
  const encoder = new TextDecoder();
  let fullText = '';
  try {
    const response = await fetch(stream.url);
    const reader = response.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: false });
    }
  } catch {
    // streaming not fully consumed in test env, read what we can
  }
  return fullText;
}

describe('API: Generation Stream', () => {
  describe('POST /api/generate/stream', () => {
    it('should reject request without token', async () => {
      const req = makeRequest('POST', '/api/generate/stream', { promptId: 'any' });
      const res = await generateStreamRoute.POST(req);
      // SSE error response - check headers
      expect(res.headers.get('content-type')).toBe('text/event-stream');
      expect(res.status).toBe(401);
    });

    it('should reject when prompt does not exist', async () => {
      const token = await registerUser(`stream_${Date.now()}@example.com`, `stream_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', '/api/generate/stream', token, { promptId: 'non-existent-prompt-id' });
      const res = await generateStreamRoute.POST(req);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toBe('text/event-stream');
    });

    it('should start a streaming generation and return SSE headers', async () => {
      const token = await registerUser(`stream2_${Date.now()}@example.com`, `stream2_${Date.now()}`);
      const promptId = await createPrompt(token, `stream-test-prompt-${Date.now()}`);
      const req = makeAuthorizedRequest('POST', '/api/generate/stream', token, { promptId });
      const res = await generateStreamRoute.POST(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/event-stream');
      expect(res.headers.get('X-Accel-Buffering')).toBe('no');
      expect(res.headers.get('Cache-Control')).toBe('no-cache');
    });
  });
});

describe('API: Generation History', () => {
  describe('GET /api/generate/history', () => {
    it('should reject request without token', async () => {
      const req = makeRequest('GET', '/api/generate/history');
      const res = await generateHistoryRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const req = makeAuthorizedRequest('GET', '/api/generate/history', 'invalid_token_xyz');
      const res = await generateHistoryRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });

    it('should return empty list when user has no generations', async () => {
      const token = await registerUser(`hist1_${Date.now()}@example.com`, `hist1_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/generate/history', token);
      const res = await generateHistoryRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data.runs)).toBe(true);
      expect(json.data.runs.length).toBe(0);
      expect(res.status).toBe(200);
    });

    it('should return generations for authenticated user', async () => {
      const token = await registerUser(`hist2_${Date.now()}@example.com`, `hist2_${Date.now()}`);
      const promptId = await createPrompt(token, `hist-test-prompt-${Date.now()}`);
      await createGeneration(token, promptId); // creates one generation run
      const req = makeAuthorizedRequest('GET', '/api/generate/history', token);
      const res = await generateHistoryRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data.runs)).toBe(true);
      expect(json.data.runs.length).toBeGreaterThan(0);
      expect(res.status).toBe(200);
    });

    it('should support limit and offset query params', async () => {
      const token = await registerUser(`hist3_${Date.now()}@example.com`, `hist3_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/generate/history?limit=5&offset=0', token);
      const res = await generateHistoryRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.limit).toBe(5);
      expect(json.data.offset).toBe(0);
    });

    it('should fall back to safe defaults for invalid limit/offset', async () => {
      const token = await registerUser(`hist4_${Date.now()}@example.com`, `hist4_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/generate/history?limit=-1&offset=abc', token);
      const res = await generateHistoryRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.limit).toBe(20); // safe default
      expect(json.data.offset).toBe(0); // safe default
    });

    it('should cap limit at 100', async () => {
      const token = await registerUser(`hist5_${Date.now()}@example.com`, `hist5_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/generate/history?limit=9999', token);
      const res = await generateHistoryRoute.GET(req);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.limit).toBe(100);
    });

    it('should match GET /api/generations for same user', async () => {
      const token = await registerUser(`hist6_${Date.now()}@example.com`, `hist6_${Date.now()}`);
      const promptId = await createPrompt(token, `hist-test-prompt-match-${Date.now()}`);
      await createGeneration(token, promptId);

      const resHistory = await generateHistoryRoute.GET(makeAuthorizedRequest('GET', '/api/generate/history', token));
      const resGenerations = await generationsRoute.GET(makeAuthorizedRequest('GET', '/api/generations', token));

      const jsonHistory = await resHistory.json();
      const jsonGenerations = await resGenerations.json();

      expect(jsonHistory.ok).toBe(true);
      expect(jsonGenerations.ok).toBe(true);
      expect(jsonHistory.data.runs.length).toBe(jsonGenerations.data.runs.length);
    });
  });
});

describe('API: Generation By ID', () => {
  describe('GET /api/generate/:id', () => {
    it('should reject request without token', async () => {
      const req = makeRequest('GET', '/api/generate/some-run-id');
      const res = await generateIdRoute.GET(req, { params: { id: 'some-run-id' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent run id', async () => {
      const token = await registerUser(`id1_${Date.now()}@example.com`, `id1_${Date.now()}`);
      const req = makeAuthorizedRequest('GET', '/api/generate/non-existent-id', token);
      const res = await generateIdRoute.GET(req, { params: { id: 'non-existent-id' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(404);
    });

    it('should return run for valid id owned by user', async () => {
      const token = await registerUser(`id2_${Date.now()}@example.com`, `id2_${Date.now()}`);
      const promptId = await createPrompt(token, `id-test-prompt-${Date.now()}`);
      const runId = await createGeneration(token, promptId);

      const req = makeAuthorizedRequest('GET', `/api/generate/${runId}`, token);
      const res = await generateIdRoute.GET(req, { params: { id: runId } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.run).toBeDefined();
      expect(json.data.run.id).toBe(runId);
      expect(res.status).toBe(200);
    });

    it('should return 403 for run owned by another user', async () => {
      const token1 = await registerUser(`id3a_${Date.now()}@example.com`, `id3a_${Date.now()}`);
      const token2 = await registerUser(`id3b_${Date.now()}@example.com`, `id3b_${Date.now()}`);
      const promptId = await createPrompt(token1, `id-test-prompt-cross-${Date.now()}`);
      const runId = await createGeneration(token1, promptId);

      // token2 trying to access token1's run
      const req = makeAuthorizedRequest('GET', `/api/generate/${runId}`, token2);
      const res = await generateIdRoute.GET(req, { params: { id: runId } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    it('should include prompt and outputs in run', async () => {
      const token = await registerUser(`id4_${Date.now()}@example.com`, `id4_${Date.now()}`);
      const promptId = await createPrompt(token, `id-test-prompt-include-${Date.now()}`);
      const runId = await createGeneration(token, promptId);

      const req = makeAuthorizedRequest('GET', `/api/generate/${runId}`, token);
      const res = await generateIdRoute.GET(req, { params: { id: runId } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.run.prompt).toBeDefined();
      expect(Array.isArray(json.data.run.outputs)).toBe(true);
    });
  });

  describe('POST /api/generate/:id/cancel', () => {
    it('should reject request without token', async () => {
      const req = makeRequest('POST', '/api/generate/some-run-id/cancel');
      const res = await generateIdRoute.POST(req, { params: { id: 'some-run-id' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent run id', async () => {
      const token = await registerUser(`cancel1_${Date.now()}@example.com`, `cancel1_${Date.now()}`);
      const req = makeAuthorizedRequest('POST', '/api/generate/non-existent-id/cancel', token);
      const res = await generateIdRoute.POST(req, { params: { id: 'non-existent-id' } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(404);
    });

    it('should return 403 when cancelling another user run', async () => {
      const token1 = await registerUser(`cancel2a_${Date.now()}@example.com`, `cancel2a_${Date.now()}`);
      const token2 = await registerUser(`cancel2b_${Date.now()}@example.com`, `cancel2b_${Date.now()}`);
      const promptId = await createPrompt(token1, `cancel-cross-${Date.now()}`);
      const runId = await createGeneration(token1, promptId);

      const req = makeAuthorizedRequest('POST', `/api/generate/${runId}/cancel`, token2);
      const res = await generateIdRoute.POST(req, { params: { id: runId } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    it('should cancel a queued run successfully', async () => {
      const token = await registerUser(`cancel3_${Date.now()}@example.com`, `cancel3_${Date.now()}`);
      const promptId = await createPrompt(token, `cancel-queued-${Date.now()}`);
      const runId = await createGeneration(token, promptId);

      // Update run status to 'queued' to test cancellation from queued state
      await import('@/lib/prisma').then(prisma => prisma.default.generationRun.update({
        where: { id: runId },
        data: { status: 'queued' },
      }));

      // Cancel the run
      const cancelReq = makeAuthorizedRequest('POST', `/api/generate/${runId}/cancel`, token);
      const cancelRes = await generateIdRoute.POST(cancelReq, { params: { id: runId } });
      const cancelJson = await cancelRes.json();
      expect(cancelJson.ok).toBe(true);
      expect(cancelJson.data.message).toBe('Generation cancelled');
      expect(cancelJson.data.run.status).toBe('failed');
      expect(cancelJson.data.run.error).toBe('Cancelled by user');
    });

    it('should return 409 when trying to cancel an already completed run', async () => {
      const token = await registerUser(`cancel4_${Date.now()}@example.com`, `cancel4_${Date.now()}`);
      const promptId = await createPrompt(token, `cancel-done-${Date.now()}`);
      const runId = await createGeneration(token, promptId);

      // Simulate run being completed by updating status in DB
      await import('@/lib/prisma').then(prisma => prisma.default.generationRun.update({
        where: { id: runId },
        data: { status: 'succeeded' },
      }));

      const req = makeAuthorizedRequest('POST', `/api/generate/${runId}/cancel`, token);
      const res = await generateIdRoute.POST(req, { params: { id: runId } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(409);
    });

    it('should return 409 when trying to cancel an already failed run', async () => {
      const token = await registerUser(`cancel5_${Date.now()}@example.com`, `cancel5_${Date.now()}`);
      const promptId = await createPrompt(token, `cancel-failed-${Date.now()}`);
      const runId = await createGeneration(token, promptId);

      await import('@/lib/prisma').then(prisma => prisma.default.generationRun.update({
        where: { id: runId },
        data: { status: 'failed' },
      }));

      const req = makeAuthorizedRequest('POST', `/api/generate/${runId}/cancel`, token);
      const res = await generateIdRoute.POST(req, { params: { id: runId } });
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(res.status).toBe(409);
    });

    it('should allow cancelling a running run', async () => {
      const token = await registerUser(`cancel6_${Date.now()}@example.com`, `cancel6_${Date.now()}`);
      const promptId = await createPrompt(token, `cancel-running-${Date.now()}`);
      const runId = await createGeneration(token, promptId);

      // Simulate run being in running state
      await import('@/lib/prisma').then(prisma => prisma.default.generationRun.update({
        where: { id: runId },
        data: { status: 'running' },
      }));

      const req = makeAuthorizedRequest('POST', `/api/generate/${runId}/cancel`, token);
      const res = await generateIdRoute.POST(req, { params: { id: runId } });
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(res.status).toBe(200);
      expect(json.data.run.status).toBe('failed');
    });
  });
});