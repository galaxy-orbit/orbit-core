import { describe, test, expect, beforeEach } from 'bun:test';
import 'reflect-metadata';
import { ExecutionPipeline, type CallHandler } from './execution-pipeline';
import { Injectable } from '../decorators';
import { Container } from '../container/container';
import {
  UseGuards,
  UseInterceptors,
  UsePipes,
  UseFilters,
  BadRequestException as CommonBadRequestException,
} from '@galaxy-stack/orbit-common';
import { HttpException } from '../exceptions';

@Injectable()
class DenyGuard {
  canActivate() {
    return false;
  }
}

@Injectable()
class AllowGuard {
  canActivate() {
    return true;
  }
}

@Injectable()
class TaggingInterceptor {
  async intercept(context: any, next: CallHandler<any>) {
    const result = await next.handle();
    return { tagged: true, result };
  }
}

class UppercasePipe {
  transform(value: any) {
    return typeof value === 'string' ? value.toUpperCase() : value;
  }
}

@Injectable()
class LoggingFilter {
  catch(exception: any) {
    return new Response(
      JSON.stringify({ handled: true, message: exception.message }),
      { status: 418, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

describe('ExecutionPipeline', () => {
  let container: Container;
  let pipeline: ExecutionPipeline;

  beforeEach(() => {
    container = new Container();
    pipeline = new ExecutionPipeline(container);
  });

  const run = (controllerClass: any, handlerFn: () => any) =>
    pipeline.execute(
      new Request('http://localhost/test'),
      controllerClass,
      new controllerClass(),
      controllerClass.prototype.test,
      'test',
      handlerFn
    );

  test('returns 403 when a guard denies access', async () => {
    @UseGuards(DenyGuard)
    class BlockedController {
      test() {
        return { secret: 'nope' };
      }
    }

    const response = await run(BlockedController, async () => ({}));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.statusCode).toBe(403);
  });

  test('runs the handler when guards pass', async () => {
    @UseGuards(AllowGuard)
    class OpenController {
      test() {
        return { ok: true };
      }
    }

    const response = await run(OpenController, async () => ({ ok: true }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  test('wraps handler results through interceptors', async () => {
    @UseInterceptors(TaggingInterceptor)
    class InterceptedController {
      test() {
        return { value: 1 };
      }
    }

    const response = await run(InterceptedController, async () => ({ value: 1 }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tagged: true, result: { value: 1 } });
  });

  test('transforms values through pipes', async () => {
    @UsePipes(UppercasePipe)
    class PipelinedController {
      test() {
        return {};
      }
    }

    const instance = new PipelinedController();
    const result = await pipeline.transformWithPipes(
      'hello',
      { type: 'query', data: 'q' },
      PipelinedController,
      instance,
      'test'
    );

    expect(result).toBe('HELLO');
  });

  test('maps HttpException subclasses to their HTTP status', async () => {
    class ThrowingController {
      test() {
        return {};
      }
    }

    const response = await run(ThrowingController, async () => {
      throw new CommonBadRequestException('payload invalid');
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('payload invalid');
  });

  test('matches exceptions imported from common via instanceof', async () => {
    // Regression test for the core/common exception merge: an exception
    // imported from @galaxy-stack/orbit-common must be recognized by the pipeline.
    const commonError = new CommonBadRequestException('cross-package');
    const coreError: HttpException = commonError;

    expect(coreError).toBeInstanceOf(HttpException);
    expect(coreError.getStatus()).toBe(400);
  });

  test('uses exception filters when registered', async () => {
    @UseFilters(LoggingFilter)
    class FilteredController {
      test() {
        return {};
      }
    }

    const response = await run(FilteredController, async () => {
      throw new Error('boom');
    });

    expect(response.status).toBe(418);
    const body = await response.json();
    expect(body.handled).toBe(true);
    expect(body.message).toBe('boom');
  });

  test('returns 204 for undefined results', async () => {
    class EmptyController {
      test() {
        return {};
      }
    }

    const response = await run(EmptyController, async () => undefined);

    expect(response.status).toBe(204);
  });
});
