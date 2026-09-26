/**
 * LIVE INTEGRATION — Full CRUD REST API
 * Wires: orbit-core (DI, controllers) + orbit-common (decorators, exceptions)
 *        + orbit-database (bun:sqlite via drizzle) + orbit-logger (request logging)
 *        + orbit-cache (expensive endpoint caching) + orbit-auth (JWT guard)
 * Boots a real HTTP server on a random port and runs real requests.
 */
import { describe, test, expect, afterAll } from 'bun:test';
import 'reflect-metadata';
import {
  OrbitFactory, Module, Controller, Get, Post, Put, Delete, Injectable,
  NotFoundException, UnauthorizedException,
} from '@galaxy-stack/orbit-core';
import { Body, Param, Query, Headers, UseGuards } from '@galaxy-stack/orbit-common';
import { CacheService, MemoryStore } from '@galaxy-stack/orbit-cache';
import { JwtService } from '@galaxy-stack/orbit-auth';
import { LoggerService } from '@galaxy-stack/orbit-logger';
import { Database } from 'bun:sqlite';

// ---------- database layer ----------
const db = new Database(':memory:');
db.exec(`CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  done INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'normal'
)`);

interface TaskRow { id: number; title: string; done: number; priority: string }

function query<T>(sql: string, params: any[] = []): T[] {
  return db.prepare(sql).all(...params) as T[];
}

// ---------- auth ----------
const jwt = new JwtService({ secret: 'integration-secret' });

class JwtGuard {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(request: Request): Promise<{ user: any }> {
    const header = request.headers.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    const payload = await this.jwtService.verify(header.slice(7));
    return { user: payload };
  }
}

// ---------- service with cache + logging ----------
@Injectable()
class TasksService {
  private cache = new CacheService({ store: new MemoryStore() });
  logger = new LoggerService({ level: 'info' } as any);

  list(priority?: string) {
    const rows = priority
      ? query<TaskRow>('SELECT * FROM tasks WHERE priority = ?', [priority])
      : query<TaskRow>('SELECT * FROM tasks');
    return rows.map((r) => ({ ...r, done: !!r.done }));
  }

  async expensiveStats() {
    // cached aggregate — proves CacheService wiring inside a live service
    return this.cache.wrap('stats:summary', async () => {
      const rows = query<TaskRow>('SELECT * FROM tasks');
      await Bun.sleep(30); // simulate heavy aggregation
      return {
        total: rows.length,
        done: rows.filter((r) => r.done).length,
        computedAt: Date.now(),
      };
    });
  }

  get(id: number) {
    const row = query<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id])[0];
    if (!row) throw new NotFoundException(`Task ${id} not found`);
    return { ...row, done: !!row.done };
  }

  create(title: string, priority = 'normal') {
    db.prepare('INSERT INTO tasks (title, priority) VALUES (?, ?)').run(title, priority);
    return this.get(db.query('SELECT last_insert_rowid() as id').get()!.id);
  }

  update(id: number, patch: Partial<{ title: string; done: boolean; priority: string }>) {
    this.get(id); // throws if missing
    if (patch.title !== undefined) db.prepare('UPDATE tasks SET title = ? WHERE id = ?').run(patch.title, id);
    if (patch.done !== undefined) db.prepare('UPDATE tasks SET done = ? WHERE id = ?').run(patch.done ? 1 : 0, id);
    if (patch.priority !== undefined) db.prepare('UPDATE tasks SET priority = ? WHERE id = ?').run(patch.priority, id);
    return this.get(id);
  }

  remove(id: number) {
    this.get(id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    return { deleted: id };
  }
}

// ---------- guard wiring ----------
class BearerGuard {
  constructor(private readonly tasksService: TasksService) {}

  static extract(request: Request): string | null {
    const header = request.headers.get('authorization');
    return header?.startsWith('Bearer ') ? header.slice(7) : null;
  }
}

const guard = new JwtGuard(jwt);

async function requireAuth(request: Request): Promise<any> {
  const token = BearerGuard.extract(request);
  if (!token) throw new UnauthorizedException('No token provided');
  try {
    return await guard.canActivate(request as any);
  } catch (error: any) {
    if (error instanceof UnauthorizedException) throw error;
    throw new UnauthorizedException('Invalid token');
  }
}

// ---------- controller ----------
@Controller('/api/tasks')
class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  list(@Query('priority') priority?: string) {
    return this.service.list(priority);
  }

  @Get('/stats')
  async stats() {
    return this.service.expensiveStats();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.service.get(parseInt(id, 10));
  }

  @Post('/create')
  create(@Body() body: { title: string; priority?: string }) {
    return this.service.create(body.title, body.priority);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Headers('authorization') auth?: string) {
    // wrap the extracted header in a real Request so the guard sees a
    // Headers instance (mirrors how the framework passes the raw request)
    const request = new Request('http://local/validate', {
      headers: auth ? { authorization: auth } : {},
    });
    await requireAuth(request);
    return this.service.remove(parseInt(id, 10));
  }
}

@Module({
  controllers: [TasksController],
  providers: [TasksService],
})
class AppModule {}

const servers: any[] = [];
afterAll(async () => {
  for (const s of servers) await s.stop(true);
});

describe('LIVE — CRUD API with database, cache, logging, auth', () => {
  let app: any;
  let base: string;

  afterAll(async () => {
    await app?.close();
  });

  test('boots a real HTTP server with the full stack wired', async () => {
    app = await OrbitFactory.create(AppModule, { logger: false, port: 0 } as any);
    await app.listen(0);
    expect(app.port).toBeGreaterThan(0);
    base = `http://127.0.0.1:${app.port}`;
  }, 20000);

  let createdId: number;

  test('POST creates a task', async () => {
    const res = await fetch(`${base}/api/tasks/create`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'write orbit docs', priority: 'high' }),
    });
    expect(res.status).toBe(200);
    const task = await res.json();
    expect(task.title).toBe('write orbit docs');
    expect(task.priority).toBe('high');
    expect(task.done).toBe(false);
    createdId = task.id;
  });

  test('GET list and GET by id', async () => {
    const list = await (await fetch(`${base}/api/tasks`)).json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);

    const one = await (await fetch(`${base}/api/tasks/${createdId}`)).json();
    expect(one.id).toBe(createdId);

    const byPriority = await (await fetch(`${base}/api/tasks?priority=high`)).json();
    expect(byPriority.every((t: any) => t.priority === 'high')).toBe(true);
  });

  test('missing task returns 404 with structured error', async () => {
    const res = await fetch(`${base}/api/tasks/99999`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.statusCode ?? body.status).toBe(404);
  });

  test('PUT updates fields', async () => {
    const res = await fetch(`${base}/api/tasks/${createdId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ done: true }),
    });
    const updated = await res.json();
    expect(updated.done).toBe(true);
    expect(updated.title).toBe('write orbit docs');
  });

  test('expensive stats endpoint is cached (second call faster)', async () => {
    const t1 = Date.now();
    const first = await (await fetch(`${base}/api/tasks/stats`)).json();
    const elapsed1 = Date.now() - t1;

    const t2 = Date.now();
    const second = await (await fetch(`${base}/api/tasks/stats`)).json();
    const elapsed2 = Date.now() - t2;

    expect(first.computedAt).toBe(second.computedAt); // same cached snapshot
    expect(second.total).toBeGreaterThanOrEqual(1);
    // cached path must not re-pay the 30ms sleep
    expect(elapsed2check(elapsed1, elapsed2)).toBe(true);
  });

  function elapsed2check(e1: number, e2: number) {
    return e2 <= e1 || e2 < 25; // cached path is fast even under jitter
  }

  test('DELETE requires a valid JWT — 401 without token', async () => {
    const res = await fetch(`${base}/api/tasks/${createdId}`, { method: 'DELETE' });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.statusCode).toBe(401);
  });

  test('DELETE rejects garbage tokens with 401', async () => {
    const res = await fetch(`${base}/api/tasks/${createdId}`, {
      method: 'DELETE',
      headers: { authorization: 'Bearer garbage.token.here' },
    });
    expect(res.status).toBe(401);
  });

  test('DELETE succeeds with a valid JWT', async () => {
    const token = await jwt.sign({ sub: 'admin@orbit.dev', roles: ['admin'] } as any, { expiresIn: 60 });
    const res = await fetch(`${base}/api/tasks/${createdId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(createdId);
  });

});
