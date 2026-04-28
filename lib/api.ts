// API Response helpers

export function ok<T>(data: T, status = 200) {
  return Response.json({ ok: true, data, error: null }, { status });
}

export function error(message: string, status = 400) {
  return Response.json({ ok: false, data: null, error: message }, { status });
}

export function parseJSON(body: string) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}
