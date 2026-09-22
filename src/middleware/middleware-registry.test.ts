import { describe, test, expect } from 'bun:test';
import { MiddlewareRegistry } from './middleware-registry';
import { Container } from '../container/container';

const fn = (req: any, next: any) => next();

describe('MiddlewareRegistry', () => {
  test('registerGlobal defaults to wildcard routes', () => {
    const registry = new MiddlewareRegistry(new Container());
    registry.registerGlobal(fn);
    const globals = (registry as any).globalMiddlewares;
    expect(globals).toHaveLength(1);
    expect(globals[0].forRoutes).toEqual([{ path: '*' }]);
  });

  test('registerGlobal with specific routes', () => {
    const registry = new MiddlewareRegistry(new Container());
    registry.registerGlobal(fn, [{ path: '/admin' }], [{ path: '/admin/login' }]);
    const globals = (registry as any).globalMiddlewares;
    expect(globals[0].forRoutes).toEqual([{ path: '/admin' }]);
    expect(globals[0].excludeRoutes).toEqual([{ path: '/admin/login' }]);
  });

  test('registerForModule registers middleware classes in the container', () => {
    const container = new Container();
    const registry = new MiddlewareRegistry(container);

    class AuthMiddleware {
      use(_req: any, next: any) { return next(); }
    }

    registry.registerForModule(class {}, [{
      middlewares: [AuthMiddleware],
      forRoutes: [{ path: '*' }],
      excludeRoutes: [],
    }]);

    expect(container.has(AuthMiddleware)).toBe(true);
  });

  test('registerForModule with plain functions does not touch container', () => {
    const container = new Container();
    const registry = new MiddlewareRegistry(container);
    const plainFn = (req: any, next: any) => next();

    registry.registerForModule(class M {}, [{
      middlewares: [plainFn],
      forRoutes: [{ path: '*' }],
      excludeRoutes: [],
    }]);

    expect((registry as any).moduleMiddlewares.size).toBe(1);
  });
});
