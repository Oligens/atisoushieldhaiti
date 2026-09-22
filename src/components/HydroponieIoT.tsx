import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { iotRequest } from '../services/neon';

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
  waterLevel: number | null;
  dissolvedOxygen: number | null;
  status: Status;
  lastUpdate: string | null;
}

interface TankForm {
  name: string;
  crop: Crop;
  location: string;
  sensorId: string;
}

interface TankApiRow {
  id: string;
  name: string;
  crop: Crop;
  location: string;
  sensor_id: string | null;
  created_at: string;
  last_update: string | null;
  ph: number | null;
  ec: number | null;
  water_temp: number | null;
  air_temp: number | null;
  humidity: number | null;
  water_level: number | null;
  dissolved_oxygen: number | null;
}

const statusConfig: Record<Status, { label: string; icon: string; className: string }> = {
  normal: { label: 'Données reçues', icon: 'fa-circle-check', className: 'text-[#D4AF37] border-[#D4AF37]/40' },
  attention: { label: 'À examiner', icon: 'fa-triangle-exclamation', className: 'text-orange-400 border-orange-400/40' },
  alerte: { label: 'Anomalie', icon: 'fa-circle-exclamation', className: 'text-red-400 border-red-400/50' },
  inconnu: { label: 'Aucune donnée', icon: 'fa-circle-question', className: 'text-body-secondary border-cyber-border' },
};

const emptyForm: TankForm = { name: '', crop: 'Tomates', location: '', sensorId: '' };

function toTank(row: TankApiRow): HydroponicTank {
  const hasReading = row.last_update !== null;
  return {
    id: row.id,
    name: row.name,
    crop: row.crop,
    location: row.location,
    sensorId: row.sensor_id ?? '',
    createdAt: row.created_at,
    ph: row.ph ?? null,
    ec: row.ec ?? null,
    waterTemp: row.water_temp ?? null,
    airTemp: row.air_temp ?? null,
    humidity: row.humidity ?? null,
    waterLevel: row.water_level ?? null,
    dissolvedOxygen: row.dissolved_oxygen ?? null,
    status: hasReading ? 'normal' : 'inconnu',
    lastUpdate: row.last_update ?? null,
  };
}

function formatMetric(value: number | null, unit = '') {
  return value === null ? '—' : `${value.toFixed(1)}${unit ? ` ${unit}` : ''}`;
}

export default function HydroponieIoT({ isDesktop }: { isDesktop: boolean }) {
  const [tanks, setTanks] = useState<HydroponicTank[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<TankForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTanks = useCallback(async () => {
    setError(null);
    try {
      const rows = await iotRequest<TankApiRow[]>('/api/iot?resource=tanks');
      setTanks(rows.map(toTank));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les bacs depuis Neon.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTanks();
    const refreshOnFocus = () => void loadTanks();
    window.addEventListener('focus', refreshOnFocus);
    window.addEventListener('online', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      window.removeEventListener('online', refreshOnFocus);
    };
  }, [loadTanks]);

  const selected = useMemo(
    () => tanks.find((tank) => tank.id === selectedId) ?? tanks[0] ?? null,
    [selectedId, tanks]
  );

  const counts = useMemo(() => ({
    received: tanks.filter((tank) => tank.lastUpdate !== null).length,
    unknown: tanks.filter((tank) => tank.lastUpdate === null).length,
  }), [tanks]);

  const createTank = async (event: FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || saving) return;

    setSaving(true);
    setError(null);
    try {
      const created = await iotRequest<TankApiRow>('/api/iot?resource=tanks', {
        method: 'POST',
        body: JSON.stringify({
          name,
          crop: form.crop,
          location: form.location.trim(),
          sensorId: form.sensorId.trim() || null,
        }),
      });
      const tank = toTank(created);
      setTanks((current) => [tank, ...current]);
      setSelectedId(tank.id);
      setForm(emptyForm);
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’enregistrer le bac dans Neon.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTank = async (id: string) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await iotRequest<{ deleted: string }(`/api/iot?resource=tanks&tankId=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setTanks((current) => current.filter((tank) => tank.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer le bac.');
    } finally {
      setSaving(false);
    }
  };

  const metricCards = selected ? [
    { label: 'pH', value: formatMetric(selected.ph), icon: 'fa-droplet', note: 'Mesure réelle uniquement' },
    { label: 'Conductivité EC', value: formatMetric(selected.ec, 'mS/cm'), icon: 'fa-flask', note: 'Mesure réelle uniquement' },
    { label: 'Température eau', value: formatMetric(selected.waterTemp, '°C'), icon: 'fa-temperature-half', note: 'Mesure réelle uniquement' },
    { label: 'Température air', value: formatMetric(selected.airTemp, '°C'), icon: 'fa-wind', note: 'Mesure réelle uniquement' },
    { label: 'Humidité air', value: formatMetric(selected.humidity, '%'), icon: 'fa-cloud', note: 'Mesure réelle uniquement' },
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
              Les bacs et les mesures sont stockés dans Neon. Aucune mesure n’est inventée tant qu’un dispositif réel n’a pas transmis de données.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadTanks()} disabled={loading || saving} className="px-4 py-3 rounded-xl border border-[#D4AF37]/30 text-body disabled:opacity-50">
              <i className="fa-solid fa-rotate mr-2"></i>Actualiser
            </button>
            <button onClick={() => setShowCreateForm(true)} className="cyber-button rounded-xl px-5 py-3 font-semibold whitespace-nowrap">
              <i className="fa-solid fa-plus mr-2"></i>Créer un bac
            </button>
          </div>
        </header>

        {error && (
          <div className="glass-panel rounded-2xl p-4 border border-red-400/30 text-red-300">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>{error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Bacs créés', tanks.length, 'fa-layer-group'],
            ['Données reçues', counts.received, 'fa-signal'],
            ['Sans mesure', counts.unknown, 'fa-circle-question'],
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
                <p className="text-xs text-body-secondary mt-1">Le bac sera créé dans Neon. Les mesures resteront vides jusqu’à la connexion d’un capteur réel.</p>
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
                <button type="submit" disabled={saving} className="cyber-button rounded-xl px-5 py-2.5 font-semibold disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Enregistrer le bac'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-body">Mes bacs hydroponiques</h3>
            {tanks.length > 0 && <span className="text-xs text-body-secondary">{tanks.length} bac{tanks.length > 1 ? 's' : ''}</span>}
          </div>

          {loading ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-body-secondary">Chargement des bacs depuis Neon…</div>
          ) : tanks.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 md:p-12 text-center border-dashed border-[#D4AF37]/30">
              <i className="fa-solid fa-seedling text-4xl text-[#D4AF37] mb-4"></i>
              <h3 className="text-xl font-bold text-body">Aucun bac configuré</h3>
              <p className="text-body-secondary max-w-xl mx-auto mt-2">Votre espace est vierge. Créez votre premier bac pour commencer à préparer son suivi IoT.</p>
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
                      <button onClick={() => void deleteTank(tank.id)} disabled={saving} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50" aria-label={`Supprimer ${tank.name}`}>
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
                    <p className="text-xs text-body-secondary">ESP32 → HTTPS → /api/iot → Neon</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    ['Microcontrôleur', selected.sensorId || 'Non configuré', 'fa-microchip'],
                    ['Transport', 'HTTPS', 'fa-tower-broadcast'],
                    ['API', '/api/iot', 'fa-code'],
                    ['Stockage', 'Neon PostgreSQL', 'fa-database'],
                  ].map(([label, value, icon]) => (
                    <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/15 px-3 py-2.5">
                      <span className="text-body-secondary"><i className={`fa-solid ${icon} text-[#D4AF37] mr-2`}></i>{label}</span>
                      <span className="text-body font-medium text-right">{value}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-body-secondary mt-4">Aucune connexion physique n’est simulée dans l’application.</p>
              </div>

              <div className="glass-panel rounded-2xl p-5">
                <h3 className="font-bold text-body mb-4">État des données</h3>
                <div className="rounded-xl border border-[#D4AF37]/20 p-4">
                  <i className={`fa-solid ${selected.lastUpdate ? 'fa-circle-check text-[#D4AF37]' : 'fa-circle-question text-body-secondary'} mr-2`}></i>
                  <span className="text-body">
                    {selected.lastUpdate ? `Dernière donnée reçue : ${new Date(selected.lastUpdate).toLocaleString('fr-FR')}` : 'Aucune donnée capteur reçue pour ce bac.'}
                  </span>
                </div>
                <p className="text-[11px] text-body-secondary mt-4">Les seuils et recommandations agronomiques devront être définis et validés expérimentalement avant toute interprétation automatique. Le prototype ne commande pas automatiquement de produit, d’eau ou de relais.</p>
              </div>
            </div>
          </>
        )}

        {!isDesktop && tanks.length > 0 && (
          <p className="text-center text-[11px] text-body-secondary pb-2">Les données affichées proviennent uniquement de Neon et des mesures IoT réellement reçues.</p>
        )}
      </div>
    </section>
  );
}
