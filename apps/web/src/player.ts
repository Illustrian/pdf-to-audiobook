import type { Sentence } from './sentences';
import type { TtsClientOptions } from './ttsClient';
import { synthWav } from './ttsClient';

export type PlayerOpts = {
  tts: TtsClientOptions;
  prefetch: number;
  speed: number;
  voice?: string;
};

export class SentencePlayer {
  private audio = new Audio();
  private urls: string[] = [];
  private aborted = false;
  private opts: PlayerOpts;

  constructor(opts: PlayerOpts) {
    this.opts = opts;
  }

  stop(): void {
    this.aborted = true;
    this.audio.pause();
    for (const u of this.urls) URL.revokeObjectURL(u);
    this.urls = [];
  }

  async play(
    sentences: Sentence[],
    startIndex: number,
    hooks: {
      onSentenceStart: (idx: number) => void;
      onError: (e: unknown) => void;
    }
  ): Promise<void> {
    this.aborted = false;

    for (let i = startIndex; i < sentences.length; i++) {
      if (this.aborted) return;

      hooks.onSentenceStart(i);
      // Prefetch next few in background
      this.prefetch(sentences, i + 1).catch(() => {});

      try {
        const blob = await synthWav(this.opts.tts, {
          text: sentences[i]!.text,
          speed: this.opts.speed,
          voice: this.opts.voice,
        });
        const url = URL.createObjectURL(blob);
        this.urls.push(url);
        await this.playUrl(url);
      } catch (e) {
        hooks.onError(e);
        return;
      }
    }
  }

  private async prefetch(sentences: Sentence[], from: number): Promise<void> {
    const end = Math.min(sentences.length, from + this.opts.prefetch);
    const tasks: Promise<any>[] = [];
    for (let i = from; i < end; i++) {
      // Fire-and-forget; server-side cache makes this useful.
      tasks.push(
        synthWav(this.opts.tts, {
          text: sentences[i]!.text,
          speed: this.opts.speed,
          voice: this.opts.voice,
        }).catch(() => null)
      );
    }
    await Promise.all(tasks);
  }

  private playUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audio.src = url;
      this.audio.onended = () => resolve();
      this.audio.onerror = () => reject(new Error('Audio playback failed'));
      this.audio.play().catch(reject);
    });
  }
}
