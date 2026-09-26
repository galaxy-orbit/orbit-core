export interface Type<T = any> extends Function {
    new (...args: any[]): T;
}
export interface Abstract<T = any> extends Function {
    prototype: T;
}
export type InjectionToken<T = any> = string | symbol | Type<T> | Abstract<T>;
