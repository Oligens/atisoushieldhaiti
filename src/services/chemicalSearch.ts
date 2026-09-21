import { completePesticidesDatabase, type Pesticide } from '../data/pesticidesData';

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

/**
 * Récupère tous les pesticides de la base de données locale (1200 entrées)
 */
export function getAllPesticides(): ChemicalProduct[] {
  return completePesticidesDatabase.map((pesticide: Pesticide) => ({
    id: pesticide.id,
    name: pesticide.nom,
    type: pesticide.type,
    toxicity: pesticide.niveauRisque === 'Élevé' ? 'high' : pesticide.niveauRisque === 'Modéré' ? 'medium' : 'low',
    toxicityScore: pesticide.scoreToxicite,
    foodChainImpact: pesticide.impactChaineAlimentaire,
    organImpact: pesticide.impactOrganes,
    bioAlternatives: pesticide.equivalentsBiologiques,
    precautions: pesticide.precautionsStrictes,
  }));
}

/**
 * Recherche intelligente dans la base de données locale
 * Insensible à la casse et aux accents
 */
export function searchLocalDatabase(query: string): ChemicalProduct | null {
  if (!query.trim()) return null;
  
  const normalizedQuery = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  
  const found = completePesticidesDatabase.find((pesticide: Pesticide) => {
    const normalizedNom = pesticide.nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    const normalizedType = pesticide.type
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    return normalizedNom.includes(normalizedQuery) || 
           normalizedType.includes(normalizedQuery);
  });
  
  if (!found) return null;
  
  return {
    id: found.id,
    name: found.nom,
    type: found.type,
    toxicity: found.niveauRisque === 'Élevé' ? 'high' : found.niveauRisque === 'Modéré' ? 'medium' : 'low',
    toxicityScore: found.scoreToxicite,
    foodChainImpact: found.impactChaineAlimentaire,
    organImpact: found.impactOrganes,
    bioAlternatives: found.equivalentsBiologiques,
    precautions: found.precautionsStrictes,
  };
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
