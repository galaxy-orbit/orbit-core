export type CircuitState = 'closed' | 'open' | 'half-open';
export interface CircuitBreakerOptions {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
    onStateChange?: (from: CircuitState, to: CircuitState) => void;
    onSuccess?: () => void;
    onFailure?: (error: Error) => void;
    isFailure?: (error: Error) => boolean;
}
export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    totalCalls: number;
    lastFailureTime: number | null;
    lastSuccessTime: number | null;
    consecutiveSuccesses: number;
    consecutiveFailures: number;
}
export declare class CircuitBreaker<T> {
    private action;
    private options;
    private state;
    private failures;
    private successes;
    private totalCalls;
    private consecutiveSuccesses;
    private consecutiveFailures;
    private lastFailureTime;
    private lastSuccessTime;
    private resetTimer;
    private halfOpenCalls;
    constructor(action: () => Promise<T>, options?: CircuitBreakerOptions);
    get currentState(): CircuitState;
    get stats(): CircuitBreakerStats;
    execute(): Promise<T>;
    private executeWithTimeout;
    private onSuccess;
    private onFailure;
    private checkResetTimeout;
    private transitionTo;
    reset(): void;
    forceOpen(): void;
    forceClosed(): void;
}
export declare class CircuitOpenError extends Error {
    constructor(message: string);
}
export declare class CircuitTimeoutError extends Error {
    constructor(message: string);
}
export declare class CircuitBreakerRegistry {
    private breakers;
    register<T>(name: string, action: () => Promise<T>, options?: CircuitBreakerOptions): CircuitBreaker<T>;
    get<T>(name: string): CircuitBreaker<T> | undefined;
    getOrCreate<T>(name: string, action: () => Promise<T>, options?: CircuitBreakerOptions): CircuitBreaker<T>;
    remove(name: string): boolean;
    clear(): void;
    getAllStats(): Map<string, CircuitBreakerStats>;
    resetAll(): void;
}
export declare const circuitBreakerRegistry: CircuitBreakerRegistry;
export declare function withCircuitBreaker<T>(name: string, action: () => Promise<T>, options?: CircuitBreakerOptions): () => Promise<T>;
export declare function circuitBreaker<T>(action: () => Promise<T>, options?: CircuitBreakerOptions): Promise<T>;
//# sourceMappingURL=circuit-breaker.d.ts.map