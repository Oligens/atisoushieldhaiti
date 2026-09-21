import { useMemo, useState } from 'react';
import { getAllLocalProducts, getLocalPesticideCount, type ChemicalProduct } from '../services/chemicalSearch';

interface ChemicalSafetyProps {
  isDesktop: boolean;
}

export default function ChemicalSafety({ isDesktop }: ChemicalSafetyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ChemicalProduct | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dataSource, setDataSource] = useState<'local' | 'ai' | null>(null);
  const [allProducts] = useState<ChemicalProduct[]>(getAllLocalProducts());\n  const localPesticideCount = getLocalPesticideCount();

  const INITIAL_VISIBLE_COUNT = isDesktop ? 12 : 8;
  const LOAD_MORE_COUNT = isDesktop ? 12 : 8;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('fr-FR');

    if (!normalizedQuery) return allProducts;

    return allProducts.filter((product) =>
      [product.name, product.type, product.foodChainImpact, ...product.organImpact]
        .join(' ')
        .toLocaleLowerCase('fr-FR')
        .includes(normalizedQuery)
    );
  }, [allProducts, searchQuery]);

  const visibleProducts = useMemo(() => {
    if (searchQuery.trim()) return filteredProducts;

    const visibleCount = isExpanded ? allProducts.length : INITIAL_VISIBLE_COUNT;
    return allProducts.slice(0, visibleCount);
  }, [allProducts, filteredProducts, searchQuery, isExpanded, INITIAL_VISIBLE_COUNT]);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setSelectedProduct(null);
    setDataSource(null);

    // Une recherche active doit toujours ouvrir la vue filtrée,
    // indépendamment de l'état du bouton "Afficher plus".
    if (value.trim()) setIsExpanded(true);
  };

  const handleProductSelect = (product: ChemicalProduct) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setDataSource('local');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedProduct(null);
    setDataSource(null);
    setIsExpanded(false);
  };

  const toxicityColors = {
    low: { bg: 'bg-green-pale', text: 'text-green-primary', label: 'FAIBLE' },
    medium: { bg: 'glass-panel neon-border-amber', text: 'text-gold', label: 'MODÉRÉ' },
    high: { bg: 'glass-panel neon-border-amber', text: 'text-gold', label: 'ÉLEVÉ' },
  };

  const canExpand = !searchQuery.trim() && visibleProducts.length < allProducts.length;
  const canCollapse = !searchQuery.trim() && isExpanded;

  return (
    <div className={isDesktop ? 'p-8 animate-fade-in' : 'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
      <div className="mb-8">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} glass-panel neon-border-amber rounded-full flex items-center justify-center animate-glow-pulse`}>
            <i className="fa-solid fa-shield-halved icon-gold"></i>
          </span>
          SÉCURITÉ & PRODUITS CHIMIQUES
        </h1>
        <p className="text-sm text-body-secondary mt-2 flex items-center gap-2">
          <i className="fa-solid fa-flask icon-gold"></i>
          Recherche intelligente dans la base de données locale des pesticides
        </p>
      </div>

      <div className="glass-panel neon-border-amber rounded-2xl p-6 mb-6 flex items-start gap-4">
        <span className="text-3xl">⚠️</span>
        <div>
          <h3 className="text-base font-bold text-gold text-glow-amber">IMPACT SUR LA SANTÉ HUMAINE</h3>
          <p className="text-sm text-body mt-2 leading-relaxed">
            Les pesticides chimiques s'accumulent dans la chaîne alimentaire et peuvent causer des dommages irréversibles au <strong>foie</strong>, aux <strong>reins</strong> et au <strong>système nerveux</strong>. Privilégiez toujours les alternatives biologiques.
          </p>
        </div>
      </div>

      <div className="relative mb-6 max-w-2xl">
        <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 icon-gold"></i>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Rechercher parmi tous les pesticides (nom, type, impact...)"
          className="cyber-input w-full rounded-2xl pl-12 pr-12 py-4 text-sm"
          aria-label="Rechercher un pesticide dans la base locale"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gold hover:text-gold-light transition-colors"
            aria-label="Effacer la recherche"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        )}
      </div>

      {dataSource && selectedProduct && (
        <div className="mb-4 glass-panel rounded-xl px-4 py-2 inline-flex items-center gap-2">
          <i className={`fa-solid ${dataSource === 'local' ? 'fa-database' : 'fa-robot'} icon-gold`}></i>
          <span className="text-xs text-body">
            Source : {dataSource === 'local' ? 'Base de données locale' : 'IA / API Open Source'}
          </span>
        </div>
      )}

      {selectedProduct ? (
        <div className="animate-fade-in">
          <button
            onClick={clearSearch}
            className="flex items-center gap-2 text-sm text-gold font-medium mb-6 hover:underline"
          >
            <i className="fa-solid fa-arrow-left icon-gold"></i>
            Retour à la liste
          </button>

          <div className={isDesktop ? 'grid grid-cols-2 gap-8' : 'space-y-4'}>
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-body">{selectedProduct.name}</h2>
                  <p className="text-sm text-body-secondary">{selectedProduct.type}</p>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-bold ${toxicityColors[selectedProduct.toxicity].bg} ${toxicityColors[selectedProduct.toxicity].text}`}>
                  {toxicityColors[selectedProduct.toxicity].label}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-body-secondary">Score de toxicité</span>
                  <span className={`text-xl font-bold ${toxicityColors[selectedProduct.toxicity].text}`}>
                    {selectedProduct.toxicityScore}/100
                  </span>
                </div>
                <div className="w-full bg-cyber-bg-deep rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      selectedProduct.toxicity === 'high'
                        ? 'bg-neon-red'
                        : selectedProduct.toxicity === 'medium'
                        ? 'bg-neon-amber'
                        : 'bg-neon-green'
                    }`}
                    style={{ width: `${selectedProduct.toxicityScore}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-bold text-body mb-3 flex items-center gap-2">
                  🍽️ Impact sur la chaîne alimentaire
                </h4>
                <p className="text-sm text-body leading-relaxed glass-panel rounded-xl p-4">
                  {selectedProduct.foodChainImpact}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-body mb-3 flex items-center gap-2">
                  🫀 Impact sur les organes
                </h4>
                <div className="space-y-2">
                  {selectedProduct.organImpact.map((impact, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-body glass-panel neon-border-amber rounded-xl p-4">
                      <i className="fa-solid fa-triangle-exclamation icon-gold mt-0.5"></i>
                      {impact}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel neon-border-green rounded-2xl p-6">
                <h4 className="text-base font-bold text-body mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-leaf icon-gold"></i>
                  <span className="gradient-text">ÉQUIVALENTS BIOLOGIQUES</span>
                </h4>
                <div className="space-y-3">
                  {selectedProduct.bioAlternatives.map((alt, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-body glass-panel rounded-xl p-4">
                      <span className="w-6 h-6 bg-neon-green text-cyber-bg-deep rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        ✓
                      </span>
                      {alt}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel neon-border-amber rounded-2xl p-6">
                <h4 className="text-base font-bold text-body mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation icon-gold"></i>
                  <span className="text-gold text-glow-amber">PRÉCAUTIONS STRICTES</span>
                </h4>
                <div className="space-y-3">
                  {selectedProduct.precautions.map((p, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-body glass-panel rounded-xl p-4">
                      <i className="fa-solid fa-circle-exclamation icon-gold mt-0.5"></i>
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-body">Base locale des pesticides</h2>
              <p className="text-xs text-body-secondary mt-1">
                {searchQuery.trim()
                  ? `${filteredProducts.length} résultat${filteredProducts.length > 1 ? 's' : ''} correspondant à « ${searchQuery} »`
                  : `${allProducts.length} produit${allProducts.length > 1 ? 's' : ''} disponible${allProducts.length > 1 ? 's' : ''}`}
              </p>
            </div>
            {!searchQuery.trim() && (
              <span className="glass-panel rounded-full px-3 py-1.5 text-xs text-gold flex items-center gap-2">
                <i className="fa-solid fa-database icon-gold"></i>
                Base locale
              </span>
            )}
          </div>

          {visibleProducts.length > 0 ? (
            <div className={isDesktop ? 'grid grid-cols-2 lg:grid-cols-4 gap-4' : 'grid grid-cols-1 gap-3'}>
              {visibleProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleProductSelect(product)}
                  className="glass-panel rounded-2xl p-5 text-left hover:glass-panel-hover card-hover border border-[#D4AF37]/20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${toxicityColors[product.toxicity].bg}`}>
                      <span className="text-2xl">
                        {product.toxicity === 'high' ? '☠️' : product.toxicity === 'medium' ? '⚠️' : '🟢'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-body truncate">{product.name}</h3>
                      <p className="text-xs text-body-secondary truncate">{product.type}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${toxicityColors[product.toxicity].bg} ${toxicityColors[product.toxicity].text}`}>
                      {toxicityColors[product.toxicity].label}
                    </span>
                  </div>
                  <div className="w-full bg-cyber-bg-deep rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        product.toxicity === 'high'
                          ? 'bg-neon-red'
                          : product.toxicity === 'medium'
                          ? 'bg-neon-amber'
                          : 'bg-neon-green'
                      }`}
                      style={{ width: `${product.toxicityScore}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-body-secondary mt-2">Toxicité : {product.toxicityScore}/100</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-10 text-center">
              <div className="w-14 h-14 mx-auto rounded-full glass-panel neon-border-amber flex items-center justify-center mb-4">
                <i className="fa-solid fa-magnifying-glass icon-gold text-xl"></i>
              </div>
              <h3 className="text-base font-bold text-body">Aucun pesticide trouvé</h3>
              <p className="text-sm text-body-secondary mt-2">
                Aucun produit local ne correspond à « {searchQuery} ».
              </p>
            </div>
          )}

          {(canExpand || canCollapse) && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="flex flex-wrap justify-center gap-3">
                {canExpand && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="cyber-button rounded-xl px-6 py-3 font-semibold flex items-center gap-2 border border-[#D4AF37]"
                    aria-label="Afficher plus de pesticides"
                  >
                    <span className="text-lg leading-none">+</span>
                    Afficher plus
                  </button>
                )}
                {canCollapse && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="rounded-xl px-6 py-3 font-semibold flex items-center gap-2 text-gold bg-transparent border border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all"
                    aria-label="Réduire la liste des pesticides"
                  >
                    <span className="text-lg leading-none">−</span>
                    Réduire
                  </button>
                )}
              </div>
              {!searchQuery.trim() && (
                <p className="text-xs text-body-secondary">
                  {isExpanded
                    ? `Affichage complet : ${allProducts.length} produit${allProducts.length > 1 ? 's' : ''}`
                    : `Affichage initial : ${Math.min(INITIAL_VISIBLE_COUNT, allProducts.length)} produit${Math.min(INITIAL_VISIBLE_COUNT, allProducts.length) > 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          )}

          <div className="mt-8 glass-panel neon-border-green rounded-2xl p-6">
            <h3 className="text-base font-bold text-body mb-2 flex items-center gap-2">
              <i className="fa-solid fa-globe icon-gold"></i>
              <span className="gradient-text">NOTRE ENGAGEMENT</span>
            </h3>
            <p className="text-sm text-body-secondary leading-relaxed">
              AtisouShield Haïti promeut l'agriculture durable et la protection de la santé publique.
              La recherche ci-dessus parcourt directement la base locale chargée dans l'application.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
