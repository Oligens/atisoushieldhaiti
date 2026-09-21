type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

function json(res: any, status: number, body: unknown) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Méthode non autorisée.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return json(res, 500, {
      error: 'Clé IA absente côté serveur. Configurez GEMINI_API_KEY dans Vercel.',
    });
  }

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

  if (!prompt) return json(res, 400, { error: 'Prompt requis.' });
  if (mode === 'vision' && !imageData) {
    return json(res, 400, { error: 'Image requise pour le diagnostic.' });
  }
  if (imageData.length > 8_000_000) {
    return json(res, 413, { error: 'Image trop volumineuse. Réduisez sa taille avant analyse.' });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const parts: GeminiPart[] = [{ text: prompt }];

  if (mode === 'vision') {
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: imageData.replace(/^data:[^;]+;base64,/, ''),
      },
    });
  }

  const generationConfig: { temperature: number; responseMimeType?: string } = {
    temperature: 0.2,
  };
  if (mode === 'vision') generationConfig.responseMimeType = 'application/json';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig,
        }),
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      const message = payload?.error?.message || 'Le fournisseur IA a refusé la requête.';
      return json(res, response.status >= 500 ? 502 : response.status, { error: message });
    }

    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || '')
        .join('') || '';

    if (!text) return json(res, 502, { error: 'Réponse IA vide.' });

    return json(res, 200, { text, model, provider: 'gemini' });
  } catch (error) {
    return json(res, 502, {
      error: error instanceof Error ? error.message : 'Erreur réseau avec le fournisseur IA.',
    });
  }
}
