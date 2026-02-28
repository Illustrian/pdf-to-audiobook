import type { RunResult } from '../types.js';
import { scoreResult } from '../compare/scoring.js';

export function renderMarkdownReport(taskId: string, results: RunResult[]): string {
  const scored = results.map(r => ({ r, s: scoreResult(r) }))
    .sort((a, b) => b.s.score - a.s.score);

  const lines: string[] = [];
  lines.push(`# Comparison Report: ${taskId}`);
  lines.push('');

  for (const { r, s } of scored) {
    lines.push(`## ${r.provider} — ${r.status} — score ${s.score}`);
    if (s.reasons.length) lines.push(`- Notes: ${s.reasons.join('; ')}`);
    if (r.errorMessage) lines.push(`- Error: ${r.errorMessage}`);
    if (r.output) {
      lines.push('');
      lines.push('**Summary**');
      lines.push('');
      lines.push(r.output.summary);
      lines.push('');
      lines.push('**Risks**');
      lines.push('');
      lines.push(r.output.risks.length ? r.output.risks.map(x => `- ${x}`).join('\n') : '- (none)');
      lines.push('');
      lines.push('**Tests added (claimed)**');
      lines.push('');
      lines.push(r.output.testsAdded.length ? r.output.testsAdded.map(x => `- ${x}`).join('\n') : '- (none)');
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('Recommendation: pick the highest score *only if* artifacts + tests look sane. Review risks.');

  return lines.join('\n');
}
