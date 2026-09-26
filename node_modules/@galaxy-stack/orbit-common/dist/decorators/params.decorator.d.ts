import 'reflect-metadata';
export declare enum ParamType {
    BODY = "body",
    QUERY = "query",
    PARAM = "param",
    HEADERS = "headers",
    REQUEST = "request",
    RESPONSE = "response",
    IP = "ip",
    SESSION = "session",
    FILE = "file",
    FILES = "files"
}
export interface ParamMetadata {
    type: ParamType;
    data?: string;
    index: number;
}
export declare const Body: (data?: string) => ParameterDecorator;
export declare const Query: (data?: string) => ParameterDecorator;
export declare const Param: (data?: string) => ParameterDecorator;
export declare const Headers: (data?: string) => ParameterDecorator;
export declare const Req: (data?: string) => ParameterDecorator;
export declare const Request: (data?: string) => ParameterDecorator;
export declare const Res: (data?: string) => ParameterDecorator;
export declare const Response: (data?: string) => ParameterDecorator;
export declare const Ip: (data?: string) => ParameterDecorator;
export declare const Session: (data?: string) => ParameterDecorator;
export declare const UploadedFile: (data?: string) => ParameterDecorator;
export declare const UploadedFiles: (data?: string) => ParameterDecorator;
export declare function getParamMetadata(target: Object, propertyKey: string | symbol): ParamMetadata[];
