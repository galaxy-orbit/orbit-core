import 'reflect-metadata';
import type { Container } from '../container/container';
import type { Type } from '../interfaces/type.interface';
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
export declare class ExecutionPipeline {
    private container;
    /** Per-controller pipeline metadata, resolved once instead of per request. */
    private metaCache;
    constructor(container: Container);
    private getCachedMeta;
    /** True when the handler has registered pipes (parameter transformation). */
    hasPipes(controllerClass: Type, methodName: string): boolean;
    execute(request: Request, controllerClass: Type, controllerInstance: any, handler: Function, methodName: string, handlerFn: () => Promise<any>): Promise<Response>;
    private runGuards;
    private runInterceptors;
    transformWithPipes(value: any, metadata: ArgumentMetadata, controllerClass: Type, instance: any, methodName: string): Promise<any>;
    private handleException;
    private transformToResponse;
    private getGuards;
    private getPipes;
    private getInterceptors;
    private getFilters;
    private resolveInstance;
}
