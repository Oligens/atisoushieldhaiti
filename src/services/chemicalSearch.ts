/**
 * Service de recherche de produits chimiques
 * Combine recherche locale et fallback vers API externe/IA
 */

export interface ChemicalProduct {
  id: string;
  name: string;
  type: string;
  toxicity: 'low' | 'medium' | 'high';
  toxicityScore: number;
  foodChainImpact: string;
  organImpact: string[];
  bioAlternatives: string[];
  precautions: string[];
}

// Base de données locale (simule Supabase/Neon)
const localDatabase: ChemicalProduct[] = [
  {
    id: '1',
    name: 'Glyphosate',
    type: 'Herbicide',
    toxicity: 'high',
    toxicityScore: 85,
    foodChainImpact: 'Contamination des sols et nappes phréatiques. Résidus détectés dans les cultures vivrières et l\'eau potable.',
    organImpact: ['Foie — Risque de stéatose hépatique', 'Reins — Toxicité rénale chronique', 'Système nerveux — Neurotoxicité potentielle'],
    bioAlternatives: ['Paillage organique (paille, feuilles mortes)', 'Désherbage manuel ciblé', 'Vinaigre horticole (acide acétique 20%)', 'Couverture végétale (légumineuses)'],
    precautions: ['Interdit en zone résidentielle', 'Délai de 30 jours avant plantation', 'Porter EPP complet'],
  },
  {
    id: '2',
    name: 'Chlorpyrifos',
    type: 'Insecticide',
    toxicity: 'high',
    toxicityScore: 92,
    foodChainImpact: 'Bioaccumulation dans la chaîne alimentaire. Résidus persistants dans les fruits et légumes.',
    organImpact: ['Foie — Hépatotoxicité sévère', 'Reins — Insuffisance rénale aiguë possible', 'Cerveau — Neurodéveloppement (enfants)'],
    bioAlternatives: ['Extrait de neem (Azadirachtine)', 'Bacillus thuringiensis (Bt)', 'Pièges à phéromones', 'Lâchers de coccinelles (prédateurs naturels)'],
    precautions: ['Classé très toxique OMS', 'Interdit dans l\'UE depuis 2020', 'Effets irréversibles sur le système nerveux'],
  },
  {
    id: '3',
    name: 'Mancozèbe',
    type: 'Fongicide',
    toxicity: 'medium',
    toxicityScore: 62,
    foodChainImpact: 'Dégradation en ETU (toxique). Résidus dans les tubercules et fruits.',
    organImpact: ['Thyroïde — Perturbation endocrinienne', 'Foie — Stress oxydatif hépatique', 'Reins — Néphrotoxicité modérée'],
    bioAlternatives: ['Bouillie bordelaise (cuivre, dosage modéré)', 'Bacillus subtilis (biofongicide)', 'Bicarbonate de potassium', 'Extrait de prêle des champs'],
    precautions: ['Délai de carence 14 jours', 'Ne pas inhaler les poussières', 'Rincer abondamment les récoltes'],
  },
  {
    id: '4',
    name: 'Imidaclopride',
    type: 'Insecticide systémique',
    toxicity: 'medium',
    toxicityScore: 58,
    foodChainImpact: 'Toxique pour les pollinisateurs (abeilles). Contamination du nectar et du pollen.',
    organImpact: ['Foie — Métabolisation hépatique', 'Reins — Élimination rénale', 'Système endocrinien — Perturbateur suspecté'],
    bioAlternatives: ['Savon insecticide (savon noir)', 'Huile essentielle de menthe poivrée', 'Diatomées (terre de diatomée)', 'Rotation culturale et plantes compagnes'],
    precautions: ['Ne pas traiter en floraison', 'Toxique pour les abeilles', 'Délai de 21 jours avant récolte'],
  },
  {
    id: '5',
    name: 'Bouillie bordelaise',
    type: 'Fongicide',
    toxicity: 'low',
    toxicityScore: 25,
    foodChainImpact: 'Accumulation cuivre dans les sols à long terme. Faible impact alimentaire aux doses recommandées.',
    organImpact: ['Foie — Risque minimal aux doses agricoles', 'Reins — Très faible toxicité rénale', 'Peau — Irritation possible au contact'],
    bioAlternatives: ['Trichoderma harzianum', 'Pulvérisation de lait dilué (10%)', 'Infusion de prêle concentrée', 'Bacillus amyloliquefaciens'],
    precautions: ['Max 6kg/ha/an (limite UE)', 'Porter des gants', 'Ne pas surdoser'],
  },
];

/**
 * Recherche locale dans la base de données
 */
export function searchLocalDatabase(query: string): ChemicalProduct | null {
  const normalizedQuery = query.toLowerCase().trim();
  
  return localDatabase.find(product => 
    product.name.toLowerCase().includes(normalizedQuery) ||
    product.type.toLowerCase().includes(normalizedQuery)
  ) || null;
}

/**
 * Génère une fiche produit via API externe/IA (simulation)
 * En production, cela appellerait une API Open Source ou un LLM
 */
export async function generateProductFromAI(productName: string): Promise<ChemicalProduct> {
  // Simulation d'un appel API (2 secondes de délai)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Logique de génération basée sur le nom du produit
  const lowerName = productName.toLowerCase();
  
  // Déterminer le type basé sur le nom
  let type = 'Pesticide';
  if (lowerName.includes('herb') || lowerName.includes('weed')) {
    type = 'Herbicide';
  } else if (lowerName.includes('insect') || lowerName.includes('bug')) {
    type = 'Insecticide';
  } else if (lowerName.includes('fung') || lowerName.includes('mildew')) {
    type = 'Fongicide';
  }

  // Score de toxicité aléatoire mais cohérent
  const toxicityScore = Math.floor(Math.random() * 60) + 30; // 30-90
  const toxicity: 'low' | 'medium' | 'high' = 
    toxicityScore >= 75 ? 'high' : toxicityScore >= 50 ? 'medium' : 'low';

  // Générer des impacts réalistes
  const organImpacts = [
    'Foie — Métabolisation hépatique potentielle',
    'Reins — Élimination rénale nécessaire',
    'Système nerveux — Effets neurotoxiques possibles à haute dose',
  ];

  const foodChainImpact = `Produit ${type.toLowerCase()} avec risque de résidus dans la chaîne alimentaire. Surveillance recommandée des niveaux de résidus dans les cultures traitées.`;

  // Alternatives biologiques génériques mais pertinentes
  const bioAlternatives = [
    'Extrait de neem (Azadirachta indica)',
    'Bacillus thuringiensis (Bt)',
    'Savon insecticide naturel',
    'Rotation culturale et plantes compagnes',
  ];

  const precautions = [
    'Porter des équipements de protection individuelle (EPI)',
    'Respecter les doses recommandées',
    'Délai de carence avant récolte à vérifier',
  ];

  return {
    id: `ai-${Date.now()}`,
    name: productName,
    type,
    toxicity,
    toxicityScore,
    foodChainImpact,
    organImpact: organImpacts,
    bioAlternatives,
    precautions,
  };
}

/**
 * Recherche intelligente avec fallback
 * 1. Cherche dans la base locale
 * 2. Si non trouvé, génère via IA/API externe
 */
export async function searchProduct(query: string): Promise<{
  product: ChemicalProduct;
  source: 'local' | 'ai';
}> {
  // Étape 1: Recherche locale
  const localResult = searchLocalDatabase(query);
  
  if (localResult) {
    return {
      product: localResult,
      source: 'local',
    };
  }

  // Étape 2: Fallback vers IA/API externe
  const aiResult = await generateProductFromAI(query);
  
  return {
    product: aiResult,
    source: 'ai',
  };
}

/**
 * Récupère tous les produits de la base locale
 */
export function getAllLocalProducts(): ChemicalProduct[] {
  return localDatabase;
}
