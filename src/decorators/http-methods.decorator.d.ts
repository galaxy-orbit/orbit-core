import 'reflect-metadata';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'ALL';
export declare const Get: (path?: string) => MethodDecorator;
export declare const Post: (path?: string) => MethodDecorator;
export declare const Put: (path?: string) => MethodDecorator;
export declare const Patch: (path?: string) => MethodDecorator;
export declare const Delete: (path?: string) => MethodDecorator;
export declare const Head: (path?: string) => MethodDecorator;
export declare const Options: (path?: string) => MethodDecorator;
export declare const All: (path?: string) => MethodDecorator;
//# sourceMappingURL=http-methods.decorator.d.ts.map