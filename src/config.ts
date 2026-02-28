import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
  KIMI_BASE_URL: z.string().optional(),
  KIMI_MODEL: z.string().optional(),
  TELEGRAM_TARGET_CHAT_ID: z.string().optional(),
  MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
  DEFAULT_TIMEOUT_MS: z.coerce.number().int().positive().default(600000),
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${msg}`);
  }
  return parsed.data;
}

export function redactSecrets(s: string, secrets: Array<string | undefined>): string {
  let out = s;
  for (const sec of secrets) {
    if (!sec) continue;
    if (sec.length < 6) continue;
    out = out.split(sec).join('[REDACTED]');
  }
  return out;
}
