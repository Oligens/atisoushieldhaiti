export type ValidationLabel = 'confirmed' | 'rejected' | 'uncertain';
export interface FieldValidationRecord { id:string; createdAt:string; crop:string; location:string; predictedDisease:string; confidence:number; label:ValidationLabel; }
const KEY='atisou_field_validations_v1';
export function loadFieldValidations():FieldValidationRecord[]{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
export function saveFieldValidation(record:Omit<FieldValidationRecord,'id'|'createdAt'>){const full={...record,id:crypto.randomUUID(),createdAt:new Date().toISOString()};localStorage.setItem(KEY,JSON.stringify([...loadFieldValidations(),full]));return full;}
export function exportFieldValidations(){return JSON.stringify(loadFieldValidations(),null,2);}
