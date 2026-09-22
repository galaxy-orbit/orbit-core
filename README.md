# @galaxy-stack/orbit-core

[![npm version](https://img.shields.io/npm/v/@galaxy-stack/orbit-core.svg)](https://www.npmjs.com/package/@galaxy-stack/orbit-core)
[![docs](https://img.shields.io/badge/docs-galaxy--orbit--framework.vercel.app-blue)](https://galaxy-orbit-framework.vercel.app)

Part of the [Orbit framework](https://github.com/galaxy-orbit/orbit) — a NestJS-style backend framework for [Bun](https://bun.sh).

## Installation

```bash
bun add @galaxy-stack/orbit-core
```

# @galaxy-stack/orbit-core

## Mô tả
Package cốt lõi của Orbit framework, cung cấp nền tảng cho toàn bộ hệ thống.

## Tính năng chính

### 1. Dependency Injection Container
- IoC container tự động resolve dependencies
- Hỗ trợ 3 scope: `DEFAULT` (singleton), `REQUEST`, `TRANSIENT`
- Sử dụng `reflect-metadata` để extract type từ constructor

```typescript
import { Injectable, Inject } from '@galaxy-stack/orbit-core';

@Injectable()
class UserService {
  constructor(
    @Inject('DATABASE') private db: Database
  ) {}
}
```

### 2. Module System
- Tổ chức code theo modules
- Hỗ trợ `imports`, `controllers`, `providers`, `exports`
- Dynamic modules với `forRoot()` và `forRootAsync()`

```typescript
import { Module } from '@galaxy-stack/orbit-core';

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
class AppModule {}
```

### 3. Routing & Controllers
- Decorator-based routing: `@Controller()`, `@Get()`, `@Post()`, etc.
- Parameter decorators: `@Body()`, `@Query()`, `@Param()`, `@Headers()`
- Response handling tự động

```typescript
import { Controller, Get, Post, Body, Param } from '@galaxy-stack/orbit-core';

@Controller('users')
class UserController {
  @Get(':id')
  getUser(@Param('id') id: string) {
    return { id };
  }

  @Post()
  createUser(@Body() data: CreateUserDto) {
    return data;
  }
}
```

### 4. Pipeline System
- **Guards**: Kiểm tra authentication/authorization
- **Pipes**: Transform và validate request data
- **Interceptors**: Xử lý request/response
- **Exception Filters**: Xử lý lỗi

### 5. Middleware
- Global middleware qua `app.use()`
- Route-specific middleware
- Tích hợp với DI container

### 6. Lifecycle Hooks
- `OnModuleInit`: Sau khi module được khởi tạo
- `OnModuleDestroy`: Trước khi module bị hủy
- `OnApplicationBootstrap`: Sau khi app khởi động
- `OnApplicationShutdown`: Khi app shutdown

### 7. API Versioning
- URI versioning: `/v1/users`, `/v2/users`
- Header versioning: `X-API-Version: 1`
- Media type versioning

```typescript
import { Version, VERSION_NEUTRAL } from '@galaxy-stack/orbit-core';

@Controller('users')
@Version('1')
class UserControllerV1 {}

@Controller('users')
@Version(['2', '3'])
class UserControllerV2 {}
```

## Cách sử dụng

```typescript
import { BunFactory, Module, Controller, Get } from '@galaxy-stack/orbit-core';

@Controller()
class AppController {
  @Get()
  hello() {
    return { message: 'Hello Orbit!' };
  }
}

@Module({
  controllers: [AppController],
})
class AppModule {}

const app = await BunFactory.create(AppModule);
await app.listen(3000);
```

## Luồng hoạt động

```
Request → Middleware → Guards → Pipes → Controller → Interceptors → Response
                                          ↓
                                    Service Layer
                                          ↓
                                    Repository/DB
```
