export type TtsClientOptions = {
  baseUrl: string; // e.g. http://127.0.0.1:17777
  token?: string;
};

export async function ttsHealth(opts: TtsClientOptions): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const res = await fetch(`${opts.baseUrl}/health`, {
      headers: opts.token ? { 'X-OC-TTS-TOKEN': opts.token } : undefined,
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as any;
    return { ok: true, version: data?.version };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

export async function synthWav(
  opts: TtsClientOptions,
  args: { text: string; voice?: string; speed?: number }
): Promise<Blob> {
  const res = await fetch(`${opts.baseUrl}/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { 'X-OC-TTS-TOKEN': opts.token } : {}),
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`TTS failed: HTTP ${res.status} ${msg}`);
  }
  return await res.blob();
}
