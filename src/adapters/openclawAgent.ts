import type { ProviderAdapter, RunResult, RunSpec } from '../types.js';

/**
 * Placeholder adapter.
 *
 * OpenClaw sub-agents are spawned via the OpenClaw runtime tool (`sessions_spawn`), not from inside this repo.
 * This adapter exists to keep the comparison pipeline uniform.
 */
export const openclawAgentAdapter: ProviderAdapter = {
  id: 'openclaw-agent',
  async isAvailable() {
    return true;
  },
  async run(_spec: RunSpec, _opts: { timeoutMs: number }): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    return {
      provider: 'openclaw-agent',
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      errorCode: 'UNKNOWN',
      errorMessage:
        'openclaw-agent adapter is not runnable from Node. Use OpenClaw sessions_spawn and feed results into the comparison pipeline.',
    };
  },
};
