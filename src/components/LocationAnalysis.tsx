import { useState, useEffect } from 'react';
import { calculateAgriculturalRisk } from '../services/agriculturalRisk';
import { getCurrentPosition, getWeatherData, LocationData, WeatherData } from '../services/geolocation';
import { saveWeatherObservation } from '../services/researchData';

interface LocationAnalysisProps { isDesktop: boolean; }

export default function LocationAnalysis({ isDesktop }: LocationAnalysisProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadLocationData(); }, []);

  const loadLocationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pos = await getCurrentPosition();
      setLocation(pos);
      const weatherData = await getWeatherData(pos.latitude, pos.longitude);
      setWeather(weatherData);
      try { await saveWeatherObservation({ latitude: pos.latitude, longitude: pos.longitude, temperature: weatherData.temperature, humidity: weatherData.humidity, wind_speed: weatherData.windSpeed }); } catch { /* La météo reste affichée même si la persistance distante échoue. */ }
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
            <div className="absolute inset-0 flex items-center justify-center"><i className="fa-solid fa-satellite-dish text-2xl icon-gold"></i></div>
          </div>
          <p className="text-sm text-neon-cyan mt-6 text-glow-cyan">ANALYSE GÉOSPATIALE EN COURS...</p>
          <p className="text-xs text-body-secondary mt-2">Acquisition des données météorologiques</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={isDesktop ? 'p-8' : 'pt-14 pb-20 px-4'}>
        <div className="glass-panel neon-border-amber rounded-2xl p-6 text-center">
          <span className="text-4xl mb-3 block">⚠️</span>
          <h2 className="text-lg font-bold text-neon-amber mb-2 text-glow-amber">ERREUR SYSTÈME</h2>
          <p className="text-sm text-body mb-4">{error}</p>
          <button onClick={loadLocationData} className="cyber-button-alert rounded-lg px-6 py-2 font-medium">Réessayer</button>
        </div>
      </div>
    );
  }

  const analysis = weather ? calculateAgriculturalRisk({ temperature: weather.temperature, humidity: weather.humidity, windSpeed: weather.windSpeed }) : null;

  return (
    <div className={isDesktop ? 'p-8 animate-fade-in' : 'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
      <div className="mb-8">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} glass-panel neon-border-cyan rounded-full flex items-center justify-center animate-glow-pulse`}>
            <i className="fa-solid fa-map-location-dot icon-gold"></i>
          </span>
          ANALYSE GÉOSPATIALE
        </h1>
        <p className="text-sm text-body-secondary mt-2 flex items-center gap-2">
          <i className="fa-solid fa-satellite icon-gold"></i>Système de surveillance agricole mondiale
        </p>
      </div>

      {weather && location && (
        <>
          <div className="glass-panel hud-corner neon-border-cyan rounded-2xl p-6 mb-6 animate-glow-pulse">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gold mb-1 flex items-center gap-2"><i className="fa-solid fa-satellite-dish icon-gold"></i>LIEU ANALYSÉ</p>
                <h2 className="text-xl font-bold mb-1 text-body">{location.region}, {location.country}</h2>
                <p className="text-sm text-body-secondary">{weather.description}</p>
              </div>
              <div className="text-right">
                <p className="text-5xl">{weather.icon}</p>
                <p className="text-4xl font-bold mt-2 text-gold text-glow-green">{weather.temperature}°C</p>
              </div>
            </div>
          </div>

          <div className={isDesktop ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>
            <div className={isDesktop ? 'col-span-2' : ''}>
              <div className="glass-panel rounded-2xl p-6 mb-6">
                <h3 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-cloud-sun icon-gold"></i>
                  <span className="gradient-text">CONDITIONS ACTUELLES</span>
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-panel rounded-xl p-4 text-center card-hover">
                    <i className="fa-solid fa-temperature-half text-2xl icon-gold mb-2"></i>
                    <p className="text-2xl font-bold text-gold text-glow-cyan">{weather.temperature}°C</p>
                    <p className="text-xs text-body-secondary">Température</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4 text-center card-hover">
                    <i className="fa-solid fa-droplet text-2xl icon-gold mb-2"></i>
                    <p className="text-2xl font-bold text-gold text-glow-cyan">{weather.humidity}%</p>
                    <p className="text-xs text-body-secondary">Humidité</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4 text-center card-hover">
                    <i className="fa-solid fa-wind text-2xl icon-gold mb-2"></i>
                    <p className="text-2xl font-bold text-gold text-glow-cyan">{weather.windSpeed}</p>
                    <p className="text-xs text-body-secondary">km/h</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-calendar-days icon-gold"></i>
                  <span className="gradient-text">PRÉVISIONS 7 JOURS</span>
                </h3>
                <div className="space-y-3">
                  {weather.forecast.map((day, index) => (
                    <div key={index} className="glass-panel rounded-xl p-3 flex items-center justify-between card-hover">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{day.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-body">{day.dayName}</p>
                          <p className="text-xs text-body-secondary">{day.condition}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gold text-glow-green">{day.tempMax}°</p>
                          <p className="text-xs text-body-secondary">{day.tempMin}°</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gold">
                          <i className="fa-solid fa-droplet icon-gold"></i><span>{day.humidity}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {analysis && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-seedling icon-gold"></i>
                  <span className="gradient-text">ANALYSE AGRICOLE</span>
                </h3>
                <div className={`glass-panel rounded-xl p-4 mb-4 ${analysis.level === 'eleve' ? 'neon-border-amber' : analysis.level === 'modere' ? 'neon-border-cyan' : 'neon-border-green'}`}>
                  <p className="text-xs font-bold mb-2" style={{ color: analysis.level === 'eleve' ? '#D4AF37' : analysis.level === 'modere' ? '#D4AF37' : '#D4AF37' }}>
                    NIVEAU DE RISQUE : {analysis.level.toUpperCase()}
                  </p>
                </div>
                {analysis.factors.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gold mb-2 flex items-center gap-1"><i className="fa-solid fa-triangle-exclamation icon-gold"></i>FACTEURS DE RISQUE :</p>
                    <ul className="space-y-1">
                      {analysis.factors.map((factor, i) => (
                        <li key={i} className="text-xs text-body flex items-start gap-2"><span className="text-gold mt-0.5">•</span>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gold mb-2 flex items-center gap-1"><i className="fa-solid fa-lightbulb icon-gold"></i>RECOMMANDATIONS :</p>
                    <ul className="space-y-1">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs text-body flex items-start gap-2"><span className="text-gold mt-0.5">✓</span>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
