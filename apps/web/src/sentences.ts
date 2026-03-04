export type TextItem = {
  str: string;
  // PDF.js item has more fields; we only keep what we need.
  transform: number[]; // [a,b,c,d,e,f]
  width: number;
  height: number;
};

export type ItemSpan = {
  itemIndex: number;
  start: number; // start offset in fullText
  end: number; // end offset (exclusive)
};

export type Sentence = {
  index: number;
  text: string;
  start: number;
  end: number;
  spans: ItemSpan[];
};

export function buildTextIndex(items: TextItem[]): { fullText: string; spans: ItemSpan[] } {
  let fullText = '';
  const spans: ItemSpan[] = [];

  for (let i = 0; i < items.length; i++) {
    const raw = items[i]!.str ?? '';
    const token = raw.replace(/\s+/g, ' ').trim();
    if (!token) continue;

    if (fullText.length > 0) fullText += ' ';
    const start = fullText.length;
    fullText += token;
    const end = fullText.length;
    spans.push({ itemIndex: i, start, end });
  }

  return { fullText, spans };
}

// Deterministic, explicit sentence splitting. Not clever NLP.
export function splitIntoSentences(fullText: string): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  const text = fullText;

  let cursor = 0;
  const isTerminal = (ch: string) => ch === '.' || ch === '!' || ch === '?';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (!isTerminal(ch)) continue;

    // Lookahead: terminal punctuation should be followed by whitespace or end.
    const next = text[i + 1];
    if (next && !/\s/.test(next)) continue;

    const rawSeg = text.slice(cursor, i + 1);
    const trimmed = rawSeg.trim();
    if (trimmed.length) {
      const segStart = cursor + rawSeg.indexOf(trimmed);
      out.push({ start: segStart, end: segStart + trimmed.length, text: trimmed });
    }

    cursor = i + 1;
    while (cursor < text.length && /\s/.test(text[cursor]!)) cursor++;
  }

  // Remainder
  const rawRem = text.slice(cursor);
  const rem = rawRem.trim();
  if (rem.length) {
    const remStart = cursor + rawRem.indexOf(rem);
    out.push({ start: remStart, end: remStart + rem.length, text: rem });
  }

  return out;
}

export function mapSentencesToItems(fullText: string, spans: ItemSpan[]): Sentence[] {
  const splits = splitIntoSentences(fullText);
  return splits.map((s, idx) => {
    const overlaps = spans.filter((sp) => !(sp.end <= s.start || sp.start >= s.end));
    return {
      index: idx,
      text: s.text,
      start: s.start,
      end: s.end,
      spans: overlaps,
    };
  });
}
