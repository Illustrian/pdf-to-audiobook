import { execa } from 'execa';
import { extractFirstJsonObject } from '../util/json.js';
import { RunOutputSchema, type ProviderAdapter, type RunResult, type RunSpec } from '../types.js';
import { runCliJson } from './baseCli.js';

export const codexAdapter: ProviderAdapter = {
  id: 'codex',
  async isAvailable() {
    const res = await execa('codex', ['--version'], { reject: false });
    return res.exitCode === 0;
  },
  async run(spec: RunSpec, opts: { timeoutMs: number }): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    try {
      const { stdout, stderr, durationMs } = await runCliJson({
        cmd: 'codex',
        args: ['--json', '--prompt', spec.prompt],
        timeoutMs: opts.timeoutMs,
      });

      const parsed = extractFirstJsonObject(stdout);
      const output = RunOutputSchema.parse(parsed);

      return {
        provider: 'codex',
        status: 'ok',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs,
        output,
        rawStdout: stdout,
        rawStderr: stderr,
      };
    } catch (err: any) {
      return {
        provider: 'codex',
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        errorCode: err?.code === 'TIMEOUT' ? 'TIMEOUT' : 'UNKNOWN',
        errorMessage: String(err?.message ?? err),
      };
    }
  },
};
