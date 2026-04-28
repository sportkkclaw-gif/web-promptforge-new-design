// Unit test: API response helpers
// tests/unit/api.test.ts

import { ok, error, parseJSON } from '../../lib/api';

describe('API Helpers', () => {
  it('ok() returns correct structure', async () => {
    const response = ok({ foo: 'bar' });
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ foo: 'bar' });
    expect(body.error).toBe(null);
  });

  it('error() returns correct structure with status', async () => {
    const response = error('Not found', 404);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.data).toBe(null);
    expect(body.error).toBe('Not found');
    expect(response.status).toBe(404);
  });

  it('parseJSON returns parsed object for valid JSON', () => {
    const result = parseJSON('{"foo":"bar"}');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('parseJSON returns null for invalid JSON', () => {
    const result = parseJSON('not json');
    expect(result).toBe(null);
  });
});
