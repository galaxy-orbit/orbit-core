import { describe, test, expect, beforeAll } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StaticMiddleware } from './static.middleware';

let staticDir: string;

beforeAll(() => {
  staticDir = mkdtempSync(`${tmpdir()}/orbit-static-`);
  writeFileSync(join(staticDir, 'index.html'), '<h1>hello</h1>');
  writeFileSync(join(staticDir, 'app.js'), 'console.log("x")');
  writeFileSync(join(staticDir, 'style.css'), 'body{}');
  writeFileSync(join(staticDir, '.secret'), 'hidden');
  mkdirSync(join(staticDir, 'sub'));
  writeFileSync(join(staticDir, 'nested.txt'), 'nested content');
});

const PASSTHROUGH = 599; // valid status sentinel for "next was called"
const get = (mw: StaticMiddleware, path: string) =>
  mw.use(new Request(`http://localhost${path}`), async () => new Response('next-called', { status: PASSTHROUGH }));

describe('StaticMiddleware', () => {
  test('serves existing files with correct MIME type', async () => {
    const mw = new StaticMiddleware({ root: staticDir });
    const res = await get(mw, '/index.html');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(await res.text()).toBe('<h1>hello</h1>');
  });

  test('non-GET/HEAD requests pass through', async () => {
    const mw = new StaticMiddleware({ root: staticDir });
    const res = await mw.use(new Request('http://x/index.html', { method: 'POST' }), async () => new Response('next', { status: PASSTHROUGH }));
    expect(res.status).toBe(PASSTHROUGH);
  });

  test('missing files fall through to next', async () => {
    const mw = new StaticMiddleware({ root: staticDir });
    const res = await get(mw, '/does-not-exist.txt');
    expect(res.status).toBe(PASSTHROUGH);
  });

  test('path traversal (dot segments) is blocked', async () => {
    const mw = new StaticMiddleware({ root: staticDir });
    const res = await get(mw, '/../../etc/passwd');
    expect(res.status).toBe(PASSTHROUGH); // falls through, never serves outside root
  });

  test('dotfiles: deny returns 403', async () => {
    const mw = new StaticMiddleware({ root: staticDir, dotFiles: 'deny' });
    const res = await get(mw, '/.secret');
    expect(res.status).toBe(403);
  });

  test('dotfiles: ignore passes through', async () => {
    const mw = new StaticMiddleware({ root: staticDir, dotFiles: 'ignore' });
    const res = await get(mw, '/.secret');
    expect(res.status).toBe(PASSTHROUGH);
  });

  test('prefix gating: only serves paths under the prefix', async () => {
    const mw = new StaticMiddleware({ root: staticDir, prefix: '/static' });
    // wrong prefix -> fall through
    const res1 = await get(mw, '/index.html');
    expect(res1.status).toBe(PASSTHROUGH);
    // correct prefix -> serves
    const res2 = await get(mw, '/static/index.html');
    expect(res2.status).toBe(200);
  });

  test('nested directories resolve', async () => {
    const mw = new StaticMiddleware({ root: staticDir });
    const res = await get(mw, '/nested.txt');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('nested content');
  });

  test('caching: second request hits cache with X-Cache header when debug enabled', async () => {
    const mw = new StaticMiddleware({ root: staticDir, cacheDebug: true });
    const r1 = await get(mw, '/app.js');
    expect(r1.headers.get('X-Cache')).toBe('MISS');
    const r2 = await get(mw, '/app.js');
    expect(r2.headers.get('X-Cache')).toBe('HIT');
  });

  test('ETag/Last-Modified headers set', async () => {
    const mw = new StaticMiddleware({ root: staticDir });
    const res = await get(mw, '/index.html');
    expect(res.headers.get('ETag')).toBeDefined();
  });
});
