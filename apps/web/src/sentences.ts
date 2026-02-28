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

  let start = 0;
  const isTerminal = (ch: string) => ch === '.' || ch === '!' || ch === '?';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (!isTerminal(ch)) continue;

    // Lookahead: terminal punctuation should be followed by whitespace or end.
    const next = text[i + 1];
    if (next && !/\s/.test(next)) continue;

    const end = i + 1;
    const slice = text.slice(start, end).trim();
    if (slice.length) out.push({ start: start + (text.slice(start).match(/^\s+/)?.[0].length ?? 0), end, text: slice });

    start = end + (next && /\s/.test(next) ? 1 : 0);
  }

  // Remainder
  const rem = text.slice(start).trim();
  if (rem.length) {
    const remStart = text.indexOf(rem, start);
    out.push({ start: remStart, end: remStart + rem.length, text: rem });
  }

  return out;
}

export function mapSentencesToItems(fullText: string, spans: ItemSpan[]): Sentence[] {
  const splits = splitIntoSentences(fullText);
  return splits.map((s, idx) => {
    const overlaps = spans.filter(sp => !(sp.end <= s.start || sp.start >= s.end));
    return {
      index: idx,
      text: s.text,
      start: s.start,
      end: s.end,
      spans: overlaps,
    };
  });
}
