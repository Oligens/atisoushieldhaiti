export type AgriculturalRiskLevel='faible'|'modere'|'eleve';
export interface AgriculturalRiskResult{score:number;level:AgriculturalRiskLevel;factors:string[];recommendations:string[];horizon:'48-72h'}
export function calculateAgriculturalRisk(input:{temperature:number;humidity:number;windSpeed:number;rainfallMm?:number;crop?:string;disease?:string}):AgriculturalRiskResult{
 let score=0;const factors:string[]=[];const recommendations:string[]=[];
 if(input.humidity>=85){score+=30;factors.push('Humidité très élevée')}else if(input.humidity>=70){score+=18;factors.push('Humidité élevée')}
 if(input.temperature>=18&&input.temperature<=30&&input.humidity>=75){score+=20;factors.push('Température + humidité favorables à plusieurs pressions fongiques')}
 if((input.rainfallMm||0)>=10){score+=25;factors.push('Pluviométrie récente importante')}else if((input.rainfallMm||0)>=3){score+=10;factors.push('Précipitations récentes')}
 if(input.windSpeed<8&&input.humidity>=80){score+=10;factors.push('Vent faible + humidité élevée')}
 score=Math.min(100,score);const level=score>=60?'eleve':score>=30?'modere':'faible';
 if(level==='eleve')recommendations.push('Inspecter la parcelle dans les prochaines 24 h.','Éviter une intervention chimique préventive sans diagnostic.','Documenter les symptômes par photo.');
 else if(level==='modere')recommendations.push('Renforcer la surveillance des feuilles et fruits.','Favoriser l’aération et limiter l’humectation du feuillage.');
 else recommendations.push('Maintenir la surveillance et les pratiques préventives.');
 return {score,level,factors,recommendations,horizon:'48-72h'};
}
