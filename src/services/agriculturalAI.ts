export interface VisionDiagnosis {
  disease: string; confidence: number; affectedArea: string; explanation: string;
  treatments: string[]; biopesticides: string[]; precautions: string[]; prevention: string[]; uncertainty: string;
}
async function callAI(body: Record<string, unknown>) {
  const response = await fetch('/api/ai', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'IA indisponible.');
  return payload;
}
export async function analyzePlantImage(input:{imageData:string;mimeType:string;crop?:string;location?:string}):Promise<VisionDiagnosis>{
  const payload=await callAI({mode:'vision',mimeType:input.mimeType,imageData:input.imageData,prompt:`Analyse cette image agricole pour Haïti. Culture: ${input.crop||'inconnue'}. Zone: ${input.location||'inconnue'}. Ne présente jamais une hypothèse comme une certitude. Retourne uniquement JSON avec disease, confidence(0-100), affectedArea, explanation, treatments[], biopesticides[], precautions[], prevention[], uncertainty. N'invente pas de doses ni de réglementation.`});
  const raw=String(payload.text||'').replace(/^```json\s*/i,'').replace(/^```\s*/i,'').replace(/\s*```$/i,'').trim();
  const d=JSON.parse(raw);
  return { disease:d.disease||'Diagnostic indéterminé', confidence:Math.max(0,Math.min(100,Number(d.confidence)||0)), affectedArea:d.affectedArea||'Non déterminée', explanation:d.explanation||'', treatments:Array.isArray(d.treatments)?d.treatments:[], biopesticides:Array.isArray(d.biopesticides)?d.biopesticides:[], precautions:Array.isArray(d.precautions)?d.precautions:[], prevention:Array.isArray(d.prevention)?d.prevention:[], uncertainty:d.uncertainty||'Validation terrain recommandée.' };
}
