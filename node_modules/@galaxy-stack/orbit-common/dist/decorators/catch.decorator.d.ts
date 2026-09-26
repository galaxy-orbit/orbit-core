import 'reflect-metadata';
import type { Type } from '../interfaces/type.interface';
export interface ArgumentsHost {
    getArgs<T extends any[] = any[]>(): T;
    getArgByIndex<T = any>(index: number): T;
    getType<T extends string = string>(): T;
}
export interface HttpArgumentsHost {
    getRequest<T = any>(): T;
    getResponse<T = any>(): T;
    getNext<T = any>(): T;
}
export interface ExceptionFilter<T = any> {
    catch(exception: T, host: ArgumentsHost): any;
}
export declare function Catch(...exceptions: Type<any>[]): ClassDecorator;
export declare function UseFilters(...filters: (Type<ExceptionFilter> | ExceptionFilter)[]): MethodDecorator & ClassDecorator;
export declare function getCatchExceptions(target: Type): Type<any>[];
export declare function getFilters(target: Object, propertyKey?: string | symbol): (Type<ExceptionFilter> | ExceptionFilter)[];
