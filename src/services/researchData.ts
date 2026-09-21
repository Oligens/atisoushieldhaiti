import { researchRequest } from './neon';

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

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  evaluatedCases: number;
  confusionMatrix: { actual: string; predicted: string; count: number }[];
}

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
  return researchRequest<AgriculturalCase>('/api/research?path=cases', { method: 'POST', body: JSON.stringify(input) });
}

export async function attachWeatherToCase(id: string, weather: Record<string, unknown>) {
  return researchRequest<AgriculturalCase>('/api/research?path=cases-weather', { method: 'PATCH', body: JSON.stringify({ id, weather }) });
}

export async function updateCaseValidation(id: string, label: AgriculturalCase['validation_label'], fieldOutcome?: string, actualDisease?: string) {
  return researchRequest<AgriculturalCase>('/api/research?path=cases', {
    method: 'PATCH',
    body: JSON.stringify({ id, validation_label: label, field_outcome: fieldOutcome, actual_disease: actualDisease }),
  });
}

export async function saveWeatherObservation(input: {
  latitude: number; longitude: number; observed_at?: string;
  temperature: number; humidity: number; wind_speed: number; rainfall_mm?: number; source?: string;
}) {
  return researchRequest('/api/research?path=weather-observations', { method: 'POST', body: JSON.stringify(input) });
}

export async function loadResearchStats() {
  return researchRequest<ResearchStats>('/api/research?path=stats');
}

export async function loadRiskMap() {
  return researchRequest<Array<{ location: string; cases: number; confirmed: number; avgConfidence: number; latitude: number | null; longitude: number | null }>>('/api/research?path=risk-map');
}

export async function exportResearchData(format: 'csv' | 'json') {
  const rows = await researchRequest<AgriculturalCase[]>('/api/research?path=export');
  if (format === 'json') return JSON.stringify(rows, null, 2);
  const keys = ['id','created_at','crop','location','latitude','longitude','predicted_disease','confidence','validation_label','actual_disease','field_outcome','weather'];
  const esc = (v: unknown) => {
    const s = typeof v === 'string' ? v : JSON.stringify(v ?? '');
    return '"' + s.replaceAll('"','""') + '"';
  };
  return [keys.join(','), ...rows.map(row => keys.map(k => esc((row as Record<string, unknown>)[k])).join(','))].join('\n');
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
