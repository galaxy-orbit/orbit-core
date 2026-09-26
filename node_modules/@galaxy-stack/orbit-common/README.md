# @galaxy-stack/orbit-common

[![npm version](https://img.shields.io/npm/v/@galaxy-stack/orbit-common.svg)](https://www.npmjs.com/package/@galaxy-stack/orbit-common)
[![docs](https://img.shields.io/badge/docs-galaxy--orbit--framework.vercel.app-blue)](https://galaxy-orbit-framework.vercel.app)

Part of the [Orbit framework](https://github.com/galaxy-orbit/packages) — a NestJS-style backend framework for [Bun](https://bun.sh).

## Installation

```bash
bun add @galaxy-stack/orbit-common
```

# @galaxy-stack/orbit-common

## Mô tả
Package chứa các decorators, pipes, guards, interceptors và exceptions dùng chung trong Orbit framework.

## Tính năng chính

### 1. HTTP Decorators
```typescript
import { 
  Controller, 
  Get, Post, Put, Patch, Delete,
  Body, Query, Param, Headers, Req, Res
} from '@galaxy-stack/orbit-common';

@Controller('api')
class ApiController {
  @Get('items')
  getItems(@Query('page') page: string) {}

  @Post('items')
  createItem(@Body() data: any) {}
}
```

### 2. Built-in Pipes
- `ParseIntPipe`: Chuyển string thành number
- `ParseFloatPipe`: Chuyển string thành float
- `ParseBoolPipe`: Chuyển string thành boolean
- `ParseArrayPipe`: Chuyển string thành array
- `DefaultValuePipe`: Giá trị mặc định
- `TrimPipe`: Xóa khoảng trắng

```typescript
@Get(':id')
getUser(@Param('id', ParseIntPipe) id: number) {
  // id đã được convert sang number
}
```

### 3. HTTP Exceptions
```typescript
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@galaxy-stack/orbit-common';

throw new NotFoundException('User not found');
```

### 4. Guards
```typescript
import { CanActivate, ExecutionContext } from '@galaxy-stack/orbit-common';

class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.headers.authorization;
  }
}
```

### 5. Interceptors
```typescript
import { Interceptor, ExecutionContext } from '@galaxy-stack/orbit-common';

class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: () => Promise<any>) {
    console.log('Before...');
    const result = await next();
    console.log('After...');
    return result;
  }
}
```

## Cách sử dụng

```typescript
import { 
  Controller, Get, UseGuards, UsePipes,
  ParseIntPipe, AuthGuard 
} from '@galaxy-stack/orbit-common';

@Controller('users')
@UseGuards(AuthGuard)
class UserController {
  @Get(':id')
  @UsePipes(ParseIntPipe)
  getUser(@Param('id') id: number) {
    return { id };
  }
}
```
