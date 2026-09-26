export interface GalaxyMiddleware {
    use(request: Request, next: () => Promise<Response>): Promise<Response>;
}
export type OrbitMiddleware = GalaxyMiddleware;
export type MiddlewareFunction = (request: Request, next: () => Promise<Response>) => Promise<Response>;
export type MiddlewareClass = new (...args: any[]) => GalaxyMiddleware;
export type Middleware = MiddlewareFunction | MiddlewareClass | GalaxyMiddleware;
export interface CorsOptions {
    origin?: string | string[] | boolean | ((origin: string) => boolean);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
}
export interface StaticServeOptions {
    root: string;
    prefix?: string;
    index?: string[];
    dotFiles?: 'allow' | 'deny' | 'ignore';
    maxAge?: number;
    immutable?: boolean;
    etag?: boolean;
    lastModified?: boolean;
    cacheMaxSize?: number;
    cacheTtl?: number;
    cacheDebug?: boolean;
}
