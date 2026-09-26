/**
 * HTTP exceptions are canonically defined in `@galaxy-stack/orbit-common`.
 * Core re-exports them so that `instanceof` checks in the request
 * pipeline match exceptions imported from either package.
 */
export { HttpException, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException, MethodNotAllowedException, NotAcceptableException, ConflictException, GoneException, PayloadTooLargeException, UnsupportedMediaTypeException, UnprocessableEntityException, InternalServerErrorException, NotImplementedException, BadGatewayException, ServiceUnavailableException, GatewayTimeoutException, } from '@galaxy-stack/orbit-common';
//# sourceMappingURL=http.exception.d.ts.map