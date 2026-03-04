import { execa } from 'execa';
import { extractFirstJsonObject } from '../util/json.js';
import { RunOutputSchema, type ProviderAdapter, type RunResult, type RunSpec } from '../types.js';

type KimiStreamEvent = {
  role?: string;
  content?: string;
};

function extractKimiFinalJson(stdout: string): unknown {
  const lines = stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const ev = JSON.parse(lines[i]!) as KimiStreamEvent;
      if (ev.role === 'assistant' && typeof ev.content === 'string' && ev.content.trim()) {
        return extractFirstJsonObject(ev.content);
      }
    } catch {
      // ignore
    }
  }

  return extractFirstJsonObject(stdout);
}

export const kimiAdapter: ProviderAdapter = {
  id: 'kimi',
  async isAvailable() {
    const res = await execa('kimi', ['--version'], { reject: false });
    return res.exitCode === 0;
  },
  async run(spec: RunSpec, opts: { timeoutMs: number }): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    try {
      const start = Date.now();
      const res = await execa(
        'kimi',
        ['--print', '--output-format', 'stream-json', '--final-message-only', '--prompt', spec.prompt],
        {
          timeout: opts.timeoutMs,
          reject: false,
          maxBuffer: 10 * 1024 * 1024,
        }
      );
      const durationMs = Date.now() - start;

      if (res.exitCode !== 0) {
        throw new Error(`CLI exit code ${res.exitCode}: ${(res.stderr || res.stdout).slice(0, 500)}`);
      }

      const parsed = extractKimiFinalJson(res.stdout ?? '');
      const output = RunOutputSchema.parse(parsed);

      return {
        provider: 'kimi',
        status: 'ok',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs,
        output,
        rawStdout: res.stdout,
        rawStderr: res.stderr,
      };
    } catch (err: any) {
      return {
        provider: 'kimi',
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        errorCode: err?.code === 'ETIMEDOUT' || err?.code === 'TIMEOUT' ? 'TIMEOUT' : 'UNKNOWN',
        errorMessage: String(err?.message ?? err),
      };
    }
  },
};
