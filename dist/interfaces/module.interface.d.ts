import type { Type, InjectionToken } from './type.interface';
import type { Provider } from './provider.interface';
/**
 * A module import may be:
 * - a module class (`Type`)
 * - a `DynamicModule` object
 * - a `ForwardReference` (created by `forwardRef()`)
 * - a lazy resolver: `() => Type | DynamicModule`
 */
export type ModuleImport = Type | DynamicModule | ForwardReference | (() => Type | DynamicModule);
export interface ModuleMetadata {
    imports?: ModuleImport[];
    controllers?: Type[];
    providers?: Provider[];
    exports?: (InjectionToken | Provider)[];
}
export interface DynamicModule extends ModuleMetadata {
    module: Type;
    global?: boolean;
}
export interface ForwardReference<T = any> {
    forwardRef: () => T;
}
export declare function forwardRef<T>(fn: () => T): ForwardReference<T>;
export declare function isForwardReference<T>(ref: any): ref is ForwardReference<T>;
