export type ValidationLabel = 'confirmed' | 'rejected' | 'uncertain';

export interface FieldValidationRecord {
  id: string;
  createdAt: string;
  crop: string;
  location: string;
  predictedDisease: string;
  confidence: number;
  label: ValidationLabel;
  note?: string;
}

const STORAGE_KEY = 'atisou_field_validations_v1';

export function saveFieldValidation(record: Omit<FieldValidationRecord, 'id' | 'createdAt'>): FieldValidationRecord {
  const full: FieldValidationRecord = { ...record, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const current = loadFieldValidations();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, full]));
  return full;
}

export function loadFieldValidations(): FieldValidationRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function exportFieldValidations(): string {
  return JSON.stringify(loadFieldValidations(), null, 2);
}
