import 'reflect-metadata';
import type { Type } from '../interfaces/type.interface';
import type { HttpMethod } from '../decorators/http-methods.decorator';
import { Container } from '../container/container';
export interface RouteDefinition {
    path: string;
    method: HttpMethod;
    controller: Type;
    methodName: string;
    handler: Function;
}
export interface ParamMetadata {
    type: 'body' | 'query' | 'param' | 'headers' | 'request' | 'response' | 'ip' | 'session';
    data?: string;
    index: number;
}
export declare class RouteExplorer {
    private container;
    private routes;
    constructor(container: Container);
    explore(controllers: Type[]): Promise<RouteDefinition[]>;
    private exploreController;
    private joinPaths;
    getParamMetadata(target: Object, methodName: string): ParamMetadata[];
}
export declare class RequestHandler {
    private container;
    private pipeline;
    constructor(container: Container);
    /** Sorted param metadata per controller+method, computed once. */
    private paramCache;
    private getCachedParams;
    handle(route: RouteDefinition, request: Request, pathParams: Record<string, string>): Promise<Response>;
    private getParamMetadata;
    /**
     * Synchronous argument resolution for handlers that only consume
     * @Param / @Req (no query string, body or header parsing needed).
     */
    private resolveParamsSync;
    /**
     * Asynchronous argument resolution. Query string, body and header objects
     * are parsed lazily — only when at least one parameter decorator needs them.
     */
    private resolveParamsAsync;
    private applyHttpMetadata;
}
