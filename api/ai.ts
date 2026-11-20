type InteractionContent =
  | { type: 'text'; text: string }
  | { type: 'image'; mime_type: string; data: string; resolution: 'medium' };

function json(res: any, status: number, body: unknown) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée.' });

  const env = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_AI_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'Clé IA absente côté serveur. Configurez GEMINI_API_KEY dans Vercel.' });

  let body: any;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return json(res, 400, { error: 'Corps JSON invalide.' });
  }

  const mode = body?.mode === 'vision' ? 'vision' : 'chat';
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const imageData = typeof body?.imageData === 'string' ? body.imageData : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';

  if (!prompt) return json(res, 400, { error: 'Une question est nécessaire.' });
  if (mode === 'vision' && !imageData) return json(res, 400, { error: 'Image requise pour le diagnostic.' });
  if (mode === 'vision' && !/^image\/(jpeg|png|webp|gif|bmp|tiff|heic|heif)$/i.test(mimeType)) {
    return json(res, 415, { error: 'Format d’image non pris en charge.' });
  }
  if (imageData.length > 8_000_000) return json(res, 413, { error: 'Image trop volumineuse. Réduisez la taille avant de réessayer.' });

  const content: InteractionContent[] = [{ type: 'text', text: prompt }];
  if (mode === 'vision') {
    content.push({
      type: 'image',
      mime_type: mimeType,
      data: imageData.replace(/^data:[^;]+;base64,/, ''),
      resolution: 'medium',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        store: false,
        input: [{ type: 'user_input', content }],
        generation_config: { thinking_level: 'low', max_output_tokens: 2048 },
      }),
    });

    const raw = await response.text();
    let payload: any;
    try { payload = JSON.parse(raw); }
    catch { return json(res, 502, { error: 'La réponse du service Gemini est illisible.' }); }

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || 'Gemini a refusé la requête.';
      console.error('Gemini Interactions API error:', response.status, message);
      return json(res, response.status >= 500 ? 502 : response.status, {
        error: `Gemini a répondu avec une erreur (${response.status}) : ${message}`,
        model: 'gemini-3.8-flash',
      });
    }

    const text = typeof payload?.output_text === 'string' ? payload.output_text.trim()
      : Array.isArray(payload?.steps)
        ? payload.steps
            .filter((step: any) => step?.type === 'model_output')
            .flatMap((step: any) => Array.isArray(step.content) ? step.content : [])
            .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
            .map((part: any) => part.text)
            .join('\n').trim()
        : '';

    if (!text) {
      console.error('Gemini returned no text:', payload?.status || 'unknown status');
      return json(res, 502, { error: 'Gemini n’a fourni aucune réponse. Réessayez avec une question plus précise.', model: 'gemini-3.8-flash' });
    }

    return json(res, 200, { text, model: 'gemini-3.8-flash', provider: 'gemini' });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    console.error('Gemini request failed:', error);
    return json(res, 504, {
      error: timedOut ? 'Gemini met trop de temps à répondre. Réessayez dans quelques instants.' : 'Impossible de joindre Gemini. Vérifiez la connexion du service.',
    });
  } finally {
    clearTimeout(timeout);
  }
}
