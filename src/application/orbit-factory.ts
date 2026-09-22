import 'reflect-metadata';
import type { Type } from '../interfaces/type.interface';
import type { DynamicModule } from '../interfaces/module.interface';
import { Container } from '../container/container';
import { ModuleScanner, ModuleCompiler } from '../module/module-scanner';
import { RouteExplorer, RequestHandler, type RouteDefinition } from '../router/route-explorer';
import type { 
  Middleware, 
  MiddlewareFunction, 
  GalaxyMiddleware, 
  CorsOptions, 
  StaticServeOptions 
} from '../middleware/middleware.interface';
import type { MiddlewareConfiguration, RouteInfo } from '../middleware/middleware-consumer';
import { CorsMiddleware } from '../middleware/cors.middleware';
import { StaticMiddleware } from '../middleware/static.middleware';
import {
  hasOnModuleInit,
  hasOnModuleDestroy,
  hasOnApplicationBootstrap,
  hasOnApplicationShutdown,
  hasBeforeApplicationShutdown,
} from '../lifecycle/lifecycle.interface';

export interface OrbitApplicationOptions {
  port?: number;
  hostname?: string;
  logger?: boolean | Console;
  cors?: boolean | CorsOptions;
}

export class OrbitApplication {
  private server: ReturnType<typeof Bun.serve> | null = null;
  private routes: RouteDefinition[] = [];
  private logger: Console | null = null;
  private middlewares: MiddlewareFunction[] = [];
  private moduleMiddlewareConfigs: Map<Type, MiddlewareConfiguration[]> = new Map();
  private isShuttingDown = false;
  private shutdownCallbacks: ((signal?: string) => Promise<void> | void)[] = [];
  public port: number = 0;

  constructor(
    private container: Container,
    private options: OrbitApplicationOptions = {}
  ) {
    this.logger = options.logger === false ? null : (options.logger === true ? console : (options.logger || console));
    
    if (options.cors) {
      const corsOptions = options.cors === true ? {} : options.cors;
      this.use(new CorsMiddleware(corsOptions));
    }
  }

  setRoutes(routes: RouteDefinition[]): void {
    this.routes = routes;
  }

  setMiddlewareConfigurations(configs: Map<Type, MiddlewareConfiguration[]>): void {
    this.moduleMiddlewareConfigs = configs;
    
    for (const [, moduleConfigs] of configs) {
      for (const config of moduleConfigs) {
        for (const middleware of config.middlewares) {
          const fn = this.resolveMiddleware(middleware);
          const wrappedFn: MiddlewareFunction = async (request, next) => {
            const url = new URL(request.url);
            const pathname = url.pathname;
            const method = request.method.toUpperCase();
            
            if (!this.matchRouteInfo(pathname, method, config.forRoutes, config.excludeRoutes)) {
              return next();
            }
            
            return fn(request, next);
          };
          this.middlewares.push(wrappedFn);
        }
      }
    }
  }

  private matchRouteInfo(
    pathname: string,
    method: string,
    forRoutes: RouteInfo[],
    excludeRoutes: RouteInfo[]
  ): boolean {
    for (const exclude of excludeRoutes) {
      if (this.matchSingleRouteInfo(pathname, method, exclude)) {
        return false;
      }
    }

    for (const route of forRoutes) {
      if (this.matchSingleRouteInfo(pathname, method, route)) {
        return true;
      }
    }

    return false;
  }

  private matchSingleRouteInfo(pathname: string, method: string, route: RouteInfo): boolean {
    if (route.method) {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      const upperMethods = methods.map(m => m.toUpperCase());
      if (!upperMethods.includes(method) && !upperMethods.includes('ALL')) {
        return false;
      }
    }

    return this.matchMiddlewarePath(route.path, pathname);
  }

  use(middleware: Middleware, options?: { forRoutes?: string[]; exclude?: string[] }): this {
    const middlewareFn = this.resolveMiddleware(middleware);
    if (options?.forRoutes || options?.exclude) {
      const wrappedFn: MiddlewareFunction = async (request, next) => {
        const url = new URL(request.url);
        const pathname = url.pathname;
        
        if (options.exclude) {
          for (const pattern of options.exclude) {
            if (this.matchMiddlewarePath(pattern, pathname)) {
              return next();
            }
          }
        }
        
        if (options.forRoutes) {
          let matched = false;
          for (const pattern of options.forRoutes) {
            if (this.matchMiddlewarePath(pattern, pathname)) {
              matched = true;
              break;
            }
          }
          if (!matched) {
            return next();
          }
        }
        
        return middlewareFn(request, next);
      };
      this.middlewares.push(wrappedFn);
    } else {
      this.middlewares.push(middlewareFn);
    }
    return this;
  }

  private matchMiddlewarePath(pattern: string, pathname: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return pathname.startsWith(prefix);
    }
    return pathname === pattern || pathname.startsWith(pattern + '/');
  }

  enableCors(options?: CorsOptions): this {
    this.use(new CorsMiddleware(options));
    return this;
  }

  useStaticAssets(options: Partial<StaticServeOptions>): this {
    this.use(new StaticMiddleware(options));
    return this;
  }

  async listen(port?: number): Promise<void> {
    const listenPort = port ?? this.options.port ?? 3000;
    const hostname = this.options.hostname || '0.0.0.0';
    const requestHandler = new RequestHandler(this.container);

    await this.callLifecycleHook('onModuleInit');
    await this.callLifecycleHook('onApplicationBootstrap');

    this.server = Bun.serve({
      port: listenPort,
      hostname,
      fetch: async (request: Request) => {
        return this.handleRequest(request, requestHandler);
      },
    });

    // When port 0 is requested, reflect the ephemeral port Bun actually bound.
    this.port = listenPort === 0 && this.server?.port ? this.server.port : listenPort;
    this.setupGracefulShutdown();

    this.log(`🌌 Orbit application running at http://${hostname}:${listenPort}`);
    this.logRoutes();
  }

  async close(signal?: string): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.log(`Shutting down application${signal ? ` (${signal})` : ''}...`);

    await this.callLifecycleHook('beforeApplicationShutdown', signal);

    if (this.server) {
      this.server.stop();
      this.server = null;
    }

    await this.callLifecycleHook('onApplicationShutdown', signal);
    await this.callLifecycleHook('onModuleDestroy');

    for (const callback of this.shutdownCallbacks) {
      await callback(signal);
    }

    this.log('Application closed');
  }

  enableShutdownHooks(): this {
    return this;
  }

  onShutdown(callback: (signal?: string) => Promise<void> | void): this {
    this.shutdownCallbacks.push(callback);
    return this;
  }

  getContainer(): Container {
    return this.container;
  }

  getServer() {
    return this.server;
  }

  private setupGracefulShutdown(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGHUP'];

    for (const signal of signals) {
      process.on(signal as any, async () => {
        await this.close(signal);
        process.exit(0);
      });
    }

    process.on('uncaughtException' as any, async (error) => {
      console.error('Uncaught Exception:', error);
      await this.close('uncaughtException');
      process.exit(1);
    });

    process.on('unhandledRejection' as any, async (reason) => {
      console.error('Unhandled Rejection:', reason);
      await this.close('unhandledRejection');
      process.exit(1);
    });
  }

  private async callLifecycleHook(hookName: string, ...args: any[]): Promise<void> {
    const providers = await this.container.getAllInstances();
    
    for (const instance of providers) {
      try {
        switch (hookName) {
          case 'onModuleInit':
            if (hasOnModuleInit(instance)) {
              await instance.onModuleInit();
            }
            break;
          case 'onModuleDestroy':
            if (hasOnModuleDestroy(instance)) {
              await instance.onModuleDestroy();
            }
            break;
          case 'onApplicationBootstrap':
            if (hasOnApplicationBootstrap(instance)) {
              await instance.onApplicationBootstrap();
            }
            break;
          case 'onApplicationShutdown':
            if (hasOnApplicationShutdown(instance)) {
              await instance.onApplicationShutdown(args[0]);
            }
            break;
          case 'beforeApplicationShutdown':
            if (hasBeforeApplicationShutdown(instance)) {
              await instance.beforeApplicationShutdown(args[0]);
            }
            break;
        }
      } catch (error) {
        console.error(`Error calling ${hookName} on provider:`, error);
      }
    }
  }

  private resolveMiddleware(middleware: Middleware): MiddlewareFunction {
    if (typeof middleware === 'function') {
      if (middleware.prototype && 'use' in middleware.prototype) {
        const MiddlewareClass = middleware as new (...args: any[]) => GalaxyMiddleware;
        return async (req, next) => {
          let instance: GalaxyMiddleware;
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

  private async handleRequest(request: Request, handler: RequestHandler): Promise<Response> {
    const executeMiddlewares = async (index: number): Promise<Response> => {
      if (index < this.middlewares.length) {
        return this.middlewares[index](request, () => executeMiddlewares(index + 1));
      }
      return this.routeRequest(request, handler);
    };

    try {
      return await executeMiddlewares(0);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async routeRequest(request: Request, handler: RequestHandler): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname;

    for (const route of this.routes) {
      if (route.method !== method && route.method !== 'ALL') continue;

      const params = this.matchRoute(route.path, pathname);
      if (params !== null) {
        try {
          return await handler.handle(route, request, params);
        } catch (error) {
          return this.handleError(error);
        }
      }
    }

    return new Response(
      JSON.stringify({ statusCode: 404, message: 'Not Found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  private matchRoute(pattern: string, pathname: string): Record<string, string> | null {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) {
      if (!pattern.endsWith('*')) return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart === '*') {
        return params;
      }

      if (patternPart.startsWith(':')) {
        const paramName = patternPart.slice(1);
        params[paramName] = pathPart;
        continue;
      }

      if (patternPart !== pathPart) {
        return null;
      }
    }

    return params;
  }

  private handleError(error: unknown): Response {
    console.error('Request error:', error);

    if (error && typeof error === 'object' && 'getStatus' in error && 'toJSON' in error) {
      const httpError = error as { getStatus(): number; toJSON(): object };
      return new Response(
        JSON.stringify(httpError.toJSON()),
        { status: httpError.getStatus(), headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof Error) {
      return new Response(
        JSON.stringify({ statusCode: 500, message: error.message, error: error.name }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ statusCode: 500, message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  private log(message: string): void {
    if (this.logger) {
      this.logger.log(message);
    }
  }

  private logRoutes(): void {
    if (this.logger && this.routes.length > 0) {
      this.logger.log('Routes registered:');
      for (const route of this.routes) {
        this.logger.log(`  ${route.method.padEnd(7)} ${route.path}`);
      }
    }
  }
}

export class OrbitFactory {
  static async create(
    rootModule: Type | DynamicModule,
    options: OrbitApplicationOptions = {}
  ): Promise<OrbitApplication> {
    const container = new Container();
    const scanner = new ModuleScanner();
    const compiler = new ModuleCompiler(container, scanner);
    
    await compiler.compile(rootModule);
    
    const routeExplorer = new RouteExplorer(container);
    const allModules = scanner.getAllModules();
    
    const allControllers: Type[] = [];
    for (const module of allModules) {
      allControllers.push(...module.controllers);
    }
    
    const routes = await routeExplorer.explore(allControllers);
    
    const app = new OrbitApplication(container, options);
    app.setRoutes(routes);
    
    const middlewareConfigs = compiler.getMiddlewareConfigurations();
    app.setMiddlewareConfigurations(middlewareConfigs);
    
    return app;
  }
}

/** @deprecated Use OrbitFactory instead. */
export const BunFactory = OrbitFactory;
export const GalaxyFactory = OrbitFactory;
export type GalaxyApplication = OrbitApplication;
