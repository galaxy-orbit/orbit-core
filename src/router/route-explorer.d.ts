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
    handle(route: RouteDefinition, request: Request, pathParams: Record<string, string>): Promise<Response>;
    private getParamMetadata;
    private resolveParams;
    private applyHttpMetadata;
}
//# sourceMappingURL=route-explorer.d.ts.map