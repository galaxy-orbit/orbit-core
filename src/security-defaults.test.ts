import { describe, test, expect, afterAll } from 'bun:test';
import 'reflect-metadata';
import { OrbitFactory, Module, Controller, Get } from './index';

@Controller('hello')
class HelloController {
  @Get()
  hello() {
    return { message: 'hi' };
  }
}

@Module({ controllers: [HelloController] })
class AppModule {}

describe('OrbitApplication secure headers (default on)', () => {
  test('applies secure headers by default', async () => {
    const app = await OrbitFactory.create(AppModule);
    await app.listen(0);
    try {
      const res = await fetch(`http://localhost:${app.port}/hello`);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
      expect(res.headers.get('X-Powered-By')).toBeNull();
    } finally {
      await app.close();
    }
  });

  test('applies headers to error responses too', async () => {
    const app = await OrbitFactory.create(AppModule);
    await app.listen(0);
    try {
      const res = await fetch(`http://localhost:${app.port}/nope`);
      expect(res.status).toBe(404);
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    } finally {
      await app.close();
    }
  });

  test('security: false disables headers', async () => {
    const app = await OrbitFactory.create(AppModule, { security: false });
    await app.listen(0);
    try {
      const res = await fetch(`http://localhost:${app.port}/hello`);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Content-Type-Options')).toBeNull();
      expect(res.headers.get('X-Frame-Options')).toBeNull();
    } finally {
      await app.close();
    }
  });

  test('security object customizes headers', async () => {
    const app = await OrbitFactory.create(AppModule, {
      security: { frameguard: 'DENY' },
    });
    await app.listen(0);
    try {
      const res = await fetch(`http://localhost:${app.port}/hello`);
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    } finally {
      await app.close();
    }
  });
});
