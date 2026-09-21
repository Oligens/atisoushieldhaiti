declare const process: { env: Record<string, string | undefined> };

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

function json(res: any, status: number, body: unknown) {
  res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Méthode non autorisée.' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return json(res, 500, { error: 'Clé IA absente côté serveur. Configurez GEMINI_API_KEY dans Vercel.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const mode = body?.mode === 'vision' ? 'vision' : 'chat';
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const imageData = typeof body?.imageData === 'string' ? body.imageData : '';
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';

  if (!prompt) return json(res, 400, { error: 'Prompt requis.' });
  if (mode === 'vision' && !imageData) return json(res, 400, { error: 'Image requise pour le diagnostic.' });
  if (imageData.length > 8_000_000) return json(res, 413, { error: 'Image trop volumineuse. Réduisez la taille à moins de 6 Mo.' });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const parts: GeminiPart[] = [{ text: prompt }];
  if (mode === 'vision') {
    parts.push({ inline_data: { mime_type: mimeType, data: imageData.replace(/^data:[^;]+;base64,/, '') } });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    },
  );

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || 'Le fournisseur IA a refusé la requête.';
    return json(res, response.status >= 500 ? 502 : response.status, { error: message });
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
  if (!text) return json(res, 502, { error: 'Réponse IA vide.' });

  return json(res, 200, { text, model, provider: 'gemini' });
}
