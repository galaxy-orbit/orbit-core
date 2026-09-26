import 'reflect-metadata';
import type { Type } from '../interfaces/type.interface';
export interface ArgumentMetadata {
    type: 'body' | 'query' | 'param' | 'custom';
    metatype?: Type;
    data?: string;
}
export interface PipeTransform<T = any, R = any> {
    transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}
export declare function UsePipes(...pipes: (Type<PipeTransform> | PipeTransform)[]): MethodDecorator & ClassDecorator;
export declare function getPipes(target: Object, propertyKey?: string | symbol): (Type<PipeTransform> | PipeTransform)[];
