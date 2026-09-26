import 'reflect-metadata';
import type { Container } from '../container/container';
import type { Type } from '../interfaces/type.interface';
import { HttpException } from '../exceptions/http.exception';

const GUARDS_KEY = 'orbit:guards';
const PIPES_KEY = 'orbit:pipes';
const INTERCEPTORS_KEY = 'orbit:interceptors';
const EXCEPTION_FILTERS_KEY = 'orbit:exception-filters';

export interface ExecutionContext {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getHandler(): Function;
  getClass(): Type;
  switchToHttp(): HttpArgumentsHost;
}

export interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
}

export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  metatype?: Type;
  data?: string;
}

export interface PipeTransform<T = any, R = any> {
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}

export interface CallHandler<T = any> {
  handle(): Promise<T>;
}

export interface GalaxyInterceptor<T = any, R = any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R> | R;
}

export type NestInterceptor<T = any, R = any> = GalaxyInterceptor<T, R>;

export interface ExceptionFilter<T = any> {
  catch(exception: T, context: ExecutionContext): any;
}

class ExecutionContextImpl implements ExecutionContext {
  constructor(
    private readonly request: Request,
    private readonly controllerClass: Type,
    private readonly handler: Function
  ) {}

  getRequest<T = any>(): T {
    return this.request as T;
  }

  getResponse<T = any>(): T {
    return null as T;
  }

  getHandler(): Function {
    return this.handler;
  }

  getClass(): Type {
    return this.controllerClass;
  }

  switchToHttp(): HttpArgumentsHost {
    return {
      getRequest: <T = any>() => this.request as T,
      getResponse: <T = any>() => null as T,
    };
  }
}

interface CachedPipelineMeta {
  guards: any[];
  pipes: any[];
  interceptors: any[];
  filters: any[];
}

export class ExecutionPipeline {
  /** Per-controller pipeline metadata, resolved once instead of per request. */
  private metaCache = new WeakMap<Type, Map<string, CachedPipelineMeta>>();

  constructor(private container: Container) {}

  private getCachedMeta(controllerClass: Type, methodName: string): CachedPipelineMeta {
    let byMethod = this.metaCache.get(controllerClass);
    if (!byMethod) {
      byMethod = new Map();
      this.metaCache.set(controllerClass, byMethod);
    }
    let meta = byMethod.get(methodName);
    if (!meta) {
      meta = {
        guards: this.getGuards(controllerClass, null, methodName),
        pipes: this.getPipes(controllerClass, null, methodName),
        interceptors: this.getInterceptors(controllerClass, null, methodName),
        filters: this.getFilters(controllerClass, null, methodName),
      };
      byMethod.set(methodName, meta);
    }
    return meta;
  }

  /** True when the handler has registered pipes (parameter transformation). */
  hasPipes(controllerClass: Type, methodName: string): boolean {
    return this.getCachedMeta(controllerClass, methodName).pipes.length > 0;
  }

  async execute(
    request: Request,
    controllerClass: Type,
    controllerInstance: any,
    handler: Function,
    methodName: string,
    handlerFn: () => Promise<any>
  ): Promise<Response> {
    const meta = this.getCachedMeta(controllerClass, methodName);

    // Fast path: no guards, no interceptors, no exception filters — run the
    // handler directly. Skips ExecutionContext construction and the
    // guard/interceptor promise chains entirely.
    if (meta.guards.length === 0 && meta.interceptors.length === 0 && meta.filters.length === 0) {
      try {
        const result = await handlerFn();
        return this.transformToResponse(result);
      } catch (error) {
        return await this.handleException(error, null as any, controllerClass, controllerInstance, methodName);
      }
    }

    const context = new ExecutionContextImpl(request, controllerClass, handler);

    try {
      const guardsPassed = await this.runGuards(meta, context);
      if (!guardsPassed) {
        return new Response(JSON.stringify({ statusCode: 403, message: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await this.runInterceptors(meta, context, handlerFn);
      return this.transformToResponse(result);
    } catch (error) {
      return await this.handleException(error, context, controllerClass, controllerInstance, methodName);
    }
  }

  private async runGuards(
    meta: CachedPipelineMeta,
    context: ExecutionContext
  ): Promise<boolean> {
    const guards = meta.guards;
    
    for (const guard of guards) {
      const guardInstance = await this.resolveInstance(guard) as CanActivate;
      const canActivate = await guardInstance.canActivate(context);
      if (!canActivate) {
        return false;
      }
    }
    
    return true;
  }

  private async runInterceptors(
    meta: CachedPipelineMeta,
    context: ExecutionContext,
    handlerFn: () => Promise<any>
  ): Promise<any> {
    const interceptors = meta.interceptors;
    
    if (interceptors.length === 0) {
      return handlerFn();
    }

    const self = this;
    const createCallHandler = (index: number): CallHandler => ({
      handle: async () => {
        if (index >= interceptors.length) {
          return handlerFn();
        }
        const interceptor = await self.resolveInstance(interceptors[index]) as NestInterceptor;
        return interceptor.intercept(context, createCallHandler(index + 1));
      },
    });

    const firstInterceptor = await this.resolveInstance(interceptors[0]) as NestInterceptor;
    return firstInterceptor.intercept(context, createCallHandler(1));
  }

  async transformWithPipes(
    value: any,
    metadata: ArgumentMetadata,
    controllerClass: Type,
    instance: any,
    methodName: string
  ): Promise<any> {
    const pipes = this.getPipes(controllerClass, instance, methodName);
    
    let result = value;
    for (const pipe of pipes) {
      const pipeInstance = await this.resolveInstance(pipe) as PipeTransform;
      result = await pipeInstance.transform(result, metadata);
    }
    
    return result;
  }

  private async handleException(
    error: any,
    context: ExecutionContext,
    controllerClass: Type,
    instance: any,
    methodName: string
  ): Promise<Response> {
    const filters = this.getCachedMeta(controllerClass, methodName).filters;
    
    for (const filter of filters) {
      const filterInstance = await this.resolveInstance(filter) as ExceptionFilter;
      const result = filterInstance.catch(error, context);
      if (result instanceof Response) {
        return result;
      }
      if (result !== undefined) {
        return this.transformToResponse(result);
      }
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      return new Response(
        JSON.stringify({ statusCode: status, message: error.message }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.error('Unhandled exception:', error);
    return new Response(
      JSON.stringify({ statusCode: 500, message: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private transformToResponse(result: any): Response {
    if (result instanceof Response) {
      return result;
    }
    
    if (result === undefined || result === null) {
      return new Response(null, { status: 204 });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private getGuards(controllerClass: Type, instance: any, methodName: string): any[] {
    const classGuards = Reflect.getMetadata(GUARDS_KEY, controllerClass) || [];
    const methodGuards = Reflect.getMetadata(GUARDS_KEY, controllerClass.prototype, methodName) || [];
    return [...classGuards, ...methodGuards];
  }

  private getPipes(controllerClass: Type, instance: any, methodName: string): any[] {
    const classPipes = Reflect.getMetadata(PIPES_KEY, controllerClass) || [];
    const methodPipes = Reflect.getMetadata(PIPES_KEY, controllerClass.prototype, methodName) || [];
    return [...classPipes, ...methodPipes];
  }

  private getInterceptors(controllerClass: Type, instance: any, methodName: string): any[] {
    const classInterceptors = Reflect.getMetadata(INTERCEPTORS_KEY, controllerClass) || [];
    const methodInterceptors = Reflect.getMetadata(INTERCEPTORS_KEY, controllerClass.prototype, methodName) || [];
    return [...classInterceptors, ...methodInterceptors];
  }

  private getFilters(controllerClass: Type, instance: any, methodName: string): any[] {
    const classFilters = Reflect.getMetadata(EXCEPTION_FILTERS_KEY, controllerClass) || [];
    const methodFilters = Reflect.getMetadata(EXCEPTION_FILTERS_KEY, controllerClass.prototype, methodName) || [];
    return [...classFilters, ...methodFilters];
  }

  private async resolveInstance(target: any): Promise<any> {
    if (target === null || target === undefined) {
      return target;
    }
    
    if (typeof target === 'function') {
      try {
        if (this.container.has(target)) {
          return await this.container.resolve(target);
        }
      } catch (e) {
      }
      
      try {
        return new target();
      } catch (e) {
        console.error('Failed to instantiate:', target.name, e);
        return target;
      }
    }
    
    if (typeof target === 'object' && target !== null) {
      if ('canActivate' in target || 'transform' in target || 'intercept' in target || 'catch' in target) {
        return target;
      }
    }
    
    return target;
  }
}
