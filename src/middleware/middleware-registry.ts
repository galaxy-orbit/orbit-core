import type { Type } from '../interfaces/type.interface';
import type { Container } from '../container/container';
import type { 
  Middleware, 
  MiddlewareFunction, 
  OrbitMiddleware,
  MiddlewareClass 
} from './middleware.interface';
import type { MiddlewareConfiguration, RouteInfo } from './middleware-consumer';

export interface ResolvedMiddleware {
  fn: MiddlewareFunction;
  forRoutes: RouteInfo[];
  excludeRoutes: RouteInfo[];
}

export class MiddlewareRegistry {
  private globalMiddlewares: ResolvedMiddleware[] = [];
  private moduleMiddlewares: Map<Type, MiddlewareConfiguration[]> = new Map();

  constructor(private container: Container) {}

  registerGlobal(middleware: Middleware, forRoutes?: RouteInfo[], excludeRoutes?: RouteInfo[]): void {
    const fn = this.resolveMiddlewareToFunction(middleware);
    this.globalMiddlewares.push({
      fn,
      forRoutes: forRoutes || [{ path: '*' }],
      excludeRoutes: excludeRoutes || [],
    });
  }

  registerForModule(moduleClass: Type, configurations: MiddlewareConfiguration[]): void {
    for (const config of configurations) {
      for (const middleware of config.middlewares) {
        if (typeof middleware === 'function' && middleware.prototype && 'use' in middleware.prototype) {
          if (!this.container.has(middleware as Type)) {
            this.container.register(middleware as Type);
          }
        }
      }
    }
    
    const existing = this.moduleMiddlewares.get(moduleClass) || [];
    this.moduleMiddlewares.set(moduleClass, [...existing, ...configurations]);
  }

  async getMiddlewaresForRoute(
    path: string, 
    method: string
  ): Promise<MiddlewareFunction[]> {
    const result: MiddlewareFunction[] = [];

    for (const mw of this.globalMiddlewares) {
      if (this.matchesRoute(path, method, mw.forRoutes, mw.excludeRoutes)) {
        result.push(mw.fn);
      }
    }

    for (const [, configs] of this.moduleMiddlewares) {
      for (const config of configs) {
        if (this.matchesRoute(path, method, config.forRoutes, config.excludeRoutes)) {
          for (const middleware of config.middlewares) {
            const fn = await this.resolveMiddlewareToFunctionAsync(middleware);
            result.push(fn);
          }
        }
      }
    }

    return result;
  }

  private matchesRoute(
    pathname: string,
    method: string,
    forRoutes: RouteInfo[],
    excludeRoutes: RouteInfo[]
  ): boolean {
    for (const exclude of excludeRoutes) {
      if (this.matchesSingleRoute(pathname, method, exclude)) {
        return false;
      }
    }

    for (const route of forRoutes) {
      if (this.matchesSingleRoute(pathname, method, route)) {
        return true;
      }
    }

    return false;
  }

  private matchesSingleRoute(pathname: string, method: string, route: RouteInfo): boolean {
    if (route.method) {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      const upperMethods = methods.map(m => m.toUpperCase());
      if (!upperMethods.includes(method.toUpperCase()) && !upperMethods.includes('ALL')) {
        return false;
      }
    }

    return this.matchPath(route.path, pathname);
  }

  private matchPath(pattern: string, pathname: string): boolean {
    if (pattern === '*' || pattern === '(.*)') {
      return true;
    }

    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }

    if (pattern.endsWith('/(.*)')) {
      const prefix = pattern.slice(0, -5);
      return pathname === prefix || pathname.startsWith(prefix + '/');
    }

    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      return pathname === pattern || pathname.startsWith(pattern + '/');
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        continue;
      }

      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }

  private resolveMiddlewareToFunction(middleware: Middleware): MiddlewareFunction {
    if (typeof middleware === 'function') {
      if (middleware.prototype && 'use' in middleware.prototype) {
        const MiddlewareClass = middleware as MiddlewareClass;
        return async (req, next) => {
          let instance: OrbitMiddleware;
          if (this.container.has(MiddlewareClass)) {
            instance = await this.container.resolve(MiddlewareClass);
          } else {
            instance = new MiddlewareClass();
          }
          return instance.use(req, next);
        };
      }
      return middleware as MiddlewareFunction;
    }

    if (typeof middleware === 'object' && 'use' in middleware) {
      return (req, next) => middleware.use(req, next);
    }

    throw new Error('Invalid middleware');
  }

  private async resolveMiddlewareToFunctionAsync(middleware: Middleware): Promise<MiddlewareFunction> {
    return this.resolveMiddlewareToFunction(middleware);
  }
}
