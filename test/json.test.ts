import { describe, expect, it } from 'vitest';
import { extractFirstJsonObject } from '../src/util/json.js';

describe('extractFirstJsonObject', () => {
  it('parses clean JSON', () => {
    expect(extractFirstJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON embedded in text', () => {
    const out = extractFirstJsonObject('hello\n{"a":1,"b":{"c":2}}\nbye');
    expect(out).toEqual({ a: 1, b: { c: 2 } });
  });

  it('throws if no JSON', () => {
    expect(() => extractFirstJsonObject('nope')).toThrow(/No JSON object start/);
  });
});
