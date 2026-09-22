import type { CorsOptions, OrbitMiddleware } from './middleware.interface';

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: '*',
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export class CorsMiddleware implements OrbitMiddleware {
  private options: CorsOptions;

  constructor(options: CorsOptions = {}) {
    this.options = { ...DEFAULT_CORS_OPTIONS, ...options };
  }

  async use(request: Request, next: () => Promise<Response>): Promise<Response> {
    const origin = request.headers.get('origin');
    const corsHeaders = this.buildCorsHeaders(origin);

    if (request.method === 'OPTIONS') {
      if (this.options.preflightContinue) {
        const response = await next();
        return this.appendHeaders(response, corsHeaders);
      }
      return new Response(null, {
        status: this.options.optionsSuccessStatus || 204,
        headers: corsHeaders,
      });
    }

    const response = await next();
    return this.appendHeaders(response, corsHeaders);
  }

  private buildCorsHeaders(origin: string | null): Headers {
    const headers = new Headers();

    const allowedOrigin = this.getAllowedOrigin(origin);
    if (allowedOrigin) {
      headers.set('Access-Control-Allow-Origin', allowedOrigin);
    }

    if (this.options.credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (this.options.exposedHeaders) {
      const exposed = Array.isArray(this.options.exposedHeaders)
        ? this.options.exposedHeaders.join(',')
        : this.options.exposedHeaders;
      headers.set('Access-Control-Expose-Headers', exposed);
    }

    const methods = Array.isArray(this.options.methods)
      ? this.options.methods.join(',')
      : this.options.methods || 'GET,HEAD,PUT,PATCH,POST,DELETE';
    headers.set('Access-Control-Allow-Methods', methods);

    const allowedHeaders = Array.isArray(this.options.allowedHeaders)
      ? this.options.allowedHeaders.join(',')
      : this.options.allowedHeaders || '*';
    headers.set('Access-Control-Allow-Headers', allowedHeaders);

    if (this.options.maxAge !== undefined) {
      headers.set('Access-Control-Max-Age', String(this.options.maxAge));
    }

    return headers;
  }

  private getAllowedOrigin(requestOrigin: string | null): string | null {
    const { origin } = this.options;

    if (origin === true || origin === '*') {
      return '*';
    }

    if (origin === false) {
      return null;
    }

    if (typeof origin === 'string') {
      return origin;
    }

    if (Array.isArray(origin) && requestOrigin) {
      if (origin.includes(requestOrigin)) {
        return requestOrigin;
      }
      return null;
    }

    if (typeof origin === 'function' && requestOrigin) {
      if (origin(requestOrigin)) {
        return requestOrigin;
      }
      return null;
    }

    return '*';
  }

  private appendHeaders(response: Response, corsHeaders: Headers): Response {
    const newHeaders = new Headers(response.headers);
    corsHeaders.forEach((value, key) => {
      newHeaders.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
}

export function cors(options?: CorsOptions): CorsMiddleware {
  return new CorsMiddleware(options);
}
