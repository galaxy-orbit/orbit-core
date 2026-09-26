import type { StaticServeOptions, OrbitMiddleware } from './middleware.interface';
export declare class StaticMiddleware implements OrbitMiddleware {
    private options;
    private rootPath;
    private cache;
    constructor(options?: Partial<StaticServeOptions>);
    private getCachedFile;
    private validateCachedFile;
    private setCachedFile;
    clearCache(): void;
    use(request: Request, next: () => Promise<Response>): Promise<Response>;
    private containsDotSegment;
}
export declare function serveStatic(options?: Partial<StaticServeOptions>): StaticMiddleware;
//# sourceMappingURL=static.middleware.d.ts.map