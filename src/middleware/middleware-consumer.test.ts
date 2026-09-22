import { describe, test, expect } from 'bun:test';
import 'reflect-metadata';
import { MiddlewareConsumerImpl } from './middleware-consumer';
import { Controller } from '../decorators/controller.decorator';

describe('MiddlewareConsumerImpl', () => {
  test('apply().forRoutes() records configuration', () => {
    const consumer = new MiddlewareConsumerImpl();
    const mw = (req: any, next: any) => next();
    consumer.apply(mw).forRoutes('/users', { path: '/admin', method: 'GET' });

    const configs = consumer.getConfigurations();
    expect(configs).toHaveLength(1);
    expect(configs[0].middlewares).toContain(mw);
    expect(configs[0].forRoutes).toEqual([
      { path: '/users' },
      { path: '/admin', method: 'GET' },
    ]);
  });

  test('apply().exclude() records exclude patterns before forRoutes', () => {
    const consumer = new MiddlewareConsumerImpl();
    const mw = (req: any, next: any) => next();
    consumer.apply(mw).exclude('/health').forRoutes('*');

    const configs = consumer.getConfigurations();
    expect(configs[0].excludeRoutes).toEqual([{ path: '/health' }]);
    expect(configs[0].forRoutes).toEqual([{ path: '*' }]);
  });

  test('chaining multiple apply() calls creates separate configurations', () => {
    const consumer = new MiddlewareConsumerImpl();
    const mwA = (req: any, next: any) => next();
    const mwB = (req: any, next: any) => next();

    consumer.apply(mwA).forRoutes('/a');
    consumer.apply(mwB).forRoutes('/b');

    const configs = consumer.getConfigurations();
    expect(configs).toHaveLength(2);
    expect(configs[0].forRoutes[0].path).toBe('/a');
    expect(configs[1].forRoutes[0].path).toBe('/b');
  });

  test('array of routes is flattened', () => {
    const consumer = new MiddlewareConsumerImpl();
    const mw = (req: any, next: any) => next();
    consumer.apply(mw).forRoutes('/x', ['/y', 'POST'] as any);
    const configs = consumer.getConfigurations();
    // nested arrays are flattened, each element normalized independently
    expect(configs[0].forRoutes).toEqual([
      { path: '/x' },
      { path: '/y' },
      { path: 'POST' },
    ]);
  });
});
