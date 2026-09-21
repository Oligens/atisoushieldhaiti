import { useRef, useState } from 'react';
import { analyzePlantImage, type VisionDiagnosis } from '../services/agriculturalAI';
import { saveFieldValidation, type ValidationLabel } from '../services/fieldValidation';

interface PlantScannerProps { isDesktop: boolean; }

export default function PlantScanner({ isDesktop }: PlantScannerProps) {
  const [scanState, setScanState] = useState<'camera' | 'scanning' | 'result' | 'error'>('camera');
  const [result, setResult] = useState<VisionDiagnosis | null>(null);
  const [showDetail, setShowDetail] = useState<'treatments' | 'bio' | 'precautions' | 'prevention' | null>(null);
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [crop, setCrop] = useState('');
  const [location, setLocation] = useState('');
  const [validation, setValidation] = useState<ValidationLabel | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Veuillez sélectionner une image.'); setScanState('error'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = String(reader.result || '');
      setImagePreview(imageData);
      setScanState('scanning');
      try {
        const diagnosis = await analyzePlantImage({ imageData, mimeType: file.type, crop, location });
        setResult(diagnosis);
        setShowDetail(null);
        setScanState('result');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Le diagnostic IA est indisponible.');
        setScanState('error');
      }
    };
    reader.onerror = () => { setError('Impossible de lire l’image.'); setScanState('error'); };
    reader.readAsDataURL(file);
  };

  const requestCamera = () => fileInputRef.current?.click();

  const resetScan = () => {
    setScanState('camera');
    setResult(null);
    setImagePreview('');
    setError('');
    setShowDetail(null);
  };

  const getLocation = () => {
    if (!navigator.geolocation) { setError('La géolocalisation n’est pas disponible sur cet appareil.'); return; }
    navigator.geolocation.getCurrentPosition(
      p => setLocation(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`),
      () => setError('Localisation refusée ou indisponible. Vous pouvez saisir la zone manuellement.'),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

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
          <i className="fa-solid fa-microscope icon-gold"></i>Vision IA réelle via passerelle serveur sécurisée
        </p>
      </div>

      {scanState === 'camera' && (
        <div className={isDesktop ? 'grid grid-cols-2 gap-8' : 'space-y-4'}>
          <div>
            <div className="glass-panel rounded-2xl border-2 border-dashed border-neon-cyan/30 p-8 flex flex-col items-center justify-center min-h-[400px]">
              {imagePreview ? <img src={imagePreview} alt="Aperçu de la plante" className="max-h-64 rounded-xl object-contain" /> : <div className="text-center"><span className="text-6xl">🌿</span><p className="text-xs text-gold font-medium mt-3">Ajoutez une photo de la zone affectée</p></div>}
              <p className="text-xs text-body-secondary mt-4 text-center">Une photo nette et bien éclairée améliore l’analyse.</p>
            </div>
            <div className="glass-panel rounded-2xl p-5 mt-4 space-y-3">
              <label className="block text-xs text-body-secondary">Culture (facultatif)
                <input value={crop} onChange={e => setCrop(e.target.value)} placeholder="Ex. tomate, maïs, café..." className="cyber-input w-full rounded-xl px-4 py-3 mt-1" />
              </label>
              <label className="block text-xs text-body-secondary">Zone / localisation (facultatif)
                <div className="flex gap-2 mt-1"><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Département, commune ou coordonnées" className="cyber-input flex-1 rounded-xl px-4 py-3" /><button type="button" onClick={getLocation} className="glass-panel neon-border-cyan rounded-xl px-4 text-gold" title="Utiliser ma position">⌖</button></div>
              </label>
            </div>
            <div className="mt-4 space-y-3">
              <button onClick={requestCamera} className="cyber-button w-full rounded-xl py-4 font-bold flex items-center justify-center gap-3"><i className="fa-solid fa-camera text-lg"></i>Prendre une photo</button>
              <button onClick={requestCamera} className="glass-panel neon-border-cyan text-gold w-full rounded-xl py-4 font-bold flex items-center justify-center gap-3"><i className="fa-solid fa-image icon-gold"></i>Importer depuis la galerie</button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && analyzeFile(e.target.files[0])} className="hidden" />
            </div>
          </div>
          {isDesktop && <div className="glass-panel neon-border-amber rounded-2xl p-5"><h3 className="text-sm font-bold text-gold mb-3">PROTOCOLE DE CAPTURE</h3><ul className="text-sm text-body space-y-2"><li>✓ Lumière naturelle</li><li>✓ Feuille/fruits entièrement visibles</li><li>✓ Plusieurs angles si possible</li><li>✓ Éviter flou, contre-jour et arrière-plan chargé</li></ul></div>}
        </div>
      )}

      {scanState === 'scanning' && <div className="flex flex-col items-center justify-center min-h-[400px]"><div className="glass-panel neon-border-cyan rounded-3xl w-full max-w-[500px] h-[330px] flex flex-col items-center justify-center relative overflow-hidden">{imagePreview && <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-contain opacity-30" />}<div className="relative text-center"><span className="text-6xl animate-pulse">🔬</span><p className="text-lg text-gold font-bold mt-4">Analyse IA en cours...</p><p className="text-sm text-body-secondary mt-2">Vision + contexte agricole</p></div><div className="absolute left-4 right-4 h-1 bg-neon-cyan animate-scan-line"></div></div></div>}

      {scanState === 'error' && <div className="glass-panel neon-border-amber rounded-2xl p-8 max-w-2xl"><h2 className="text-lg font-bold text-gold">Analyse non disponible</h2><p className="text-sm text-body mt-3">{error}</p><p className="text-xs text-body-secondary mt-3">Vérifiez que GEMINI_API_KEY est configurée dans l’environnement Vercel de production, puis redéployez.</p><button onClick={resetScan} className="cyber-button rounded-xl px-5 py-3 mt-5">Réessayer</button></div>}

      {scanState === 'result' && result && (
        <div className={isDesktop ? 'grid grid-cols-2 gap-8' : 'space-y-4'}>
          <div>
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4"><span className="text-xs font-bold text-gold glass-panel neon-border-green px-3 py-1.5 rounded-full">✓ Analyse IA</span><span className="text-xs text-body-secondary">Résultat</span></div>
              <h2 className="text-2xl font-bold text-body">{result.disease}</h2>
              <div className="flex items-center gap-3 mt-3"><div className="flex-1 bg-cyber-bg-deep rounded-full h-3"><div className="bg-neon-cyan h-3 rounded-full" style={{ width: `${result.confidence}%` }} /></div><span className="text-lg font-bold text-gold">{result.confidence}%</span></div>
              <p className="text-sm text-body-secondary mt-2">Zone observée : {result.affectedArea}</p>
              <div className="glass-panel rounded-xl p-4 mt-4"><p className="text-sm text-body leading-relaxed">{result.explanation}</p></div>
              <div className="grid grid-cols-2 gap-2 mt-4">{(['treatments','bio','precautions','prevention'] as const).map(key => <button key={key} onClick={() => setShowDetail(key)} className="glass-panel neon-border-cyan text-gold rounded-xl py-3 px-3 text-xs font-bold">{key === 'treatments' ? '💊 Mesures' : key === 'bio' ? '🌿 Biocontrôle' : key === 'precautions' ? '⚠️ Précautions' : '🛡️ Prévention'}</button>)}</div>
            </div>
            <button onClick={resetScan} className="glass-panel neon-border-cyan text-gold w-full mt-4 rounded-xl py-4 font-bold">↻ Nouveau scan</button>
          </div>
          <div className="space-y-4">
            {showDetail && <div className="glass-panel rounded-2xl p-6"><h3 className="text-sm font-bold text-gold mb-4">{showDetail === 'treatments' ? '💊 Mesures recommandées' : showDetail === 'bio' ? '🌿 Options de biocontrôle' : showDetail === 'precautions' ? '⚠️ Précautions' : '🛡️ Prévention'}</h3><ul className="space-y-3">{(result[showDetail === 'bio' ? 'biopesticides' : showDetail]).map((item, i) => <li key={i} className="text-sm text-body glass-panel rounded-xl p-3">{i + 1}. {item}</li>)}</ul></div>}
            <div className="glass-panel neon-border-amber rounded-2xl p-6"><h3 className="text-sm font-bold text-gold">INCERTITUDE / VALIDATION</h3><p className="text-sm text-body mt-3">{result.uncertainty}</p><p className="text-xs text-body-secondary mt-3">Ce résultat est une aide à la décision et doit être confronté à l’observation terrain ou à un professionnel.</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
