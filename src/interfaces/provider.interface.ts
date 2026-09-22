import type { Type, InjectionToken } from './type.interface';

export enum Scope {
  DEFAULT = 'DEFAULT',
  REQUEST = 'REQUEST',
  TRANSIENT = 'TRANSIENT',
}

export interface ClassProvider<T = any> {
  provide: InjectionToken<T>;
  useClass: Type<T>;
  scope?: Scope;
}

export interface ValueProvider<T = any> {
  provide: InjectionToken<T>;
  useValue: T;
}

export interface FactoryProvider<T = any> {
  provide: InjectionToken<T>;
  useFactory: (...args: any[]) => T | Promise<T>;
  inject?: InjectionToken[];
  scope?: Scope;
}

export interface ExistingProvider<T = any> {
  provide: InjectionToken<T>;
  useExisting: InjectionToken<T>;
}

export type Provider<T = any> =
  | Type<T>
  | ClassProvider<T>
  | ValueProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>;

export function isClassProvider<T>(provider: Provider<T>): provider is ClassProvider<T> {
  return (provider as ClassProvider<T>).useClass !== undefined;
}

export function isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T> {
  return (provider as ValueProvider<T>).useValue !== undefined;
}

export function isFactoryProvider<T>(provider: Provider<T>): provider is FactoryProvider<T> {
  return (provider as FactoryProvider<T>).useFactory !== undefined;
}

export function isExistingProvider<T>(provider: Provider<T>): provider is ExistingProvider<T> {
  return (provider as ExistingProvider<T>).useExisting !== undefined;
}

export function getProviderToken<T>(provider: Provider<T>): InjectionToken<T> {
  if (typeof provider === 'function') {
    return provider;
  }
  return provider.provide;
}
