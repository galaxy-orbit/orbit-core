import { describe, test, expect } from 'bun:test';
import { VersioningManager, Version, VERSION_METADATA } from './versioning';

const req = (path: string, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { headers });

describe('VersioningManager', () => {
  test('extracts version from URI path', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'uri' });
    expect(vm.extractVersion(req('/v1/users'))).toBe('1');
    expect(vm.extractVersion(req('/v2.1/users'))).toBe('2.1');
  });

  test('returns null when no version segment in URI', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'uri' });
    expect(vm.extractVersion(req('/users'))).toBeNull();
  });

  test('prefix: false matches bare numeric segments', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'uri', prefix: false });
    expect(vm.extractVersion(req('/1/users'))).toBe('1');
    expect(vm.extractVersion(req('/users'))).toBeNull();
  });

  test('custom prefix', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'uri', prefix: 'api-v' });
    expect(vm.extractVersion(req('/api-v3/users'))).toBe('3');
  });

  test('header-based versioning', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'header' });
    expect(vm.extractVersion(req('/users', { 'X-API-Version': '2' }))).toBe('2');
    expect(vm.extractVersion(req('/users'))).toBeNull();
  });

  test('media-type versioning', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'media' });
    expect(vm.extractVersion(req('/users', { Accept: 'application/json; version=2' }))).toBe('2');
  });

  test('extractVersion returns null when not configured', () => {
    expect(new VersioningManager().extractVersion(req('/v1/users'))).toBeNull();
  });

  test('matchVersion: neutral and undefined handlers always match', () => {
    const vm = new VersioningManager();
    expect(vm.matchVersion('1', undefined)).toBe(true);
  });

  test('matchVersion: request falls back to defaultVersion', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'uri', defaultVersion: '1' });
    expect(vm.matchVersion(null, '1')).toBe(true);
  });

  test('matchVersion: strict equality on arrays', () => {
    const vm = new VersioningManager();
    expect(vm.matchVersion(['1', '2'], ['2', '3'])).toBe(true);
    expect(vm.matchVersion('1', '2')).toBe(false);
  });

  test('buildVersionedPath only applies to uri type', () => {
    const vm = new VersioningManager();
    vm.configure({ type: 'header' });
    expect(vm.buildVersionedPath('/users', '1')).toBe('/users');

    vm.configure({ type: 'uri' });
    expect(vm.buildVersionedPath('/users', '1')).toBe('/v1/users');
    expect(vm.buildVersionedPath('users', '1')).toBe('/v1/users');
  });
});

describe('@Version decorator', () => {
  test('stores version metadata on handler', () => {
    class C {
      @Version('2')
      handler() {}
    }
    expect(Reflect.getMetadata(VERSION_METADATA, C.prototype.handler)).toBe('2');
  });
});
