import 'reflect-metadata';
export declare function HttpCode(statusCode: number): MethodDecorator;
export declare function Header(name: string, value: string): MethodDecorator;
export declare function Redirect(url: string, statusCode?: number): MethodDecorator;
export declare function Render(template: string): MethodDecorator;
export declare function getHttpCode(target: Object, propertyKey: string | symbol): number | undefined;
export declare function getHeaders(target: Object, propertyKey: string | symbol): Record<string, string>;
export declare function getRedirect(target: Object, propertyKey: string | symbol): {
    url: string;
    statusCode: number;
} | undefined;
