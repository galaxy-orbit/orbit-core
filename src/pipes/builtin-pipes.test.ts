import { describe, test, expect } from 'bun:test';
import {
  ParseIntPipe,
  ParseFloatPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  DefaultValuePipe,
  TrimPipe,
  ParseUUIDPipe,
  ParseEnumPipe,
} from './builtin.pipes';
import { BadRequestException } from '../exceptions/http.exception';

const meta = (data?: string) => ({ type: 'query' as const, metatype: String, data });

describe('ParseIntPipe', () => {
  test('parses numeric strings', () => {
    expect(new ParseIntPipe().transform('42', meta('id'))).toBe(42);
    expect(new ParseIntPipe().transform('-7', meta())).toBe(-7);
  });

  test('throws BadRequestException with field name on invalid input', () => {
    expect(() => new ParseIntPipe().transform('abc', meta('page'))).toThrow(BadRequestException);
    expect(() => new ParseIntPipe().transform('abc', meta('page'))).toThrow(/page/);
  });

  test('rejects empty string', () => {
    expect(() => new ParseIntPipe().transform('', meta())).toThrow(BadRequestException);
  });
});

describe('ParseFloatPipe', () => {
  test('parses float strings', () => {
    expect(new ParseFloatPipe().transform('3.14', meta())).toBeCloseTo(3.14);
    expect(new ParseFloatPipe().transform('1e3', meta())).toBe(1000);
  });

  test('throws on non-numeric input', () => {
    expect(() => new ParseFloatPipe().transform('xyz', meta('rate'))).toThrow(/rate/);
  });
});

describe('ParseBoolPipe', () => {
  test('accepts true/false strings only', () => {
    expect(new ParseBoolPipe().transform('true', meta())).toBe(true);
    expect(new ParseBoolPipe().transform('false', meta())).toBe(false);
  });

  test('throws on anything else (strict contract)', () => {
    expect(() => new ParseBoolPipe().transform('1', meta())).toThrow(BadRequestException);
    expect(() => new ParseBoolPipe().transform('yes', meta())).toThrow(BadRequestException);
    expect(() => new ParseBoolPipe().transform('TRUE', meta())).toThrow(BadRequestException);
  });
});

describe('ParseArrayPipe', () => {
  test('splits on comma and trims items by default', () => {
    expect(new ParseArrayPipe().transform(' a , b ,c', meta())).toEqual(['a', 'b', 'c']);
  });

  test('supports custom separators via constructor', () => {
    expect(new ParseArrayPipe('|').transform('a|b|c', meta())).toEqual(['a', 'b', 'c']);
  });

  test('returns empty array for empty input', () => {
    expect(new ParseArrayPipe().transform('', meta())).toEqual([]);
  });
});

describe('DefaultValuePipe', () => {
  test('returns default on undefined and null', () => {
    const pipe = new DefaultValuePipe<string>('fallback');
    expect(pipe.transform(undefined, meta())).toBe('fallback');
    expect(pipe.transform(null as any, meta())).toBe('fallback');
  });

  test('passes real values through (including falsy)', () => {
    const pipe = new DefaultValuePipe(99);
    expect(pipe.transform(0 as any, meta())).toBe(0);
    expect(pipe.transform(5, meta())).toBe(5);

    const anyPipe = new DefaultValuePipe<any>('fallback');
    expect(anyPipe.transform('' as any, meta())).toBe('');
    expect(anyPipe.transform(null as any, meta())).toBe('fallback');
  });
});

describe('TrimPipe', () => {
  test('trims strings', () => {
    expect(new TrimPipe().transform('  hello  ', meta())).toBe('hello');
  });

  test('leaves non-strings untouched', () => {
    expect(new TrimPipe().transform(123 as any, meta()) as any).toBe(123);
    expect(new TrimPipe().transform(undefined as any, meta())).toBeUndefined();
  });
});

describe('ParseUUIDPipe', () => {
  test('accepts valid uuid v4 and passes it through', () => {
    const pipe = new ParseUUIDPipe();
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(uuid, meta('id'))).toBe(uuid);
  });

  test('accepts other uuid versions', () => {
    const pipe = new ParseUUIDPipe();
    expect(pipe.transform('a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6', meta())).toBe(
      'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6',
    );
  });

  test('throws on malformed uuid with field name', () => {
    const pipe = new ParseUUIDPipe();
    expect(() => pipe.transform('not-a-uuid', meta('userId'))).toThrow(/userId/);
    expect(() => pipe.transform('550e8400-e29b-01d4-a716-446655440000', meta())).toThrow(BadRequestException);
  });
});

describe('ParseEnumPipe', () => {
  enum Role { Admin = 'admin', User = 'user' }

  test('accepts enum values', () => {
    const pipe = new ParseEnumPipe(Role);
    expect(pipe.transform('admin', meta('role'))).toBe('admin');
    expect(pipe.transform('user', meta('role'))).toBe('user');
  });

  test('throws on values outside the enum', () => {
    const pipe = new ParseEnumPipe(Role);
    expect(() => pipe.transform('superadmin', meta('role'))).toThrow(BadRequestException);
  });
});
