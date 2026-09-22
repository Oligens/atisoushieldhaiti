import { useEffect, useMemo, useState } from 'react';

type Crop = 'Épices' | 'Tomates' | 'Riz';
type Status = 'normal' | 'attention' | 'alerte';

interface HydroponicTank {
  id: string;
  name: string;
  crop: Crop;
  location: string;
  ph: number;
  ec: number;
  waterTemp: number;
  airTemp: number;
  humidity: number;
  status: Status;
  lastUpdate: string;
}

const initialTanks: HydroponicTank[] = [
  { id: 'BAC-01', name: 'Bac Épices A', crop: 'Épices', location: 'Serre pilote 01', ph: 6.1, ec: 1.7, waterTemp: 22.4, airTemp: 26.1, humidity: 71, status: 'normal', lastUpdate: 'à l’instant' },
  { id: 'BAC-02', name: 'Bac Tomates A', crop: 'Tomates', location: 'Serre pilote 01', ph: 5.9, ec: 2.3, waterTemp: 23.1, airTemp: 27.2, humidity: 76, status: 'normal', lastUpdate: 'à l’instant' },
  { id: 'BAC-03', name: 'Bac Riz expérimental', crop: 'Riz', location: 'Unité R&D', ph: 6.7, ec: 1.2, waterTemp: 24.0, airTemp: 28.0, humidity: 82, status: 'attention', lastUpdate: 'à l’instant' },
];

const statusConfig: Record<Status, { label: string; icon: string; className: string }> = {
  normal: { label: 'Normal', icon: 'fa-circle-check', className: 'text-[#D4AF37] border-[#D4AF37]/40' },
  attention: { label: 'Attention', icon: 'fa-triangle-exclamation', className: 'text-orange-400 border-orange-400/40' },
  alerte: { label: 'Alerte', icon: 'fa-circle-exclamation', className: 'text-red-400 border-red-400/50' },
};

function drift(value: number, amount: number) {
  return Number((value + (Math.random() - 0.5) * amount).toFixed(1));
}

function metricStatus(tank: HydroponicTank): Status {
  const abnormal = tank.ph < 5.5 || tank.ph > 7.2 || tank.ec < 0.8 || tank.ec > 3.2 || tank.waterTemp > 30 || tank.airTemp > 34 || tank.humidity > 90;
  const attention = tank.ph < 5.8 || tank.ph > 7.0 || tank.ec < 1.0 || tank.ec > 2.9 || tank.waterTemp > 27 || tank.airTemp > 31 || tank.humidity > 85;
  return abnormal ? 'alerte' : attention ? 'attention' : 'normal';
}

export default function HydroponieIoT({ isDesktop }: { isDesktop: boolean }) {
  const [tanks, setTanks] = useState(initialTanks);
  const [selectedId, setSelectedId] = useState(initialTanks[0].id);
  const [connected, setConnected] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTanks((current) => current.map((tank) => {
        const next = {
          ...tank,
          ph: drift(tank.ph, 0.08),
          ec: drift(tank.ec, 0.08),
          waterTemp: drift(tank.waterTemp, 0.2),
          airTemp: drift(tank.airTemp, 0.3),
          humidity: Math.max(35, Math.min(95, Math.round(tank.humidity + (Math.random() - 0.5) * 2))),
          lastUpdate: 'à l’instant',
        };
        return { ...next, status: metricStatus(next) };
      }));
      setLastSync(new Date());
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const selected = useMemo(
    () => tanks.find((tank) => tank.id === selectedId) ?? tanks[0],
    [selectedId, tanks]
  );

  const counts = useMemo(() => ({
    normal: tanks.filter((tank) => tank.status === 'normal').length,
    attention: tanks.filter((tank) => tank.status === 'attention').length,
    alerte: tanks.filter((tank) => tank.status === 'alerte').length,
  }), [tanks]);

  const metricCards = [
    { label: 'pH', value: selected.ph.toFixed(1), unit: '', icon: 'fa-droplet', note: 'Solution nutritive' },
    { label: 'Conductivité EC', value: selected.ec.toFixed(1), unit: 'mS/cm', icon: 'fa-flask', note: 'Nutriments dissous' },
    { label: 'Température eau', value: selected.waterTemp.toFixed(1), unit: '°C', icon: 'fa-temperature-half', note: 'Sonde immergée' },
    { label: 'Température air', value: selected.airTemp.toFixed(1), unit: '°C', icon: 'fa-wind', note: 'Ambiance serre' },
    { label: 'Humidité air', value: String(selected.humidity), unit: '%', icon: 'fa-cloud', note: 'Capteur environnemental' },
  ];

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
              Supervision expérimentale des cultures hors-sol et intégration des données issues des capteurs IoT.
            </p>
          </div>
          <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-[#D4AF37] shadow-[0_0_12px_#D4AF37]' : 'bg-red-500'}`}></span>
            <div>
              <p className="text-sm font-semibold text-body">Passerelle IoT {connected ? 'connectée' : 'déconnectée'}</p>
              <p className="text-[11px] text-body-secondary">Dernière synchronisation : {lastSync.toLocaleTimeString('fr-FR')}</p>
            </div>
            <button
              onClick={() => setConnected((value) => !value)}
              className="ml-2 text-xs text-gold hover:text-[#F4CF67]"
              aria-label="Basculer l’état simulé de la passerelle"
            >
              {connected ? 'Tester' : 'Reconnecter'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[
            ['Bacs surveillés', tanks.length, 'fa-layer-group'],
            ['Normaux', counts.normal, 'fa-circle-check'],
            ['À surveiller', counts.attention + counts.alerte, 'fa-triangle-exclamation'],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="glass-panel rounded-2xl p-4">
              <i className={`fa-solid ${icon} text-[#D4AF37] mb-2`}></i>
              <p className="text-xl md:text-2xl font-bold text-body">{value}</p>
              <p className="text-xs text-body-secondary">{label}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-body">Tableau de bord des bacs</h3>
            <span className="text-xs text-body-secondary">Mise à jour automatique • 5 s</span>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {tanks.map((tank) => {
              const status = statusConfig[tank.status];
              return (
                <button
                  key={tank.id}
                  onClick={() => setSelectedId(tank.id)}
                  className={`glass-panel rounded-2xl p-5 text-left transition-all hover:-translate-y-1 ${selectedId === tank.id ? 'ring-1 ring-[#D4AF37]/70 shadow-[0_0_28px_rgba(212,175,55,0.12)]' : ''}`}
                >
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
                    <div><span className="text-[11px] text-body-secondary">pH</span><p className="font-semibold text-body">{tank.ph.toFixed(1)}</p></div>
                    <div><span className="text-[11px] text-body-secondary">EC</span><p className="font-semibold text-body">{tank.ec.toFixed(1)} mS/cm</p></div>
                    <div><span className="text-[11px] text-body-secondary">Eau</span><p className="font-semibold text-body">{tank.waterTemp.toFixed(1)} °C</p></div>
                    <div><span className="text-[11px] text-body-secondary">Humidité</span><p className="font-semibold text-body">{tank.humidity}%</p></div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <p className="text-xs text-gold font-semibold">BAC SÉLECTIONNÉ • {selected.id}</p>
              <h3 className="text-lg font-bold text-body mt-1">Métriques IoT en direct</h3>
            </div>
            <span className="text-xs text-body-secondary">Culture : {selected.crop}</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {metricCards.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-[#D4AF37]/20 bg-black/10 p-4">
                <i className={`fa-solid ${metric.icon} text-[#D4AF37] text-lg`}></i>
                <p className="text-xs text-body-secondary mt-3">{metric.label}</p>
                <p className="text-xl font-bold text-body mt-1">{metric.value} <span className="text-xs text-gold">{metric.unit}</span></p>
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
                ['Microcontrôleur', 'ESP32 / Arduino', 'fa-microchip'],
                ['Transport', 'Wi-Fi / GSM', 'fa-tower-broadcast'],
                ['API', 'AtisouShield /api/iot (simulation)', 'fa-code'],
                ['Stockage', 'Base de données cloud (simulation)', 'fa-database'],
              ].map(([label, value, icon]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/15 px-3 py-2.5">
                  <span className="text-body-secondary"><i className={`fa-solid ${icon} text-[#D4AF37] mr-2`}></i>{label}</span>
                  <span className="text-body font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-body-secondary mt-4">
              Mode démonstration : les valeurs affichées sont simulées localement pour préparer l’interface et le protocole d’intégration. Aucune donnée capteur physique n’est affirmée comme réelle.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-5">
            <h3 className="font-bold text-body mb-4">Alertes et interprétation expérimentale</h3>
            <div className="space-y-3">
              {tanks.filter((tank) => tank.status !== 'normal').length === 0 ? (
                <div className="rounded-xl border border-[#D4AF37]/25 p-4">
                  <i className="fa-solid fa-circle-check text-[#D4AF37] mr-2"></i>
                  <span className="text-body">Aucune déviation simulée détectée.</span>
                </div>
              ) : tanks.filter((tank) => tank.status !== 'normal').map((tank) => (
                <div key={tank.id} className="rounded-xl border border-orange-400/30 bg-orange-400/5 p-4">
                  <p className="font-semibold text-body">{tank.id} • {tank.crop}</p>
                  <p className="text-xs text-body-secondary mt-1">Une ou plusieurs métriques sortent de la plage expérimentale configurée.</p>
                  <p className="text-xs text-gold mt-2">Vérification humaine recommandée avant toute intervention.</p>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-cyber-border">
              <p className="text-[11px] text-body-secondary">
                Ces seuils sont des paramètres d’interface expérimentale et ne constituent pas encore des recommandations agronomiques validées scientifiquement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
