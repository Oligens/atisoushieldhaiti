import { supabase } from './supabase';

export interface AgriculturalCase {
  id: string;
  created_at: string;
  crop: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  predicted_disease: string;
  confidence: number;
  validation_label?: 'confirmed' | 'rejected' | 'uncertain' | null;
  actual_disease?: string | null;
  weather?: Record<string, unknown> | null;
  field_outcome?: string | null;
}

export interface ModelMetrics { accuracy: number; precision: number; recall: number; f1: number; evaluatedCases: number; confusionMatrix: { actual: string; predicted: string; count: number }[]; }

export interface ResearchStats {
  totalCases: number;
  confirmed: number;
  rejected: number;
  uncertain: number;
  confirmationRate: number;
  averageConfidence: number;
  byCrop: { label: string; value: number }[];
  byDisease: { label: string; value: number }[];
  byLocation: { label: string; value: number }[];
  metrics: ModelMetrics;
}

export async function saveAgriculturalCase(input: Omit<AgriculturalCase, 'id' | 'created_at'>) {
  if (!supabase) throw new Error('Supabase non configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.from('agricultural_cases').insert(input).select().single();
  if (error) throw error;
  return data as AgriculturalCase;
}

export async function updateCaseValidation(id: string, label: AgriculturalCase['validation_label'], fieldOutcome?: string, actualDisease?: string) {
  if (!supabase) throw new Error('Supabase non configuré.');
  const { data, error } = await supabase.from('agricultural_cases').update({
    validation_label: label,
    field_outcome: fieldOutcome ?? null,
    actual_disease: actualDisease?.trim() || null,
    validated_at: new Date().toISOString()
  }).eq('id', id).select().single();
  if (error) throw error;
  return data as AgriculturalCase;
}

export async function saveWeatherObservation(input: {
  latitude: number; longitude: number; observed_at?: string;
  temperature: number; humidity: number; wind_speed: number; rainfall_mm?: number; source?: string;
}) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('weather_observations').insert({
    ...input,
    observed_at: input.observed_at ?? new Date().toISOString(),
    source: input.source ?? 'AtisouShield'
  }).select().single();
  if (error) throw error;
  return data;
}

export async function loadResearchStats(): Promise<ResearchStats> {
  if (!supabase) throw new Error('Supabase non configuré. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
  const { data, error } = await supabase.from('agricultural_cases').select('crop,location,predicted_disease,confidence,validation_label,actual_disease');
  if (error) throw error;
  const rows = (data ?? []) as Pick<AgriculturalCase, 'crop'|'location'|'predicted_disease'|'confidence'|'validation_label'|'actual_disease'>[];
  const count = (key: keyof typeof rows[number]) => {
    const map = new Map<string, number>();
    rows.forEach(row => {
      const value = String(row[key] || 'Non renseigné');
      map.set(value, (map.get(value) || 0) + 1);
    });
    return [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([label,value])=>({label,value}));
  };
  const confirmed = rows.filter(r=>r.validation_label==='confirmed').length;
  const rejected = rows.filter(r=>r.validation_label==='rejected').length;
  const uncertain = rows.filter(r=>r.validation_label==='uncertain').length;
  const validated = confirmed + rejected;
  const evaluated = rows.filter(r => r.validation_label === 'confirmed' || r.validation_label === 'rejected');
  const correct = evaluated.filter(r => r.validation_label === 'confirmed').length;
  const accuracy = evaluated.length ? correct / evaluated.length : 0;
  const referenceRows = rows.filter(r => !!r.actual_disease && (r.validation_label === 'confirmed' || r.validation_label === 'rejected'));
  const labels = [...new Set(referenceRows.flatMap(r => [r.predicted_disease, r.actual_disease as string]))];
  const confusionMatrix = labels.flatMap(actual => labels.map(predicted => ({
    actual, predicted, count: referenceRows.filter(r => r.actual_disease === actual && r.predicted_disease === predicted).length
  }))).filter(x => x.count > 0);
  const tp = labels.reduce((sum, label) => sum + referenceRows.filter(r => r.actual_disease === label && r.predicted_disease === label).length, 0);
  const fp = labels.reduce((sum, label) => sum + referenceRows.filter(r => r.actual_disease !== label && r.predicted_disease === label).length, 0);
  const fn = labels.reduce((sum, label) => sum + referenceRows.filter(r => r.actual_disease === label && r.predicted_disease !== label).length, 0);
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    totalCases: rows.length,
    confirmed,
    rejected,
    uncertain,
    confirmationRate: validated ? Math.round((confirmed / validated) * 100) : 0,
    averageConfidence: rows.length ? Math.round(rows.reduce((s,r)=>s + Number(r.confidence || 0),0) / rows.length) : 0,
    byCrop: count('crop'),
    byDisease: count('predicted_disease'),
    byLocation: count('location'),
    metrics: { accuracy, precision, recall, f1, evaluatedCases: referenceRows.length, confusionMatrix }
  };
}

export async function loadRiskMap() {
  if (!supabase) throw new Error('Supabase non configuré.');
  const { data, error } = await supabase.from('agricultural_cases')
    .select('location,latitude,longitude,predicted_disease,confidence,validation_label,weather,created_at')
    .not('location','is',null);
  if (error) throw error;
  const grouped = new Map<string, { location:string; cases:number; confirmed:number; avgConfidence:number; latitude:number|null; longitude:number|null }>();
  for (const row of data ?? []) {
    const key = row.location || 'Non renseigné';
    const prev = grouped.get(key) ?? { location:key,cases:0,confirmed:0,avgConfidence:0,latitude:row.latitude,longitude:row.longitude };
    prev.cases += 1;
    prev.confirmed += row.validation_label === 'confirmed' ? 1 : 0;
    prev.avgConfidence += Number(row.confidence || 0);
    if (row.latitude != null) prev.latitude = row.latitude;
    if (row.longitude != null) prev.longitude = row.longitude;
    grouped.set(key, prev);
  }
  return [...grouped.values()].map(r=>({...r,avgConfidence:Math.round(r.avgConfidence/r.cases)})).sort((a,b)=>b.cases-a.cases);
}

export async function exportResearchData(format: 'csv'|'json') {
  if (!supabase) throw new Error('Supabase non configuré.');
  const { data, error } = await supabase.from('agricultural_cases').select('*').order('created_at',{ascending:false});
  if (error) throw error;
  const rows = data ?? [];
  if (format === 'json') return JSON.stringify(rows, null, 2);
  const keys = ['id','created_at','crop','location','latitude','longitude','predicted_disease','confidence','validation_label','field_outcome','weather'];
  const esc = (v: unknown) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v ?? '');
    return '"' + s.replaceAll('"','""') + '"';
  };
  return [keys.join(','), ...rows.map(row=>keys.map(k=>esc((row as Record<string,unknown>)[k])).join(','))].join('\n');
}

export function downloadResearchFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
