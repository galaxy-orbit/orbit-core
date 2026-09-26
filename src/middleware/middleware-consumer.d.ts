import type { Type } from '../interfaces/type.interface';
import type { Middleware } from './middleware.interface';
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
export declare class MiddlewareConfigProxyImpl implements MiddlewareConfigProxy {
    private readonly consumer;
    private readonly middlewares;
    private excludePatterns;
    constructor(consumer: MiddlewareConsumerImpl, middlewares: Middleware[]);
    exclude(...routes: RouteInfoOrController[]): MiddlewareConfigProxy;
    forRoutes(...routes: RouteInfoOrController[]): MiddlewareConsumer;
    private normalizeRoutes;
}
export declare class MiddlewareConsumerImpl implements MiddlewareConsumer {
    private configurations;
    apply(...middlewares: Middleware[]): MiddlewareConfigProxy;
    addConfiguration(config: MiddlewareConfiguration): void;
    getConfigurations(): MiddlewareConfiguration[];
}
export interface NestModule {
    configure(consumer: MiddlewareConsumer): void | Promise<void>;
}
export declare function hasConfigureMethod(module: any): module is NestModule;
//# sourceMappingURL=middleware-consumer.d.ts.map