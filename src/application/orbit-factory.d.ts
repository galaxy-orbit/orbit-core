import 'reflect-metadata';
import { type SecureHeaderOptions } from '@galaxy-stack/orbit-common';
import type { Type } from '../interfaces/type.interface';
import type { DynamicModule } from '../interfaces/module.interface';
import { Container } from '../container/container';
import { type RouteDefinition } from '../router/route-explorer';
import type { Middleware, CorsOptions, StaticServeOptions } from '../middleware/middleware.interface';
import type { MiddlewareConfiguration } from '../middleware/middleware-consumer';
export interface OrbitApplicationOptions {
    port?: number;
    hostname?: string;
    logger?: boolean | Console;
    cors?: boolean | CorsOptions;
    /**
     * Secure response headers (helmet-style) applied to every response by
     * default. Set `false` to disable, or pass an object to customize
     * individual headers. CSRF / rate limiting / sanitization stay opt-in via
     * SecurityModule and ThrottlerModule.
     */
    security?: boolean | SecureHeaderOptions;
}
export declare class OrbitApplication {
    private container;
    private options;
    private server;
    private routes;
    private logger;
    private middlewares;
    private moduleMiddlewareConfigs;
    private isShuttingDown;
    private shutdownCallbacks;
    port: number;
    constructor(container: Container, options?: OrbitApplicationOptions);
    private readonly secureHeaderOptions;
    setRoutes(routes: RouteDefinition[]): void;
    /** Registered routes (method/path/controller/handler) — used by orbit-devtools. */
    getRoutes(): RouteDefinition[];
    /** Compiled module tree — used by orbit-devtools for the module graph. */
    modules: unknown[];
    setModules(modules: unknown[]): void;
    setMiddlewareConfigurations(configs: Map<Type, MiddlewareConfiguration[]>): void;
    private matchRouteInfo;
    private matchSingleRouteInfo;
    use(middleware: Middleware, options?: {
        forRoutes?: string[];
        exclude?: string[];
    }): this;
    private matchMiddlewarePath;
    enableCors(options?: CorsOptions): this;
    useStaticAssets(options: Partial<StaticServeOptions>): this;
    listen(port?: number): Promise<void>;
    close(signal?: string): Promise<void>;
    enableShutdownHooks(): this;
    onShutdown(callback: (signal?: string) => Promise<void> | void): this;
    getContainer(): Container;
    getServer(): Bun.Server<unknown> | null;
    private setupGracefulShutdown;
    private callLifecycleHook;
    private resolveMiddleware;
    private handleRequest;
    private applySecurityHeaders;
    private routeRequest;
    private matchRoute;
    private handleError;
    private log;
    private logRoutes;
}
export interface RequestTelemetry {
    method: string;
    path: string;
    status: number;
    durationMs: number;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}
type RequestTelemetryListener = (telemetry: RequestTelemetry) => void;
/** Register a listener fired after every handled request (used by orbit-devtools). */
export declare function onRequestTelemetry(listener: RequestTelemetryListener): () => void;
export declare function emitRequestTelemetry(telemetry: RequestTelemetry): void;
export declare class OrbitFactory {
    static create(rootModule: Type | DynamicModule, options?: OrbitApplicationOptions): Promise<OrbitApplication>;
}
/** @deprecated Use OrbitFactory instead. */
export declare const BunFactory: typeof OrbitFactory;
export declare const GalaxyFactory: typeof OrbitFactory;
export type GalaxyApplication = OrbitApplication;
export {};
//# sourceMappingURL=orbit-factory.d.ts.map