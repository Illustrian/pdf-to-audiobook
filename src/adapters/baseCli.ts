import { execa } from 'execa';
import { redactSecrets, getEnv } from '../config.js';

export async function runCliJson(opts: {
  cmd: string;
  args: string[];
  timeoutMs: number;
  env?: Record<string, string | undefined>;
}): Promise<{ stdout: string; stderr: string; durationMs: number }> {
  const env = getEnv();
  const started = Date.now();
  const res = await execa(opts.cmd, opts.args, {
    timeout: opts.timeoutMs,
    reject: false,
    env: {
      ...process.env,
      ...opts.env,
    },
    all: false,
  });
  const durationMs = Date.now() - started;
  const stdout = redactSecrets(res.stdout ?? '', [
    env.OPENAI_API_KEY,
    env.GEMINI_API_KEY,
    env.KIMI_API_KEY,
  ]);
  const stderr = redactSecrets(res.stderr ?? '', [
    env.OPENAI_API_KEY,
    env.GEMINI_API_KEY,
    env.KIMI_API_KEY,
  ]);

  if (res.timedOut) {
    const e = new Error(`CLI timed out after ${opts.timeoutMs}ms`);
    // @ts-expect-error tag
    e.code = 'TIMEOUT';
    throw e;
  }

  if (res.exitCode !== 0) {
    const e = new Error(`CLI exit code ${res.exitCode}`);
    // @ts-expect-error tag
    e.code = 'EXIT_NONZERO';
    // @ts-expect-error tag
    e.stderr = stderr;
    // @ts-expect-error tag
    e.stdout = stdout;
    throw e;
  }

  return { stdout, stderr, durationMs };
}
