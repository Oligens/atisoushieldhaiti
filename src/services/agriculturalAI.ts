export interface VisionDiagnosis {
  disease: string;
  confidence: number;
  affectedArea: string;
  explanation: string;
  treatments: string[];
  biopesticides: string[];
  precautions: string[];
  prevention: string[];
  uncertainty: string;
}

export async function analyzePlantImage(input: {
  imageData: string;
  mimeType: string;
  crop?: string;
  location?: string;
}): Promise<VisionDiagnosis> {
  const prompt = `Tu es un assistant agronomique pour Haïti. Analyse uniquement les indices visibles et le contexte fourni. Ne présente jamais une hypothèse comme une certitude. Si l'image est insuffisante, dis-le clairement et baisse la confiance.
Culture: ${input.crop || 'non précisée'}
Localisation: ${input.location || 'non précisée'}

Retourne UNIQUEMENT un JSON valide avec:
{
  "disease": "nom de la maladie ou problème probable",
  "confidence": 0,
  "affectedArea": "zone observée",
  "explanation": "indices visuels et contexte qui motivent l'hypothèse",
  "treatments": ["mesures intégrées et prudentes"],
  "biopesticides": ["options de biocontrôle, sans dosage dangereux"],
  "precautions": ["précautions"],
  "prevention": ["prévention"],
  "uncertainty": "limites et ce qui devrait être vérifié sur le terrain"
}
confidence doit être un entier de 0 à 100. Pour une image ambiguë, utilise une valeur basse. Ne recommande pas de dose ou de produit chimique spécifique sans validation réglementaire.`;

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'vision', prompt, imageData: input.imageData, mimeType: input.mimeType }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'Analyse IA indisponible.');

  const raw = String(payload.text || '').replace(/^\`\`\`json\s*/i, '').replace(/^\`\`\`\s*/i, '').replace(/\s*\`\`\`$/i, '').trim();
  const parsed = JSON.parse(raw) as VisionDiagnosis;
  return {
    disease: parsed.disease || 'Diagnostic indéterminé',
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    affectedArea: parsed.affectedArea || 'Non déterminée',
    explanation: parsed.explanation || 'Aucune explication fournie.',
    treatments: Array.isArray(parsed.treatments) ? parsed.treatments : [],
    biopesticides: Array.isArray(parsed.biopesticides) ? parsed.biopesticides : [],
    precautions: Array.isArray(parsed.precautions) ? parsed.precautions : [],
    prevention: Array.isArray(parsed.prevention) ? parsed.prevention : [],
    uncertainty: parsed.uncertainty || 'Validation terrain recommandée.',
  };
}

export async function askAgriculturalAI(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 50000);
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        mode: 'chat',
        prompt: `Tu es Atisou, assistant agronomique pour Haïti. Réponds en français, avec des explications pratiques, structurées et adaptées aux exploitations haïtiennes. Distingue faits, hypothèses et incertitudes. Privilégie la prévention et la lutte intégrée. N'invente ni diagnostic certain, ni dose de pesticide, ni réglementation. Question de l’utilisateur : ${prompt}`,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Le service IA a répondu HTTP ${response.status}.`);
    const answer = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!answer) throw new Error('Atisou n’a pas reçu de réponse exploitable. Réessayez.');
    return answer;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La réponse d’Atisou dépasse 50 secondes. Vérifiez votre connexion puis réessayez.');
    }
    throw error instanceof Error ? error : new Error('Assistant IA momentanément indisponible.');
  } finally {
    window.clearTimeout(timeout);
  }
}}
