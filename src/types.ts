import { z } from 'zod';

export const ProviderIdSchema = z.enum(['codex', 'gemini', 'kimi', 'openclaw-agent']);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const ArtifactSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const RunOutputSchema = z.object({
  summary: z.string().min(1),
  rationale: z.string().min(1),
  risks: z.array(z.string()).default([]),
  followups: z.array(z.string()).default([]),
  artifacts: z.array(ArtifactSchema).default([]),
  testsAdded: z.array(z.string()).default([]),
});
export type RunOutput = z.infer<typeof RunOutputSchema>;

export const RunResultSchema = z.object({
  provider: ProviderIdSchema,
  status: z.enum(['ok', 'partial', 'failed']),
  startedAt: z.string(),
  finishedAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  output: RunOutputSchema.optional(),
  rawStdout: z.string().optional(),
  rawStderr: z.string().optional(),
  errorCode: z.enum(['AUTH_MISSING', 'RATE_LIMIT', 'TOOL_NOT_INSTALLED', 'TIMEOUT', 'PARSE_ERROR', 'UNKNOWN']).optional(),
  errorMessage: z.string().optional(),
});
export type RunResult = z.infer<typeof RunResultSchema>;

export const RunSpecSchema = z.object({
  taskId: z.string().min(1),
  prompt: z.string().min(1),
  rubric: z.array(z.string()).min(1),
  expectedArtifactPaths: z.array(z.string()).default([]),
});
export type RunSpec = z.infer<typeof RunSpecSchema>;

export type ProviderAdapter = {
  id: ProviderId;
  isAvailable: () => Promise<boolean>;
  run: (spec: RunSpec, opts: { timeoutMs: number }) => Promise<RunResult>;
};
