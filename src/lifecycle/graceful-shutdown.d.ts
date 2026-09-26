export interface GracefulShutdownOptions {
    timeout?: number;
    signals?: NodeJS.Signals[];
    onShutdown?: () => void | Promise<void>;
    forceExitCode?: number;
}
export interface ActiveRequest {
    id: string;
    startedAt: number;
    path?: string;
    method?: string;
}
export declare class GracefulShutdownManager {
    private options;
    private activeRequests;
    private isShuttingDown;
    private shutdownPromise;
    private shutdownCallbacks;
    private server;
    constructor(options?: GracefulShutdownOptions);
    get isInShutdown(): boolean;
    get activeRequestCount(): number;
    get pendingRequests(): ActiveRequest[];
    registerServer(server: {
        stop: (closeActiveConnections?: boolean) => void;
    }): void;
    registerShutdownCallback(callback: () => void | Promise<void>): void;
    trackRequest(request: Request): string;
    completeRequest(id: string): void;
    setupSignalHandlers(): void;
    initiateShutdown(): Promise<void>;
    private performShutdown;
    private waitForRequests;
    createMiddleware(): (request: Request, next: () => Promise<Response>) => Promise<Response>;
}
export declare function getGracefulShutdownManager(options?: GracefulShutdownOptions): GracefulShutdownManager;
export declare function gracefulShutdown(options?: GracefulShutdownOptions): GracefulShutdownManager;
//# sourceMappingURL=graceful-shutdown.d.ts.map