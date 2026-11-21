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

export interface WeatherObservation {
  id: string;
  observed_at: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  wind_speed: number;
  rainfall: number;
  weather?: Record<string, unknown> | null;
}

export interface ResearchEvent {
  id: string;
  source: 'ai_assistant' | 'location_analysis' | 'plant_scan';
  event_type: string;
  prompt?: string | null;
  ai_response?: string | null;
  crop?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  weather?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface FieldSurvey {
  id: string;
  linked_case_id?: string | null;
  crop: string;
  symptoms: string[];
  field_diagnosis?: string | null;
  assessment: 'confirmed' | 'rejected' | 'uncertain' | 'observation_only';
  observer_name: string;
  observer_role: string;
  observer_organization?: string | null;
  visit_date: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  treatment_applied?: string | null;
  treatment_date?: string | null;
  follow_up_date?: string | null;
  follow_up_result?: string | null;
  expert_notes?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string | null;
  created_at: string;
}

export interface RiskMapPoint {
  location: string;
  cases: number;
  observations: number;
  confirmed: number;
  avgConfidence: number;
  latitude: number | null;
  longitude: number | null;
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
  weatherObservations: number;
  fieldSurveys: number;
  aiConsultations: number;
  researchEvents: number;
  byCrop: { label: string; value: number }[];
  byDisease: { label: string; value: number }[];
  byLocation: { label: string; value: number }[];
  metrics: ModelMetrics;
}

export interface ResearchExport {
  generated_at: string;
  cases: AgriculturalCase[];
  weather_observations: WeatherObservation[];
  field_surveys: FieldSurvey[];
  research_events: ResearchEvent[];
  totals: { cases: number; weather_observations: number; field_surveys: number; research_events: number };
}

export async function saveAgriculturalCase(input: Omit<AgriculturalCase, 'id' | 'created_at'>) {
  return researchRequest<AgriculturalCase>('/api/research?path=cases', { method: 'POST', body: JSON.stringify(input) });
}

export async function loadAgriculturalCases() {
  return researchRequest<AgriculturalCase[]>('/api/research?path=cases');
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
  temperature: number; humidity: number; wind_speed: number; rainfall_mm?: number;
  weather?: Record<string, unknown>;
}) {
  return researchRequest('/api/research?path=weather-observations', { method: 'POST', body: JSON.stringify(input) });
}

export async function saveResearchEvent(input: Omit<ResearchEvent, 'id' | 'created_at'>) {
  return researchRequest<ResearchEvent>('/api/research?path=events', { method: 'POST', body: JSON.stringify(input) });
}

export async function saveFieldSurvey(input: Omit<FieldSurvey, 'id' | 'created_at'>) {
  return researchRequest<FieldSurvey>('/api/research?path=field-surveys', { method: 'POST', body: JSON.stringify(input) });
}

export async function loadFieldSurveys() {
  return researchRequest<FieldSurvey[]>('/api/research?path=field-surveys');
}

export async function loadResearchEvents() {
  return researchRequest<ResearchEvent[]>('/api/research?path=events');
}

export async function loadResearchStats() {
  return researchRequest<ResearchStats>('/api/research?path=stats');
}

export async function loadRiskMap() {
  return researchRequest<RiskMapPoint[]>('/api/research?path=risk-map');
}

export async function loadRecentWeatherObservations() {
  return researchRequest<WeatherObservation[]>('/api/research?path=observations');
}

export async function exportResearchData(format: 'csv' | 'json') {
  const data = await researchRequest<ResearchExport>('/api/research?path=export');
  if (format === 'json') return JSON.stringify(data, null, 2);

  const columns = [
    'type_enregistrement', 'id', 'date', 'source', 'culture', 'lieu', 'latitude', 'longitude',
    'diagnostic_ia', 'confiance_ia', 'validation_terrain', 'diagnostic_reference',
    'symptomes', 'professionnel', 'fonction_professionnelle', 'organisation',
    'traitement_applique', 'date_traitement', 'date_suivi', 'resultat_suivi',
    'temperature_c', 'humidite_pct', 'vent_kmh', 'pluie_mm', 'details_json',
  ];
  const esc = (value: unknown) => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    return '"' + stringValue.replace(/"/g, '""') + '"';
  };
  const rows: unknown[][] = [];
  data.cases.forEach((row) => rows.push([
    'cas_scanner_ia', row.id, row.created_at, 'plant_scan', row.crop, row.location, row.latitude, row.longitude,
    row.predicted_disease, row.confidence, row.validation_label, row.actual_disease, '', '', '', '',
    row.field_outcome, '', '', '', '', '', '', '', row.weather,
  ]));
  data.weather_observations.forEach((row) => rows.push([
    'observation_meteo', row.id, row.observed_at, 'location_analysis', '', 'Observation GPS',
    row.latitude, row.longitude, '', '', '', '', '', '', '', '', '', '', '',
    row.temperature, row.humidity, row.wind_speed, row.rainfall, row.weather,
  ]));
  data.field_surveys.forEach((row) => rows.push([
    'enquete_terrain', row.id, row.visit_date, 'field_survey', row.crop, row.location,
    row.latitude, row.longitude, '', '', row.assessment, row.field_diagnosis, row.symptoms,
    row.observer_name, row.observer_role, row.observer_organization, row.treatment_applied,
    row.treatment_date, row.follow_up_date, row.follow_up_result, '', '', '', '', row.expert_notes,
  ]));
  data.research_events.forEach((row) => rows.push([
    row.event_type, row.id, row.created_at, row.source, row.crop, row.location, row.latitude,
    row.longitude, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    { prompt: row.prompt, response: row.ai_response, weather: row.weather, metadata: row.metadata },
  ]));
  return [columns.join(','), ...rows.map((row) => row.map(esc).join(','))].join('\n');
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
