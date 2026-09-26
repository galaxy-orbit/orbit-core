import 'reflect-metadata';
import type { Type } from '../interfaces/type.interface';
export declare class Reflector {
    static getMetadata<T>(key: string, target: object): T | undefined;
    static getOwnMetadata<T>(key: string, target: object): T | undefined;
    static defineMetadata(key: string, value: unknown, target: object): void;
    static hasMetadata(key: string, target: object): boolean;
    static getConstructorParams<T = unknown>(target: Type<T>): Type[];
    static isInjectable(target: Function): boolean;
    static isController(target: Type): boolean;
    static isModule(target: Type): boolean;
    static getControllerPath(target: Type): string;
    static getInjectionToken(target: Type, index: number): string | symbol | Type | undefined;
    static getAllMethodMetadata<T>(key: string, target: object): Map<string | symbol, T>;
}
