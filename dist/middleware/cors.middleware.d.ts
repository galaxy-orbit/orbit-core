import type { CorsOptions, OrbitMiddleware } from './middleware.interface';
export declare class CorsMiddleware implements OrbitMiddleware {
    private options;
    constructor(options?: CorsOptions);
    use(request: Request, next: () => Promise<Response>): Promise<Response>;
    private buildCorsHeaders;
    private getAllowedOrigin;
    private appendHeaders;
}
export declare function cors(options?: CorsOptions): CorsMiddleware;
