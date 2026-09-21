import { useState, useEffect } from 'react';
import { Screen } from '../App';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentPosition, getWeatherData, LocationData, WeatherData } from '../services/geolocation';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
  isDesktop: boolean;
}

export default function Dashboard({ onNavigate, isDesktop }: DashboardProps) {
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setLocation(pos);
      const weatherData = await getWeatherData(pos.latitude, pos.longitude);
      setWeather(weatherData);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className={isDesktop ? 'p-8' : 'pt-14 pb-20 px-4'}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="w-20 h-20 border-2 border-neon-cyan/30 rounded-full animate-ping absolute"></div>
            <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl">🌱</span></div>
          </div>
          <p className="text-sm text-neon-cyan mt-6 text-glow-cyan">INITIALISATION DU SYSTÈME...</p>
          <p className="text-xs text-body-secondary mt-2">Chargement des données agricoles</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={isDesktop ? 'p-8' : 'pt-14 pb-20 px-4'}>
        <div className="glass-panel neon-border-amber rounded-2xl p-6 text-center">
          <span className="text-4xl mb-3 block">📍</span>
          <h2 className="text-lg font-bold text-neon-amber mb-2 text-glow-amber">GÉOLOCALISATION REQUISE</h2>
          <p className="text-sm text-body mb-4">{error}</p>
          <button onClick={loadDashboardData} className="cyber-button-alert rounded-lg px-6 py-2 font-medium">
            <i className="fa-solid fa-location-crosshairs mr-2"></i>Activer la géolocalisation
          </button>
        </div>
      </div>
    );
  }

  const quickActions = [
    { id: 'scanner', icon: '📸', label: 'Scanner une plante', description: 'Diagnostic instantané', screen: 'scanner' as Screen, glow: 'neon-border-green' },
    { id: 'assistant', icon: '💬', label: 'Discuter avec l\'IA', description: 'Posez vos questions', screen: 'assistant' as Screen, glow: 'neon-border-cyan' },
    { id: 'location', icon: '🗺️', label: 'Analyser un lieu', description: 'Conditions & prévisions', screen: 'location' as Screen, glow: 'neon-border-cyan' },
  ];

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

        {weather && location && (
          <div className="glass-panel hud-corner neon-border-cyan rounded-2xl p-6 mb-6 animate-glow-pulse">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gold mb-1 flex items-center gap-2"><i className="fa-solid fa-satellite-dish icon-gold"></i>POSITION GÉOSPATIALE</p>
                <h2 className="text-xl font-bold text-body mb-1">{location.region || 'Position actuelle'}</h2>
                <p className="text-sm text-body-secondary">{weather.description}</p>
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
      </div>
    );
  }

  return (
    <div className="px-4 pt-14 pb-6 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-bold gradient-text">ATISOUSHIELD</h1>
        <p className="text-xs text-body-secondary mt-1 flex items-center gap-2">
          <span className="status-dot status-dot-green"></span>{location?.region || 'Votre exploitation'}
        </p>
      </div>

      {weather && location && (
        <div className="glass-panel hud-corner neon-border-cyan rounded-2xl p-5 mb-5 animate-glow-pulse">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-gold mb-1 flex items-center gap-1"><i className="fa-solid fa-satellite-dish icon-gold"></i>POSITION</p>
              <h2 className="text-base font-bold mb-1 text-body">{location.region || 'Actuelle'}</h2>
              <p className="text-xs text-body-secondary">{weather.description}</p>
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
    </div>
  );
}
