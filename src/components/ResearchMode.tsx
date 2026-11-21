import { useEffect, useState } from 'react';
import {
  downloadResearchFile,
  exportResearchData,
  loadRecentWeatherObservations,
  loadResearchStats,
  loadRiskMap,
  loadAgriculturalCases,
  loadFieldSurveys,
  saveFieldSurvey,
  type AgriculturalCase,
  type FieldSurvey,
  type ResearchStats,
  type RiskMapPoint,
  type WeatherObservation,
} from '../services/researchData';

interface Props { isDesktop: boolean; }

export default function ResearchMode({ isDesktop }: Props) {
  const [stats, setStats] = useState<ResearchStats | null>(null);
  const [riskMap, setRiskMap] = useState<RiskMapPoint[]>([]);
  const [observations, setObservations] = useState<WeatherObservation[]>([]);
  const [cases, setCases] = useState<AgriculturalCase[]>([]);
  const [fieldSurveys, setFieldSurveys] = useState<FieldSurvey[]>([]);
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [surveyMessage, setSurveyMessage] = useState('');
  const [fieldForm, setFieldForm] = useState({
    linked_case_id: '',
    crop: '',
    symptoms: '',
    field_diagnosis: '',
    assessment: 'observation_only' as FieldSurvey['assessment'],
    observer_name: '',
    observer_role: 'Agronome',
    observer_organization: '',
    visit_date: new Date().toISOString().slice(0, 10),
    location: '',
    latitude: '',
    longitude: '',
    treatment_applied: '',
    treatment_date: '',
    follow_up_date: '',
    follow_up_result: '',
    expert_notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextStats, nextMap, nextObservations, nextCases, nextSurveys] = await Promise.all([
        loadResearchStats(),
        loadRiskMap(),
        loadRecentWeatherObservations(),
        loadAgriculturalCases(),
        loadFieldSurveys(),
      ]);
      setStats(nextStats);
      setRiskMap(nextMap);
      setObservations(nextObservations);
      setCases(nextCases);
      setFieldSurveys(nextSurveys);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Données de recherche indisponibles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const exportData = async (format: 'csv' | 'json') => {
    setExporting(true);
    setError('');
    try {
      const content = await exportResearchData(format);
      downloadResearchFile(
        content,
        'atisoushield-corpus-scientifique-' + new Date().toISOString().slice(0, 10) + '.' + format,
        format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible.');
    } finally {
      setExporting(false);
    }
  };

  const submitFieldSurvey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSurvey(true);
    setSurveyMessage('');
    try {
      await saveFieldSurvey({
        linked_case_id: fieldForm.linked_case_id || null,
        crop: fieldForm.crop.trim(),
        symptoms: fieldForm.symptoms.split(/[;,\\n]/).map((value) => value.trim()).filter(Boolean),
        field_diagnosis: fieldForm.field_diagnosis.trim() || null,
        assessment: fieldForm.assessment,
        observer_name: fieldForm.observer_name.trim(),
        observer_role: fieldForm.observer_role.trim(),
        observer_organization: fieldForm.observer_organization.trim() || null,
        visit_date: new Date(fieldForm.visit_date + 'T12:00:00').toISOString(),
        location: fieldForm.location.trim(),
        latitude: fieldForm.latitude ? Number(fieldForm.latitude) : null,
        longitude: fieldForm.longitude ? Number(fieldForm.longitude) : null,
        treatment_applied: fieldForm.treatment_applied.trim() || null,
        treatment_date: fieldForm.treatment_date || null,
        follow_up_date: fieldForm.follow_up_date || null,
        follow_up_result: fieldForm.follow_up_result.trim() || null,
        expert_notes: fieldForm.expert_notes.trim() || null,
      });
      setSurveyMessage('Enquête terrain enregistrée dans le corpus. Les métriques liées au cas seront actualisées.');
      setFieldForm((current) => ({
        ...current, linked_case_id: '', symptoms: '', field_diagnosis: '',
        assessment: 'observation_only', visit_date: new Date().toISOString().slice(0, 10),
        treatment_applied: '', treatment_date: '', follow_up_date: '', follow_up_result: '', expert_notes: '',
      }));
      await refresh();
    } catch (e) {
      setSurveyMessage(e instanceof Error ? e.message : 'Impossible d’enregistrer cette enquête terrain.');
    } finally {
      setSavingSurvey(false);
    }
  };

  const metric = (value: number) => stats?.metrics.evaluatedCases
    ? (value * 100).toFixed(1) + '%'
    : 'N/D';
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date inconnue' : date.toLocaleString('fr-FR');
  };

  return <div className={isDesktop ? 'p-8 animate-fade-in' : 'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
          <span className="w-10 h-10 glass-panel neon-border-cyan rounded-full flex items-center justify-center">
            <i className="fa-solid fa-flask icon-gold"></i>
          </span>
          MODE RECHERCHE
        </h1>
        <p className="text-sm text-body-secondary mt-2">
          Corpus de diagnostics, observations météo, validation terrain, statistiques et cartographie.
        </p>
      </div>
      <button onClick={refresh} disabled={loading} className="glass-panel neon-border-amber text-gold rounded-xl px-4 py-2.5 font-bold disabled:opacity-50">
        <i className={'fa-solid fa-rotate mr-2 ' + (loading ? 'fa-spin' : '')}></i>Actualiser
      </button>
    </div>

    {error && <div className="glass-panel neon-border-amber rounded-xl p-4 mb-5 text-sm text-body" role="alert">
      {error}
      <button onClick={refresh} className="ml-3 text-gold underline">Réessayer</button>
    </div>}

    {loading ? <div className="glass-panel rounded-2xl p-8 text-center text-body-secondary">Chargement des données réelles depuis Neon...</div> : stats && <>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          ['CAS AGRICOLES', stats.totalCases],
          ['OBSERVATIONS MÉTÉO', stats.weatherObservations],
          ['CONFIRMÉS', stats.confirmed],
          ['REJETÉS', stats.rejected],
          ['INCERTAINS', stats.uncertain],
          ['TAUX CONFIRMATION', stats.confirmed + stats.rejected ? stats.confirmationRate + '%' : 'N/D'],
        ].map(([label, value]) => <div key={String(label)} className="glass-panel rounded-2xl p-5">
          <p className="text-xs text-body-secondary">{label}</p>
          <p className="text-2xl font-bold text-gold mt-2">{value}</p>
        </div>)}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold gradient-text mb-4">Statistiques du corpus</h2>
          <p className="text-sm text-body">
            Confiance moyenne : <strong className="text-gold">{stats.totalCases ? stats.averageConfidence + '%' : 'N/D'}</strong>
          </p>
          <p className="text-xs text-body-secondary mt-1">Répartition calculée uniquement à partir des diagnostics réellement enregistrés.</p>
          <div className="mt-5">
            <p className="text-xs text-gold mb-2">CAS PAR CULTURE</p>
            {stats.byCrop.length ? stats.byCrop.map((item) => <div key={item.label} className="flex items-center gap-3 mb-2">
              <span className="w-28 truncate text-xs text-body">{item.label}</span>
              <div className="flex-1 h-2 bg-cyber-bg-deep rounded">
                <div className="h-2 bg-neon-cyan rounded" style={{ width: Math.max(4, (item.value / (stats.totalCases || 1)) * 100) + '%' }}></div>
              </div>
              <span className="text-xs text-gold">{item.value}</span>
            </div>) : <p className="text-xs text-body-secondary">Aucun diagnostic de culture enregistré pour le moment. Les observations météo ne sont pas comptées comme des cas de maladie.</p>}
          </div>
          {stats.byDisease.length > 0 && <div className="mt-5">
            <p className="text-xs text-gold mb-2">DIAGNOSTICS LES PLUS ENREGISTRÉS</p>
            {stats.byDisease.map((item) => <div key={item.label} className="flex justify-between gap-3 py-1 text-xs">
              <span className="text-body">{item.label}</span><strong className="text-gold">{item.value}</strong>
            </div>)}
          </div>}
        </section>

        <section className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold gradient-text mb-4">Métriques du modèle</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Confiance moyenne', stats.totalCases ? stats.averageConfidence + '%' : 'N/D'],
              ['Cas validés', stats.confirmed + stats.rejected],
              ['Cas incertains', stats.uncertain],
              ['Références terrain', stats.metrics.evaluatedCases],
            ].map(([label, value]) => <div key={String(label)} className="glass-panel rounded-xl p-4">
              <p className="text-xs text-body-secondary">{label}</p><p className="text-xl font-bold text-gold mt-1">{value}</p>
            </div>)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {[
              ['Accuracy', stats.metrics.accuracy],
              ['Precision', stats.metrics.precision],
              ['Recall', stats.metrics.recall],
              ['F1', stats.metrics.f1],
            ].map(([label, value]) => <div key={String(label)} className="glass-panel rounded-xl p-3">
              <p className="text-xs text-body-secondary">{label}</p>
              <p className="text-xl font-bold text-gold mt-1">{metric(Number(value))}</p>
            </div>)}
          </div>
          <p className="text-xs text-body-secondary mt-4">
            Les métriques sont calculées uniquement sur les diagnostics disposant d’une référence terrain renseignée. N/D signifie qu’aucun échantillon de référence ne permet encore un calcul fiable ; ce n’est pas un score de 0%.
          </p>
          <div className="mt-5">
            <p className="text-xs text-gold mb-2">MATRICE DE CONFUSION</p>
            {stats.metrics.confusionMatrix.length === 0
              ? <p className="text-xs text-body-secondary">Aucun cas avec diagnostic terrain de référence. Validez les scans et renseignez le diagnostic réel pour alimenter cette matrice.</p>
              : <div className="overflow-x-auto"><table className="w-full text-xs">
                <thead><tr><th className="text-left p-2 text-body-secondary">Réel</th><th className="text-left p-2 text-body-secondary">Prédit</th><th className="text-right p-2 text-body-secondary">N</th></tr></thead>
                <tbody>{stats.metrics.confusionMatrix.map((item, index) => <tr key={index} className="border-t border-cyber-border">
                  <td className="p-2 text-body">{item.actual}</td><td className="p-2 text-body">{item.predicted}</td><td className="p-2 text-right text-gold">{item.count}</td>
                </tr>)}</tbody>
              </table></div>}
          </div>
        </section>
      </div>

      <section className="glass-panel rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold gradient-text">Cartographie des données collectées</h2>
          <span className="text-xs text-body-secondary">{riskMap.length} zones géolocalisées</span>
        </div>
        {riskMap.length === 0
          ? <p className="text-sm text-body-secondary">Aucune donnée avec coordonnées GPS enregistrée. Les prochaines analyses de lieux et les scans géolocalisés alimenteront cette carte.</p>
          : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{riskMap.map((zone) => <div key={zone.location} className="glass-panel rounded-xl p-4">
            <div className="flex justify-between gap-2"><strong className="text-sm text-body">{zone.location}</strong><span className="text-xs text-gold">{zone.cases} cas</span></div>
            <p className="text-xs text-body-secondary mt-2">Observations météo : {zone.observations}</p>
            <p className="text-xs text-body-secondary">Diagnostics confirmés : {zone.confirmed}</p>
            {zone.cases > 0 && <p className="text-xs text-body-secondary">Confiance moyenne : {zone.avgConfidence}%</p>}
            {zone.latitude != null && zone.longitude != null && <a className="inline-flex mt-3 text-xs text-gold underline" href={'https://www.openstreetmap.org/?mlat=' + zone.latitude + '&mlon=' + zone.longitude + '#map=13/' + zone.latitude + '/' + zone.longitude} target="_blank" rel="noreferrer">Ouvrir cette position sur la carte ↗</a>}
          </div>)}</div>}
      </section>

      <section className="glass-panel rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div><h2 className="text-lg font-bold gradient-text">Historique météo récent</h2><p className="text-xs text-body-secondary mt-1">Observations effectivement enregistrées lors des analyses de lieux.</p></div>
          <span className="text-xs text-body-secondary">{observations.length} dernières observations</span>
        </div>
        {observations.length === 0
          ? <p className="text-sm text-body-secondary">Aucune observation météo enregistrée pour ce compte.</p>
          : <div className="overflow-x-auto"><table className="w-full text-xs min-w-[620px]">
            <thead><tr className="text-left text-body-secondary border-b border-cyber-border">
              <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Position GPS</th><th className="py-2 pr-3">Température</th><th className="py-2 pr-3">Humidité</th><th className="py-2 pr-3">Vent</th><th className="py-2">Pluie</th>
            </tr></thead>
            <tbody>{observations.map((item) => <tr key={item.id} className="border-b border-cyber-border/60">
              <td className="py-2 pr-3 text-body">{formatDate(item.observed_at)}</td>
              <td className="py-2 pr-3 text-body">{Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}</td>
              <td className="py-2 pr-3 text-gold">{item.temperature} °C</td>
              <td className="py-2 pr-3 text-body">{item.humidity} %</td>
              <td className="py-2 pr-3 text-body">{item.wind_speed} km/h</td>
              <td className="py-2 text-body">{item.rainfall ?? 0} mm</td>
            </tr>)}</tbody>
          </table></div>}
      </section>

      <section className="glass-panel rounded-2xl p-6 mt-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold gradient-text">Enquête et validation professionnelle sur le terrain</h2>
          <p className="text-xs text-body-secondary mt-2">Ce formulaire permet à un agronome ou à un agent de terrain de documenter les cultures, symptômes, diagnostic de référence, interventions et résultats de suivi. Les informations professionnelles sont déclaratives et ne constituent pas une vérification d’identité par la plateforme.</p>
        </div>
        {surveyMessage && <div className="glass-panel neon-border-cyan rounded-xl p-3 mb-4 text-sm text-body" role="status">{surveyMessage}</div>}
        <form onSubmit={submitFieldSurvey} className="grid md:grid-cols-2 gap-4">
          <label className="text-xs text-body-secondary">Relier à un diagnostic IA existant (facultatif)
            <select value={fieldForm.linked_case_id} onChange={e => setFieldForm(v => ({...v, linked_case_id:e.target.value}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1">
              <option value="">Enquête indépendante / aucun cas lié</option>
              {cases.map(item => <option key={item.id} value={item.id}>{item.crop} · {item.predicted_disease} · {new Date(item.created_at).toLocaleDateString('fr-FR')}</option>)}
            </select>
          </label>
          <label className="text-xs text-body-secondary">Culture observée *
            <input required value={fieldForm.crop} onChange={e => setFieldForm(v => ({...v,crop:e.target.value}))} placeholder="Ex. tomate, maïs, café..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary md:col-span-2">Symptômes observés *
            <textarea required value={fieldForm.symptoms} onChange={e => setFieldForm(v => ({...v,symptoms:e.target.value}))} placeholder="Décrire les symptômes séparés par des virgules : taches foliaires, jaunissement, flétrissement..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1 min-h-20" />
          </label>
          <label className="text-xs text-body-secondary">Diagnostic de référence terrain
            <input value={fieldForm.field_diagnosis} onChange={e => setFieldForm(v => ({...v,field_diagnosis:e.target.value}))} placeholder="Maladie ou cause identifiée" className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary">Conclusion de l’examen *
            <select required value={fieldForm.assessment} onChange={e => setFieldForm(v => ({...v,assessment:e.target.value as FieldSurvey['assessment']}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1">
              <option value="observation_only">Observation sans validation IA</option>
              <option value="confirmed">Diagnostic IA confirmé</option>
              <option value="rejected">Diagnostic IA rejeté / corrigé</option>
              <option value="uncertain">Diagnostic incertain — analyses complémentaires</option>
            </select>
          </label>
          <label className="text-xs text-body-secondary">Nom du professionnel *
            <input required value={fieldForm.observer_name} onChange={e => setFieldForm(v => ({...v,observer_name:e.target.value}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary">Fonction / qualification *
            <input required value={fieldForm.observer_role} onChange={e => setFieldForm(v => ({...v,observer_role:e.target.value}))} placeholder="Agronome, technicien agricole..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary">Institution / organisation
            <input value={fieldForm.observer_organization} onChange={e => setFieldForm(v => ({...v,observer_organization:e.target.value}))} placeholder="Institution, coopérative, laboratoire..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary">Date de visite *
            <input required type="date" value={fieldForm.visit_date} onChange={e => setFieldForm(v => ({...v,visit_date:e.target.value}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary">Lieu / commune / parcelle *
            <input required value={fieldForm.location} onChange={e => setFieldForm(v => ({...v,location:e.target.value}))} placeholder="Commune, département, parcelle..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-body-secondary">Latitude
              <input type="number" step="any" value={fieldForm.latitude} onChange={e => setFieldForm(v => ({...v,latitude:e.target.value}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
            </label>
            <label className="text-xs text-body-secondary">Longitude
              <input type="number" step="any" value={fieldForm.longitude} onChange={e => setFieldForm(v => ({...v,longitude:e.target.value}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
            </label>
          </div>
          <label className="text-xs text-body-secondary md:col-span-2">Traitement / intervention appliqué(e)
            <textarea value={fieldForm.treatment_applied} onChange={e => setFieldForm(v => ({...v,treatment_applied:e.target.value}))} placeholder="Pratiques culturales, biocontrôle, traitement autorisé, mesures appliquées..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1 min-h-16" />
          </label>
          <label className="text-xs text-body-secondary">Date du traitement
            <input type="date" value={fieldForm.treatment_date} onChange={e => setFieldForm(v => ({...v,treatment_date:e.target.value}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary">Date de suivi prévue
            <input type="date" value={fieldForm.follow_up_date} onChange={e => setFieldForm(v => ({...v,follow_up_date:e.target.value}))} className="cyber-input w-full rounded-xl px-3 py-3 mt-1" />
          </label>
          <label className="text-xs text-body-secondary md:col-span-2">Résultat du suivi
            <textarea value={fieldForm.follow_up_result} onChange={e => setFieldForm(v => ({...v,follow_up_result:e.target.value}))} placeholder="Évolution des symptômes, efficacité observée, rechute..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1 min-h-16" />
          </label>
          <label className="text-xs text-body-secondary md:col-span-2">Notes techniques / méthode de vérification
            <textarea value={fieldForm.expert_notes} onChange={e => setFieldForm(v => ({...v,expert_notes:e.target.value}))} placeholder="Méthode d'observation, prélèvements, photos, laboratoire, limites..." className="cyber-input w-full rounded-xl px-3 py-3 mt-1 min-h-20" />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-body-secondary">Les cas liés sont mis à jour dans les statistiques de validation du modèle. Les observations indépendantes restent séparées des métriques IA.</p>
            <button type="submit" disabled={savingSurvey} className="cyber-button rounded-xl px-6 py-3 font-bold disabled:opacity-50">{savingSurvey ? 'Enregistrement...' : 'Enregistrer l’enquête terrain'}</button>
          </div>
        </form>
      </section>

      <section className="glass-panel rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-lg font-bold gradient-text">Historique des enquêtes professionnelles</h2><span className="text-xs text-body-secondary">{fieldSurveys.length} enquêtes</span></div>
        {fieldSurveys.length === 0 ? <p className="text-sm text-body-secondary">Aucune enquête terrain enregistrée pour le moment.</p> : <div className="space-y-3">
          {fieldSurveys.slice(0, 20).map(survey => <article key={survey.id} className="glass-panel rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-body">{survey.crop} · {survey.location}</strong><span className="text-xs text-gold">{survey.assessment === 'confirmed' ? 'Confirmé' : survey.assessment === 'rejected' ? 'Rejeté / corrigé' : survey.assessment === 'uncertain' ? 'Incertain' : 'Observation'}</span></div>
            <p className="text-xs text-body-secondary mt-2">{survey.observer_name} · {survey.observer_role}{survey.observer_organization ? ' · ' + survey.observer_organization : ''} · {formatDate(survey.visit_date)}</p>
            <p className="text-xs text-body mt-2">Symptômes : {survey.symptoms.join(', ') || 'Non renseignés'}</p>
            {survey.field_diagnosis && <p className="text-xs text-body mt-1">Diagnostic terrain : {survey.field_diagnosis}</p>}
            {survey.treatment_applied && <p className="text-xs text-body mt-1">Intervention : {survey.treatment_applied}</p>}
            {survey.follow_up_result && <p className="text-xs text-body mt-1">Suivi : {survey.follow_up_result}</p>}
          </article>)}
        </div>}
      </section>

      <section className="glass-panel rounded-2xl p-6 mt-6">
        <h2 className="text-lg font-bold gradient-text mb-2">Export scientifique</h2>
        <p className="text-xs text-body-secondary mb-4">
          Les fichiers incluent séparément les cas agricoles et les observations météo réellement stockés dans Neon. Aucune donnée fictive n’est ajoutée.
        </p>
        <div className="flex flex-wrap gap-3">
          <button disabled={exporting} onClick={() => exportData('csv')} className="cyber-button rounded-xl px-5 py-3 font-bold disabled:opacity-50">
            {exporting ? 'Préparation...' : 'Exporter CSV'}
          </button>
          <button disabled={exporting} onClick={() => exportData('json')} className="glass-panel neon-border-cyan text-gold rounded-xl px-5 py-3 font-bold disabled:opacity-50">
            {exporting ? 'Préparation...' : 'Exporter JSON'}
          </button>
        </div>
      </section>
    </>}
  </div>;
}
