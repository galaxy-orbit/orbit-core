import type { Type } from '../interfaces/type.interface';
import type { Container } from '../container/container';
import type { Middleware, MiddlewareFunction } from './middleware.interface';
import type { MiddlewareConfiguration, RouteInfo } from './middleware-consumer';
export interface ResolvedMiddleware {
    fn: MiddlewareFunction;
    forRoutes: RouteInfo[];
    excludeRoutes: RouteInfo[];
}
export declare class MiddlewareRegistry {
    private container;
    private globalMiddlewares;
    private moduleMiddlewares;
    constructor(container: Container);
    registerGlobal(middleware: Middleware, forRoutes?: RouteInfo[], excludeRoutes?: RouteInfo[]): void;
    registerForModule(moduleClass: Type, configurations: MiddlewareConfiguration[]): void;
    getMiddlewaresForRoute(path: string, method: string): Promise<MiddlewareFunction[]>;
    private matchesRoute;
    private matchesSingleRoute;
    private matchPath;
    private resolveMiddlewareToFunction;
    private resolveMiddlewareToFunctionAsync;
}
//# sourceMappingURL=middleware-registry.d.ts.map