type CircuitState = { count: number; lastFailure: number };
type CircuitConfig = { maxFailures: number; cooldownMs: number };

export class CircuitBreaker {
  private failureMap: Map<string, CircuitState> = new Map();
  private configMap: Map<string, CircuitConfig> = new Map();

  configure(group: string, config: CircuitConfig) {
    this.configMap.set(group, config);
  }

  recordFailure(group: string) {
    const prev = this.failureMap.get(group) ?? { count: 0, lastFailure: 0 };
    this.failureMap.set(group, {
      count: prev.count + 1,
      lastFailure: Date.now(),
    });
  }

  clear(group: string) {
    this.failureMap.delete(group);
  }

  isOpen(group: string): boolean {
    const config = this.configMap.get(group);
    const state = this.failureMap.get(group);

    if (!config || !state) return false;

    const now = Date.now();
    const { maxFailures, cooldownMs } = config;
    return state.count >= maxFailures && now - state.lastFailure < cooldownMs;
  }
}
