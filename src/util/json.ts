export function extractFirstJsonObject(text: string): unknown {
  // Explicit, non-clever: find first '{' and attempt to parse until it succeeds.
  const start = text.indexOf('{');
  if (start < 0) throw new Error('No JSON object start found');

  // Attempt progressive parsing by scanning end braces.
  // This is intentionally conservative; if tools produce messy output, we prefer to fail.
  for (let end = text.lastIndexOf('}'); end > start; end = text.lastIndexOf('}', end - 1)) {
    const candidate = text.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }
  throw new Error('Unable to parse JSON object from output');
}
