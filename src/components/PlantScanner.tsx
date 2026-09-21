import { useState, useRef } from 'react';

interface PlantScannerProps { isDesktop: boolean; }
interface ScanResult { disease: string; confidence: number; affectedArea: string; treatments: string[]; biopesticides: string[]; precautions: string[]; prevention: string[]; }

const mockResults: ScanResult[] = [
  { disease: 'Mildiou de la tomate', confidence: 94, affectedArea: 'Feuilles et tiges', treatments: ['Appliquer bouillie bordelaise (1%)', 'Retirer les feuilles infectées', 'Pulvériser extrait de prêle'], biopesticides: ['Bacillus subtilis', 'Extrait de neem', 'Bicarbonate de soude'], precautions: ['Porter des gants', 'Délai de carence : 7 jours', 'Ne pas traiter par forte chaleur'], prevention: ['Espacer les plants (50cm)', 'Arroser au pied', 'Rotation des cultures'] },
  { disease: 'Rouille du caféier', confidence: 89, affectedArea: 'Feuilles (face inférieure)', treatments: ['Appliquer soufre mouillable', 'Pulvériser extrait de neem', 'Traiter avec Trichoderma'], biopesticides: ['Extrait de neem concentré', 'Bacillus amyloliquefaciens', 'Décoction de prêle'], precautions: ['Max 2 traitements par saison', 'Porter un masque FFP2', 'Délai de 14 jours'], prevention: ['Variétés résistantes (Catimor)', 'Taille régulière', 'Ombrière à 40-50%'] },
];

export default function PlantScanner({ isDesktop }: PlantScannerProps) {
  const [scanState, setScanState] = useState<'camera' | 'scanning' | 'result'>('camera');
  const [resultIndex, setResultIndex] = useState(0);
  const [showDetail, setShowDetail] = useState<'treatments' | 'bio' | 'precautions' | 'prevention' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const result = mockResults[resultIndex];

  const handleScan = () => {
    setScanState('scanning');
    setTimeout(() => { setResultIndex(Math.floor(Math.random() * mockResults.length)); setScanState('result'); }, 3000);
  };

  const resetScan = () => { setScanState('camera'); setShowDetail(null); };

  return (
    <div className={isDesktop ? 'p-8 animate-fade-in' : 'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
      <div className="mb-8">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} glass-panel neon-border-cyan rounded-full flex items-center justify-center animate-glow-pulse`}>
            <i className="fa-solid fa-camera icon-gold"></i>
          </span>
          SCANNER DE PLANTES
        </h1>
        <p className="text-sm text-body-secondary mt-2 flex items-center gap-2">
          <i className="fa-solid fa-microscope icon-gold"></i>Diagnostic instantané par vision IA
        </p>
      </div>

      {scanState === 'camera' && (
        <div className={isDesktop ? 'grid grid-cols-2 gap-8' : 'space-y-4'}>
          <div>
            <div className="glass-panel rounded-2xl border-2 border-dashed border-neon-cyan/30 p-12 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-48 h-48 border-2 border-neon-cyan rounded-2xl relative flex items-center justify-center">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-neon-cyan rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-neon-cyan rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-neon-cyan rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-neon-cyan rounded-br-lg"></div>
                <div className="text-center">
                  <span className="text-4xl">🌿</span>
                  <p className="text-xs text-gold font-medium mt-2">Ciblez la zone affectée</p>
                </div>
              </div>
              <p className="text-xs text-body-secondary mt-4 text-center px-8">Placez la feuille ou le fruit malade dans le cadre</p>
            </div>

            <div className="mt-6 space-y-3">
              <button onClick={handleScan} className="cyber-button w-full rounded-xl py-4 font-bold flex items-center justify-center gap-3">
                <i className="fa-solid fa-camera text-lg"></i>Prendre une photo
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="glass-panel neon-border-cyan text-gold w-full rounded-xl py-4 font-bold flex items-center justify-center gap-3 hover:glass-panel-hover">
                <i className="fa-solid fa-image text-lg icon-gold"></i>Importer depuis la galerie
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScan} className="hidden" />
            </div>
          </div>

          {isDesktop && (
            <div className="glass-panel neon-border-amber rounded-2xl p-5">
              <h3 className="text-sm font-bold text-body mb-3 flex items-center gap-2"><i className="fa-solid fa-lightbulb icon-gold"></i><span className="text-gold text-glow-amber">CONSEILS POUR UN BON SCAN</span></h3>
              <ul className="text-sm text-body space-y-2">
                <li className="flex items-start gap-2"><span className="text-gold">✓</span>Photographiez en lumière naturelle</li>
                <li className="flex items-start gap-2"><span className="text-gold">✓</span>Ciblez les zones visibles de la maladie</li>
                <li className="flex items-start gap-2"><span className="text-gold">✓</span>Évitez les photos floues ou trop sombres</li>
                <li className="flex items-start gap-2"><span className="text-gold">✓</span>Plusieurs angles améliorent le diagnostic</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {scanState === 'scanning' && (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="glass-panel neon-border-cyan rounded-3xl w-[400px] h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
            <div className="text-center">
              <span className="text-6xl animate-pulse">🔬</span>
              <p className="text-lg text-gold font-bold mt-4 text-glow-cyan">Analyse en cours...</p>
              <p className="text-sm text-body-secondary mt-2">Identification de la maladie par IA</p>
            </div>
            <div className="absolute left-4 right-4 h-1 bg-neon-cyan animate-scan-line shadow-lg shadow-neon-cyan/50"></div>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {scanState === 'result' && (
        <div className={isDesktop ? 'grid grid-cols-2 gap-8' : 'space-y-4'}>
          <div>
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-gold glass-panel neon-border-green px-3 py-1.5 rounded-full">✓ Maladie identifiée</span>
                <span className="text-xs text-body-secondary">Scan #{Date.now().toString().slice(-4)}</span>
              </div>
              <h2 className="text-2xl font-bold text-body">{result.disease}</h2>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 bg-cyber-bg-deep rounded-full h-3">
                  <div className="bg-neon-cyan h-3 rounded-full transition-all duration-1000" style={{ width: `${result.confidence}%` }}></div>
                </div>
                <span className="text-lg font-bold text-gold text-glow-cyan">{result.confidence}%</span>
              </div>
              <p className="text-sm text-body-secondary mt-2">Zone affectée : {result.affectedArea}</p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => setShowDetail('treatments')} className="glass-panel neon-border-green text-gold rounded-xl py-3 px-3 text-xs font-bold hover:glass-panel-hover flex items-center justify-center gap-1">💊 Traitements</button>
                <button onClick={() => setShowDetail('bio')} className="glass-panel neon-border-green text-gold rounded-xl py-3 px-3 text-xs font-bold hover:glass-panel-hover flex items-center justify-center gap-1">🌿 Biopesticides</button>
                <button onClick={() => setShowDetail('precautions')} className="glass-panel neon-border-amber text-gold rounded-xl py-3 px-3 text-xs font-bold hover:glass-panel-hover flex items-center justify-center gap-1">⚠️ Précautions</button>
                <button onClick={() => setShowDetail('prevention')} className="glass-panel neon-border-cyan text-gold rounded-xl py-3 px-3 text-xs font-bold hover:glass-panel-hover flex items-center justify-center gap-1">🛡️ Prévention</button>
              </div>
            </div>

            <button onClick={resetScan} className="glass-panel neon-border-cyan text-gold w-full mt-4 rounded-xl py-4 font-bold hover:glass-panel-hover flex items-center justify-center gap-2">
              <i className="fa-solid fa-rotate-right icon-gold"></i>Nouveau scan
            </button>
          </div>

          {showDetail && (
            <div className="glass-panel rounded-2xl p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-body">
                  {showDetail === 'treatments' && '💊 Traitements recommandés'}
                  {showDetail === 'bio' && '🌿 Biopesticides alternatifs'}
                  {showDetail === 'precautions' && '⚠️ Précautions de manipulation'}
                  {showDetail === 'prevention' && '🛡️ Mesures de prévention'}
                </h3>
                <button onClick={() => setShowDetail(null)} className="text-body-secondary text-lg"><i className="fa-solid fa-xmark icon-gold"></i></button>
              </div>
              <ul className="space-y-2">
                {(showDetail === 'treatments' ? result.treatments : showDetail === 'bio' ? result.biopesticides : showDetail === 'precautions' ? result.precautions : result.prevention).map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-body">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${showDetail === 'precautions' ? 'glass-panel neon-border-amber text-gold' : 'glass-panel neon-border-green text-gold'}`}>{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
