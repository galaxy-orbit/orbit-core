import type { Type, InjectionToken } from './type.interface';
export declare enum Scope {
    DEFAULT = "DEFAULT",
    REQUEST = "REQUEST",
    TRANSIENT = "TRANSIENT"
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
export type Provider<T = any> = Type<T> | ClassProvider<T> | ValueProvider<T> | FactoryProvider<T> | ExistingProvider<T>;
export declare function isClassProvider<T>(provider: Provider<T>): provider is ClassProvider<T>;
export declare function isValueProvider<T>(provider: Provider<T>): provider is ValueProvider<T>;
export declare function isFactoryProvider<T>(provider: Provider<T>): provider is FactoryProvider<T>;
export declare function isExistingProvider<T>(provider: Provider<T>): provider is ExistingProvider<T>;
export declare function getProviderToken<T>(provider: Provider<T>): InjectionToken<T>;
//# sourceMappingURL=provider.interface.d.ts.map