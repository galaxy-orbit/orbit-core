import { describe, test, expect } from 'bun:test';
import { ClusterManager } from './cluster';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// real worker script: reports ready, echoes pings, closes on shutdown
const workerDir = mkdtempSync(`${tmpdir()}/orbit-worker-`);
const workerScript = join(workerDir, 'worker.js');
writeFileSync(workerScript, `
self.postMessage({ type: 'ready' });
self.onmessage = (event) => {
  const msg = event.data;
  if (msg.type === 'ping') self.postMessage({ type: 'pong', payload: msg.payload });
  if (msg.type === 'shutdown') self.close();
};
`);

describe('ClusterManager', () => {
  test('start throws without workerScript', async () => {
    const manager = new ClusterManager({ workers: 1 });
    await expect(manager.start()).rejects.toThrow('workerScript is required');
  });

  test('spawns workers that report ready', async () => {
    const manager = new ClusterManager({ workers: 2, workerScript, gracefulTimeout: 500 });
    await manager.start();
    expect(manager.workerCount).toBe(2);
    expect(manager.activeWorkers).toHaveLength(2);
    await manager.shutdown();
    expect(manager.workerCount).toBe(0);
  }, 20000);

  test('broadcast pings reach every running worker', async () => {
    const manager = new ClusterManager({ workers: 2, workerScript, gracefulTimeout: 500 });
    await manager.start();

    let pong = 0;
    (manager as any).messageHandlers.set('pong-1', () => pong++);
    (manager as any).messageHandlers.set('pong-2', () => pong++);

    manager.broadcast({ type: 'ping', payload: 'x' });
    await Bun.sleep(100);
    expect(pong).toBe(2);

    await manager.shutdown();
  }, 20000);

  test('sendToWorker returns false for unknown or stopped workers', async () => {
    const manager = new ClusterManager({ workers: 1, workerScript, gracefulTimeout: 500 });
    await manager.start();
    expect(manager.sendToWorker(999, { type: 'ping' })).toBe(false);
    await manager.shutdown();
    expect(manager.sendToWorker(1, { type: 'ping' })).toBe(false);
  }, 20000);

  test('getStats reports worker counts', async () => {
    const manager = new ClusterManager({ workers: 2, workerScript, gracefulTimeout: 500 });
    await manager.start();
    const stats = manager.getStats();
    expect(stats.totalWorkers).toBe(2);
    expect(stats.activeWorkers).toBe(2);
    expect(stats.crashedWorkers).toBe(0);
    await manager.shutdown();
  }, 20000);

  test('shutdown is idempotent', async () => {
    const manager = new ClusterManager({ workers: 1, workerScript, gracefulTimeout: 500 });
    await manager.start();
    await manager.shutdown();
    await manager.shutdown();
    expect(manager.workerCount).toBe(0);
  }, 20000);
});
