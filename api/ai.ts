type InteractionInput =
  | { type: 'text'; text: string }
  | { type: 'image'; mime_type: string; data: string };

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

  if (!prompt) return json(res, 400, { error: 'Prompt requis.' });
  if (mode === 'vision' && !imageData) return json(res, 400, { error: 'Image requise pour le diagnostic.' });
  if (imageData.length > 8_000_000) return json(res, 413, { error: 'Image trop volumineuse. Réduisez la taille à moins de 6 Mo.' });

  const model = 'gemini-3.8-flash';
  const input: InteractionInput[] = [{ type: 'text', text: prompt }];
  if (mode === 'vision') {
    input.push({
      type: 'image',
      mime_type: mimeType,
      data: imageData.replace(/^data:[^;]+;base64,/, ''),
    });
  }

  let response: Response;
  try {
    response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
        'Api-Revision': '2026-05-20',
      },
      body: JSON.stringify({ model, input }),
    });
  } catch {
    return json(res, 502, { error: 'Impossible de joindre le service Gemini. Vérifiez la connexion du serveur.' });
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    return json(res, 502, { error: 'Gemini a renvoyé une réponse illisible.' });
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || 'Gemini a refusé la requête.';
    console.error('Gemini Interactions API error:', response.status, message);
    return json(res, response.status >= 500 ? 502 : response.status, {
      error: `Erreur Gemini (${response.status}) : ${message}`,
      model,
    });
  }

  const text = Array.isArray(payload?.steps)
    ? payload.steps
        .filter((step: any) => step?.type === 'model_output')
        .flatMap((step: any) => Array.isArray(step.content) ? step.content : [])
        .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
        .map((part: any) => part.text)
        .join('\n')
    : '';

  if (!text.trim()) {
    console.error('Gemini Interactions API returned no model text:', payload?.status || 'unknown status');
    return json(res, 502, { error: 'Gemini n’a retourné aucun texte. Réessayez avec une question plus précise.', model });
  }

  return json(res, 200, { text: text.trim(), model, provider: 'gemini' });
}
