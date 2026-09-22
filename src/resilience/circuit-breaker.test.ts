import { describe, test, expect } from 'bun:test';
import { CircuitBreaker, CircuitOpenError, CircuitTimeoutError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  test('closed circuit passes successful calls through', async () => {
    const cb = new CircuitBreaker(async () => 'ok', { volumeThreshold: 1, failureThreshold: 2 });
    expect(await cb.execute()).toBe('ok');
    expect(cb.stats.successes).toBe(1);
    expect(cb.stats.totalCalls).toBe(1);
    expect(cb.currentState).toBe('closed');
    expect(cb.stats.lastSuccessTime).not.toBeNull();
  });

  test('opens after consecutive failures reach threshold (past volume threshold)', async () => {
    const transitions: string[] = [];
    const cb = new CircuitBreaker(
      async () => { throw new Error('fail'); },
      { volumeThreshold: 2, failureThreshold: 2, resetTimeout: 10_000, onStateChange: (_f, to) => transitions.push(to) },
    );

    for (let i = 0; i < 2; i++) {
      await expect(cb.execute()).rejects.toThrow('fail');
    }
    expect(cb.currentState).toBe('open');
    expect(transitions).toEqual(['open']);
    expect(cb.stats.consecutiveFailures).toBe(2);

    await expect(cb.execute()).rejects.toBeInstanceOf(CircuitOpenError);
    expect(cb.stats.totalCalls).toBe(2);
  });

  test('does not open before volume threshold is reached', async () => {
    const cb = new CircuitBreaker(
      async () => { throw new Error('fail'); },
      { volumeThreshold: 5, failureThreshold: 2, resetTimeout: 10_000 },
    );

    await expect(cb.execute()).rejects.toThrow('fail');
    await expect(cb.execute()).rejects.toThrow('fail');
    expect(cb.currentState).toBe('closed');
  });

  test('half-open after resetTimeout, closes after successThreshold successes', async () => {
    let failing = true;
    const cb = new CircuitBreaker(
      async () => { if (failing) throw new Error('fail'); return 'ok'; },
      { volumeThreshold: 1, failureThreshold: 1, resetTimeout: 40, successThreshold: 2, timeout: 500 },
    );

    await expect(cb.execute()).rejects.toThrow('fail');
    expect(cb.currentState).toBe('open');

    await Bun.sleep(60);
    failing = false;

    expect(await cb.execute()).toBe('ok');
    expect(cb.currentState).toBe('half-open');
    expect(await cb.execute()).toBe('ok');
    expect(cb.currentState).toBe('closed');
    expect(cb.stats.consecutiveSuccesses).toBe(2);
  });

  test('failure while half-open reopens the circuit', async () => {
    let failing = true;
    const cb = new CircuitBreaker(
      async () => { if (failing) throw new Error('fail'); return 'ok'; },
      { volumeThreshold: 1, failureThreshold: 1, resetTimeout: 30, timeout: 1000 },
    );

    await expect(cb.execute()).rejects.toThrow('fail');
    expect(cb.currentState).toBe('open');

    await Bun.sleep(50);
    failing = true;
    await expect(cb.execute()).rejects.toThrow('fail');
    expect(cb.currentState).toBe('open');
  });

  test('reset returns breaker to pristine closed state', async () => {
    const cb = new CircuitBreaker(
      async () => { throw new Error('fail'); },
      { volumeThreshold: 1, failureThreshold: 1, resetTimeout: 10_000 },
    );
    await expect(cb.execute()).rejects.toThrow('fail');
    cb.reset();
    expect(cb.currentState).toBe('closed');
    expect(cb.stats.failures).toBe(0);
    expect(cb.stats.totalCalls).toBe(0);
    expect(cb.stats.consecutiveFailures).toBe(0);
   });
});

test('CircuitTimeoutError surfaces on slow action', async () => {
  const cb = new CircuitBreaker(
    () => new Promise(resolve => setTimeout(() => resolve('late'), 500)),
    { timeout: 30, volumeThreshold: 1 },
  );
  await expect(cb.execute()).rejects.toBeInstanceOf(CircuitTimeoutError);
});
