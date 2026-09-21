import { pesticidesData, type LocalPesticide } from '../data/pesticidesData';

export interface ChemicalProduct extends LocalPesticide {}

const localDatabase: ChemicalProduct[] = pesticidesData;

export function searchLocalDatabase(query: string): ChemicalProduct | null {
  const normalizedQuery = query.toLocaleLowerCase('fr-FR').trim();
  if (!normalizedQuery) return null;

  return localDatabase.find((product) =>
    [product.name, product.activeIngredient, product.type, product.context]
      .join(' ')
      .toLocaleLowerCase('fr-FR')
      .includes(normalizedQuery)
  ) || null;
}

/**
 * Fallback IA conservé pour les recherches hors base locale.
 * Les données générées sont explicitement présentées comme non validées.
 */
export async function generateProductFromAI(productName: string): Promise<ChemicalProduct> {
  await new Promise(resolve => setTimeout(resolve, 2000));

  const lowerName = productName.toLocaleLowerCase('fr-FR');
  let type = 'Pesticide';
  if (lowerName.includes('herb')) type = 'Herbicide';
  else if (lowerName.includes('insect')) type = 'Insecticide';
  else if (lowerName.includes('fung')) type = 'Fongicide';

  const toxicityScore = 50;
  return {
    id: `ai-${Date.now()}`,
    name: productName,
    activeIngredient: productName,
    type,
    context: 'Recherche externe',
    toxicity: 'medium',
    toxicityScore,
    evidenceLevel: 'normalized',
    foodChainImpact: 'Donnée générée automatiquement — vérifier auprès d’une source réglementaire avant utilisation.',
    organImpact: [
      'Foie — données spécifiques à vérifier',
      'Reins — données spécifiques à vérifier',
      'Système nerveux — données spécifiques à vérifier',
    ],
    bioAlternatives: ['Gestion intégrée des ravageurs', 'Biocontrôle adapté à la culture'],
    precautions: ['Vérifier l’étiquette officielle et les EPI', 'Respecter les doses et délais réglementaires'],
  };
}

export async function searchProduct(query: string): Promise<{
  product: ChemicalProduct;
  source: 'local' | 'ai';
}> {
  const localResult = searchLocalDatabase(query);

  if (localResult) {
    return { product: localResult, source: 'local' };
  }

  return {
    product: await generateProductFromAI(query),
    source: 'ai',
  };
}

export function getAllLocalProducts(): ChemicalProduct[] {
  return localDatabase;
}

export function getLocalPesticideCount(): number {
  return localDatabase.length;
}
