import { describe, test, expect } from 'bun:test';
import { CorsMiddleware } from './cors.middleware';
import { TimeoutMiddleware, RequestTimeoutError, createTimeoutHandler } from './timeout.middleware';

const req = (url = 'http://localhost/api', init: RequestInit = {}) => new Request(url, init);
const ok = async () => new Response('ok');

describe('CorsMiddleware', () => {
  test('wildcard origin by default', async () => {
    const cors = new CorsMiddleware();
    const res = await cors.use(req('http://localhost/api', { headers: { origin: 'http://evil.com' } }), ok);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('reflects allowed origin from list', async () => {
    const cors = new CorsMiddleware({ origin: ['http://a.com', 'http://b.com'] });
    const res = await cors.use(req('http://localhost', { headers: { origin: 'http://b.com' } }), ok);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://b.com');
  });

  test('omits origin header for disallowed origin', async () => {
    const cors = new CorsMiddleware({ origin: ['http://a.com'] });
    const res = await cors.use(req('http://localhost', { headers: { origin: 'http://evil.com' } }), ok);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  test('credentials header only when enabled', async () => {
    const withCreds = new CorsMiddleware({ origin: 'http://a.com', credentials: true });
    const without = new CorsMiddleware();
    const r1 = await withCreds.use(req('http://x', { headers: { origin: 'http://a.com' } }), ok);
    const r2 = await without.use(req('http://x', { headers: { origin: 'http://a.com' } }), ok);
    expect(r1.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(r2.headers.get('Access-Control-Allow-Credentials')).toBeNull();
  });

  test('OPTIONS returns 204 with cors headers without calling next', async () => {
    let called = false;
    const cors = new CorsMiddleware({ maxAge: 86400 });
    const res = await cors.use(req('http://x', { method: 'OPTIONS', headers: { origin: 'http://a.com' } }), async () => {
      called = true;
      return ok();
    });
    expect(called).toBe(false);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  test('preflightContinue: OPTIONS calls next and appends headers', async () => {
    const cors = new CorsMiddleware({ preflightContinue: true });
    const res = await cors.use(req('http://x', { method: 'OPTIONS' }), ok);
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('function origin resolver', async () => {
    const cors = new CorsMiddleware({ origin: (o: string | null) => (o ?? '').endsWith('.trusted.com') ? o : null } as any);
    const res = await cors.use(req('http://x', { headers: { origin: 'http://app.trusted.com' } }), ok);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://app.trusted.com');
  });
});

describe('TimeoutMiddleware', () => {
  test('passes through fast responses', async () => {
    const mw = new TimeoutMiddleware({ timeout: 500 });
    const res = await mw.use(req(), async () => new Response('fast'));
    expect(await res.text()).toBe('fast');
  });

  test('returns 408 when handler exceeds timeout', async () => {
    let onTimeoutElapsed = -1;
    const mw = new TimeoutMiddleware({
      timeout: 30,
      statusCode: 408,
      message: 'Too slow',
      onTimeout: (_req, elapsed) => { onTimeoutElapsed = elapsed; },
    });
    const res = await mw.use(req('http://localhost/slow'), async () => new Promise<Response>(r => setTimeout(() => r(new Response('never')), 500)));
    expect(res.status).toBe(408);
    const body = await res.json();
    expect(body.statusCode).toBe(408);
    expect(body.message).toBe('Too slow');
    expect(onTimeoutElapsed).toBeGreaterThanOrEqual(25);
  });

  test('propagates non-timeout errors', async () => {
    const mw = new TimeoutMiddleware({ timeout: 1000 });
    await expect(mw.use(req(), async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });
});

describe('RequestTimeoutError / createTimeoutHandler', () => {
  test('error captures request context', () => {
    const err = new RequestTimeoutError(req('http://x/users?x=1', { method: 'POST' }), 1234);
    expect(err.path).toBe('/users');
    expect(err.method).toBe('POST');
    expect(err.message).toContain('1234ms');
  });

  test('createTimeoutHandler returns 408 response on timeout', async () => {
    const handler = createTimeoutHandler(30, async () => new Promise<Response>(r => setTimeout(() => r(new Response('late')), 400)));
    const res = await handler(req());
    expect(res.status).toBe(408);
  });

  test('createTimeoutHandler passes through successful responses', async () => {
    const handler = createTimeoutHandler(1000, async () => new Response('ok'));
    const res = await handler(req());
    expect(res.status).toBe(200);
  });
});
