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
export declare class ClusterManager {
    private options;
    private workers;
    private nextWorkerId;
    private isShuttingDown;
    private messageHandlers;
    constructor(options?: ClusterOptions);
    get workerCount(): number;
    get activeWorkers(): WorkerInfo[];
    start(): Promise<void>;
    private spawnWorker;
    private handleWorkerMessage;
    private handleWorkerError;
    private respawnWorker;
    broadcast(message: ClusterMessage): void;
    sendToWorker(workerId: number, message: ClusterMessage): boolean;
    shutdown(): Promise<void>;
    getStats(): {
        totalWorkers: number;
        activeWorkers: number;
        crashedWorkers: number;
        totalRespawns: number;
    };
}
export declare function isPrimaryProcess(): boolean;
export declare function isWorkerProcess(): boolean;
export declare function notifyReady(): void;
export declare function onShutdown(callback: () => void | Promise<void>): void;
