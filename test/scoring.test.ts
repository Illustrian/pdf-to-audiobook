import { describe, expect, it } from 'vitest';
import { scoreResult } from '../src/compare/scoring.js';

describe('scoreResult', () => {
  it('gives 0 to failures', () => {
    expect(
      scoreResult({
        provider: 'codex',
        status: 'failed',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: 0,
        errorCode: 'UNKNOWN',
        errorMessage: 'x',
      }).score
    ).toBe(0);
  });

  it('rewards tests + artifacts', () => {
    const s = scoreResult({
      provider: 'codex',
      status: 'ok',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      output: {
        summary: 's',
        rationale: 'r',
        risks: ['a'],
        followups: [],
        artifacts: [{ path: 'a.txt', content: 'x' }],
        testsAdded: ['t'],
      },
    });
    expect(s.score).toBeGreaterThan(70);
  });
});
