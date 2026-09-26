import 'reflect-metadata';
import type { Type } from '../interfaces/type.interface';
import type { ExecutionContext } from '../interfaces/execution-context.interface';
export interface CallHandler<T = any> {
    handle(): Promise<T>;
}
export interface OrbitInterceptor<T = any, R = any> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R>;
}
export declare function UseInterceptors(...interceptors: (Type<OrbitInterceptor> | OrbitInterceptor)[]): MethodDecorator & ClassDecorator;
export declare function getInterceptors(target: Object, propertyKey?: string | symbol): (Type<OrbitInterceptor> | OrbitInterceptor)[];
