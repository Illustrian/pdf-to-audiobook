import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { getEnv } from './config.js';
import { RunSpecSchema } from './types.js';
import { runComparison } from './orchestrator.js';
import { codexAdapter } from './adapters/codex.js';
import { geminiAdapter } from './adapters/gemini.js';
import { kimiAdapter } from './adapters/kimi.js';
import { openclawAgentAdapter } from './adapters/openclawAgent.js';
import { renderMarkdownReport } from './report/report.js';

const ArgsSchema = z.tuple([z.string(), z.string(), z.string().optional()]);

function usage(): never {
  // Explicit usage.
  console.error('Usage: npm run doctor');
  console.error('   or: npm run compare -- <taskId>');
  process.exit(2);
}

async function doctor(): Promise<void> {
  const env = getEnv();
  console.log('doctor:');
  console.log('- MAX_CONCURRENCY:', env.MAX_CONCURRENCY);
  console.log('- DEFAULT_TIMEOUT_MS:', env.DEFAULT_TIMEOUT_MS);
  console.log('- OPENAI_API_KEY:', env.OPENAI_API_KEY ? 'set' : 'missing');
  console.log('- GEMINI_API_KEY:', env.GEMINI_API_KEY ? 'set' : 'missing');
  console.log('- KIMI_API_KEY:', env.KIMI_API_KEY ? 'set' : 'missing');
}

async function compare(taskId: string): Promise<void> {
  const spec = RunSpecSchema.parse({
    taskId,
    prompt:
      `You are an engineering agent. Return ONLY valid JSON matching this shape:\n` +
      `{\n  "summary": string,\n  "rationale": string,\n  "risks": string[],\n  "followups": string[],\n  "artifacts": {"path": string, "content": string}[],\n  "testsAdded": string[]\n}\n` +
      `No markdown. No commentary outside JSON.\n\n` +
      `Task: ${taskId}`,
    rubric: [
      'Correctness and edge-case handling',
      'Test quality and coverage',
      'Clarity and maintainability (explicit over clever)',
      'DRY (no duplicated logic)',
    ],
  });

  const { results } = await runComparison({
    spec,
    adapters: [codexAdapter, geminiAdapter, kimiAdapter, openclawAgentAdapter],
  });

  await mkdir('reports', { recursive: true });
  const md = renderMarkdownReport(taskId, results);
  await writeFile(`reports/${taskId}.md`, md, 'utf8');
  await writeFile(`reports/${taskId}.json`, JSON.stringify({ taskId, results }, null, 2), 'utf8');

  console.log(`Wrote reports/${taskId}.md and reports/${taskId}.json`);
}

async function main() {
  const argv = process.argv;
  const parsed = ArgsSchema.safeParse([argv[0]!, argv[1]!, argv[2], argv[3]]);
  if (!parsed.success) usage();

  const cmd = argv[2];
  if (cmd === 'doctor') return doctor();
  if (cmd === 'compare') {
    const taskId = argv[3];
    if (!taskId) usage();
    return compare(taskId);
  }
  usage();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
