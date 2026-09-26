import 'reflect-metadata';
import { emitRequestTelemetry } from '../application/orbit-factory';
import type { Type } from '../interfaces/type.interface';
import type { HttpMethod } from '../decorators/http-methods.decorator';
import { METADATA_KEYS } from '../metadata/constants';
import { Reflector } from '../metadata/reflection';
import { Container } from '../container/container';
import { ExecutionPipeline } from '../pipeline/execution-pipeline';
import { HttpException } from '../exceptions/http.exception';

export interface RouteDefinition {
  path: string;
  method: HttpMethod;
  controller: Type;
  methodName: string;
  handler: Function;
}

export interface ParamMetadata {
  type: 'body' | 'query' | 'param' | 'headers' | 'request' | 'response' | 'ip' | 'session';
  data?: string;
  index: number;
}

interface CachedParamInfo {
  sorted: ParamMetadata[];
  maxIndex: number;
  hasQuery: boolean;
  hasBody: boolean;
  hasHeaders: boolean;
  /** True when any parameter needs asynchronous resolution. */
  hasAsync: boolean;
}

const ROUTE_PARAMS_KEY = 'orbit:route:params';
const HTTP_CODE_KEY = 'orbit:http-code';
const HEADERS_KEY = 'orbit:headers';

export class RouteExplorer {
  private routes: RouteDefinition[] = [];

  constructor(private container: Container) {}

  async explore(controllers: Type[]): Promise<RouteDefinition[]> {
    this.routes = [];

    for (const controller of controllers) {
      await this.exploreController(controller);
    }

    return this.routes;
  }

  private async exploreController(controller: Type): Promise<void> {
    const controllerPath = Reflector.getControllerPath(controller);
    const prototype = controller.prototype;
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      name => name !== 'constructor' && typeof prototype[name] === 'function'
    );

    for (const methodName of methodNames) {
      const routePath = Reflect.getMetadata(METADATA_KEYS.ROUTE_PATH, prototype, methodName);
      const routeMethod = Reflect.getMetadata(METADATA_KEYS.ROUTE_METHOD, prototype, methodName) as HttpMethod;

      if (routePath !== undefined && routeMethod) {
        const fullPath = this.joinPaths(controllerPath, routePath);
        
        this.routes.push({
          path: fullPath,
          method: routeMethod,
          controller,
          methodName,
          handler: prototype[methodName],
        });
      }
    }
  }

  private joinPaths(...paths: string[]): string {
    const joined = paths
      .map(p => p.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
    return '/' + joined;
  }

  getParamMetadata(target: Object, methodName: string): ParamMetadata[] {
    return Reflect.getMetadata(ROUTE_PARAMS_KEY, target, methodName) || [];
  }
}

export class RequestHandler {
  private pipeline: ExecutionPipeline;

  constructor(private container: Container) {
    this.pipeline = new ExecutionPipeline(container);
  }

  /** Sorted param metadata per controller+method, computed once. */
  private paramCache = new WeakMap<Type, Map<string, CachedParamInfo>>();

  private getCachedParams(controllerClass: Type, methodName: string): CachedParamInfo {
    let byMethod = this.paramCache.get(controllerClass);
    if (!byMethod) {
      byMethod = new Map();
      this.paramCache.set(controllerClass, byMethod);
    }
    let info = byMethod.get(methodName);
    if (!info) {
      const metadata = this.getParamMetadata(controllerClass.prototype, methodName);
      const sorted = [...metadata].sort((a, b) => a.index - b.index);
      const maxIndex = sorted.length > 0 ? Math.max(...sorted.map(m => m.index)) : -1;
      info = {
        sorted,
        maxIndex,
        hasQuery: sorted.some(m => m.type === 'query'),
        hasBody: sorted.some(m => m.type === 'body'),
        hasHeaders: sorted.some(m => m.type === 'headers'),
        hasAsync: sorted.some(
          m => m.type === 'query' || m.type === 'body' || m.type === 'headers' || m.type === 'ip'
        ),
      };
      byMethod.set(methodName, info);
    }
    return info;
  }

  async handle(
    route: RouteDefinition,
    request: Request,
    pathParams: Record<string, string>
  ): Promise<Response> {
    const startedAt = Date.now();
    let telemetryError: { name: string; message: string; stack?: string } | undefined;

    try {
      const controllerInstance = await this.container.resolve(route.controller);
      const paramInfo = this.getCachedParams(route.controller, route.methodName);
      const hasPipes = this.pipeline.hasPipes(route.controller, route.methodName);

      // Fast path: only path/request params and no pipes — resolve arguments
      // synchronously without parsing query string, body or headers.
      const handlerFn = (paramInfo.hasAsync || hasPipes)
        ? async () => {
            const args = await this.resolveParamsAsync(paramInfo, request, pathParams, controllerInstance, route, hasPipes);
            return controllerInstance[route.methodName](...args);
          }
        : () => {
            const args = this.resolveParamsSync(paramInfo, request, pathParams);
            return controllerInstance[route.methodName](...args);
          };

      const response = await this.pipeline.execute(
        request,
        route.controller,
        controllerInstance,
        route.handler,
        route.methodName,
        handlerFn
      );

      emitRequestTelemetry({
        method: request.method,
        path: route.path,
        status: response.status,
        durationMs: Date.now() - startedAt,
      });

      return this.applyHttpMetadata(response, route.controller.prototype, route.methodName);
    } catch (error) {
      telemetryError = {
        name: (error as any)?.name ?? 'Error',
        message: (error as any)?.message ?? String(error),
        stack: (error as any)?.stack,
      };
      emitRequestTelemetry({
        method: request.method,
        path: route.path,
        status: 500,
        durationMs: Date.now() - startedAt,
        error: telemetryError,
      });
      throw error;
    }
  }

  private getParamMetadata(target: Object, methodName: string): ParamMetadata[] {
    return Reflect.getMetadata(ROUTE_PARAMS_KEY, target, methodName) || [];
  }

  /**
   * Synchronous argument resolution for handlers that only consume
   * @Param / @Req (no query string, body or header parsing needed).
   */
  private resolveParamsSync(
    info: CachedParamInfo,
    request: Request,
    pathParams: Record<string, string>
  ): any[] {
    if (info.maxIndex < 0) {
      return [];
    }

    const args: any[] = new Array(info.maxIndex + 1).fill(undefined);
    for (const param of info.sorted) {
      switch (param.type) {
        case 'param':
          args[param.index] = param.data ? pathParams[param.data] : pathParams;
          break;
        case 'request':
          args[param.index] = request;
          break;
        default:
          args[param.index] = undefined;
      }
    }
    return args;
  }

  /**
   * Asynchronous argument resolution. Query string, body and header objects
   * are parsed lazily — only when at least one parameter decorator needs them.
   */
  private async resolveParamsAsync(
    info: CachedParamInfo,
    request: Request,
    pathParams: Record<string, string>,
    controllerInstance: any,
    route: RouteDefinition,
    hasPipes: boolean
  ): Promise<any[]> {
    if (info.maxIndex < 0) {
      return [];
    }

    let queryParams: Record<string, string> | undefined;
    if (info.hasQuery) {
      queryParams = {};
      const qi = request.url.indexOf('?');
      if (qi !== -1 && qi + 1 < request.url.length) {
        for (const [key, value] of new URLSearchParams(request.url.slice(qi + 1))) {
          queryParams[key] = value;
        }
      }
    }

    let body: any = undefined;
    if (info.hasBody && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
      try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          body = await request.json();
        } else {
          body = await request.text();
        }
      } catch {
        body = undefined;
      }
    }

    let headers: Record<string, string> | undefined;
    if (info.hasHeaders) {
      headers = Object.fromEntries(request.headers.entries());
    }

    const args: any[] = new Array(info.maxIndex + 1).fill(undefined);

    for (const param of info.sorted) {
      let value: any;
      let paramType: 'body' | 'query' | 'param' | 'custom' = 'custom';

      switch (param.type) {
        case 'body':
          value = param.data ? body?.[param.data] : body;
          paramType = 'body';
          break;
        case 'query':
          value = param.data ? queryParams![param.data] : queryParams;
          paramType = 'query';
          break;
        case 'param':
          value = param.data ? pathParams[param.data] : pathParams;
          paramType = 'param';
          break;
        case 'headers':
          value = param.data ? headers![param.data.toLowerCase()] : headers;
          break;
        case 'request':
          value = request;
          break;
        case 'ip':
          value = request.headers.get('x-forwarded-for') || 'unknown';
          break;
        default:
          value = undefined;
      }

      if (hasPipes) {
        const transformedValue = await this.pipeline.transformWithPipes(
          value,
          { type: paramType, data: param.data },
          route.controller,
          controllerInstance,
          route.methodName
        );
        args[param.index] = transformedValue;
      } else {
        args[param.index] = value;
      }
    }

    return args;
  }

  private applyHttpMetadata(response: Response, target: Object, methodName: string): Response {
    const httpCode = Reflect.getMetadata(HTTP_CODE_KEY, target, methodName);
    const customHeaders = Reflect.getMetadata(HEADERS_KEY, target, methodName) as Record<string, string> | undefined;

    if (!httpCode && !customHeaders) {
      return response;
    }

    const newHeaders = new Headers(response.headers);
    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        newHeaders.set(key, value);
      }
    }

    return new Response(response.body, {
      status: httpCode || response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
}
