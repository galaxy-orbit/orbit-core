export interface HttpArgumentsHost {
    getRequest<T = any>(): T;
    getResponse<T = any>(): T;
}
export interface ExecutionContext {
    getRequest<T = any>(): T;
    getResponse<T = any>(): T;
    getHandler(): Function;
    getClass(): Function;
    switchToHttp(): HttpArgumentsHost;
}
