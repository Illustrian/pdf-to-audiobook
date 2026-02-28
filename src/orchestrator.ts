import { z } from 'zod';
import { getEnv } from './config.js';
import type { ProviderAdapter, RunResult, RunSpec } from './types.js';
import { withConcurrency } from './util/concurrency.js';

const CompareOutputSchema = z.object({
  taskId: z.string(),
  results: z.array(z.any()),
});

export async function runComparison(opts: {
  spec: RunSpec;
  adapters: ProviderAdapter[];
}): Promise<{ results: RunResult[] }> {
  const env = getEnv();
  const timeoutMs = env.DEFAULT_TIMEOUT_MS;
  const maxConc = env.MAX_CONCURRENCY;

  const results: RunResult[] = [];

  await withConcurrency(opts.adapters, maxConc, async (adapter) => {
    const available = await adapter.isAvailable();
    if (!available) {
      results.push({
        provider: adapter.id,
        status: 'failed',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        errorCode: 'TOOL_NOT_INSTALLED',
        errorMessage: 'Tool not installed or not on PATH',
      });
      return;
    }

    const res = await adapter.run(opts.spec, { timeoutMs });
    results.push(res);
  });

  // Basic shape check for forward compat when persisting.
  CompareOutputSchema.parse({ taskId: opts.spec.taskId, results });

  return { results };
}
