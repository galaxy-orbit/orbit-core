import { describe, test, expect, afterAll } from 'bun:test';
import { ConfigService } from './config.service';

const ENV_KEY = 'ORBIT_CONFIG_SERVICE_TEST_TOKEN';
const ENV_KEY_2 = 'ORBIT_CONFIG_SERVICE_TEST_NUMBER';

afterAll(() => {
  delete process.env[ENV_KEY];
  delete process.env[ENV_KEY_2];
});

describe('ConfigService — constructor sources', () => {
  test('flattens nested config objects with dot notation', () => {
    const svc = new ConfigService({
      app: { port: 3000, name: 'orbit' },
      db: { host: 'localhost', credentials: { user: 'admin' } },
    });

    expect(svc.get<number>('app.port')).toBe(3000);
    expect(svc.get<string>('app.name')).toBe('orbit');
    expect(svc.get<string>('db.credentials.user')).toBe('admin');
  });

  test('does not flatten arrays (stored as-is)', () => {
    const svc = new ConfigService({ features: ['a', 'b'] });
    expect(svc.get<string[]>('features')).toEqual(['a', 'b']);
  });

  test('loads string env vars into config', () => {
    process.env[ENV_KEY] = 'from-env';
    const svc = new ConfigService({});
    expect(svc.get<string>(ENV_KEY)).toBe('from-env');
  });
});

describe('ConfigService — get()', () => {
  test('returns undefined for missing keys without default', () => {
    const svc = new ConfigService({});
    expect(svc.get('no.such.key')).toBeUndefined();
  });

  test('returns default for missing keys', () => {
    const svc = new ConfigService({});
    expect(svc.get('no.such.key', 'fallback')).toBe('fallback');
  });

  test('real values beat defaults', () => {
    const svc = new ConfigService({ app: { port: 3000 } });
    expect(svc.get('app.port', 9999)).toBe(3000);
  });

  test('falls back to UPPERCASE env var name with underscores', () => {
    process.env[ENV_KEY_2] = '42';
    const svc = new ConfigService({});
    // 'orbit.config.service.test.number' -> 'ORBIT_CONFIG_SERVICE_TEST_NUMBER'
    expect(svc.get<string>('orbit.config.service.test.number')).toBe('42');
  });

  test('explicit config beats env fallback', () => {
    process.env[ENV_KEY] = 'from-env';
    const svc = new ConfigService({ [ENV_KEY]: 'from-config' });
    expect(svc.get<string>(ENV_KEY)).toBe('from-config');
  });
});

describe('ConfigService — getOrThrow', () => {
  test('returns existing values', () => {
    const svc = new ConfigService({ app: { port: 3000 } });
    expect(svc.getOrThrow<number>('app.port')).toBe(3000);
  });

  test('throws a descriptive error for missing keys', () => {
    const svc = new ConfigService({});
    expect(() => svc.getOrThrow('missing.key')).toThrow(
      'Configuration key "missing.key" does not exist',
    );
  });
});

describe('ConfigService — set and cache', () => {
  test('set overrides existing values', () => {
    const svc = new ConfigService({ app: { port: 3000 } });
    svc.set('app.port', 8080);
    expect(svc.get<number>('app.port')).toBe(8080);
  });

  test('set adds new values retrievable via get', () => {
    const svc = new ConfigService({});
    svc.set('runtime.flag', true);
    expect(svc.get<boolean>('runtime.flag')).toBe(true);
  });

  test('cache returns consistent values when enabled', () => {
    const svc = new ConfigService({ app: { mode: 'prod' } });
    svc.setEnableCache(true);

    expect(svc.get<string>('app.mode')).toBe('prod');

    // set() invalidates the cached entry for that key
    svc.set('app.mode', 'dev');
    expect(svc.get<string>('app.mode')).toBe('dev');
  });

  test('disabling cache clears stored cache entries', () => {
    const svc = new ConfigService({ app: { mode: 'prod' } });
    svc.setEnableCache(true);
    expect(svc.get<string>('app.mode')).toBe('prod');

    svc.setEnableCache(false);
    svc.set('app.mode', 'dev');
    expect(svc.get<string>('app.mode')).toBe('dev');
  });
});
