import type { Type } from '../interfaces/type.interface';
import type { Middleware, MiddlewareClass } from './middleware.interface';

export interface RouteInfo {
  path: string;
  method?: string | string[];
}

export type RouteInfoOrController = string | RouteInfo | Type | (string | RouteInfo | Type)[];

export interface MiddlewareConfigProxy {
  forRoutes(...routes: RouteInfoOrController[]): MiddlewareConsumer;
  exclude(...routes: RouteInfoOrController[]): MiddlewareConfigProxy;
}

export interface MiddlewareConsumer {
  apply(...middlewares: Middleware[]): MiddlewareConfigProxy;
}

export interface MiddlewareConfiguration {
  middlewares: Middleware[];
  forRoutes: RouteInfo[];
  excludeRoutes: RouteInfo[];
}

export class MiddlewareConfigProxyImpl implements MiddlewareConfigProxy {
  private excludePatterns: RouteInfo[] = [];

  constructor(
    private readonly consumer: MiddlewareConsumerImpl,
    private readonly middlewares: Middleware[]
  ) {}

  exclude(...routes: RouteInfoOrController[]): MiddlewareConfigProxy {
    this.excludePatterns.push(...this.normalizeRoutes(routes));
    return this;
  }

  forRoutes(...routes: RouteInfoOrController[]): MiddlewareConsumer {
    const config: MiddlewareConfiguration = {
      middlewares: this.middlewares,
      forRoutes: this.normalizeRoutes(routes),
      excludeRoutes: this.excludePatterns,
    };
    this.consumer.addConfiguration(config);
    return this.consumer;
  }

  private normalizeRoutes(routes: RouteInfoOrController[]): RouteInfo[] {
    const result: RouteInfo[] = [];
    
    for (const route of routes) {
      if (typeof route === 'string') {
        result.push({ path: route });
      } else if (typeof route === 'function') {
        const controllerPath = Reflect.getMetadata('orbit:controller:path', route) || '';
        result.push({ path: controllerPath });
      } else if (Array.isArray(route)) {
        result.push(...this.normalizeRoutes(route));
      } else {
        result.push(route);
      }
    }
    
    return result;
  }
}

export class MiddlewareConsumerImpl implements MiddlewareConsumer {
  private configurations: MiddlewareConfiguration[] = [];

  apply(...middlewares: Middleware[]): MiddlewareConfigProxy {
    return new MiddlewareConfigProxyImpl(this, middlewares);
  }

  addConfiguration(config: MiddlewareConfiguration): void {
    this.configurations.push(config);
  }

  getConfigurations(): MiddlewareConfiguration[] {
    return this.configurations;
  }
}

export interface NestModule {
  configure(consumer: MiddlewareConsumer): void | Promise<void>;
}

export function hasConfigureMethod(module: any): module is NestModule {
  return module && typeof module.configure === 'function';
}
