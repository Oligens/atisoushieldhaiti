import { useEffect, useMemo, useState } from 'react';

type Crop = 'Épices' | 'Tomates' | 'Riz' | 'Autre';
type Status = 'normal' | 'attention' | 'alerte' | 'inconnu';

interface HydroponicTank {
  id: string;
  name: string;
  crop: Crop;
  location: string;
  sensorId: string;
  createdAt: string;
  ph: number | null;
  ec: number | null;
  waterTemp: number | null;
  airTemp: number | null;
  humidity: number | null;
  status: Status;
  lastUpdate: string | null;
}

interface TankForm {
  name: string;
  crop: Crop;
  location: string;
  sensorId: string;
}

const STORAGE_KEY = 'atisoushield_hydroponic_tanks';

const statusConfig: Record<Status, { label: string; icon: string; className: string }> = {
  normal: { label: 'Normal', icon: 'fa-circle-check', className: 'text-[#D4AF37] border-[#D4AF37]/40' },
  attention: { label: 'Attention', icon: 'fa-triangle-exclamation', className: 'text-orange-400 border-orange-400/40' },
  alerte: { label: 'Alerte', icon: 'fa-circle-exclamation', className: 'text-red-400 border-red-400/50' },
  inconnu: { label: 'Aucune donnée', icon: 'fa-circle-question', className: 'text-body-secondary border-cyber-border' },
};

const emptyForm: TankForm = { name: '', crop: 'Tomates', location: '', sensorId: '' };

function getStoredTanks(): HydroponicTank[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatMetric(value: number | null, unit = '') {
  return value === null ? '—' : `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
}

function statusFromMetrics(tank: HydroponicTank): Status {
  if ([tank.ph, tank.ec, tank.waterTemp, tank.airTemp, tank.humidity].every((value) => value === null)) return 'inconnu';
  return 'normal';
}

export default function HydroponieIoT({ isDesktop }: { isDesktop: boolean }) {
  const [tanks, setTanks] = useState<HydroponicTank[]>(getStoredTanks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<TankForm>(emptyForm);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tanks));
  }, [tanks]);

  const selected = useMemo(
    () => tanks.find((tank) => tank.id === selectedId) ?? tanks[0] ?? null,
    [selectedId, tanks]
  );

  const counts = useMemo(() => ({
    normal: tanks.filter((tank) => tank.status === 'normal').length,
    attention: tanks.filter((tank) => tank.status === 'attention').length,
    alerte: tanks.filter((tank) => tank.status === 'alerte').length,
  }), [tanks]);

  const createTank = (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    const tank: HydroponicTank = {
      id: `BAC-${Date.now().toString(36).toUpperCase()}`,
      name,
      crop: form.crop,
      location: form.location.trim() || 'Emplacement non renseigné',
      sensorId: form.sensorId.trim(),
      createdAt: new Date().toISOString(),
      ph: null,
      ec: null,
      waterTemp: null,
      airTemp: null,
      humidity: null,
      status: 'inconnu',
      lastUpdate: null,
    };

    setTanks((current) => [...current, tank]);
    setSelectedId(tank.id);
    setForm(emptyForm);
    setShowCreateForm(false);
  };

  const deleteTank = (id: string) => {
    setTanks((current) => current.filter((tank) => tank.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const metricCards = selected ? [
    { label: 'pH', value: formatMetric(selected.ph), icon: 'fa-droplet', note: 'En attente de la sonde pH' },
    { label: 'Conductivité EC', value: formatMetric(selected.ec, 'mS/cm'), icon: 'fa-flask', note: 'En attente de la sonde EC' },
    { label: 'Température eau', value: formatMetric(selected.waterTemp, '°C'), icon: 'fa-temperature-half', note: 'En attente du capteur eau' },
    { label: 'Température air', value: formatMetric(selected.airTemp, '°C'), icon: 'fa-wind', note: 'En attente du capteur air' },
    { label: 'Humidité air', value: formatMetric(selected.humidity, '%'), icon: 'fa-cloud', note: 'En attente du capteur humidité' },
  ] : [];

  return (
    <section className="min-h-screen p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-seedling text-[#D4AF37]"></i>
              <span className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Axe expérimental • R&amp;D</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold gradient-text">Hydroponie &amp; IoT</h2>
            <p className="text-body-secondary mt-1 max-w-3xl">
              Créez vos propres bacs et connectez progressivement leurs capteurs. Aucune mesure n’est inventée tant qu’un dispositif réel n’est pas connecté.
            </p>
          </div>
          <button onClick={() => setShowCreateForm(true)} className="cyber-button rounded-xl px-5 py-3 font-semibold whitespace-nowrap">
            <i className="fa-solid fa-plus mr-2"></i>Créer un bac
          </button>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Bacs créés', tanks.length, 'fa-layer-group'],
            ['Données reçues', tanks.filter((tank) => tank.lastUpdate).length, 'fa-signal'],
            ['À surveiller', counts.attention + counts.alerte, 'fa-triangle-exclamation'],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="glass-panel rounded-2xl p-4">
              <i className={`fa-solid ${icon} text-[#D4AF37] mb-2`}></i>
              <p className="text-xl md:text-2xl font-bold text-body">{value}</p>
              <p className="text-xs text-body-secondary">{label}</p>
            </div>
          ))}
        </div>

        {showCreateForm && (
          <div className="glass-panel rounded-2xl p-5 border border-[#D4AF37]/30">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-body">Créer un bac hydroponique</h3>
                <p className="text-xs text-body-secondary mt-1">Les mesures resteront vides jusqu’à la connexion d’un capteur réel.</p>
              </div>
              <button onClick={() => setShowCreateForm(false)} className="text-body-secondary hover:text-gold" aria-label="Fermer">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={createTank} className="grid md:grid-cols-2 gap-4">
              <label className="text-sm text-body">
                Nom du bac
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="cyber-input w-full rounded-xl px-4 py-3 mt-2" placeholder="Ex. Tomates serre A" />
              </label>
              <label className="text-sm text-body">
                Culture
                <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value as Crop })} className="cyber-input w-full rounded-xl px-4 py-3 mt-2">
                  <option>Tomates</option><option>Épices</option><option>Riz</option><option>Autre</option>
                </select>
              </label>
              <label className="text-sm text-body">
                Emplacement
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="cyber-input w-full rounded-xl px-4 py-3 mt-2" placeholder="Serre, parcelle, commune..." />
              </label>
              <label className="text-sm text-body">
                Identifiant capteur / passerelle <span className="text-body-secondary">(facultatif)</span>
                <input value={form.sensorId} onChange={(e) => setForm({ ...form, sensorId: e.target.value })} className="cyber-input w-full rounded-xl px-4 py-3 mt-2" placeholder="ESP32-001" />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 rounded-xl text-body-secondary hover:text-gold">Annuler</button>
                <button type="submit" className="cyber-button rounded-xl px-5 py-2.5 font-semibold">Enregistrer le bac</button>
              </div>
            </form>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-body">Mes bacs hydroponiques</h3>
            {tanks.length > 0 && <span className="text-xs text-body-secondary">{tanks.length} bac{tanks.length > 1 ? 's' : ''}</span>}
          </div>

          {tanks.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 md:p-12 text-center border-dashed border-[#D4AF37]/30">
              <i className="fa-solid fa-seedling text-4xl text-[#D4AF37] mb-4"></i>
              <h3 className="text-xl font-bold text-body">Aucun bac configuré</h3>
              <p className="text-body-secondary max-w-xl mx-auto mt-2">
                Votre espace est vierge. Créez votre premier bac pour commencer à préparer son suivi IoT.
              </p>
              <button onClick={() => setShowCreateForm(true)} className="cyber-button rounded-xl px-5 py-3 mt-5 font-semibold">
                <i className="fa-solid fa-plus mr-2"></i>Créer mon premier bac
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tanks.map((tank) => {
                const status = statusConfig[tank.status];
                return (
                  <div key={tank.id} className={`glass-panel rounded-2xl p-5 text-left transition-all ${selected?.id === tank.id ? 'ring-1 ring-[#D4AF37]/70' : ''}`}>
                    <button onClick={() => setSelectedId(tank.id)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-gold font-semibold">{tank.id}</p>
                          <h4 className="font-bold text-body mt-1">{tank.name}</h4>
                          <p className="text-xs text-body-secondary mt-1">{tank.crop} • {tank.location}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${status.className}`}>
                          <i className={`fa-solid ${status.icon} mr-1`}></i>{status.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <div><span className="text-[11px] text-body-secondary">pH</span><p className="font-semibold text-body">{formatMetric(tank.ph)}</p></div>
                        <div><span className="text-[11px] text-body-secondary">EC</span><p className="font-semibold text-body">{formatMetric(tank.ec, 'mS/cm')}</p></div>
                        <div><span className="text-[11px] text-body-secondary">Eau</span><p className="font-semibold text-body">{formatMetric(tank.waterTemp, '°C')}</p></div>
                        <div><span className="text-[11px] text-body-secondary">Humidité</span><p className="font-semibold text-body">{formatMetric(tank.humidity, '%')}</p></div>
                      </div>
                    </button>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-cyber-border">
                      <span className="text-[11px] text-body-secondary">{tank.sensorId ? `Capteur : ${tank.sensorId}` : 'Aucun capteur associé'}</span>
                      <button onClick={() => deleteTank(tank.id)} className="text-xs text-red-400 hover:text-red-300" aria-label={`Supprimer ${tank.name}`}>
                        <i className="fa-solid fa-trash mr-1"></i>Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selected && (
          <>
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                <div>
                  <p className="text-xs text-gold font-semibold">BAC SÉLECTIONNÉ • {selected.id}</p>
                  <h3 className="text-lg font-bold text-body mt-1">Métriques IoT</h3>
                </div>
                <span className="text-xs text-body-secondary">Culture : {selected.crop}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {metricCards.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-[#D4AF37]/20 bg-black/10 p-4">
                    <i className={`fa-solid ${metric.icon} text-[#D4AF37] text-lg`}></i>
                    <p className="text-xs text-body-secondary mt-3">{metric.label}</p>
                    <p className="text-xl font-bold text-body mt-1">{metric.value}</p>
                    <p className="text-[10px] text-body-secondary mt-1">{metric.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              <div className="glass-panel rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl border border-[#D4AF37]/40 flex items-center justify-center">
                    <i className="fa-solid fa-microchip text-[#D4AF37]"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-body">Passerelle de communication</h3>
                    <p className="text-xs text-body-secondary">ESP32 / Arduino → API → base de données</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    ['Microcontrôleur', selected.sensorId || 'Non configuré', 'fa-microchip'],
                    ['Transport', 'À configurer', 'fa-tower-broadcast'],
                    ['API', 'À connecter', 'fa-code'],
                    ['Stockage', 'À connecter', 'fa-database'],
                  ].map(([label, value, icon]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/15 px-3 py-2.5">
                      <span className="text-body-secondary"><i className={`fa-solid ${icon} text-[#D4AF37] mr-2`}></i>{label}</span>
                      <span className="text-body font-medium text-right">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-[11px] text-body-secondary">Aucune connexion physique n’est simulée.</p>
                  <button onClick={() => setConnected((value) => !value)} className="text-xs text-gold hover:text-[#F4CF67]">
                    {connected ? 'Déconnecter' : 'Tester la configuration'}
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-5">
                <h3 className="font-bold text-body mb-4">État des données</h3>
                <div className="rounded-xl border border-[#D4AF37]/20 p-4">
                  <i className={`fa-solid ${selected.lastUpdate ? 'fa-circle-check text-[#D4AF37]' : 'fa-circle-question text-body-secondary'} mr-2`}></i>
                  <span className="text-body">
                    {selected.lastUpdate ? `Dernière donnée reçue : ${new Date(selected.lastUpdate).toLocaleString('fr-FR')}` : 'Aucune donnée capteur reçue pour ce bac.'}
                  </span>
                </div>
                <p className="text-[11px] text-body-secondary mt-4">
                  Les seuils et recommandations agronomiques devront être définis et validés dans le cadre expérimental avant toute interprétation automatique.
                </p>
              </div>
            </div>
          </>
        )}

        {!isDesktop && tanks.length > 0 && (
          <p className="text-center text-[11px] text-body-secondary pb-2">
            Les capteurs réels pourront être associés à chaque bac lors de l’étape d’intégration IoT.
          </p>
        )}
      </div>
    </section>
  );
}
