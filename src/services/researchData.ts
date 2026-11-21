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
  ai_symptoms?: string[];
  ai_explanation?: string | null;
  ai_affected_area?: string | null;
  ai_treatments?: string[];
  ai_prevention?: string[];
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

export interface FieldResearchReport {
  id: string;
  case_id?: string | null;
  investigator_name: string;
  investigator_role: string;
  institution?: string | null;
  credential_reference?: string | null;
  field_visit_date: string;
  department?: string | null;
  commune?: string | null;
  locality?: string | null;
  crop: string;
  crop_stage?: string | null;
  symptoms: string[];
  field_diagnosis: string;
  diagnosis_method: string;
  diagnostic_status: 'confirmed' | 'rejected' | 'uncertain';
  laboratory_reference?: string | null;
  treatment_applied?: string | null;
  treatment_product?: string | null;
  treatment_active_ingredient?: string | null;
  treatment_start_date?: string | null;
  treatment_end_date?: string | null;
  treatment_notes?: string | null;
  field_outcome?: string | null;
  follow_up_date?: string | null;
  yield_impact?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export interface ResearchStats {
  totalCases: number;
  confirmed: number;
  rejected: number;
  uncertain: number;
  confirmationRate: number;
  averageConfidence: number;
  weatherObservations: number;
  fieldReports: number;
  pendingFieldReports: number;
  verifiedFieldReports: number;
  byCrop: { label: string; value: number }[];
  byDisease: { label: string; value: number }[];
  byLocation: { label: string; value: number }[];
  metrics: ModelMetrics;
}

export interface ResearchExport {
  generated_at: string;
  cases: AgriculturalCase[];
  weather_observations: WeatherObservation[];
  totals: { cases: number; weather_observations: number };
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


export async function loadResearchCases() {
  return researchRequest<AgriculturalCase[]>('/api/research?path=cases');
}

export async function loadFieldReports() {
  return researchRequest<FieldResearchReport[]>('/api/research?path=field-reports');
}

export async function saveFieldReport(input: Omit<FieldResearchReport, 'id' | 'created_at' | 'verification_status'>) {
  return researchRequest<FieldResearchReport>('/api/research?path=field-reports', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function saveFieldFollowup(input: {
  report_id: string;
  follow_up_date: string;
  symptoms_evolution?: string;
  disease_progression?: string;
  treatment_continued?: string;
  treatment_changed?: string;
  observed_result: string;
  yield_or_loss_observation?: string;
}) {
  return researchRequest('/api/research?path=field-followups', {
    method: 'POST',
    body: JSON.stringify(input),
  });
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
    'type_enregistrement', 'id', 'date', 'culture', 'lieu', 'latitude', 'longitude',
    'diagnostic_predit', 'confiance', 'validation_terrain', 'diagnostic_terrain',
    'resultat_terrain', 'temperature_c', 'humidite_pct', 'vent_kmh', 'pluie_mm', 'meteo_json',
  ];
  const esc = (value: unknown) => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    return '"' + stringValue.replace(/"/g, '""') + '"';
  };
  const caseRows = data.cases.map((row) => [
    'cas_agricole', row.id, row.created_at, row.crop, row.location, row.latitude, row.longitude,
    row.predicted_disease, row.confidence, row.validation_label, row.actual_disease, row.field_outcome,
    '', '', '', '', row.weather,
  ]);
  const observationRows = data.weather_observations.map((row) => [
    'observation_meteo', row.id, row.observed_at, '', 'Observation GPS', row.latitude, row.longitude,
    '', '', '', '', '', row.temperature, row.humidity, row.wind_speed, row.rainfall, row.weather,
  ]);
  return [
    columns.join(','),
    ...[...caseRows, ...observationRows].map((row) => row.map(esc).join(',')),
  ].join('\n');
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
