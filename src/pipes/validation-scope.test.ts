import { describe, test, expect } from 'bun:test';
import { ValidationPipe, ZodValidationPipe, type ArgumentMetadata, type ZodSchema } from './validation.pipe';

/** Minimal Zod-shaped schema: a member body must carry a name of at least two characters. */
const memberSchema: ZodSchema = {
  parse: (data) => data,
  safeParse: (data: any) => (typeof data?.name === 'string' && data.name.length >= 2
    ? { success: true, data }
    : { success: false, error: { issues: [{ path: ['name'], message: 'Too short' }] } }),
};

const metadata = (type: ArgumentMetadata['type'], data?: string): ArgumentMetadata => ({ type, data, metatype: undefined } as ArgumentMetadata);

describe('validation pipe scope', () => {
  // @UsePipes() runs the pipe for EVERY parameter of the handler, so a body schema used to reject
  // @Param('id') / @Query() values too: the agent-visible symptom was a 400 on a valid request, which
  // reads exactly like "the pipe is broken" and sends it to the declarations to re-derive the wiring.
  test('an unscoped Zod pipe still validates every argument', () => {
    const pipe = new ZodValidationPipe(memberSchema);
    expect(() => pipe.transform({ name: 'An' }, metadata('body'))).not.toThrow();
    expect(() => pipe.transform('7', metadata('param', 'id'))).toThrow(/Validation failed/);
  });

  test('a body-scoped Zod pipe leaves params and query alone', () => {
    const pipe = new ZodValidationPipe(memberSchema, 'body');
    expect(pipe.transform('7', metadata('param', 'id'))).toBe('7');
    expect(pipe.transform({ page: '2' }, metadata('query'))).toEqual({ page: '2' });
    expect(pipe.transform({ name: 'An' }, metadata('body'))).toEqual({ name: 'An' });
    expect(() => pipe.transform({ name: 'A' }, metadata('body'))).toThrow(/Too short/);
  });

  test('the scope option accepts several argument kinds', async () => {
    const pipe = new ValidationPipe({ schema: memberSchema, scope: ['body', 'query'] });
    expect(await pipe.transform('7', metadata('param', 'id'))).toBe('7');
    await expect(pipe.transform({ name: 'A' }, metadata('body'))).rejects.toThrow();
    await expect(pipe.transform({ name: 'A' }, metadata('query'))).rejects.toThrow();
  });

  test('an unscoped ValidationPipe keeps validating the body', async () => {
    const pipe = new ValidationPipe({ schema: memberSchema });
    expect(await pipe.transform({ name: 'An' }, metadata('body'))).toEqual({ name: 'An' });
    await expect(pipe.transform({ name: 'A' }, metadata('body'))).rejects.toThrow(/name: Too short/);
  });

  test('a custom argument kind is only validated when it is in scope', async () => {
    const pipe = new ValidationPipe({ schema: memberSchema, scope: 'custom' });
    await expect(pipe.transform({ name: 'A' }, metadata('custom'))).rejects.toThrow();
    expect(await pipe.transform({ name: 'A' }, metadata('body'))).toEqual({ name: 'A' });
  });
});
