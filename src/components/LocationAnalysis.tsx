import { useEffect, useRef, useState, type FormEvent } from 'react';
import { calculateAgriculturalRisk } from '../services/agriculturalRisk';
import { getCurrentPosition, getWeatherData, type LocationData, type WeatherData } from '../services/geolocation';
import { saveWeatherObservation } from '../services/researchData';

interface LocationAnalysisProps { isDesktop: boolean; }
interface PlaceResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
}
type MapLayer = 'plan' | 'satellite';

const firstValue = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();

function countryFlag(code?: string): string | undefined {
  if (!code || !/^[a-z]{2}$/i.test(code)) return undefined;
  return String.fromCodePoint(...code.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0)));
}

function addressDetails(address: Record<string, string> = {}) {
  const countryCode = address.country_code?.toUpperCase();
  const street = [address.house_number, firstValue(address.road, address.pedestrian, address.residential, address.footway, address.path)]
    .filter(Boolean).join(' ');
  const commune = firstValue(
    address.city, address.town, address.village, address.municipality,
    address.city_district, address.suburb, address.county
  );
  const department = firstValue(address.state, address.province, address.region, address.state_district);
  return {
    department,
    commune,
    street: firstValue(street, address.neighbourhood, address.hamlet),
    country: firstValue(address.country),
    countryCode,
    flagEmoji: countryFlag(countryCode),
  };
}

async function reverseAddress(lat: number, lon: number): Promise<Record<string, string>> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'fr');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Le service de détail géographique est indisponible.');
    const result = await response.json() as { address?: Record<string, string> };
    return result.address || {};
  } finally {
    window.clearTimeout(timeout);
  }
}

function mapUrl(layer: MapLayer, latitude: number, longitude: number): string {
  if (layer === 'satellite') {
    return `https://maps.google.com/maps?q=${latitude},${longitude}&t=k&z=16&output=embed`;
  }
  const delta = 0.018;
  const west = longitude - delta;
  const east = longitude + delta;
  const south = Math.max(-85, latitude - delta);
  const north = Math.min(85, latitude + delta);
  const bbox = [west, south, east, north].join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
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
  const [mapLayer, setMapLayer] = useState<MapLayer>('plan');
  const requestSequence = useRef(0);

  const loadWeatherForPlace = async (
    lat: number,
    lon: number,
    address: string,
    region?: string,
    country?: string,
    details?: Partial<LocationData>,
    shouldReverseGeocode = false,
  ) => {
    const requestId = ++requestSequence.current;
    setLoadingWeather(true);
    setError(null);
    setWeather(null);

    const selectedLocation: LocationData = {
      latitude: lat,
      longitude: lon,
      accuracy: details?.accuracy || 0,
      address,
      region: region || address.split(',')[0],
      department: details?.department,
      commune: details?.commune || region,
      street: details?.street,
      country: country || details?.country || 'Pays non identifié',
      countryCode: details?.countryCode,
      flagEmoji: details?.flagEmoji,
      source: details?.source || 'manual',
      timestamp: Date.now(),
    };
    setLocation(selectedLocation);

    try {
      const [weatherResult, addressResult] = await Promise.all([
        getWeatherData(lat, lon),
        shouldReverseGeocode
          ? reverseAddress(lat, lon).catch((geocodeError) => {
              console.warn('Adresse précise indisponible pour ce lieu :', geocodeError);
              return {} as Record<string, string>;
            })
          : Promise.resolve({} as Record<string, string>),
      ]);
      if (requestId !== requestSequence.current) return;

      const resolved = addressDetails(addressResult);
      const enrichedLocation: LocationData = {
        ...selectedLocation,
        department: resolved.department || selectedLocation.department,
        commune: resolved.commune || selectedLocation.commune,
        street: resolved.street || selectedLocation.street,
        country: resolved.country || selectedLocation.country,
        countryCode: resolved.countryCode || selectedLocation.countryCode,
        flagEmoji: resolved.flagEmoji || selectedLocation.flagEmoji,
        address: firstValue(
          [resolved.street || selectedLocation.street, resolved.commune || selectedLocation.commune,
            resolved.department || selectedLocation.department, resolved.country || selectedLocation.country]
            .filter(Boolean).join(', '),
          selectedLocation.address,
        ),
      };
      setLocation(enrichedLocation);
      setWeather(weatherResult);
      try {
        await saveWeatherObservation({
          latitude: lat,
          longitude: lon,
          temperature: weatherResult.temperature,
          humidity: weatherResult.humidity,
          wind_speed: weatherResult.windSpeed,
        });
      } catch {
        // L'analyse reste disponible même si l'enregistrement distant échoue.
      }
    } catch (err) {
      if (requestId !== requestSequence.current) return;
      setError(err instanceof Error ? err.message : 'Impossible de récupérer les données météo pour ce lieu.');
    } finally {
      if (requestId === requestSequence.current) setLoadingWeather(false);
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
        position,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Position actuelle indisponible. Recherchez un lieu manuellement.');
    } finally {
      setLoadingGps(false);
    }
  };

  useEffect(() => {
    void loadCurrentPosition();
    // La recherche manuelle reste disponible pendant la tentative GPS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      url.searchParams.set('namedetails', '1');
      url.searchParams.set('limit', '8');
      url.searchParams.set('accept-language', 'fr');
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) throw new Error('La recherche a dépassé le délai autorisé. Réessayez.');
        throw err;
      } finally {
        window.clearTimeout(timeoutId);
      }
      if (!response.ok) {
        throw new Error(response.status === 429
          ? 'Le service cartographique est temporairement saturé. Attendez quelques instants avant de réessayer.'
          : 'Le service de recherche géographique ne répond pas.');
      }
      const results = await response.json() as PlaceResult[];
      setPlaces(results);
      if (!results.length) setSearchError('Aucun résultat trouvé. Essayez le nom de la commune suivi du département ou du pays.');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'La recherche du lieu a échoué.');
    } finally {
      setSearching(false);
    }
  };

  const choosePlace = (place: PlaceResult) => {
    const address = place.address || {};
    const details = addressDetails(address);
    const lat = Number(place.lat);
    const lon = Number(place.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setSearchError('Les coordonnées du lieu sélectionné sont invalides. Choisissez un autre résultat.');
      return;
    }
    setSearchError(null);
    setPlaces([]);
    setQuery(place.display_name);
    void loadWeatherForPlace(
      lat,
      lon,
      place.display_name,
      details.commune || details.department,
      details.country,
      { ...details, source: 'manual' },
      true,
    );
  };

  const rainfall72h = weather
    ? weather.forecast.slice(0, 3).reduce((total, day) => total + (Number(day.precipitation) || 0), 0)
    : 0;
  const analysis = weather
    ? calculateAgriculturalRisk({
        temperature: weather.temperature,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        rainfallMm: rainfall72h,
      })
    : null;

  return (
    <div className={isDesktop ? 'p-8 animate-fade-in' : 'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
      <div className="mb-6">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className="w-10 h-10 glass-panel neon-border-cyan rounded-full flex items-center justify-center">
            <i className="fa-solid fa-map-location-dot icon-gold"></i>
          </span>
          RECHERCHER UN LIEU
        </h1>
        <p className="text-sm text-body-secondary mt-2">
          Sélectionnez une commune, une ville ou une zone agricole : les conditions météo et les risques agricoles seront calculés pour ses coordonnées géographiques.
        </p>
      </div>

      <section className="glass-panel rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <i className="fa-solid fa-magnifying-glass icon-gold"></i>
          <h2 className="font-bold text-body">Rechercher une commune, une ville ou une zone</h2>
        </div>
        <form onSubmit={searchPlaces} className="flex flex-col sm:flex-row gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="cyber-input flex-1 rounded-xl px-4 py-3 text-sm"
            placeholder="Ex. Delmas, Jacmel, Plaine du Cul-de-Sac, Cap-Haïtien…"
            aria-label="Nom de la commune, ville ou zone agricole"
          />
          <button type="submit" disabled={searching || query.trim().length < 2} className="cyber-button rounded-xl px-5 py-3 font-semibold disabled:opacity-50">
            {searching
              ? <><i className="fa-solid fa-spinner fa-spin mr-2"></i>Recherche…</>
              : <><i className="fa-solid fa-search mr-2"></i>Rechercher</>}
          </button>
          <button type="button" onClick={() => void loadCurrentPosition()} disabled={loadingGps || loadingWeather} className="rounded-xl border border-[#D4AF37]/40 px-4 py-3 text-sm text-gold disabled:opacity-50">
            <i className="fa-solid fa-location-crosshairs mr-2"></i>{loadingGps ? 'Localisation…' : 'Ma position'}
          </button>
        </form>
        {searchError && <p className="text-sm text-orange-300 mt-3" role="status">{searchError}</p>}
        {places.length > 0 && (
          <div className="mt-4 space-y-2" aria-label="Résultats de recherche">
            <p className="text-xs text-body-secondary">Choisissez le résultat correspondant à votre zone :</p>
            {places.map((place) => {
              const details = addressDetails(place.address);
              return (
                <button key={place.place_id} type="button" onClick={() => choosePlace(place)} className="w-full text-left rounded-xl border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 p-3 flex items-start gap-3 transition-colors">
                  <i className="fa-solid fa-location-dot text-[#D4AF37] mt-1"></i>
                  <span className="min-w-0">
                    <span className="block text-sm text-body">{details.flagEmoji ? details.flagEmoji + ' ' : ''}{place.display_name}</span>
                    <span className="block text-[11px] text-body-secondary mt-1">
                      {[details.commune, details.department, details.country].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-body-secondary mt-3">
          Géocodage OpenStreetMap / Nominatim. Les détails de rue ne sont affichés que si la base cartographique les connaît.
        </p>
      </section>

      {loadingGps && !location && (
        <div className="glass-panel rounded-2xl p-4 mb-5 text-sm text-body-secondary">
          <i className="fa-solid fa-satellite-dish mr-2 text-[#D4AF37]"></i>
          Détection de la position actuelle… La recherche manuelle reste disponible.
        </div>
      )}
      {loadingWeather && (
        <div className="glass-panel rounded-2xl p-6 mb-5 text-center" role="status" aria-live="polite">
          <i className="fa-solid fa-spinner fa-spin text-2xl text-[#D4AF37]"></i>
          <p className="text-sm text-body mt-3">Chargement de la météo et calcul des risques agricoles pour les coordonnées sélectionnées…</p>
        </div>
      )}
      {error && (
        <div className="glass-panel neon-border-amber rounded-2xl p-5 mb-5">
          <p className="text-sm text-body">{error}</p>
          <p className="text-xs text-body-secondary mt-2">Vérifiez votre connexion ou choisissez un autre lieu dans les résultats de recherche.</p>
        </div>
      )}

      {weather && location && (
        <>
          <section className="glass-panel hud-corner neon-border-cyan rounded-2xl p-5 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-gold mb-1"><i className="fa-solid fa-location-crosshairs mr-2"></i>ZONE GÉOGRAPHIQUE ANALYSÉE</p>
                <h2 className="text-xl font-bold text-body mb-2">
                  <span className="text-2xl mr-2">{location.flagEmoji || '🌐'}</span>
                  {location.commune || location.region || 'Lieu sélectionné'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <p className="text-body-secondary"><span className="text-gold">Département :</span> {location.department || 'Non renseigné par la carte'}</p>
                  <p className="text-body-secondary"><span className="text-gold">Commune / ville :</span> {location.commune || 'Non renseignée par la carte'}</p>
                  <p className="text-body-secondary"><span className="text-gold">Rue / adresse :</span> {location.street || 'Non disponible à ce niveau de précision'}</p>
                  <p className="text-body-secondary"><span className="text-gold">Pays :</span> {location.country || 'Non identifié'} {location.flagEmoji || ''}</p>
                </div>
                <p className="text-[11px] text-body-secondary mt-3 break-words">{location.address}</p>
                <p className="text-[11px] text-body-secondary mt-1">
                  Coordonnées : {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                  {' · '}
                  {location.source === 'ip'
                    ? 'Position approximative par réseau'
                    : location.source === 'gps'
                      ? `GPS · précision ±${Math.round(location.accuracy)} m`
                      : 'Coordonnées du lieu choisi'}
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="text-5xl">{weather.icon}</p>
                <p className="text-4xl font-bold mt-2 text-gold">{weather.temperature}°C</p>
                <p className="text-xs text-body-secondary">{weather.description}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-body"><i className="fa-solid fa-map icon-gold mr-2"></i>CARTE DE LA ZONE</h3>
                <p className="text-xs text-body-secondary mt-1">Visualisez le point sélectionné sur une carte publique.</p>
              </div>
              <div className="flex gap-2" role="group" aria-label="Type de carte">
                <button type="button" onClick={() => setMapLayer('plan')} aria-pressed={mapLayer === 'plan'} className={`rounded-lg px-3 py-2 text-xs font-semibold border ${mapLayer === 'plan' ? 'border-[#D4AF37] text-gold bg-[#D4AF37]/10' : 'border-cyber-border text-body-secondary'}`}>
                  <i className="fa-solid fa-map mr-1"></i>Plan
                </button>
                <button type="button" onClick={() => setMapLayer('satellite')} aria-pressed={mapLayer === 'satellite'} className={`rounded-lg px-3 py-2 text-xs font-semibold border ${mapLayer === 'satellite' ? 'border-[#D4AF37] text-gold bg-[#D4AF37]/10' : 'border-cyber-border text-body-secondary'}`}>
                  <i className="fa-solid fa-satellite mr-1"></i>Satellite
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[#D4AF37]/20 bg-black/20">
              <iframe
                key={`${mapLayer}-${location.latitude}-${location.longitude}`}
                title={mapLayer === 'satellite' ? 'Vue satellite de la zone sélectionnée' : 'Carte de la zone sélectionnée'}
                src={mapUrl(mapLayer, location.latitude, location.longitude)}
                className="w-full h-[320px] sm:h-[420px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <p className="text-[10px] text-body-secondary mt-2">
              {mapLayer === 'satellite' ? 'Imagerie satellite Google Maps.' : 'Carte OpenStreetMap · © contributeurs OpenStreetMap.'}
              {' '}La précision de l’adresse dépend des données cartographiques disponibles.
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex mt-3 text-xs text-gold hover:underline"
            >
              Ouvrir cette position dans Google Maps <i className="fa-solid fa-arrow-up-right-from-square ml-2"></i>
            </a>
          </section>

          <div className={isDesktop ? 'grid grid-cols-3 gap-6' : 'space-y-4'}>
            <div className={isDesktop ? 'col-span-2 space-y-6' : 'space-y-4'}>
              <section className="glass-panel rounded-2xl p-5 sm:p-6">
                <h3 className="text-lg font-bold text-body mb-4"><i className="fa-solid fa-cloud-sun icon-gold mr-2"></i>CONDITIONS MÉTÉOROLOGIQUES ACTUELLES</h3>
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
              </section>
              <section className="glass-panel rounded-2xl p-5 sm:p-6">
                <h3 className="text-lg font-bold text-body mb-4"><i className="fa-solid fa-calendar-days icon-gold mr-2"></i>PRÉVISIONS MÉTÉO — 7 JOURS</h3>
                <div className="space-y-3">
                  {weather.forecast.map((day) => (
                    <div key={day.date} className="glass-panel rounded-xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl">{day.icon}</span>
                        <div className="min-w-0"><p className="text-sm font-medium text-body">{day.dayName}</p><p className="text-xs text-body-secondary">{day.condition}</p></div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right"><p className="text-sm font-bold text-gold">{day.tempMax}°</p><p className="text-xs text-body-secondary">{day.tempMin}°</p></div>
                        <span className="text-xs text-gold"><i className="fa-solid fa-cloud-rain mr-1"></i>{day.precipitation.toFixed(1)} mm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {analysis && (
              <section className="glass-panel rounded-2xl p-5 sm:p-6">
                <h3 className="text-lg font-bold text-body mb-2"><i className="fa-solid fa-seedling icon-gold mr-2"></i>RISQUES AGRICOLES</h3>
                <p className="text-[11px] text-body-secondary mb-4">Évaluation indicative basée sur la météo locale actuelle et les précipitations prévues sur 72 heures. Ce n’est pas un diagnostic phytosanitaire.</p>
                <div className={`glass-panel rounded-xl p-4 mb-4 ${analysis.level === 'eleve' ? 'neon-border-amber' : analysis.level === 'modere' ? 'neon-border-cyan' : 'neon-border-green'}`}>
                  <p className="text-xs font-bold text-gold">NIVEAU DE RISQUE : {analysis.level.toUpperCase()}</p>
                  <p className="text-3xl font-bold text-body mt-1">{analysis.score}<span className="text-sm text-body-secondary"> / 100</span></p>
                  <div className="h-2 rounded-full bg-white/10 mt-3 overflow-hidden"><div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${analysis.score}%` }} /></div>
                  <p className="text-[10px] text-body-secondary mt-2">Pluie prévue sur 72 h : {rainfall72h.toFixed(1)} mm</p>
                </div>
                {analysis.factors.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gold mb-2">FACTEURS DE RISQUE</p>
                    <ul className="space-y-2">{analysis.factors.map((factor, index) => <li key={index} className="text-xs text-body flex gap-2"><span className="text-gold">•</span>{factor}</li>)}</ul>
                  </div>
                ) : <p className="text-xs text-body-secondary mb-4">Aucun facteur météorologique aggravant détecté selon les seuils utilisés.</p>}
                <div>
                  <p className="text-xs font-bold text-gold mb-2">RECOMMANDATIONS</p>
                  <ul className="space-y-2">{analysis.recommendations.map((item, index) => <li key={index} className="text-xs text-body flex gap-2"><span className="text-gold">✓</span>{item}</li>)}</ul>
                </div>
                <p className="text-[10px] text-body-secondary mt-4">Horizon d’analyse : {analysis.horizon}.</p>
              </section>
            )}
          </div>
        </>
      )}

      {!weather && !loadingWeather && !loadingGps && !error && (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <i className="fa-solid fa-map-location-dot text-3xl text-[#D4AF37]"></i>
          <p className="text-body font-semibold mt-3">Choisissez un lieu à analyser</p>
          <p className="text-sm text-body-secondary mt-1">La météo, les risques agricoles et la carte de cette position s’afficheront ici.</p>
        </div>
      )}
    </div>
  );
}
