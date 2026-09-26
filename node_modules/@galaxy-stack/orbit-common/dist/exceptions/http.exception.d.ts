export declare class HttpException extends Error {
    private readonly response;
    private readonly status;
    constructor(response: string | Record<string, any>, status: number);
    private initMessage;
    private initName;
    getResponse(): string | Record<string, any>;
    getStatus(): number;
    toJSON(): Record<string, any>;
}
export declare class BadRequestException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class UnauthorizedException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class ForbiddenException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class NotFoundException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class MethodNotAllowedException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class NotAcceptableException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class ConflictException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class GoneException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class PayloadTooLargeException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class UnsupportedMediaTypeException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class UnprocessableEntityException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class InternalServerErrorException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class NotImplementedException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class BadGatewayException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class ServiceUnavailableException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
export declare class GatewayTimeoutException extends HttpException {
    constructor(message?: string | Record<string, any>);
}
