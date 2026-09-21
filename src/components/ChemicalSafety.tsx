import { useState } from 'react';
import { searchProduct, getAllLocalProducts, type ChemicalProduct } from '../services/chemicalSearch';

interface ChemicalSafetyProps {
  isDesktop: boolean;
}

export default function ChemicalSafety({ isDesktop }: ChemicalSafetyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ChemicalProduct | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'local' | 'ai' | null>(null);
  const [allProducts] = useState<ChemicalProduct[]>(getAllLocalProducts());

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSelectedProduct(null);
      setDataSource(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await searchProduct(query);
      setSelectedProduct(result.product);
      setDataSource(result.source);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      handleSearch(value);
    } else {
      setSelectedProduct(null);
      setDataSource(null);
    }
  };

  const toxicityColors = {
    low: { bg: 'bg-green-pale', text: 'text-green-primary', label: 'FAIBLE' },
    medium: { bg: 'glass-panel neon-border-amber', text: 'text-gold', label: 'MODÉRÉ' },
    high: { bg: 'glass-panel neon-border-amber', text: 'text-gold', label: 'ÉLEVÉ' },
  };

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
          Recherche intelligente avec base de données locale et IA
        </p>
      </div>

      {/* Bannière d'alerte santé */}
      <div className="glass-panel neon-border-amber rounded-2xl p-6 mb-6 flex items-start gap-4">
        <span className="text-3xl">⚠️</span>
        <div>
          <h3 className="text-base font-bold text-gold text-glow-amber">IMPACT SUR LA SANTÉ HUMAINE</h3>
          <p className="text-sm text-body mt-2 leading-relaxed">
            Les pesticides chimiques s'accumulent dans la chaîne alimentaire et peuvent causer des dommages irréversibles au <strong>foie</strong>, aux <strong>reins</strong> et au <strong>système nerveux</strong>. Privilégiez toujours les alternatives biologiques.
          </p>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-6 max-w-xl">
        <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 icon-gold"></i>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Rechercher un pesticide (ex: Glyphosate, Chlorpyrifos...)"
          className="cyber-input w-full rounded-2xl pl-12 pr-5 py-4 text-sm"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Indicateur de source */}
      {dataSource && selectedProduct && (
        <div className="mb-4 glass-panel rounded-xl px-4 py-2 inline-flex items-center gap-2">
          <i className={`fa-solid ${dataSource === 'local' ? 'fa-database' : 'fa-robot'} icon-gold`}></i>
          <span className="text-xs text-body">
            Source : {dataSource === 'local' ? 'Base de données locale' : 'IA / API Open Source'}
          </span>
        </div>
      )}

      {/* Vue détaillée du produit sélectionné */}
      {selectedProduct ? (
        <div className="animate-fade-in">
          <button
            onClick={() => {
              setSelectedProduct(null);
              setSearchQuery('');
              setDataSource(null);
            }}
            className="flex items-center gap-2 text-sm text-gold font-medium mb-6 hover:underline"
          >
            <i className="fa-solid fa-arrow-left icon-gold"></i>
            Retour à la liste
          </button>

          <div className={isDesktop ? 'grid grid-cols-2 gap-8' : 'space-y-4'}>
            {/* Colonne gauche : Informations principales */}
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

              {/* Score de toxicité */}
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

              {/* Impact chaîne alimentaire */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-body mb-3 flex items-center gap-2">
                  🍽️ Impact sur la chaîne alimentaire
                </h4>
                <p className="text-sm text-body leading-relaxed glass-panel rounded-xl p-4">
                  {selectedProduct.foodChainImpact}
                </p>
              </div>

              {/* Impact sur les organes */}
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

            {/* Colonne droite : Alternatives et précautions */}
            <div className="space-y-6">
              {/* Équivalents biologiques */}
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

              {/* Précautions */}
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
        /* Liste des produits */
        <div className={isDesktop ? 'grid grid-cols-2 lg:grid-cols-4 gap-4' : 'space-y-3'}>
          {allProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                setSelectedProduct(product);
                setSearchQuery(product.name);
                setDataSource('local');
              }}
              className="glass-panel rounded-2xl p-5 text-left hover:glass-panel-hover card-hover"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${toxicityColors[product.toxicity].bg}`}>
                  <span className="text-2xl">
                    {product.toxicity === 'high' ? '☠️' : product.toxicity === 'medium' ? '⚠️' : '🟢'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-body">{product.name}</h3>
                  <p className="text-xs text-body-secondary">{product.type}</p>
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
      )}

      {/* Engagement */}
      {!selectedProduct && (
        <div className="mt-8 glass-panel neon-border-green rounded-2xl p-6">
          <h3 className="text-base font-bold text-body mb-2 flex items-center gap-2">
            <i className="fa-solid fa-globe icon-gold"></i>
            <span className="gradient-text">NOTRE ENGAGEMENT</span>
          </h3>
          <p className="text-sm text-body-secondary leading-relaxed">
            AtisouShield Haïti promeut l'agriculture durable et la protection de la santé publique. 
            Notre système de recherche combine une base de données locale avec une IA open source pour fournir 
            des informations complètes sur tous les produits chimiques, même ceux non répertoriés localement.
          </p>
        </div>
      )}
    </div>
  );
}
