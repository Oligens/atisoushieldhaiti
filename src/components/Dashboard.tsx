import { useEffect, useState } from 'react';
import { Screen } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentPosition, getWeatherData, LocationData, WeatherData, analyzeAgriculturalConditions } from '../services/geolocation';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  isDesktop: boolean;
}

export default function Dashboard({ onNavigate, isDesktop }: DashboardProps) {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setLocation(pos);
      const weatherData = await getWeatherData(pos.latitude, pos.longitude);
      setWeather(weatherData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La localisation et la météo sont momentanément indisponibles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
    // Détection automatique au chargement du tableau de bord.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickActions = [
    { id: 'scanner', icon: '📸', label: 'Scanner une plante', description: 'Diagnostic instantané', screen: 'scanner' as Screen, glow: 'neon-border-green' },
    { id: 'assistant', icon: '💬', label: "Discuter avec l'IA", description: 'Posez vos questions', screen: 'assistant' as Screen, glow: 'neon-border-cyan' },
    { id: 'location', icon: '🗺️', label: 'Analyser un lieu', description: 'Conditions & prévisions', screen: 'location' as Screen, glow: 'neon-border-cyan' },
  ];

  const locationMethodLabel = location?.source === 'ip' ? 'Position approximative (réseau)' : 'Position GPS';
  const agriculturalAnalysis = weather ? analyzeAgriculturalConditions(weather) : null;
  const locationDetails = location ? [location.street, location.commune, location.department, location.country].filter(Boolean) : [];

  if (isDesktop) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text">SYSTÈME ATISOUSHIELD</h1>
            <p className="text-sm text-body-secondary mt-1 flex items-center gap-2">
              <span className="status-dot status-dot-green"></span>OPÉRATIONNEL • {user?.nom || 'Agriculteur'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void loadDashboardData()} disabled={loading} className="rounded-xl border border-[#D4AF37]/40 px-4 py-2 text-sm font-semibold text-gold disabled:opacity-50">
              <i className="fa-solid fa-location-crosshairs mr-2"></i>{loading ? 'Localisation…' : 'Actualiser ma position'}
            </button>
            <button onClick={() => setShowAbout(true)} className="cyber-button rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2">
              <i className="fa-solid fa-circle-info"></i>À propos du logiciel
            </button>
          </div>
          <div className="flex items-center gap-4">
            {location && (
              <div className="glass-panel rounded-xl px-4 py-2 flex items-center gap-2 card-hover">
                <i className="fa-solid fa-location-dot icon-gold"></i>
                <span className="text-sm font-medium text-body">{location.region || 'Position actuelle'}</span>
              </div>
            )}
            {weather && (
              <div className="glass-panel rounded-xl px-4 py-2 flex items-center gap-3 card-hover">
                <span className="text-2xl">{weather.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gold text-glow-green">{weather.temperature}°C</p>
                  <p className="text-xs text-body-secondary">{weather.humidity}% humidité</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {(loading || error || location?.source === 'ip') && (
          <div className="glass-panel rounded-xl p-4 mb-5 text-sm" role="status" aria-live="polite">
            {loading && <span className="text-body-secondary"><i className="fa-solid fa-spinner fa-spin mr-2 text-[#D4AF37]"></i>Détection automatique de votre position…</span>}
            {!loading && error && <span className="text-body-secondary"><i className="fa-solid fa-circle-info mr-2 text-[#D4AF37]"></i>{error}</span>}
            {!loading && !error && location?.source === 'ip' && <span className="text-body-secondary"><i className="fa-solid fa-location-dot mr-2 text-[#D4AF37]"></i>Position estimée par le réseau : {location.region || location.country}. Précision indicative, non GPS.</span>}
          </div>
        )}

        {weather && location && (
          <div className="glass-panel hud-corner neon-border-cyan rounded-2xl p-6 mb-6 animate-glow-pulse">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gold mb-1 flex items-center gap-2"><i className="fa-solid fa-satellite-dish icon-gold"></i>POSITION GÉOSPATIALE</p>
                <h2 className="text-xl font-bold text-body mb-1">{location.flagEmoji ? location.flagEmoji + ' ' : ''}{location.commune || location.region || 'Position actuelle'}</h2>
                <p className="text-sm text-body-secondary">{weather.description} • {locationMethodLabel}</p>
                <p className="text-xs text-body-secondary mt-2">{locationDetails.length ? locationDetails.join(' · ') : location.address || 'Adresse détaillée indisponible'}</p>
                <p className="text-[11px] text-body-secondary mt-1">Précision : {location.source === 'ip' ? 'approximative par réseau (environ 25 km)' : '±' + Math.round(location.accuracy) + ' m (GPS)'}</p>
              </div>
              <div className="text-right">
                <p className="text-5xl">{weather.icon}</p>
                <p className="text-4xl font-bold mt-2 text-gold text-glow-green">{weather.temperature}°C</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="glass-panel rounded-xl p-3 text-center card-hover">
                <i className="fa-solid fa-droplet text-xl mb-1 icon-gold"></i>
                <p className="text-2xl font-bold text-gold text-glow-cyan">{weather.humidity}%</p>
                <p className="text-xs text-body-secondary">Humidité</p>
              </div>
              <div className="glass-panel rounded-xl p-3 text-center card-hover">
                <i className="fa-solid fa-wind text-xl mb-1 icon-gold"></i>
                <p className="text-2xl font-bold text-gold text-glow-cyan">{weather.windSpeed}</p>
                <p className="text-xs text-body-secondary">km/h</p>
              </div>
              <div className={`glass-panel rounded-xl p-3 text-center card-hover ${weather.riskLevel === 'eleve' ? 'neon-border-amber' : 'neon-border-green'}`}>
                <i className="fa-solid fa-triangle-exclamation text-xl mb-1 icon-gold"></i>
                <p className="text-lg font-bold text-gold text-glow-amber">{weather.riskLevel.toUpperCase()}</p>
                <p className="text-xs text-body-secondary">Risque</p>
              </div>
            </div>
          </div>
        )}

        {agriculturalAnalysis && (
          <div className="glass-panel rounded-2xl p-5 mb-6">
            <h2 className="text-lg font-bold text-body mb-3 flex items-center gap-2"><i className="fa-solid fa-seedling icon-gold"></i><span className="gradient-text">RISQUES AGRICOLES LOCAUX</span></h2>
            <p className="text-sm font-semibold text-gold mb-2">Niveau global : {agriculturalAnalysis.overallRisk.toUpperCase()}</p>
            {agriculturalAnalysis.riskFactors.map((factor, index) => <p key={index} className="text-xs text-body-secondary mb-2">• {factor}</p>)}
            <p className="text-xs font-semibold text-gold mt-3 mb-2">RECOMMANDATIONS</p>
            {agriculturalAnalysis.recommendations.map((item, index) => <p key={index} className="text-xs text-body-secondary mb-1">✓ {item}</p>)}
          </div>
        )}
        <h2 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
          <i className="fa-solid fa-bolt icon-gold"></i><span className="gradient-text">MODULES D'ACTION</span>
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {quickActions.map((action) => (
            <button key={action.id} onClick={() => onNavigate(action.screen)} className={`glass-panel glass-panel-hover rounded-2xl p-6 flex items-center gap-4 card-hover ${action.glow}`}>
              <div className="w-14 h-14 glass-panel rounded-xl flex items-center justify-center text-3xl">{action.icon}</div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-body">{action.label}</h3>
                <p className="text-xs text-body-secondary mt-0.5">{action.description}</p>
              </div>
            </button>
          ))}
        </div>

        {weather && (
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
              <i className="fa-solid fa-calendar-days icon-gold"></i><span className="gradient-text">PRÉVISIONS 7 JOURS</span>
            </h2>
            <div className="grid grid-cols-7 gap-3">
              {weather.forecast.map((day, index) => (
                <div key={index} className="glass-panel rounded-xl p-3 text-center card-hover">
                  <p className="text-xs font-medium text-body mb-2">{day.dayName.slice(0, 3)}</p>
                  <p className="text-2xl mb-2">{day.icon}</p>
                  <p className="text-sm font-bold text-gold text-glow-green">{day.tempMax}°</p>
                  <p className="text-xs text-body-secondary">{day.tempMin}°</p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-gold">
                    <i className="fa-solid fa-droplet text-[8px] icon-gold"></i><span>{day.humidity}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {showAbout && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="about-software-title" onClick={(event) => { if (event.target === event.currentTarget) setShowAbout(false); }}>
            <div className="glass-panel neon-border-cyan rounded-2xl p-6 w-full max-w-xl animate-fade-in">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div><p className="text-xs text-gold tracking-widest mb-1">PRÉSENTATION DU LOGICIEL</p><h2 id="about-software-title" className="text-xl font-bold gradient-text">À propos d’AtisouShield</h2></div>
                <button type="button" onClick={() => setShowAbout(false)} aria-label="Fermer" className="text-body-secondary hover:text-gold text-2xl leading-none">×</button>
              </div>
              <p className="text-sm leading-7 text-body-secondary">AtisouShield Haïti est une plateforme d’aide à la décision et de recherche appliquée qui associe analyse phytosanitaire, données agricoles, intelligence artificielle et expérimentation hydroponique. Son ambition est d’étudier comment des outils adaptés au contexte haïtien peuvent contribuer à protéger les cultures, améliorer la productivité et renforcer les revenus et la sécurité alimentaire des ménages.</p>
              <div className="flex flex-wrap justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAbout(false)} className="rounded-xl px-4 py-2 text-sm border border-cyber-border text-body-secondary">Fermer</button>
                <button type="button" onClick={() => { setShowAbout(false); onNavigate('about'); }} className="cyber-button rounded-xl px-5 py-2 text-sm font-semibold">En savoir plus <i className="fa-solid fa-arrow-right ml-2"></i></button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 pb-6 animate-fade-in">
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => void loadDashboardData()} disabled={loading} className="rounded-xl border border-[#D4AF37]/40 px-3 py-2 text-xs font-semibold text-gold disabled:opacity-50">
          <i className="fa-solid fa-location-crosshairs mr-2"></i>{loading ? 'Localisation…' : 'Actualiser ma position'}
        </button>
        <button onClick={() => setShowAbout(true)} className="cyber-button rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2"><i className="fa-solid fa-circle-info"></i>À propos du logiciel</button>
      </div>
      <div className="mb-6">
        <h1 className="text-xl font-bold gradient-text">ATISOUSHIELD</h1>
        <p className="text-xs text-body-secondary mt-1 flex items-center gap-2">
          <span className="status-dot status-dot-green"></span>{location?.region || 'Détection de votre localisation…'}
        </p>
      </div>

      {(loading || error || location?.source === 'ip') && (
        <div className="glass-panel rounded-xl p-3 mb-4 text-xs" role="status" aria-live="polite">
          {loading && <span className="text-body-secondary"><i className="fa-solid fa-spinner fa-spin mr-2 text-[#D4AF37]"></i>Détection automatique de votre position…</span>}
          {!loading && error && <span className="text-body-secondary">{error}</span>}
          {!loading && !error && location?.source === 'ip' && <span className="text-body-secondary">Position approximative détectée par le réseau. Activez le GPS pour une position précise.</span>}
        </div>
      )}

      {weather && location && (
        <div className="glass-panel hud-corner neon-border-cyan rounded-2xl p-5 mb-5 animate-glow-pulse">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-gold mb-1 flex items-center gap-1"><i className="fa-solid fa-satellite-dish icon-gold"></i>POSITION</p>
              <h2 className="text-base font-bold mb-1 text-body">{location.flagEmoji ? location.flagEmoji + ' ' : ''}{location.commune || location.region || 'Actuelle'}</h2>
              <p className="text-xs text-body-secondary">{weather.description} • {locationMethodLabel}</p>
              <p className="text-[10px] text-body-secondary mt-2">{locationDetails.length ? locationDetails.join(' · ') : location.address || 'Adresse détaillée indisponible'}</p>
              <p className="text-[10px] text-body-secondary mt-1">Précision : {location.source === 'ip' ? 'approximative par réseau' : '±' + Math.round(location.accuracy) + ' m'}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl">{weather.icon}</p>
              <p className="text-2xl font-bold mt-1 text-gold text-glow-green">{weather.temperature}°C</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="glass-panel rounded-lg p-2 text-center">
              <i className="fa-solid fa-droplet text-sm mb-1 icon-gold"></i>
              <p className="text-lg font-bold text-gold text-glow-cyan">{weather.humidity}%</p>
              <p className="text-[10px] text-body-secondary">Humidité</p>
            </div>
            <div className="glass-panel rounded-lg p-2 text-center">
              <i className="fa-solid fa-wind text-sm mb-1 icon-gold"></i>
              <p className="text-lg font-bold text-gold text-glow-cyan">{weather.windSpeed}</p>
              <p className="text-[10px] text-body-secondary">km/h</p>
            </div>
            <div className={`glass-panel rounded-lg p-2 text-center ${weather.riskLevel === 'eleve' ? 'neon-border-amber' : 'neon-border-green'}`}>
              <i className="fa-solid fa-triangle-exclamation text-sm mb-1 icon-gold"></i>
              <p className="text-xs font-bold text-gold text-glow-amber">{weather.riskLevel.toUpperCase()}</p>
              <p className="text-[10px] text-body-secondary">Risque</p>
            </div>
          </div>
        </div>
      )}

        {agriculturalAnalysis && (
          <div className="glass-panel rounded-2xl p-5 mb-5">
            <h2 className="text-lg font-bold text-body mb-3 flex items-center gap-2"><i className="fa-solid fa-seedling icon-gold"></i><span className="gradient-text">RISQUES AGRICOLES LOCAUX</span></h2>
            <p className="text-sm font-semibold text-gold mb-2">Niveau global : {agriculturalAnalysis.overallRisk.toUpperCase()}</p>
            {agriculturalAnalysis.riskFactors.map((factor, index) => <p key={index} className="text-xs text-body-secondary mb-2">• {factor}</p>)}
            <p className="text-xs font-semibold text-gold mt-3 mb-2">RECOMMANDATIONS</p>
            {agriculturalAnalysis.recommendations.map((item, index) => <p key={index} className="text-xs text-body-secondary mb-1">✓ {item}</p>)}
          </div>
        )}
      <h2 className="text-base font-bold text-body mb-3 flex items-center gap-2">
        <i className="fa-solid fa-bolt icon-gold"></i><span className="gradient-text">MODULES</span>
      </h2>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {quickActions.map((action) => (
          <button key={action.id} onClick={() => onNavigate(action.screen)} className={`glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col items-center gap-2 card-hover ${action.glow}`}>
            <div className="w-12 h-12 glass-panel rounded-xl flex items-center justify-center text-2xl">{action.icon}</div>
            <span className="text-[11px] font-semibold text-body text-center leading-tight">{action.label}</span>
            <span className="text-[9px] text-body-secondary">{action.description}</span>
          </button>
        ))}
      </div>

      {weather && (
        <div className="glass-panel rounded-2xl p-4">
          <h2 className="text-sm font-bold text-body mb-3 flex items-center gap-2">
            <i className="fa-solid fa-calendar-days icon-gold"></i><span className="gradient-text">PRÉVISIONS</span>
          </h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {weather.forecast.map((day, index) => (
              <div key={index} className="glass-panel rounded-xl p-3 text-center min-w-[70px] flex-shrink-0 card-hover">
                <p className="text-[10px] font-medium text-body mb-1">{day.dayName.slice(0, 3)}</p>
                <p className="text-xl mb-1">{day.icon}</p>
                <p className="text-xs font-bold text-gold text-glow-green">{day.tempMax}°</p>
                <p className="text-[10px] text-body-secondary">{day.tempMin}°</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {showAbout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="about-software-title" onClick={(event) => { if (event.target === event.currentTarget) setShowAbout(false); }}>
          <div className="glass-panel neon-border-cyan rounded-2xl p-6 w-full max-w-xl animate-fade-in">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div><p className="text-xs text-gold tracking-widest mb-1">PRÉSENTATION DU LOGICIEL</p><h2 id="about-software-title" className="text-xl font-bold gradient-text">À propos d’AtisouShield</h2></div>
              <button type="button" onClick={() => setShowAbout(false)} aria-label="Fermer" className="text-body-secondary hover:text-gold text-2xl leading-none">×</button>
            </div>
            <p className="text-sm leading-7 text-body-secondary">AtisouShield Haïti est une plateforme d’aide à la décision et de recherche appliquée qui associe analyse phytosanitaire, données agricoles, intelligence artificielle et expérimentation hydroponique. Son ambition est d’étudier comment des outils adaptés au contexte haïtien peuvent contribuer à protéger les cultures, améliorer la productivité et renforcer les revenus et la sécurité alimentaire des ménages.</p>
            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowAbout(false)} className="rounded-xl px-4 py-2 text-sm border border-cyber-border text-body-secondary">Fermer</button>
              <button type="button" onClick={() => { setShowAbout(false); onNavigate('about'); }} className="cyber-button rounded-xl px-5 py-2 text-sm font-semibold">En savoir plus <i className="fa-solid fa-arrow-right ml-2"></i></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
