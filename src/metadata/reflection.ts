import 'reflect-metadata';
import { METADATA_KEYS } from './constants';
import type { Type } from '../interfaces/type.interface';

export class Reflector {
  static getMetadata<T>(key: string, target: object): T | undefined {
    return Reflect.getMetadata(key, target);
  }

  static getOwnMetadata<T>(key: string, target: object): T | undefined {
    return Reflect.getOwnMetadata(key, target);
  }

  static defineMetadata(key: string, value: unknown, target: object): void {
    Reflect.defineMetadata(key, value, target);
  }

  static hasMetadata(key: string, target: object): boolean {
    return Reflect.hasMetadata(key, target);
  }

  static getConstructorParams<T = unknown>(target: Type<T>): Type[] {
    return Reflect.getMetadata(METADATA_KEYS.PARAM_TYPES, target) || [];
  }

  static isInjectable(target: Function): boolean {
    return Reflect.hasMetadata(METADATA_KEYS.INJECTABLE, target);
  }

  static isController(target: Type): boolean {
    return Reflect.hasMetadata(METADATA_KEYS.CONTROLLER, target);
  }

  static isModule(target: Type): boolean {
    return Reflect.hasMetadata(METADATA_KEYS.MODULE, target);
  }

  static getControllerPath(target: Type): string {
    return Reflect.getMetadata(METADATA_KEYS.CONTROLLER, target) || '';
  }

  static getInjectionToken(target: Type, index: number): string | symbol | Type | undefined {
    const tokens = Reflect.getMetadata(METADATA_KEYS.INJECT_TOKEN, target) || {};
    return tokens[index];
  }

  static getAllMethodMetadata<T>(
    key: string,
    target: object
  ): Map<string | symbol, T> {
    const result = new Map<string | symbol, T>();
    const prototype = (target as any).prototype || target;
    
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      name => name !== 'constructor' && typeof prototype[name] === 'function'
    );
    
    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(key, prototype, methodName);
      if (metadata !== undefined) {
        result.set(methodName, metadata);
      }
    }
    
    return result;
  }
}
