import type { OrbitMiddleware } from './middleware.interface';

export interface TimeoutOptions {
  timeout?: number;
  message?: string;
  statusCode?: number;
  onTimeout?: (request: Request, elapsed: number) => void;
}

const DEFAULT_OPTIONS: Required<TimeoutOptions> = {
  timeout: 30000,
  message: 'Request Timeout',
  statusCode: 408,
  onTimeout: () => {},
};

export class TimeoutMiddleware implements OrbitMiddleware {
  private options: Required<TimeoutOptions>;

  constructor(options: TimeoutOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async use(request: Request, next: () => Promise<Response>): Promise<Response> {
    const controller = new AbortController();
    const startTime = Date.now();

    // clean up BOTH the race timer and the abort timer once settled,
    // otherwise every fast request leaks a pending setTimeout
    let timeoutId: any = null;
    const racePromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        reject(error);
      }, this.options.timeout);
    });

    try {
      const response = await Promise.race([next(), racePromise]);
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'TimeoutError' || error.message === 'Request timeout') {
        const elapsed = Date.now() - startTime;
        this.options.onTimeout(request, elapsed);
        
        return new Response(
          JSON.stringify({
            statusCode: this.options.statusCode,
            message: this.options.message,
            error: 'Request Timeout',
          }),
          {
            status: this.options.statusCode,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      throw error;
    }
  }

}

export function timeout(options?: TimeoutOptions): TimeoutMiddleware {
  return new TimeoutMiddleware(options);
}

export class RequestTimeoutError extends Error {
  readonly elapsed: number;
  readonly path: string;
  readonly method: string;

  constructor(request: Request, elapsed: number) {
    const url = new URL(request.url);
    super(`Request timeout after ${elapsed}ms: ${request.method} ${url.pathname}`);
    this.name = 'RequestTimeoutError';
    this.elapsed = elapsed;
    this.path = url.pathname;
    this.method = request.method;
  }
}

export function createTimeoutHandler(
  timeoutMs: number,
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const controller = new AbortController();
    const startTime = Date.now();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await Promise.race([
        handler(request),
        new Promise<Response>((_, reject) => {
          setTimeout(() => {
            reject(new RequestTimeoutError(request, Date.now() - startTime));
          }, timeoutMs);
        }),
      ]);

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof RequestTimeoutError) {
        return new Response(
          JSON.stringify({
            statusCode: 408,
            message: 'Request Timeout',
            error: error.message,
          }),
          {
            status: 408,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      throw error;
    }
  };
}
