export interface ClusterOptions {
  workers?: number;
  workerScript?: string;
  respawn?: boolean;
  respawnDelay?: number;
  maxRespawns?: number;
  gracefulTimeout?: number;
}

export interface WorkerInfo {
  id: number;
  worker: Worker;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed';
  startedAt: number;
  respawnCount: number;
  lastError?: string;
}

export interface ClusterMessage {
  type: 'ready' | 'error' | 'shutdown' | 'ping' | 'pong' | 'custom';
  workerId?: number;
  payload?: unknown;
}

function getDefaultWorkerCount(): number {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  try {
    const os = require('os');
    return os.cpus?.()?.length || 4;
  } catch {
    return 4;
  }
}

const DEFAULT_OPTIONS: Required<ClusterOptions> = {
  workers: getDefaultWorkerCount(),
  workerScript: '',
  respawn: true,
  respawnDelay: 1000,
  maxRespawns: 10,
  gracefulTimeout: 30000,
};

export class ClusterManager {
  private options: Required<ClusterOptions>;
  private workers: Map<number, WorkerInfo> = new Map();
  private nextWorkerId = 1;
  private isShuttingDown = false;
  private messageHandlers: Map<string, (msg: ClusterMessage, workerId: number) => void> = new Map();

  constructor(options: ClusterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get workerCount(): number {
    return this.workers.size;
  }

  get activeWorkers(): WorkerInfo[] {
    return Array.from(this.workers.values()).filter(
      (w) => w.status === 'running' || w.status === 'starting'
    );
  }

  async start(): Promise<void> {
    if (!this.options.workerScript) {
      throw new Error('workerScript is required');
    }

    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < this.options.workers; i++) {
      promises.push(this.spawnWorker());
    }

    await Promise.all(promises);
  }

  private async spawnWorker(): Promise<void> {
    const id = this.nextWorkerId++;
    
    const worker = new Worker(this.options.workerScript, {
      name: `worker-${id}`,
    });

    const info: WorkerInfo = {
      id,
      worker,
      status: 'starting',
      startedAt: Date.now(),
      respawnCount: 0,
    };

    this.workers.set(id, info);

    worker.onmessage = (event: MessageEvent<ClusterMessage>) => {
      this.handleWorkerMessage(id, event.data);
    };

    worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(id, error);
    };

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        info.status = 'running';
        resolve();
      }, 5000);

      const handler = (msg: ClusterMessage) => {
        if (msg.type === 'ready') {
          clearTimeout(timeout);
          info.status = 'running';
          resolve();
        }
      };

      this.messageHandlers.set(`ready-${id}`, handler);
    });
  }

  private handleWorkerMessage(workerId: number, message: ClusterMessage): void {
    const handler = this.messageHandlers.get(`${message.type}-${workerId}`);
    if (handler) {
      handler(message, workerId);
    }

    if (message.type === 'ready') {
      const info = this.workers.get(workerId);
      if (info) {
        info.status = 'running';
      }
    }
  }

  private handleWorkerError(workerId: number, error: ErrorEvent): void {
    const info = this.workers.get(workerId);
    if (!info) return;

    info.status = 'crashed';
    info.lastError = error.message;

    if (this.isShuttingDown) return;

    if (this.options.respawn && info.respawnCount < this.options.maxRespawns) {
      setTimeout(() => {
        this.respawnWorker(workerId);
      }, this.options.respawnDelay);
    }
  }

  private async respawnWorker(oldWorkerId: number): Promise<void> {
    const oldInfo = this.workers.get(oldWorkerId);
    const respawnCount = oldInfo ? oldInfo.respawnCount + 1 : 1;

    this.workers.delete(oldWorkerId);

    const id = this.nextWorkerId++;
    
    const worker = new Worker(this.options.workerScript, {
      name: `worker-${id}`,
    });

    const info: WorkerInfo = {
      id,
      worker,
      status: 'starting',
      startedAt: Date.now(),
      respawnCount,
    };

    this.workers.set(id, info);

    worker.onmessage = (event: MessageEvent<ClusterMessage>) => {
      this.handleWorkerMessage(id, event.data);
    };

    worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(id, error);
    };
  }

  broadcast(message: ClusterMessage): void {
    for (const info of this.workers.values()) {
      if (info.status === 'running') {
        info.worker.postMessage(message);
      }
    }
  }

  sendToWorker(workerId: number, message: ClusterMessage): boolean {
    const info = this.workers.get(workerId);
    if (!info || info.status !== 'running') return false;
    
    info.worker.postMessage(message);
    return true;
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    this.broadcast({ type: 'shutdown' });

    const shutdownPromises = Array.from(this.workers.values()).map((info) => {
      return new Promise<void>((resolve) => {
        info.status = 'stopping';

        const timeout = setTimeout(() => {
          info.worker.terminate();
          info.status = 'stopped';
          resolve();
        }, this.options.gracefulTimeout);

        const checkStopped = () => {
          if (info.status === 'stopped') {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkStopped, 100);
          }
        };

        checkStopped();
      });
    });

    await Promise.all(shutdownPromises);
    this.workers.clear();
  }

  getStats(): {
    totalWorkers: number;
    activeWorkers: number;
    crashedWorkers: number;
    totalRespawns: number;
  } {
    let activeWorkers = 0;
    let crashedWorkers = 0;
    let totalRespawns = 0;

    for (const info of this.workers.values()) {
      if (info.status === 'running' || info.status === 'starting') {
        activeWorkers++;
      } else if (info.status === 'crashed') {
        crashedWorkers++;
      }
      totalRespawns += info.respawnCount;
    }

    return {
      totalWorkers: this.workers.size,
      activeWorkers,
      crashedWorkers,
      totalRespawns,
    };
  }
}

export function isPrimaryProcess(): boolean {
  if (typeof Bun !== 'undefined' && 'isMainThread' in Bun) {
    return (Bun as any).isMainThread === true;
  }
  return typeof self === 'undefined' || typeof (self as any).postMessage !== 'function';
}

export function isWorkerProcess(): boolean {
  if (typeof Bun !== 'undefined' && 'isMainThread' in Bun) {
    return (Bun as any).isMainThread === false;
  }
  return typeof self !== 'undefined' && typeof (self as any).postMessage === 'function';
}

export function notifyReady(): void {
  if (isWorkerProcess()) {
    self.postMessage({ type: 'ready' } as ClusterMessage);
  }
}

export function onShutdown(callback: () => void | Promise<void>): void {
  if (isWorkerProcess()) {
    self.onmessage = async (event: MessageEvent<ClusterMessage>) => {
      if (event.data.type === 'shutdown') {
        await callback();
        self.close();
      }
    };
  }
}
