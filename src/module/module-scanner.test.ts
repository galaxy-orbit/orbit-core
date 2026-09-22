import { describe, test, expect } from 'bun:test';
import 'reflect-metadata';
import { ModuleScanner } from './module-scanner';
import { Module } from '../decorators/module.decorator';
import { Injectable } from '../decorators/injectable.decorator';
import { Controller } from '../decorators/controller.decorator';
import type { DynamicModule } from '../interfaces/module.interface';

@Injectable()
class UserService {}

@Controller('users')
class UserController {}

@Injectable()
class OrderService {}

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
class UsersModule {}

@Module({
  imports: [UsersModule],
  providers: [OrderService],
})
class OrdersModule {}

describe('ModuleScanner — static modules', () => {
  test('extracts controllers, providers and exports from @Module metadata', async () => {
    const scanner = new ModuleScanner();
    const compiled = await scanner.scan(UsersModule);

    expect(compiled.metatype).toBe(UsersModule);
    expect(compiled.controllers).toEqual([UserController]);
    expect(compiled.providers).toEqual([UserService]);
    expect(compiled.exports).toEqual([UserService]);
  });

  test('recursively scans imported modules', async () => {
    const scanner = new ModuleScanner();
    const compiled = await scanner.scan(OrdersModule);

    expect(compiled.controllers).toEqual([]);
    expect(compiled.providers).toEqual([OrderService]);
    expect(compiled.imports).toHaveLength(1);
    expect(compiled.imports[0].metatype).toBe(UsersModule);
    expect(compiled.imports[0].providers).toEqual([UserService]);
  });

  test('caches compiled modules (same instance on repeated scan)', async () => {
    const scanner = new ModuleScanner();
    const first = await scanner.scan(UsersModule);
    const second = await scanner.scan(UsersModule);
    expect(first).toBe(second);
  });

  test('getAllModules lists every visited module', async () => {
    const scanner = new ModuleScanner();
    await scanner.scan(OrdersModule);
    const all = scanner.getAllModules();
    expect(all.map(m => m.metatype).sort((a, b) => String(a).localeCompare(String(b)))).toEqual([
      OrdersModule,
      UsersModule,
    ]);
  });

  test('no global providers for static modules', async () => {
    const scanner = new ModuleScanner();
    await scanner.scan(OrdersModule);
    expect(scanner.getGlobalProviders()).toEqual([]);
  });
});

describe('ModuleScanner — dynamic modules', () => {
  test('scans DynamicModule metadata', async () => {
    @Injectable()
    class DbService {}

    const DynamicDb: DynamicModule = {
      module: class DbModule {},
      providers: [DbService],
      exports: [DbService],
      controllers: [],
    };

    const scanner = new ModuleScanner();
    const compiled = await scanner.scan(DynamicDb);
    expect(compiled.providers).toEqual([DbService]);
    expect(compiled.exports).toEqual([DbService]);
  });

  test('collects providers from global dynamic modules', async () => {
    @Injectable()
    class GlobalSvc {}

    const GlobalFeature: DynamicModule = {
      module: class GlobalModule {},
      providers: [GlobalSvc],
      exports: [GlobalSvc],
      global: true,
    };

    const scanner = new ModuleScanner();
    await scanner.scan(GlobalFeature);
    expect(scanner.getGlobalProviders()).toContain(GlobalSvc);
  });
});

describe('ModuleScanner — import resolution', () => {
  test('resolves forward references', async () => {
    const LazyModule = class LazyModule {};
    Module({ controllers: [], providers: [], exports: [] })(LazyModule as any);

    @Module({ imports: [{ forwardRef: () => LazyModule } as any] })
    class HostModule {}

    const scanner = new ModuleScanner();
    const compiled = await scanner.scan(HostModule);
    expect(compiled.imports[0].metatype).toBe(LazyModule);
  });

  test('resolves dynamic-import style arrow functions', async () => {
    @Module({ controllers: [], providers: [], exports: [] })
    class InnerModule {}

    @Module({ imports: [() => InnerModule] })
    class OuterModule {}

    const scanner = new ModuleScanner();
    const compiled = await scanner.scan(OuterModule);
    expect(compiled.imports[0].metatype).toBe(InnerModule);
  });
});

describe('ModuleScanner — export resolution', () => {
  test('resolves string and symbol tokens', async () => {
    const TOKEN = Symbol('TOKEN');

    const Dyn: DynamicModule = {
      module: class TokenModule {},
      providers: [
        { provide: 'STRING_TOKEN', useValue: 1 },
        { provide: TOKEN, useValue: 2 },
      ],
      exports: ['STRING_TOKEN', TOKEN],
      controllers: [],
    };

    const scanner = new ModuleScanner();
    const compiled = await scanner.scan(Dyn);
    expect(compiled.exports).toContain('STRING_TOKEN');
    expect(compiled.exports).toContain(TOKEN);
  });

  test('resolves provider objects to their provide token', async () => {
    const Dyn: DynamicModule = {
      module: class ProviderObjModule {},
      providers: [{ provide: 'CONFIG', useValue: { a: 1 } }],
      exports: [{ provide: 'CONFIG', useValue: { a: 1 } }],
      controllers: [],
    };

    const scanner = new ModuleScanner();
    const compiled = await scanner.scan(Dyn);
    expect(compiled.exports).toEqual(['CONFIG']);
  });
});
