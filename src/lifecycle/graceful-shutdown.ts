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

const DEFAULT_OPTIONS: Required<GracefulShutdownOptions> = {
  timeout: 30000,
  signals: ['SIGTERM', 'SIGINT', 'SIGHUP'],
  onShutdown: () => {},
  forceExitCode: 1,
};

export class GracefulShutdownManager {
  private options: Required<GracefulShutdownOptions>;
  private activeRequests: Map<string, ActiveRequest> = new Map();
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;
  private shutdownCallbacks: Array<() => void | Promise<void>> = [];
  private server: { stop: (closeActiveConnections?: boolean) => void } | null = null;

  constructor(options: GracefulShutdownOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get isInShutdown(): boolean {
    return this.isShuttingDown;
  }

  get activeRequestCount(): number {
    return this.activeRequests.size;
  }

  get pendingRequests(): ActiveRequest[] {
    return Array.from(this.activeRequests.values());
  }

  registerServer(server: { stop: (closeActiveConnections?: boolean) => void }): void {
    this.server = server;
  }

  registerShutdownCallback(callback: () => void | Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  trackRequest(request: Request): string {
    const id = crypto.randomUUID();
    const url = new URL(request.url);
    
    this.activeRequests.set(id, {
      id,
      startedAt: Date.now(),
      path: url.pathname,
      method: request.method,
    });

    return id;
  }

  completeRequest(id: string): void {
    this.activeRequests.delete(id);
  }

  setupSignalHandlers(): void {
    for (const signal of this.options.signals) {
      process.on(signal as any, () => {
        this.initiateShutdown();
      });
    }
  }

  async initiateShutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  private async performShutdown(): Promise<void> {
    console.log('[Shutdown] Initiating graceful shutdown...');

    if (this.server) {
      console.log('[Shutdown] Stopping server from accepting new connections...');
      this.server.stop(false);
    }

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Shutdown timeout exceeded'));
      }, this.options.timeout);
    });

    let timedOut = false;
    
    try {
      await Promise.race([
        this.waitForRequests(),
        timeoutPromise,
      ]);

      console.log('[Shutdown] All requests completed');
    } catch (error) {
      timedOut = true;
      console.warn('[Shutdown] Timeout exceeded, forcing shutdown...');
      console.warn(`[Shutdown] ${this.activeRequests.size} requests still pending`);
      
      for (const req of this.activeRequests.values()) {
        console.warn(`[Shutdown] Pending: ${req.method} ${req.path} (${Date.now() - req.startedAt}ms)`);
      }
    }

    console.log('[Shutdown] Running shutdown callbacks...');
    
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('[Shutdown] Callback error:', error);
      }
    }

    await this.options.onShutdown();

    console.log('[Shutdown] Graceful shutdown complete');

    if (this.server) {
      this.server.stop(true);
    }

    if (timedOut && this.options.forceExitCode !== undefined) {
      console.log(`[Shutdown] Force exiting with code ${this.options.forceExitCode}`);
      process.exit(this.options.forceExitCode);
    }
  }

  private async waitForRequests(): Promise<void> {
    while (this.activeRequests.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  createMiddleware(): (request: Request, next: () => Promise<Response>) => Promise<Response> {
    return async (request: Request, next: () => Promise<Response>): Promise<Response> => {
      if (this.isShuttingDown) {
        return new Response('Service Unavailable', {
          status: 503,
          headers: {
            'Connection': 'close',
            'Retry-After': '30',
          },
        });
      }

      const requestId = this.trackRequest(request);

      try {
        const response = await next();
        return response;
      } finally {
        this.completeRequest(requestId);
      }
    };
  }
}

let globalManager: GracefulShutdownManager | null = null;

export function getGracefulShutdownManager(options?: GracefulShutdownOptions): GracefulShutdownManager {
  if (!globalManager) {
    globalManager = new GracefulShutdownManager(options);
  }
  return globalManager;
}

export function gracefulShutdown(options?: GracefulShutdownOptions): GracefulShutdownManager {
  const manager = getGracefulShutdownManager(options);
  manager.setupSignalHandlers();
  return manager;
}
