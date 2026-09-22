import { describe, test, expect, beforeEach } from 'bun:test';
import 'reflect-metadata';
import { Container } from './container';
import { Injectable, Inject, Optional } from '../decorators';
import { Scope } from '../interfaces/provider.interface';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('resolves an @Injectable class as a singleton', async () => {
    @Injectable()
    class CounterService {
      value = 42;
    }

    const first = await container.resolve(CounterService);
    const second = await container.resolve(CounterService);

    expect(first.value).toBe(42);
    expect(first).toBe(second);
  });

  test('injects constructor dependencies', async () => {
    @Injectable()
    class UserRepository {
      find() {
        return 'user-data';
      }
    }

    @Injectable()
    class UserService {
      constructor(private readonly userRepository: UserRepository) {}

      getUser() {
        return this.userRepository.find();
      }
    }

    container.register(UserRepository);
    container.register(UserService);

    const service = await container.resolve(UserService);
    expect(service.getUser()).toBe('user-data');
  });

  test('resolves value providers by string token', async () => {
    container.register({ provide: 'CONFIG', useValue: { env: 'test' } });

    const config = await container.resolve<{ env: string }>('CONFIG');
    expect(config.env).toBe('test');
  });

  test('injects @Inject tokens into constructors', async () => {
    @Injectable()
    class TokenService {
      constructor(@Inject('SECRET') public readonly secret: string) {}
    }

    container.register({ provide: 'SECRET', useValue: 'abc123' });
    container.register(TokenService);

    const service = await container.resolve(TokenService);
    expect(service.secret).toBe('abc123');
  });

  test('resolves factory providers with injected dependencies', async () => {
    @Injectable()
    class Database {
      connected = true;
    }

    container.register(Database);
    container.register({
      provide: 'DB_CLIENT',
      useFactory: (db: Database) => ({ db }),
      inject: [Database],
    });

    const client = await container.resolve<{ db: Database }>('DB_CLIENT');
    expect(client.db).toBeInstanceOf(Database);
    expect(client.db.connected).toBe(true);
  });

  test('resolves async factory providers', async () => {
    container.register({
      provide: 'ASYNC_VALUE',
      useFactory: async () => 'async-result',
    });

    expect(await container.resolve<string>('ASYNC_VALUE')).toBe('async-result');
  });

  test('resolves existing providers as aliases', async () => {
    @Injectable()
    class RealService {
      ok = 'yes';
    }

    container.register(RealService);
    container.register({ provide: 'ALIAS', useExisting: RealService });

    const alias = await container.resolve<RealService>('ALIAS');
    expect(alias).toBeInstanceOf(RealService);
  });

  test('resolves useClass redirects', async () => {
    abstract class Shape {
      abstract area(): number;
    }

    class Square extends Shape {
      area() {
        return 9;
      }
    }

    container.register({ provide: Shape, useClass: Square });

    const shape = await container.resolve(Shape);
    expect(shape.area()).toBe(9);
  });

  test('REQUEST scope creates a new instance per resolution', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class RequestState {
      id = Math.random();
    }

    const first = await container.resolve<RequestState>(RequestState);
    const second = await container.resolve<RequestState>(RequestState);

    expect(first).not.toBe(second);
  });

  test('TRANSIENT scope creates a new instance per resolution', async () => {
    @Injectable({ scope: Scope.TRANSIENT })
    class TransientService {
      id = Math.random();
    }

    const first = await container.resolve<TransientService>(TransientService);
    const second = await container.resolve<TransientService>(TransientService);

    expect(first).not.toBe(second);
  });

  test('throws a helpful error for unregistered string tokens', async () => {
    await expect(container.resolve('MISSING_TOKEN')).rejects.toThrow(
      /No provider found for MISSING_TOKEN/
    );
  });

  test('detects circular dependencies', async () => {
    @Injectable()
    class ServiceA {
      constructor(@Inject('TOKEN_B') public readonly b: any) {}
    }

    @Injectable()
    class ServiceB {
      constructor(@Inject('TOKEN_A') public readonly a: any) {}
    }

    container.register({ provide: 'TOKEN_A', useClass: ServiceA });
    container.register({ provide: 'TOKEN_B', useClass: ServiceB });

    await expect(container.resolve('TOKEN_A')).rejects.toThrow(
      /Circular dependency detected/
    );
  });

  test('supports @Optional dependencies', async () => {
    @Injectable()
    class OptionalService {
      constructor(@Optional() public readonly maybe: any) {}
    }

    container.register(OptionalService);

    const service = await container.resolve(OptionalService);
    expect(service.maybe).toBeUndefined();
  });

  test('auto-registers injectable classes resolved on demand', async () => {
    @Injectable()
    class OrphanService {
      ok = true;
    }

    const instance = await container.resolve(OrphanService);

    expect(instance.ok).toBe(true);
    expect(container.has(OrphanService)).toBe(true);
  });

  test('clear removes all registrations', async () => {
    container.register({ provide: 'CONFIG', useValue: { env: 'test' } });
    expect(container.has('CONFIG')).toBe(true);

    container.clear();

    expect(container.has('CONFIG')).toBe(false);
  });

  test('getAllInstances resolves lazily registered providers', async () => {
    @Injectable()
    class LazyService {
      ready = true;
    }

    container.register(LazyService);

    const instances = await container.getAllInstances();
    const lazy = instances.find(i => i instanceof LazyService);

    expect(lazy).toBeInstanceOf(LazyService);
  });
});
