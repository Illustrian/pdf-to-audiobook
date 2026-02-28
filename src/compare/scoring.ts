import type { RunResult } from '../types.js';

export type Score = {
  provider: RunResult['provider'];
  score: number;
  reasons: string[];
};

export function scoreResult(result: RunResult): Score {
  const reasons: string[] = [];
  let score = 0;

  if (result.status !== 'ok') {
    reasons.push(`status=${result.status}`);
    return { provider: result.provider, score: 0, reasons };
  }

  score += 50;

  const out = result.output;
  if (!out) {
    reasons.push('missing output');
    return { provider: result.provider, score: 0, reasons };
  }

  if (out.testsAdded.length > 0) score += 15;
  else reasons.push('no testsAdded reported');

  if (out.risks.length > 0) score += 10;
  else reasons.push('no risks reported');

  if (out.followups.length > 0) score += 5;

  if (out.artifacts.length > 0) score += 20;
  else reasons.push('no artifacts produced');

  return { provider: result.provider, score, reasons };
}
