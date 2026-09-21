import { useEffect, useState } from 'react';
import { downloadResearchFile, exportResearchData, loadResearchStats, loadRiskMap, type ResearchStats } from '../services/researchData';

interface Props { isDesktop: boolean; }

export default function ResearchMode({ isDesktop }: Props) {
  const [stats,setStats]=useState<ResearchStats|null>(null);
  const [riskMap,setRiskMap]=useState<Awaited<ReturnType<typeof loadRiskMap>>>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [exporting,setExporting]=useState(false);

  const refresh=async()=>{
    setLoading(true); setError('');
    try {
      const [s,m]=await Promise.all([loadResearchStats(),loadRiskMap()]);
      setStats(s); setRiskMap(m);
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Données de recherche indisponibles.');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ void refresh(); },[]);

  const exportData=async(format:'csv'|'json')=>{
    setExporting(true);
    try {
      const content=await exportResearchData(format);
      downloadResearchFile(content,'atisoushield-cas-agricoles-'+new Date().toISOString().slice(0,10)+'.'+format,format==='csv'?'text/csv;charset=utf-8':'application/json');
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Export impossible.');
    } finally { setExporting(false); }
  };

  return <div className={isDesktop?'p-8 animate-fade-in':'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
    <div className="mb-8">
      <h1 className="text-3xl font-bold gradient-text flex items-center gap-3"><span className="w-10 h-10 glass-panel neon-border-cyan rounded-full flex items-center justify-center"><i className="fa-solid fa-flask icon-gold"></i></span>MODE RECHERCHE</h1>
      <p className="text-sm text-body-secondary mt-2">Base de cas agricoles, historique, météo, validation terrain, statistiques et cartographie.</p>
    </div>
    {error&&<div className="glass-panel neon-border-amber rounded-xl p-4 mb-5 text-sm text-body">{error}<button onClick={refresh} className="ml-3 text-gold underline">Actualiser</button></div>}
    {loading?<div className="glass-panel rounded-2xl p-8 text-center text-body-secondary">Chargement des données de recherche...</div>:stats&&<>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[['CAS',stats.totalCases],['CONFIRMÉS',stats.confirmed],['REJETÉS',stats.rejected],['INCERTAINS',stats.uncertain],['TAUX CONFIRMATION',stats.confirmationRate+'%']].map(([l,v])=><div key={String(l)} className="glass-panel rounded-2xl p-5"><p className="text-xs text-body-secondary">{l}</p><p className="text-2xl font-bold text-gold mt-2">{v}</p></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold gradient-text mb-4">Statistiques du corpus</h2>
          <p className="text-sm text-body">Confiance moyenne : <strong className="text-gold">{stats.averageConfidence}%</strong></p>
          <p className="text-xs text-body-secondary mt-1">Top cultures et maladies enregistrées.</p>
          <div className="mt-5"><p className="text-xs text-gold mb-2">CAS PAR CULTURE</p>{stats.byCrop.map(x=><div key={x.label} className="flex items-center gap-3 mb-2"><span className="w-28 truncate text-xs text-body">{x.label}</span><div className="flex-1 h-2 bg-cyber-bg-deep rounded"><div className="h-2 bg-neon-cyan rounded" style={{width:Math.max(4,(x.value/(stats.totalCases||1))*100)+'%'}}></div></div><span className="text-xs text-gold">{x.value}</span></div>)}</div>
        </section>
        <section className="glass-panel rounded-2xl p-6">
          <h2 className="text-lg font-bold gradient-text mb-4">Métriques du modèle</h2>
          <div className="grid grid-cols-2 gap-3">
            {[['Confiance moyenne',stats.averageConfidence+'%'],['Cas validés',stats.confirmed+stats.rejected],['Cas incertains',stats.uncertain],['Base terrain',stats.totalCases]].map(([a,b])=><div key={String(a)} className="glass-panel rounded-xl p-4"><p className="text-xs text-body-secondary">{a}</p><p className="text-xl font-bold text-gold mt-1">{b}</p></div>)}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">{[['Accuracy',stats.metrics.accuracy],['Precision',stats.metrics.precision],['Recall',stats.metrics.recall],['F1',stats.metrics.f1]].map(([label,value])=><div key={String(label)} className="glass-panel rounded-xl p-3"><p className="text-xs text-body-secondary">{label}</p><p className="text-xl font-bold text-gold mt-1">{(Number(value)*100).toFixed(1)}%</p></div>)}</div><p className="text-xs text-body-secondary mt-4">Calculs effectués uniquement sur les cas disposant d'un diagnostic terrain de référence. Les cas sans référence sont exclus.</p><div className="mt-5"><p className="text-xs text-gold mb-2">MATRICE DE CONFUSION</p>{stats.metrics.confusionMatrix.length===0?<p className="text-xs text-body-secondary">Aucun cas avec diagnostic terrain de référence.</p>:<div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th className="text-left p-2 text-body-secondary">Réel</th><th className="text-left p-2 text-body-secondary">Prédit</th><th className="text-right p-2 text-body-secondary">N</th></tr></thead><tbody>{stats.metrics.confusionMatrix.map((x,i)=><tr key={i} className="border-t border-cyber-border"><td className="p-2 text-body">{x.actual}</td><td className="p-2 text-body">{x.predicted}</td><td className="p-2 text-right text-gold">{x.count}</td></tr>)}</tbody></table></div>}</div>
        </section>
      </div>
      <section className="glass-panel rounded-2xl p-6 mt-6">
        <div className="flex items-center justify-between gap-3 mb-4"><h2 className="text-lg font-bold gradient-text">Cartographie des risques</h2><span className="text-xs text-body-secondary">{riskMap.length} zones</span></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{riskMap.map(z=><div key={z.location} className="glass-panel rounded-xl p-4"><div className="flex justify-between"><strong className="text-sm text-body">{z.location}</strong><span className="text-xs text-gold">{z.cases} cas</span></div><p className="text-xs text-body-secondary mt-2">Confiance moyenne : {z.avgConfidence}%</p><p className="text-xs text-body-secondary">Confirmés : {z.confirmed}</p><p className="text-[10px] text-body-secondary mt-2">{z.latitude!=null&&z.longitude!=null?z.latitude.toFixed(4)+', '+z.longitude.toFixed(4):'Coordonnées non disponibles'}</p></div>)}</div>
      </section>
      <section className="glass-panel rounded-2xl p-6 mt-6">
        <h2 className="text-lg font-bold gradient-text mb-4">Export scientifique</h2>
        <div className="flex flex-wrap gap-3"><button disabled={exporting} onClick={()=>exportData('csv')} className="cyber-button rounded-xl px-5 py-3 font-bold">Exporter CSV</button><button disabled={exporting} onClick={()=>exportData('json')} className="glass-panel neon-border-cyan text-gold rounded-xl px-5 py-3 font-bold">Exporter JSON</button><button onClick={refresh} className="glass-panel neon-border-amber text-gold rounded-xl px-5 py-3 font-bold">Actualiser</button></div>
      </section>
    </>}
  </div>;
}
