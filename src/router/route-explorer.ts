import 'reflect-metadata';
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

  async handle(
    route: RouteDefinition,
    request: Request,
    pathParams: Record<string, string>
  ): Promise<Response> {
    const controllerInstance = await this.container.resolve(route.controller);
    
    const handlerFn = async () => {
      const paramMetadata = this.getParamMetadata(route.controller.prototype, route.methodName);
      const args = await this.resolveParams(paramMetadata, request, pathParams, route.controller, route.methodName);
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

    return this.applyHttpMetadata(response, route.controller.prototype, route.methodName);
  }

  private getParamMetadata(target: Object, methodName: string): ParamMetadata[] {
    return Reflect.getMetadata(ROUTE_PARAMS_KEY, target, methodName) || [];
  }

  private async resolveParams(
    metadata: ParamMetadata[],
    request: Request,
    pathParams: Record<string, string>,
    controllerClass: Type,
    methodName: string
  ): Promise<any[]> {
    if (metadata.length === 0) {
      return [];
    }

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    let body: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          body = await request.json();
        } else if (contentType.includes('text/')) {
          body = await request.text();
        } else {
          body = await request.text();
        }
      } catch {
        body = undefined;
      }
    }

    const headers = Object.fromEntries(request.headers.entries());
    const sorted = [...metadata].sort((a, b) => a.index - b.index);
    const maxIndex = sorted.length > 0 ? Math.max(...sorted.map(m => m.index)) : -1;
    const args: any[] = new Array(maxIndex + 1).fill(undefined);

    for (const param of sorted) {
      let value: any;
      let paramType: 'body' | 'query' | 'param' | 'custom' = 'custom';

      switch (param.type) {
        case 'body':
          value = param.data ? body?.[param.data] : body;
          paramType = 'body';
          break;
        case 'query':
          value = param.data ? queryParams[param.data] : queryParams;
          paramType = 'query';
          break;
        case 'param':
          value = param.data ? pathParams[param.data] : pathParams;
          paramType = 'param';
          break;
        case 'headers':
          value = param.data ? headers[param.data.toLowerCase()] : headers;
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

      const controllerInstance = await this.container.resolve(controllerClass);
      const transformedValue = await this.pipeline.transformWithPipes(
        value,
        { type: paramType, data: param.data },
        controllerClass,
        controllerInstance,
        methodName
      );
      args[param.index] = transformedValue;
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
