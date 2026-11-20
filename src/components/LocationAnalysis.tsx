import { useEffect, useState, type FormEvent } from 'react';
import { calculateAgriculturalRisk } from '../services/agriculturalRisk';
import { getCurrentPosition, getWeatherData, type LocationData, type LocationSource, type WeatherData } from '../services/geolocation';
import LocationOverview from './LocationOverview';
import { saveWeatherObservation } from '../services/researchData';

interface LocationAnalysisProps { isDesktop: boolean; }
interface PlaceResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  address?: Record<string, string>;
}

export default function LocationAnalysis({ isDesktop }: LocationAnalysisProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadWeatherForPlace = async (lat: number, lon: number, address: string, region?: string, country?: string, source: LocationSource = 'search', details?: Partial<LocationData>) => {
    setLoadingWeather(true);
    setError(null);
    setWeather(null);
    const selectedLocation: LocationData = {
      latitude: lat,
      longitude: lon,
      accuracy: 0,
      address,
      region: region || address.split(',')[0],
      country: country || 'Non précisé',
      source,
      department: details?.department,
      commune: details?.commune || region,
      street: details?.street,
      countryCode: details?.countryCode,
      accuracy: details?.accuracy ?? 0,
      timestamp: Date.now(),
    };
    setLocation(selectedLocation);
    try {
      const data = await getWeatherData(lat, lon);
      setWeather(data);
      try {
        await saveWeatherObservation({ latitude: lat, longitude: lon, temperature: data.temperature, humidity: data.humidity, wind_speed: data.windSpeed });
      } catch {
        // La météo reste disponible même si l'enregistrement distant échoue.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de récupérer les données météo.');
    } finally {
      setLoadingWeather(false);
    }
  };

  const loadCurrentPosition = async () => {
    setLoadingGps(true);
    setError(null);
    try {
      const position = await getCurrentPosition();
      await loadWeatherForPlace(
        position.latitude,
        position.longitude,
        position.address || 'Position actuelle',
        position.region,
        position.country,
        position.source || 'gps',
        position
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Position actuelle indisponible. Recherchez un lieu manuellement.');
    } finally {
      setLoadingGps(false);
    }
  };

  useEffect(() => {
    void loadCurrentPosition();
  }, []);

  const searchPlaces = async (event: FormEvent) => {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      setSearchError('Saisissez au moins deux caractères pour rechercher un lieu.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setPlaces([]);
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', term);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', '6');
      url.searchParams.set('accept-language', 'fr');
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      let response: Response;
      try {
        response = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal: controller.signal });
      } catch (err) {
        if (controller.signal.aborted) throw new Error('La recherche du lieu a pris trop de temps. Réessayez.');
        throw err;
      } finally {
        window.clearTimeout(timeoutId);
      }
      if (!response.ok) throw new Error(response.status === 429 ? 'Le service cartographique est temporairement saturé. Réessayez dans une minute.' : 'Le service de recherche géographique ne répond pas.');
      const results = await response.json() as PlaceResult[];
      setPlaces(results);
      if (!results.length) setSearchError('Aucun lieu trouvé. Essayez avec une commune, une ville ou un département.');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'La recherche du lieu a échoué.');
    } finally {
      setSearching(false);
    }
  };

  const choosePlace = (place: PlaceResult) => {
    const address = place.address || {};
    const region = address.city || address.town || address.village || address.county || address.state;
    void loadWeatherForPlace(
      Number(place.lat),
      Number(place.lon),
      place.display_name,
      region,
      address.country,
      'search',
      {
        department: address.state || address.region || address.county,
        commune: address.city || address.town || address.village || address.municipality || address.county || region,
        street: [address.house_number, address.road || address.pedestrian || address.residential].filter(Boolean).join(' ') || undefined,
        countryCode: address.country_code,
      }
    );
    setPlaces([]);
    setQuery(place.display_name);
  };

  const analysis = weather
    ? calculateAgriculturalRisk({ temperature: weather.temperature, humidity: weather.humidity, windSpeed: weather.windSpeed })
    : null;

  return (
    <div className={isDesktop ? 'p-8 animate-fade-in' : 'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
      <div className="mb-6">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className="w-10 h-10 glass-panel neon-border-cyan rounded-full flex items-center justify-center">
            <i className="fa-solid fa-map-location-dot icon-gold"></i>
          </span>
          ANALYSE GÉOSPATIALE
        </h1>
        <p className="text-sm text-body-secondary mt-2">Recherchez une commune, une ville ou une zone agricole pour consulter les conditions météorologiques et les risques agricoles.</p>
      </div>

      <section className="glass-panel rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <i className="fa-solid fa-magnifying-glass icon-gold"></i>
          <h2 className="font-bold text-body">Rechercher un lieu</h2>
        </div>
        <form onSubmit={searchPlaces} className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="cyber-input flex-1 rounded-xl px-4 py-3 text-sm"
            placeholder="Ex. Delmas, Port-au-Prince, Jacmel, Cap-Haïtien..."
            aria-label="Nom du lieu à rechercher"
          />
          <button type="submit" disabled={searching || query.trim().length < 2} className="cyber-button rounded-xl px-5 py-3 font-semibold disabled:opacity-50">
            {searching ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Recherche…</> : <><i className="fa-solid fa-search mr-2"></i>Rechercher</>}
          </button>
          <button type="button" onClick={() => void loadCurrentPosition()} disabled={loadingGps || loadingWeather} className="rounded-xl border border-[#D4AF37]/40 px-4 py-3 text-sm text-gold disabled:opacity-50">
            <i className="fa-solid fa-location-crosshairs mr-2"></i>Ma position
          </button>
        </form>
        {searchError && <p className="text-sm text-orange-300 mt-3" role="status">{searchError}</p>}
        {places.length > 0 && (
          <div className="mt-4 space-y-2" aria-label="Résultats de recherche">
            {places.map((place) => (
              <button key={place.place_id} type="button" onClick={() => choosePlace(place)} className="w-full text-left rounded-xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 p-3 flex items-start gap-3">
                <i className="fa-solid fa-location-dot text-[#D4AF37] mt-1"></i>
                <span className="text-sm text-body">{place.display_name}</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-[11px] text-body-secondary mt-3">Recherche cartographique OpenStreetMap. La localisation est tentée automatiquement ; si le GPS n’est pas autorisé, une position IP approximative est utilisée lorsque disponible.</p>
      </section>

      {loadingGps && !location && (
        <div className="glass-panel rounded-2xl p-4 mb-5 text-sm text-body-secondary">
          <i className="fa-solid fa-satellite-dish mr-2 text-[#D4AF37]"></i>Tentative de localisation GPS puis, si nécessaire, localisation approximative par Internet… Vous pouvez déjà rechercher un lieu ci-dessus.
        </div>
      )}
      {loadingWeather && (
        <div className="glass-panel rounded-2xl p-6 mb-5 text-center">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-[#D4AF37]"></i>
          <p className="text-sm text-body mt-3">Récupération des données météo pour le lieu sélectionné…</p>
        </div>
      )}
      {error && (
        <div className="glass-panel neon-border-amber rounded-2xl p-5 mb-5">
          <p className="text-sm text-body">{error}</p>
          <p className="text-xs text-body-secondary mt-2">Vous pouvez continuer en recherchant manuellement une commune ou une ville.</p>
        </div>
      )}

      {weather && location && (
        <>
          <div className="glass-panel hud-corner neon-border-cyan rounded-2xl p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs text-gold mb-1"><i className="fa-solid fa-satellite-dish mr-2"></i>LIEU ANALYSÉ</p>
                <h2 className="text-xl font-bold text-body mb-1">{location.region}, {location.country}</h2>
                <p className="text-xs text-body-secondary max-w-2xl">{location.address}</p>
                <p className="text-sm text-body-secondary mt-2">{weather.description}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-5xl">{weather.icon}</p>
                <p className="text-4xl font-bold mt-2 text-gold">{weather.temperature}°C</p>
              </div>
            </div>
          </div>

          <LocationOverview location={location} weather={weather} />

          <div className={isDesktop ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>
            <div className={isDesktop ? 'col-span-2 space-y-6' : 'space-y-4'}>
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-bold text-body mb-4"><i className="fa-solid fa-cloud-sun icon-gold mr-2"></i>CONDITIONS ACTUELLES</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass-panel rounded-xl p-4 text-center">
                    <i className="fa-solid fa-temperature-half text-xl icon-gold mb-2"></i>
                    <p className="text-2xl font-bold text-gold">{weather.temperature}°C</p>
                    <p className="text-xs text-body-secondary">Température</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4 text-center">
                    <i className="fa-solid fa-droplet text-xl icon-gold mb-2"></i>
                    <p className="text-2xl font-bold text-gold">{weather.humidity}%</p>
                    <p className="text-xs text-body-secondary">Humidité</p>
                  </div>
                  <div className="glass-panel rounded-xl p-4 text-center">
                    <i className="fa-solid fa-wind text-xl icon-gold mb-2"></i>
                    <p className="text-2xl font-bold text-gold">{weather.windSpeed}</p>
                    <p className="text-xs text-body-secondary">Vent km/h</p>
                  </div>
                </div>
              </div>
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-bold text-body mb-4"><i className="fa-solid fa-calendar-days icon-gold mr-2"></i>PRÉVISIONS 7 JOURS</h3>
                <div className="space-y-3">
                  {weather.forecast.map((day) => (
                    <div key={day.date} className="glass-panel rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{day.icon}</span>
                        <div><p className="text-sm font-medium text-body">{day.dayName}</p><p className="text-xs text-body-secondary">{day.condition}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right"><p className="text-sm font-bold text-gold">{day.tempMax}°</p><p className="text-xs text-body-secondary">{day.tempMin}°</p></div>
                        <span className="text-xs text-gold"><i className="fa-solid fa-cloud-rain mr-1"></i>{day.precipitation} mm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {analysis && (
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-lg font-bold text-body mb-4"><i className="fa-solid fa-seedling icon-gold mr-2"></i>ANALYSE AGRICOLE</h3>
                <div className={`glass-panel rounded-xl p-4 mb-4 ${analysis.level === 'eleve' ? 'neon-border-amber' : analysis.level === 'modere' ? 'neon-border-cyan' : 'neon-border-green'}`}>
                  <p className="text-xs font-bold text-gold">NIVEAU DE RISQUE : {analysis.level.toUpperCase()}</p>
                </div>
                {analysis.factors.length > 0 && <div className="mb-4"><p className="text-xs font-bold text-gold mb-2">FACTEURS DE RISQUE</p><ul className="space-y-2">{analysis.factors.map((factor, index) => <li key={index} className="text-xs text-body flex gap-2"><span className="text-gold">•</span>{factor}</li>)}</ul></div>}
                {analysis.recommendations.length > 0 && <div><p className="text-xs font-bold text-gold mb-2">RECOMMANDATIONS</p><ul className="space-y-2">{analysis.recommendations.map((item, index) => <li key={index} className="text-xs text-body flex gap-2"><span className="text-gold">✓</span>{item}</li>)}</ul></div>}
              </div>
            )}
          </div>
        </>
      )}
      {!weather && !loadingWeather && !loadingGps && !error && (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <i className="fa-solid fa-map-location-dot text-3xl text-[#D4AF37]"></i>
          <p className="text-body font-semibold mt-3">Choisissez un lieu à analyser</p>
          <p className="text-sm text-body-secondary mt-1">Les données météo et les indicateurs agricoles apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
