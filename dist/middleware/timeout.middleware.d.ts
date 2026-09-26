import type { OrbitMiddleware } from './middleware.interface';
export interface TimeoutOptions {
    timeout?: number;
    message?: string;
    statusCode?: number;
    onTimeout?: (request: Request, elapsed: number) => void;
}
export declare class TimeoutMiddleware implements OrbitMiddleware {
    private options;
    constructor(options?: TimeoutOptions);
    use(request: Request, next: () => Promise<Response>): Promise<Response>;
}
export declare function timeout(options?: TimeoutOptions): TimeoutMiddleware;
export declare class RequestTimeoutError extends Error {
    readonly elapsed: number;
    readonly path: string;
    readonly method: string;
    constructor(request: Request, elapsed: number);
}
export declare function createTimeoutHandler(timeoutMs: number, handler: (request: Request) => Promise<Response>): (request: Request) => Promise<Response>;
