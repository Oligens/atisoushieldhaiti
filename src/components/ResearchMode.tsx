import { useEffect, useState } from 'react';
import {
  downloadResearchFile,
  exportResearchData,
  loadRecentWeatherObservations,
  loadResearchStats,
  loadRiskMap,
  type ResearchStats,
  type RiskMapPoint,
  type WeatherObservation,
} from '../services/researchData';

interface Props { isDesktop: boolean; }

export default function ResearchMode({ isDesktop }: Props) {
  const [stats, setStats] = useState<ResearchStats | null>(null);
  const [riskMap, setRiskMap] = useState<RiskMapPoint[]>([]);
  const [observations, setObservations] = useState<WeatherObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextStats, nextMap, nextObservations] = await Promise.all([
        loadResearchStats(),
        loadRiskMap(),
        loadRecentWeatherObservations(),
      ]);
      setStats(nextStats);
      setRiskMap(nextMap);
      setObservations(nextObservations);
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
