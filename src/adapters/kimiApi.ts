import { getEnv } from '../config.js';
import { extractFirstJsonObject } from '../util/json.js';
import { RunOutputSchema, type ProviderAdapter, type RunResult, type RunSpec } from '../types.js';

// Moonshot/Kimi provides an OpenAI-compatible chat completions API.
// This adapter avoids the interactive kimi CLI (which is currently unstable in our environment).

type MoonshotChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export const kimiApiAdapter: ProviderAdapter = {
  id: 'kimi',
  async isAvailable() {
    const env = getEnv();
    return Boolean(env.KIMI_API_KEY);
  },

  async run(spec: RunSpec, opts: { timeoutMs: number }): Promise<RunResult> {
    const env = getEnv();
    const startedAt = new Date().toISOString();

    if (!env.KIMI_API_KEY) {
      return {
        provider: 'kimi',
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        errorCode: 'AUTH_MISSING',
        errorMessage: 'KIMI_API_KEY is not set',
      };
    }

    const baseUrl = (env.KIMI_BASE_URL ?? 'https://api.moonshot.cn/v1').replace(/\/+$/, '');
    const model = env.KIMI_MODEL ?? 'kimi-latest';

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), opts.timeoutMs);
    const start = Date.now();

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.KIMI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content:
                'Return ONLY valid JSON matching the requested schema. No markdown. No extra text.',
            },
            { role: 'user', content: spec.prompt },
          ],
        }),
        signal: controller.signal,
      });

      const durationMs = Date.now() - start;
      const text = await res.text();

      if (!res.ok) {
        return {
          provider: 'kimi',
          status: 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs,
          errorCode: res.status === 401 ? 'AUTH_MISSING' : 'UNKNOWN',
          errorMessage: `HTTP ${res.status}: ${text.slice(0, 500)}`,
          rawStdout: text.slice(0, 4000),
        };
      }

      const json = JSON.parse(text) as MoonshotChatResponse;
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        return {
          provider: 'kimi',
          status: 'failed',
          startedAt,
          finishedAt: new Date().toISOString(),
          durationMs,
          errorCode: 'PARSE_ERROR',
          errorMessage: json.error?.message ?? 'Missing choices[0].message.content',
          rawStdout: text.slice(0, 4000),
        };
      }

      const parsed = extractFirstJsonObject(content);
      const output = RunOutputSchema.parse(parsed);

      return {
        provider: 'kimi',
        status: 'ok',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs,
        output,
        rawStdout: content,
      };
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const code = err?.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN';
      return {
        provider: 'kimi',
        status: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs,
        errorCode: code,
        errorMessage: String(err?.message ?? err),
      };
    } finally {
      clearTimeout(t);
    }
  },
};
