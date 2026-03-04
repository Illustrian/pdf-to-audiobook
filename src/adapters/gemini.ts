import { execa } from 'execa';
import { extractFirstJsonObject } from '../util/json.js';
import { RunOutputSchema, type ProviderAdapter, type RunResult, type RunSpec } from '../types.js';
import { runCliJson } from './baseCli.js';

type GeminiJsonOutput = {
  response?: string;
};

export const geminiAdapter: ProviderAdapter = {
  id: 'gemini',
  async isAvailable() {
    const res = await execa('gemini', ['--version'], { reject: false });
    return res.exitCode === 0;
  },
  async run(spec: RunSpec, opts: { timeoutMs: number }): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    try {
      const { stdout, stderr, durationMs } = await runCliJson({
        cmd: 'gemini',
        args: ['--output-format', 'json', '--prompt', spec.prompt],
        timeoutMs: opts.timeoutMs,
      });

      // gemini --output-format json wraps the model output in { response: "..." }
      let modelText = stdout;
      try {
        const outer = JSON.parse(stdout) as GeminiJsonOutput;
        if (typeof outer.response === 'string' && outer.response.trim()) {
          modelText = outer.response;
        }
      } catch {
        // ignore, fall back to stdout
      }

      const parsed = extractFirstJsonObject(modelText);
      const output = RunOutputSchema.parse(parsed);

      return {
        provider: 'gemini',
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
        provider: 'gemini',
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
