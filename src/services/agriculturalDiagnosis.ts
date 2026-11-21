import type { WeatherData } from './geolocation';
import type { AgriculturalRiskResult } from './agriculturalRisk';

export interface PlantDiseaseGuide {
  id: string;
  name: string;
  crops: string[];
  cause: string;
  symptoms: string[];
  weatherLink: string;
  prevention: string[];
  management: string[];
  relevance: 'eleve' | 'a-surveiller';
  relevanceReason: string;
}

export interface AgriculturalDiagnosis {
  level: 'faible' | 'modere' | 'eleve';
  title: string;
  summary: string;
  weatherContext: string[];
  immediateActions: string[];
  diseases: PlantDiseaseGuide[];
  generalPrecautions: string[];
  rainfall72h: number;
}

const diseaseLibrary = [
  {
    id: 'tomato-late-blight', name: 'Mildiou de la tomate', crops: ['Tomate'],
    cause: 'Phytophthora infestans',
    symptoms: ['Taches aqueuses qui brunissent sur les feuilles, parfois entourées d’une zone pâle.', 'Développement possible d’un duvet blanchâtre sous les feuilles par temps humide.', 'Lésions brunes sur les tiges et les fruits.'],
    weatherLink: 'Le risque augmente avec une humidité durable, des pluies répétées et des températures modérées.',
    prevention: ['Espacer les plants et tuteurer pour accélérer le séchage du feuillage.', 'Arroser au pied, de préférence le matin, sans mouiller les feuilles.', 'Éviter de travailler dans la parcelle lorsque le feuillage est mouillé.'],
    management: ['Retirer rapidement les parties fortement atteintes et les éliminer selon les règles locales, sans les laisser dans la parcelle.', 'Surveiller quotidiennement les plants voisins et nettoyer les outils.', 'Demander conseil à un technicien agricole avant tout traitement homologué pour la tomate.'],
    match: (w: WeatherData, rain: number) => w.humidity >= 85 && rain >= 8 && w.temperature >= 15 && w.temperature <= 28,
    reason: 'Humidité élevée, pluie prévue et température compatible avec le développement du mildiou.',
  },
  {
    id: 'tomato-early-blight', name: 'Alternariose de la tomate (brûlure précoce)', crops: ['Tomate', 'Pomme de terre'],
    cause: 'Alternaria spp.',
    symptoms: ['Taches brunes souvent rondes, parfois avec des anneaux concentriques.', 'Jaunissement puis dessèchement des feuilles les plus âgées.', 'Taches possibles près du pédoncule des fruits.'],
    weatherLink: 'La chaleur, l’humidité du feuillage et les périodes pluvieuses peuvent favoriser la maladie.',
    prevention: ['Faire une rotation avec des cultures non solanacées.', 'Éviter les éclaboussures de terre sur les feuilles et maintenir un bon espacement.', 'Retirer les résidus de culture malades après récolte.'],
    management: ['Retirer les feuilles atteintes sans défolier excessivement le plant.', 'Maintenir une nutrition équilibrée et éviter le stress hydrique.', 'Faire confirmer la maladie avant d’utiliser un fongicide autorisé pour la culture.'],
    match: (w: WeatherData, rain: number) => w.humidity >= 70 && rain >= 3 && w.temperature >= 20,
    reason: 'Humidité et précipitations associées à une température favorable aux taches foliaires.',
  },
  {
    id: 'bean-anthracnose', name: 'Anthracnose du haricot', crops: ['Haricot'],
    cause: 'Colletotrichum lindemuthianum',
    symptoms: ['Lésions sombres sur les nervures et les pétioles.', 'Taches enfoncées brun-noir sur les gousses, parfois avec des ponctuations rosées.', 'Plantules pouvant présenter des lésions et dépérir.'],
    weatherLink: 'Les pluies, les éclaboussures et une humidité élevée favorisent la dissémination.',
    prevention: ['Utiliser des semences saines et, si possible, des variétés adaptées ou tolérantes.', 'Éviter de manipuler les plants mouillés.', 'Pratiquer une rotation et enfouir ou éliminer correctement les résidus infectés.'],
    management: ['Isoler les foyers et retirer les organes très atteints.', 'Ne pas conserver les graines provenant de plantes symptomatiques.', 'Demander une confirmation technique avant tout traitement.'],
    match: (w: WeatherData, rain: number) => w.humidity >= 80 && rain >= 5 && w.temperature >= 15 && w.temperature <= 28,
    reason: 'Humidité élevée et pluies pouvant favoriser les infections et leur propagation.',
  },
  {
    id: 'bean-rust', name: 'Rouille du haricot', crops: ['Haricot'],
    cause: 'Uromyces appendiculatus',
    symptoms: ['Petites pustules poudreuses brun-rouille, surtout sous les feuilles.', 'Jaunissement et dessèchement des feuilles en cas d’attaque importante.'],
    weatherLink: 'Une humidité élevée et des périodes de rosée favorisent les infections.',
    prevention: ['Surveiller régulièrement le dessous des feuilles.', 'Éviter les plantations trop denses et limiter l’humidité prolongée du feuillage.', 'Utiliser des semences saines et des variétés tolérantes disponibles localement.'],
    management: ['Retirer les feuilles fortement atteintes lorsque cela est possible sans affaiblir la culture.', 'Éviter de déplacer les débris contaminés vers d’autres parcelles.', 'Consulter un conseiller pour choisir une méthode adaptée et autorisée.'],
    match: (w: WeatherData) => w.humidity >= 75 && w.temperature >= 16 && w.temperature <= 28,
    reason: 'Humidité ambiante élevée et température compatible avec la rouille.',
  },
  {
    id: 'banana-sigatoka', name: 'Cercosporiose / Sigatoka du bananier', crops: ['Banane', 'Plantain'],
    cause: 'Complexe de champignons responsables des Sigatoka jaune et noire',
    symptoms: ['Petites stries ou taches allongées sur les feuilles.', 'Taches qui s’élargissent, brunissent puis nécrosent.', 'Perte de surface foliaire lorsque plusieurs feuilles sont touchées.'],
    weatherLink: 'La chaleur, l’humidité persistante et les pluies peuvent accélérer les infections.',
    prevention: ['Maintenir un espacement et une aération suffisants.', 'Éviter les excès d’azote et assurer une nutrition équilibrée.', 'Surveiller les nouvelles feuilles et utiliser du matériel végétal sain.'],
    management: ['Enlever seulement les parties très atteintes avec un outil propre, sans supprimer trop de feuilles fonctionnelles.', 'Gérer les résidus foliaires selon les recommandations locales.', 'Faire identifier le type de Sigatoka avant tout programme de traitement.'],
    match: (w: WeatherData, rain: number) => w.humidity >= 80 && rain >= 5 && w.temperature >= 20,
    reason: 'Humidité et pluies prévues favorables aux maladies foliaires du bananier.',
  },
  {
    id: 'coffee-rust', name: 'Rouille orangée du caféier', crops: ['Café'],
    cause: 'Hemileia vastatrix',
    symptoms: ['Pustules poudreuses orange-jaune sous les feuilles.', 'Taches jaunâtres visibles sur la face supérieure.', 'Chute prématurée des feuilles et affaiblissement de l’arbre.'],
    weatherLink: 'La présence d’eau sur les feuilles, l’humidité et des températures favorables peuvent stimuler les infections.',
    prevention: ['Entretenir une ombre et une aération adaptées au système de culture.', 'Surveiller les feuilles basses et l’intérieur de la couronne.', 'Privilégier des plants sains et des variétés adaptées à la zone.'],
    management: ['Repérer les foyers et faire confirmer la rouille par un technicien.', 'Éviter les tailles sévères non recommandées.', 'N’appliquer un produit que si son usage sur caféier est autorisé et conseillé localement.'],
    match: (w: WeatherData) => w.humidity >= 75 && w.temperature >= 18 && w.temperature <= 28,
    reason: 'Humidité et température compatibles avec le développement de la rouille du caféier.',
  },
  {
    id: 'mango-anthracnose', name: 'Anthracnose du manguier', crops: ['Mangue'],
    cause: 'Colletotrichum spp.',
    symptoms: ['Taches noires ou brunes sur les feuilles et les jeunes rameaux.', 'Lésions sombres sur les fleurs et les fruits, pouvant évoluer en pourriture.', 'Dépérissement des inflorescences lors de périodes très humides.'],
    weatherLink: 'Les pluies et l’humidité pendant la floraison et le développement des fruits augmentent le risque.',
    prevention: ['Aérer la frondaison par une taille raisonnée en période appropriée.', 'Retirer les fruits momifiés et débris infectés.', 'Éviter les blessures et manipulations inutiles des fruits.'],
    management: ['Éliminer les fruits pourris et les débris contaminés.', 'Surveiller particulièrement les fleurs et jeunes fruits après les épisodes pluvieux.', 'Faire confirmer la maladie avant tout traitement post-récolte ou au champ.'],
    match: (w: WeatherData, rain: number) => w.humidity >= 80 && rain >= 5 && w.temperature >= 20,
    reason: 'Humidité et précipitations prévues pouvant favoriser l’anthracnose.',
  },
  {
    id: 'cacao-black-pod', name: 'Pourriture brune des cabosses de cacao', crops: ['Cacao'],
    cause: 'Phytophthora spp.',
    symptoms: ['Taches brunes qui s’étendent rapidement sur les cabosses.', 'Pourriture des fruits pouvant entraîner leur perte.', 'Présence possible de sporulation blanchâtre en conditions très humides.'],
    weatherLink: 'Les pluies fréquentes, l’humidité élevée et une mauvaise circulation de l’air favorisent la maladie.',
    prevention: ['Récolter régulièrement les cabosses mûres et retirer celles qui sont malades.', 'Maintenir une bonne aération et limiter les zones où l’eau stagne.', 'Nettoyer la parcelle et surveiller les cabosses après chaque période pluvieuse.'],
    management: ['Retirer les cabosses atteintes et les détruire selon les pratiques recommandées localement.', 'Éviter de laisser les fruits malades au sol ou sur l’arbre.', 'Demander un conseil agronomique pour un programme de lutte adapté à la zone.'],
    match: (w: WeatherData, rain: number) => w.humidity >= 85 && rain >= 10 && w.temperature >= 20,
    reason: 'Humidité très élevée et cumul de pluie susceptibles de favoriser les pourritures de cabosses.',
  },
] as const;

export function buildAgriculturalDiagnosis(
  weather: WeatherData,
  risk: AgriculturalRiskResult,
  rainfall72h: number,
): AgriculturalDiagnosis {
  const weatherContext: string[] = [
    `Température actuelle : ${weather.temperature} °C.`,
    `Humidité relative : ${weather.humidity} %.`,
    `Vent : ${weather.windSpeed} km/h.`,
    `Précipitations prévues sur les trois premiers jours : ${rainfall72h.toFixed(1)} mm.`,
  ];
  if (weather.humidity >= 80) weatherContext.push('L’humidité est élevée : le feuillage peut sécher plus lentement et certaines maladies foliaires peuvent être favorisées.');
  if (rainfall72h >= 10) weatherContext.push('Le cumul de pluie prévu justifie une vigilance sur le drainage, les éclaboussures et les infections favorisées par l’eau.');
  if (weather.temperature >= 32) weatherContext.push('La chaleur peut augmenter les besoins en eau et le stress des cultures.');
  if (rainfall72h < 3 && weather.temperature >= 28) weatherContext.push('La combinaison chaleur et faibles précipitations appelle une surveillance du stress hydrique.');
  const immediateActions: string[] = [];
  if (weather.humidity >= 75 || rainfall72h >= 5) {
    immediateActions.push('Inspecter les feuilles, tiges, fleurs et fruits, en particulier les faces inférieures des feuilles, après les épisodes humides.');
    immediateActions.push('Éviter de travailler dans les cultures lorsque le feuillage est mouillé et nettoyer les outils entre les parcelles.');
    immediateActions.push('Favoriser l’aération, l’espacement et l’arrosage au pied plutôt que sur le feuillage.');
  }
  if (rainfall72h >= 10) {
    immediateActions.push('Vérifier les rigoles et les drains, dégager les évacuations et éviter que l’eau stagne au pied des plants.');
    immediateActions.push('Reporter les travaux dans les sols détrempés afin de limiter le tassement et la propagation de certains agents.');
  }
  if (weather.temperature >= 32 || (rainfall72h < 3 && weather.temperature >= 28)) {
    immediateActions.push('Contrôler l’humidité du sol, pailler si la pratique convient à la culture et arroser tôt le matin selon les besoins.');
  }
  if (!immediateActions.length) immediateActions.push('Poursuivre l’observation régulière des cultures, maintenir une bonne hygiène de parcelle et suivre les prochaines prévisions météo.');
  const diseases = diseaseLibrary
    .map((disease) => {
      const relevant = disease.match(weather, rainfall72h);
      return {
        id: disease.id, name: disease.name, crops: [...disease.crops], cause: disease.cause,
        symptoms: [...disease.symptoms], weatherLink: disease.weatherLink,
        prevention: [...disease.prevention], management: [...disease.management],
        relevance: relevant ? 'eleve' as const : 'a-surveiller' as const,
        relevanceReason: relevant ? disease.reason : 'À surveiller uniquement si cette culture est présente ; les conditions météo actuelles ne suffisent pas à signaler une pression élevée.',
      };
    })
    .sort((a, b) => Number(b.relevance === 'eleve') - Number(a.relevance === 'eleve'));
  const level = risk.level;
  const title = level === 'eleve' ? 'Vigilance agricole renforcée' : level === 'modere' ? 'Surveillance agricole recommandée' : 'Conditions relativement favorables';
  const summary = level === 'eleve'
    ? 'Les indicateurs météo actuels justifient une inspection rapprochée des parcelles. Les maladies listées sont des risques à vérifier, pas des maladies confirmées.'
    : level === 'modere'
      ? 'Certains facteurs météo peuvent favoriser des problèmes phytosanitaires. Renforcez l’observation et appliquez les mesures préventives adaptées aux cultures présentes.'
      : 'Les indicateurs météo disponibles ne montrent pas de pression climatique forte selon les seuils utilisés. Continuez la surveillance et les bonnes pratiques.';
  return {
    level, title, summary, weatherContext, immediateActions, diseases,
    generalPrecautions: [
      'Identifier la culture et observer les symptômes avant de choisir une méthode de lutte : plusieurs problèmes peuvent se ressembler.',
      'Privilégier la prévention et la lutte intégrée : semences saines, rotation, hygiène, drainage, aération et surveillance.',
      'Ne jamais mélanger des pesticides ni appliquer un produit sans vérifier son homologation locale, son étiquette, les équipements de protection et le délai avant récolte.',
      'En cas de symptômes étendus ou inhabituels, demander une confirmation à un agronome ou au service phytosanitaire compétent.',
    ],
    rainfall72h,
  };
}
