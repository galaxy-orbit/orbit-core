import { describe, test, expect } from 'bun:test';
import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from './http.exception';
import * as commonExceptions from '@galaxy-stack/orbit-common';

describe('HttpException base class', () => {
  test('string response becomes the message', () => {
    const e = new HttpException('custom error', 418);
    expect(e.message).toBe('custom error');
    expect(e.getStatus()).toBe(418);
    expect(e.getResponse()).toBe('custom error');
  });

  test('object response with message array joins into message', () => {
    const e = new HttpException({ message: ['a', 'b'], error: 'Bad Request' }, 400);
    expect(e.message).toBe('a, b');
    expect(e.getResponse()).toEqual({ message: ['a', 'b'], error: 'Bad Request' });
  });

  test('name derives from constructor', () => {
    class TeapotException extends HttpException {}
    const e = new TeapotException('hot', 418);
    expect(e.name).toBe('TeapotException');
  });

  test('toJSON produces the wire format', () => {
    const e = new NotFoundException('user missing');
    expect(e.toJSON()).toEqual({
      statusCode: 404,
      message: 'user missing',
      error: 'NotFound',
    });
  });

  test('is an Error instance', () => {
    expect(new BadRequestException()).toBeInstanceOf(Error);
    expect(new BadRequestException()).toBeInstanceOf(HttpException);
  });
});

describe('built-in exception status codes', () => {
  const cases: Array<[() => HttpException, number, string]> = [
    [() => new BadRequestException(), 400, 'Bad Request'],
    [() => new UnauthorizedException(), 401, 'Unauthorized'],
    [() => new ForbiddenException(), 403, 'Forbidden'],
    [() => new NotFoundException(), 404, 'Not Found'],
    [() => new ConflictException(), 409, 'Conflict'],
    [() => new InternalServerErrorException(), 500, 'Internal Server Error'],
    [() => new ServiceUnavailableException(), 503, 'Service Unavailable'],
    [() => new GatewayTimeoutException(), 504, 'Gateway Timeout'],
  ];

  for (const [make, status, message] of cases) {
    test(`status ${status} with default message`, () => {
      const e = make();
      expect(e.getStatus()).toBe(status);
      expect(e.message).toBe(message);
    });
  }
});

describe('core/common exception interop', () => {
  test('core re-exports the same classes as orbit-common', () => {
    expect(BadRequestException).toBe(commonExceptions.BadRequestException);
    expect(HttpException).toBe(commonExceptions.HttpException);
    expect(InternalServerErrorException).toBe(commonExceptions.InternalServerErrorException);
  });

  test('instanceof works across package boundaries', () => {
    const fromCommon = new commonExceptions.NotFoundException();
    expect(fromCommon).toBeInstanceOf(NotFoundException);
    expect(fromCommon).toBeInstanceOf(HttpException);
  });

  test('custom subclass stays instanceof HttpException', () => {
    class PaymentRequiredException extends HttpException {
      constructor() { super('Payment Required', 402); }
    }
    const e = new PaymentRequiredException();
    expect(e.getStatus()).toBe(402);
    expect(e).toBeInstanceOf(HttpException);
  });
});
