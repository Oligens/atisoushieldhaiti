export type AgriculturalRiskLevel = 'faible' | 'modere' | 'eleve';

export interface AgriculturalRiskInput {
  temperature: number;
  humidity: number;
  windSpeed: number;
  rainfallMm?: number;
  crop?: string;
  disease?: string;
}

export interface AgriculturalRiskResult {
  score: number;
  level: AgriculturalRiskLevel;
  factors: string[];
  recommendations: string[];
  horizon: 'actuel' | '48-72h';
}

/**
 * Règle explicable de présélection. Ce n'est pas un modèle scientifique validé :
 * elle sert à structurer les variables et devra être calibrée sur des observations terrain.
 */
export function calculateAgriculturalRisk(input: AgriculturalRiskInput): AgriculturalRiskResult {
  let score = 0;
  const factors: string[] = [];
  const recommendations: string[] = [];

  if (input.humidity >= 85) { score += 30; factors.push('Humidité relative très élevée'); }
  else if (input.humidity >= 70) { score += 18; factors.push('Humidité relative élevée'); }

  if (input.temperature >= 18 && input.temperature <= 30 && input.humidity >= 75) {
    score += 20;
    factors.push('Température et humidité compatibles avec plusieurs pressions fongiques');
  }

  if ((input.rainfallMm || 0) >= 10) { score += 25; factors.push('Pluviométrie récente importante'); }
  else if ((input.rainfallMm || 0) >= 3) { score += 10; factors.push('Précipitations récentes'); }

  if (input.windSpeed < 8 && input.humidity >= 80) {
    score += 10;
    factors.push('Vent faible avec humidité élevée');
  }

  if (input.crop) factors.push(`Culture suivie : ${input.crop}`);
  if (input.disease) factors.push(`Surveillance ciblée : ${input.disease}`);

  score = Math.min(100, score);
  const level: AgriculturalRiskLevel = score >= 60 ? 'eleve' : score >= 30 ? 'modere' : 'faible';

  if (level === 'eleve') {
    recommendations.push('Inspecter les parcelles dans les prochaines 24 h.');
    recommendations.push('Éviter les interventions chimiques préventives sans diagnostic.');
    recommendations.push('Documenter toute lésion par photo pour validation.');
  } else if (level === 'modere') {
    recommendations.push('Renforcer la surveillance des feuilles et fruits.');
    recommendations.push('Favoriser l’aération et limiter l’humectation du feuillage.');
  } else {
    recommendations.push('Maintenir la surveillance régulière et les pratiques préventives.');
  }

  return { score, level, factors, recommendations, horizon: '48-72h' };
}
