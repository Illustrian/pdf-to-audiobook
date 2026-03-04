import { execa } from 'execa';
import { extractFirstJsonObject } from '../util/json.js';
import { RunOutputSchema, type ProviderAdapter, type RunResult, type RunSpec } from '../types.js';

type CodexEvent = {
  type?: string;
  item?: { type?: string; text?: string };
};

function extractCodexFinalJson(stdout: string): unknown {
  // codex exec --json prints JSONL events.
  const lines = stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const ev = JSON.parse(lines[i]!) as CodexEvent;
      if (ev.type === 'item.completed' && ev.item?.type === 'agent_message' && ev.item.text) {
        return extractFirstJsonObject(ev.item.text);
      }
    } catch {
      // ignore
    }
  }

  // Fallback: try to find any JSON in raw stdout.
  return extractFirstJsonObject(stdout);
}

export const codexAdapter: ProviderAdapter = {
  id: 'codex',
  async isAvailable() {
    const res = await execa('codex', ['--version'], { reject: false });
    return res.exitCode === 0;
  },
  async run(spec: RunSpec, opts: { timeoutMs: number }): Promise<RunResult> {
    const startedAt = new Date().toISOString();
    try {
      const start = Date.now();
      const res = await execa(
        'codex',
        [
          'exec',
          '--json',
          '--skip-git-repo-check',
          '--output-schema',
          'schemas/runOutput.schema.json',
          spec.prompt,
        ],
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

      const parsed = extractCodexFinalJson(res.stdout ?? '');
      const output = RunOutputSchema.parse(parsed);

      return {
        provider: 'codex',
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
        provider: 'codex',
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
