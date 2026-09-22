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

const DEFAULT_OPTIONS: Required<CircuitBreakerOptions> = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  resetTimeout: 60000,
  volumeThreshold: 10,
  onStateChange: () => {},
  onSuccess: () => {},
  onFailure: () => {},
  isFailure: () => true,
};

export class CircuitBreaker<T> {
  private options: Required<CircuitBreakerOptions>;
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private totalCalls = 0;
  private consecutiveSuccesses = 0;
  private consecutiveFailures = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private resetTimer: Timer | null = null;
  private halfOpenCalls = 0;

  constructor(
    private action: () => Promise<T>,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  get currentState(): CircuitState {
    return this.state;
  }

  get stats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      consecutiveSuccesses: this.consecutiveSuccesses,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  async execute(): Promise<T> {
    this.checkResetTimeout();

    if (this.state === 'open') {
      throw new CircuitOpenError('Circuit breaker is open');
    }

    if (this.state === 'half-open' && this.halfOpenCalls >= 1) {
      throw new CircuitOpenError('Circuit breaker is testing');
    }

    if (this.state === 'half-open') {
      this.halfOpenCalls++;
    }

    this.totalCalls++;

    try {
      const result = await this.executeWithTimeout();
      this.onSuccess();
      return result;
    } catch (error: any) {
      if (this.options.isFailure(error)) {
        this.onFailure(error);
      }
      throw error;
    }
  }

  private async executeWithTimeout(): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new CircuitTimeoutError('Circuit breaker timeout'));
      }, this.options.timeout);
    });

    return Promise.race([this.action(), timeoutPromise]);
  }

  private onSuccess(): void {
    this.successes++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
    this.options.onSuccess();

    if (this.state === 'half-open') {
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.transitionTo('closed');
      }
      this.halfOpenCalls = 0;
    }
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    this.options.onFailure(error);

    if (this.state === 'half-open') {
      this.transitionTo('open');
      this.halfOpenCalls = 0;
      return;
    }

    if (this.state === 'closed') {
      if (
        this.totalCalls >= this.options.volumeThreshold &&
        this.consecutiveFailures >= this.options.failureThreshold
      ) {
        this.transitionTo('open');
      }
    }
  }

  private checkResetTimeout(): void {
    if (
      this.state === 'open' &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime >= this.options.resetTimeout
    ) {
      this.transitionTo('half-open');
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    if (newState === 'closed') {
      this.consecutiveFailures = 0;
    }

    if (newState === 'half-open') {
      this.consecutiveSuccesses = 0;
      this.halfOpenCalls = 0;
    }

    this.options.onStateChange(oldState, newState);
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.consecutiveSuccesses = 0;
    this.consecutiveFailures = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.halfOpenCalls = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  forceOpen(): void {
    this.transitionTo('open');
    this.lastFailureTime = Date.now();
  }

  forceClosed(): void {
    this.transitionTo('closed');
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitTimeoutError';
  }
}

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker<any>> = new Map();

  register<T>(name: string, action: () => Promise<T>, options?: CircuitBreakerOptions): CircuitBreaker<T> {
    const breaker = new CircuitBreaker(action, options);
    this.breakers.set(name, breaker);
    return breaker;
  }

  get<T>(name: string): CircuitBreaker<T> | undefined {
    return this.breakers.get(name);
  }

  getOrCreate<T>(
    name: string,
    action: () => Promise<T>,
    options?: CircuitBreakerOptions
  ): CircuitBreaker<T> {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = this.register(name, action, options);
    }
    return breaker;
  }

  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  clear(): void {
    this.breakers.clear();
  }

  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [name, breaker] of this.breakers) {
      stats.set(name, breaker.stats);
    }
    return stats;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

export function withCircuitBreaker<T>(
  name: string,
  action: () => Promise<T>,
  options?: CircuitBreakerOptions
): () => Promise<T> {
  const breaker = circuitBreakerRegistry.getOrCreate(name, action, options);
  return () => breaker.execute();
}

export async function circuitBreaker<T>(
  action: () => Promise<T>,
  options?: CircuitBreakerOptions
): Promise<T> {
  const breaker = new CircuitBreaker(action, options);
  return breaker.execute();
}
