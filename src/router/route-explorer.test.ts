import { describe, test, expect, beforeEach } from 'bun:test';
import 'reflect-metadata';
import { RouteExplorer, RequestHandler } from './route-explorer';
import { Controller, Get, Post, Injectable } from '../decorators';
import { Container } from '../container/container';
import { Body, Param, Query, HttpCode } from '@galaxy-stack/orbit-common';
import { NotFoundException } from '../exceptions';

describe('RouteExplorer', () => {
  let container: Container;
  let explorer: RouteExplorer;

  beforeEach(() => {
    container = new Container();
    explorer = new RouteExplorer(container);
  });

  test('discovers routes from decorated controller methods', async () => {
    @Controller('/cats')
    class CatsController {
      @Get()
      list() {
        return [];
      }

      @Get(':id')
      get() {
        return {};
      }

      @Post()
      create() {
        return {};
      }
    }

    const routes = await explorer.explore([CatsController]);

    expect(routes).toHaveLength(3);

    const byPath = (path: string, method: string) =>
      routes.find(r => r.path === path && r.method === method);

    expect(byPath('/cats', 'GET')).toBeDefined();
    expect(byPath('/cats/:id', 'GET')).toBeDefined();
    expect(byPath('/cats', 'POST')).toBeDefined();
  });

  test('@Get() without a path registers the controller root', async () => {
    @Controller()
    class RootController {
      @Get()
      root() {
        return {};
      }
    }

    const routes = await explorer.explore([RootController]);

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/');
    expect(routes[0].method).toBe('GET');
  });

  test('routes reference controller and handler', async () => {
    @Controller('/health')
    class HealthController {
      @Get('/live')
      live() {
        return { ok: true };
      }
    }

    const routes = await explorer.explore([HealthController]);

    expect(routes[0].controller).toBe(HealthController);
    expect(routes[0].methodName).toBe('live');
  });
});

describe('RequestHandler', () => {
  let container: Container;
  let explorer: RouteExplorer;
  let handler: RequestHandler;

  @Injectable()
  @Controller('/api')
  class ApiController {
    @Get('/users/:id')
    getUser(@Param('id') id: string, @Query('verbose') verbose: string) {
      return { id, verbose: verbose === 'true' };
    }

    @Post('/echo')
    echo(@Body() body: any) {
      return { got: body };
    }

    @Post('/created')
    @HttpCode(201)
    created(@Body() body: any) {
      return body;
    }

    @Get('/missing/:id')
    missing(@Param('id') id: string) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }

  beforeEach(() => {
    container = new Container();
    container.register(ApiController);
    explorer = new RouteExplorer(container);
    handler = new RequestHandler(container);
  });

  const findRoute = async (method: string, path: string) => {
    const routes = await explorer.explore([ApiController]);
    const route = routes.find(r => r.method === method && r.path === path);
    if (!route) throw new Error(`Route ${method} ${path} not found`);
    return route;
  };

  test('passes @Param and @Query values to the handler', async () => {
    const route = await findRoute('GET', '/api/users/:id');
    const request = new Request('http://localhost/api/users/7?verbose=true');

    const response = await handler.handle(route, request, { id: '7' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: '7', verbose: true });
  });

  test('parses JSON request bodies for @Body', async () => {
    const route = await findRoute('POST', '/api/echo');
    const request = new Request('http://localhost/api/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hello: 'galaxy' }),
    });

    const response = await handler.handle(route, request, {});

    expect(await response.json()).toEqual({ got: { hello: 'galaxy' } });
  });

  test('applies @HttpCode metadata to the response', async () => {
    const route = await findRoute('POST', '/api/created');
    const request = new Request('http://localhost/api/created', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    });

    const response = await handler.handle(route, request, {});

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true });
  });

  test('maps HttpException thrown from common to a JSON error response', async () => {
    const route = await findRoute('GET', '/api/missing/:id');
    const request = new Request('http://localhost/api/missing/9');

    const response = await handler.handle(route, request, { id: '9' });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('User 9 not found');
  });
});
