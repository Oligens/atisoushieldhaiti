import { useState } from 'react';
import type { AgriculturalDiagnosis, PlantDiseaseGuide } from '../services/agriculturalDiagnosis';

interface AgriculturalDiagnosisProps {
  mode: 'summary' | 'details';
  diagnosis: AgriculturalDiagnosis;
  locationLabel: string;
  onClose: () => void;
  onDetails: () => void;
}

function RiskLabel({ level }: { level: AgriculturalDiagnosis['level'] }) {
  const styles = level === 'eleve'
    ? 'border-amber-400/50 text-amber-300'
    : level === 'modere'
      ? 'border-cyan-400/50 text-cyan-300'
      : 'border-emerald-400/50 text-emerald-300';
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${styles}`}>Risque {level}</span>;
}

function DiseaseCard({ disease }: { disease: PlantDiseaseGuide }) {
  return (
    <article className="glass-panel rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-body">{disease.name}</h3>
          <p className="text-xs text-body-secondary mt-1">Cultures concernées : {disease.crops.join(', ')}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${disease.relevance === 'eleve' ? 'border-amber-400/50 text-amber-300' : 'border-cyber-border text-body-secondary'}`}>
          {disease.relevance === 'eleve' ? 'À surveiller en priorité' : 'Surveillance préventive'}
        </span>
      </div>
      <p className="text-xs text-body-secondary mt-3"><strong className="text-gold">Agent causal :</strong> {disease.cause}</p>
      <p className="text-xs text-body mt-3">{disease.relevanceReason}</p>
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-bold text-gold mb-2"><i className="fa-solid fa-magnifying-glass mr-2"></i>SYMPTÔMES À OBSERVER</h4>
          <ul className="space-y-1.5">{disease.symptoms.map((item) => <li key={item} className="text-xs text-body-secondary flex gap-2"><span className="text-gold">•</span>{item}</li>)}</ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gold mb-2"><i className="fa-solid fa-cloud-rain mr-2"></i>LIEN AVEC LA MÉTÉO</h4>
          <p className="text-xs text-body-secondary">{disease.weatherLink}</p>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gold mb-2"><i className="fa-solid fa-shield-heart mr-2"></i>PRÉVENTION</h4>
          <ul className="space-y-1.5">{disease.prevention.map((item) => <li key={item} className="text-xs text-body-secondary flex gap-2"><span className="text-emerald-300">✓</span>{item}</li>)}</ul>
        </div>
        <div>
          <h4 className="text-xs font-bold text-gold mb-2"><i className="fa-solid fa-hand-holding-medical mr-2"></i>GESTION ET TRAITEMENT</h4>
          <ul className="space-y-1.5">{disease.management.map((item) => <li key={item} className="text-xs text-body-secondary flex gap-2"><span className="text-gold">•</span>{item}</li>)}</ul>
        </div>
      </div>
    </article>
  );
}

export default function AgriculturalDiagnosis({ mode, diagnosis, locationLabel, onClose, onDetails }: AgriculturalDiagnosisProps) {
  const [selectedCrop, setSelectedCrop] = useState('Toutes les cultures');
  const availableCrops = Array.from(new Set(diagnosis.diseases.flatMap((disease) => disease.crops))).sort();
  const visibleDiseases = selectedCrop === 'Toutes les cultures'
    ? diagnosis.diseases
    : diagnosis.diseases.filter((disease) => disease.crops.includes(selectedCrop));

  if (mode === 'summary') {
    return (
      <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="agri-diagnosis-title" className="glass-panel neon-border-cyan rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-gold font-bold tracking-wider">CONSEIL AGRICOLE PERSONNALISÉ</p>
              <h2 id="agri-diagnosis-title" className="text-xl sm:text-2xl font-bold text-body mt-1">Diagnostic de la zone</h2>
              <p className="text-xs text-body-secondary mt-1">{locationLabel}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer le diagnostic" className="w-9 h-9 rounded-full border border-cyber-border text-body-secondary hover:text-gold">✕</button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3"><RiskLabel level={diagnosis.level} /><span className="text-xs text-body-secondary">Pluie prévue sur 72 h : {diagnosis.rainfall72h.toFixed(1)} mm</span></div>
          <h3 className="text-lg font-bold text-body mt-4">{diagnosis.title}</h3>
          <p className="text-sm text-body-secondary mt-2">{diagnosis.summary}</p>
          <div className="glass-panel rounded-xl p-4 mt-5">
            <h3 className="text-xs font-bold text-gold mb-3">CE QUE LES AGRICULTEURS DOIVENT FAIRE MAINTENANT</h3>
            <ul className="space-y-3">{diagnosis.immediateActions.map((item, index) => <li key={item} className="text-sm text-body flex gap-3"><span className="text-gold font-bold">{index + 1}.</span><span>{item}</span></li>)}</ul>
          </div>
          <div className="mt-5">
            <h3 className="text-xs font-bold text-gold mb-2">INDICATEURS MÉTÉOROLOGIQUES UTILISÉS</h3>
            <ul className="space-y-1.5">{diagnosis.weatherContext.map((item) => <li key={item} className="text-xs text-body-secondary">• {item}</li>)}</ul>
          </div>
          {diagnosis.diseases.some((disease) => disease.relevance === 'eleve') && (
            <div className="mt-5 rounded-xl border border-amber-400/30 p-4">
              <p className="text-xs font-bold text-amber-300 mb-2">MALADIES À SURVEILLER EN PRIORITÉ</p>
              {diagnosis.diseases.filter((disease) => disease.relevance === 'eleve').map((disease) => <p key={disease.id} className="text-sm text-body mt-1">• {disease.name} — {disease.crops.join(', ')}</p>)}
              <p className="text-[11px] text-body-secondary mt-2">Ces maladies ne sont pas confirmées : elles sont proposées comme risques à vérifier si les cultures concernées sont présentes.</p>
            </div>
          )}
          <div className="mt-5 rounded-xl bg-black/10 p-3">
            <p className="text-[11px] text-body-secondary">Ce diagnostic est une aide à la vigilance fondée sur les données météo et les risques calculés pour cette zone. Il ne remplace pas l’observation des plantes ni l’avis d’un agronome.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button type="button" onClick={onDetails} className="cyber-button rounded-xl px-5 py-3 text-sm font-bold flex-1"><i className="fa-solid fa-book-open mr-2"></i>En savoir plus sur les maladies</button>
            <button type="button" onClick={onClose} className="rounded-xl border border-cyber-border px-5 py-3 text-sm text-body-secondary">Fermer</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm text-gold hover:underline mb-6">
          <i className="fa-solid fa-arrow-left"></i> Retour à Analyser un lieu
        </button>
        <header className="glass-panel neon-border-cyan rounded-2xl p-5 sm:p-7">
          <p className="text-xs font-bold text-gold tracking-wider">GUIDE PHYTOSANITAIRE ADAPTÉ À LA MÉTÉO</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-body mt-2">Maladies des cultures, prévention et traitements</h1>
          <p className="text-sm text-body-secondary mt-2">{locationLabel}</p>
          <div className="flex flex-wrap items-center gap-3 mt-4"><RiskLabel level={diagnosis.level} /><span className="text-xs text-body-secondary">Pluie sur 72 h : {diagnosis.rainfall72h.toFixed(1)} mm</span></div>
          <p className="text-sm text-body mt-4">{diagnosis.summary}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {diagnosis.weatherContext.slice(0, 4).map((item) => <div key={item} className="glass-panel rounded-xl p-3"><p className="text-xs text-body-secondary">{item}</p></div>)}
          </div>
        </header>

        <section className="glass-panel rounded-2xl p-5 sm:p-6 mt-6">
          <h2 className="text-lg font-bold text-body"><i className="fa-solid fa-clipboard-check text-gold mr-2"></i>Plan d’action pour cette zone</h2>
          <p className="text-xs text-body-secondary mt-1 mb-4">Mesures à appliquer selon les conditions météo qui ont servi au calcul du risque agricole.</p>
          <ol className="space-y-3">{diagnosis.immediateActions.map((item, index) => <li key={item} className="flex gap-3 text-sm text-body"><span className="w-7 h-7 shrink-0 rounded-full border border-[#D4AF37]/50 text-gold flex items-center justify-center text-xs">{index + 1}</span>{item}</li>)}</ol>
        </section>

        <section className="mt-7">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-body">Maladies végétales à connaître</h2>
            <p className="text-xs text-body-secondary mt-1">Les fiches prioritaires sont classées selon les conditions météo de la zone. Choisissez votre culture pour afficher les maladies qui la concernent.</p>
            <label className="block text-xs font-semibold text-gold mt-4 mb-2" htmlFor="diagnosis-crop-filter">Culture présente dans votre parcelle</label>
            <select id="diagnosis-crop-filter" value={selectedCrop} onChange={(event) => setSelectedCrop(event.target.value)} className="cyber-input w-full sm:max-w-sm rounded-xl px-4 py-3 text-sm">
              <option value="Toutes les cultures">Toutes les cultures</option>
              {availableCrops.map((crop) => <option key={crop} value={crop}>{crop}</option>)}
            </select>
          </div>
          <div className="space-y-4">{visibleDiseases.map((disease) => <DiseaseCard key={disease.id} disease={disease} />)}</div>
          {visibleDiseases.length === 0 && <p className="text-sm text-body-secondary">Aucune fiche disponible pour cette culture.</p>}
        </section>

        <section className="glass-panel rounded-2xl p-5 sm:p-6 mt-7">
          <h2 className="text-lg font-bold text-body"><i className="fa-solid fa-shield-halved text-gold mr-2"></i>Précautions phytosanitaires générales</h2>
          <ul className="space-y-3 mt-4">{diagnosis.generalPrecautions.map((item) => <li key={item} className="text-sm text-body-secondary flex gap-3"><i className="fa-solid fa-check text-emerald-300 mt-1"></i>{item}</li>)}</ul>
        </section>

        <section className="glass-panel rounded-2xl p-5 sm:p-6 mt-7">
          <h2 className="text-lg font-bold text-body">Sources et références agricoles</h2>
          <p className="text-xs text-body-secondary mt-1">Références utilisées pour constituer les fiches de surveillance. Les conseils doivent être adaptés à la culture et validés localement.</p>
          <ul className="space-y-3 mt-4 text-sm">
            <li><a className="text-gold hover:underline" href="https://agriculture.gouv.ht/view/01/IMG/pdf/Plan_de_Gestion_des_Pestes_et_Pesticides.pdf" target="_blank" rel="noreferrer">Ministère de l’Agriculture d’Haïti — Plan de gestion des pestes et pesticides</a></li>
            <li><a className="text-gold hover:underline" href="https://agriculture.gouv.ht/IMG/pdf/rapport-final-etude_systemes_de_production-2.pdf" target="_blank" rel="noreferrer">Ministère de l’Agriculture — Étude des systèmes de production et maladies des cultures</a></li>
            <li><a className="text-gold hover:underline" href="https://revues.ueh.edu.ht/index.php/red/article/fullText/38" target="_blank" rel="noreferrer">Université d’État d’Haïti — Ravageurs prévalents des cultures et gestion en Haïti (2026)</a></li>
            <li><a className="text-gold hover:underline" href="https://aurora.auburn.edu/handle/11200/49576" target="_blank" rel="noreferrer">Auburn University — Maladies du bananier et du plantain en Haïti</a></li>
          </ul>
        </section>
        <button type="button" onClick={onClose} className="cyber-button rounded-xl px-6 py-3 text-sm font-bold mt-7"><i className="fa-solid fa-arrow-left mr-2"></i>Retour à Analyser un lieu</button>
      </div>
    </div>
  );
}
