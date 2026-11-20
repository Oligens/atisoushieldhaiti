export interface LocationData {
  latitude: number; longitude: number; accuracy: number; address?: string; region?: string;
  department?: string; commune?: string; street?: string; country?: string; countryCode?: string;
  flagEmoji?: string; timestamp: number; source?: 'gps' | 'ip' | 'manual';
}
export interface WeatherData { temperature: number; humidity: number; windSpeed: number; description: string; icon: string; condition: string; riskLevel: 'faible' | 'modere' | 'eleve'; forecast: ForecastDay[]; }
export interface ForecastDay { date: string; dayName: string; tempMax: number; tempMin: number; humidity: number; condition: string; icon: string; precipitation: number; }
interface ReverseGeocodeResult { address: string; region?: string; department?: string; commune?: string; street?: string; country?: string; countryCode?: string; flagEmoji?: string; }
interface IpLocationResponse { latitude: number; longitude: number; city?: string; region?: string; country?: string; accuracy?: number; }
function validCoordinates(lat: number, lon: number): boolean { return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180; }
function flagFromCountryCode(code?: string): string | undefined { if (!code || !/^[a-z]{2}$/i.test(code)) return undefined; return String.fromCodePoint(...code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0))); }
function browserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("La géolocalisation du navigateur n'est pas disponible.")); return; }
    navigator.geolocation.getCurrentPosition(resolve, error => {
      const messages: Record<number, string> = { 1: "L'accès à la position précise a été refusé.", 2: 'La position GPS est momentanément indisponible.', 3: 'Le GPS met trop de temps à répondre.' };
      reject(new Error(messages[error.code] || "Impossible d'obtenir la position GPS."));
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  });
}
async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 7000);
  let response: Response;
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2'); url.searchParams.set('lat', String(lat)); url.searchParams.set('lon', String(lon));
    url.searchParams.set('addressdetails', '1'); url.searchParams.set('zoom', '18'); url.searchParams.set('accept-language', 'fr');
    response = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json' } });
  } finally { window.clearTimeout(timeout); }
  if (!response.ok) throw new Error('Le service de géocodage ne répond pas.');
  const data = await response.json(); const a = data?.address || {};
  const countryCode = typeof a.country_code === 'string' ? a.country_code.toUpperCase() : undefined;
  const department = a.state || a.province || a.region || a.county;
  const commune = a.city || a.town || a.village || a.municipality || a.city_district || a.county;
  const street = [a.house_number, a.road || a.pedestrian || a.residential || a.footway].filter(Boolean).join(' ');
  return { address: data.display_name || [street, commune, department, a.country].filter(Boolean).join(', '), region: commune || department || a.country, department, commune, street: street || a.neighbourhood || a.suburb, country: a.country, countryCode, flagEmoji: flagFromCountryCode(countryCode) };
}
async function getIpPosition(): Promise<LocationData> {
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 7000); let response: Response;
  try { response = await fetch('/api/location', { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal }); }
  finally { window.clearTimeout(timeout); }
  if (!response.ok) throw new Error("La localisation approximative par réseau n'est pas disponible.");
  const data = await response.json() as IpLocationResponse;
  if (!validCoordinates(data.latitude, data.longitude)) throw new Error('Coordonnées réseau invalides.');
  const location: LocationData = { latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy || 25000, region: data.city || data.region, country: data.country, countryCode: data.country, flagEmoji: flagFromCountryCode(data.country), timestamp: Date.now(), source: 'ip' };
  try { Object.assign(location, await reverseGeocode(location.latitude, location.longitude)); }
  catch (error) { console.warn('Géocodage de la position réseau indisponible :', error); location.address = [location.region, location.country].filter(Boolean).join(', '); }
  return location;
}
/** GPS navigateur d'abord, puis localisation réseau Vercel si le GPS échoue. */
export async function getCurrentPosition(): Promise<LocationData> {
  let gpsError: Error;
  try {
    const position = await browserPosition();
    const location: LocationData = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp, source: 'gps' };
    try { Object.assign(location, await reverseGeocode(location.latitude, location.longitude)); }
    catch (error) { console.warn('Adresse GPS indisponible :', error); }
    return location;
  } catch (error) { gpsError = error instanceof Error ? error : new Error('Position GPS indisponible.'); }
  try { return await getIpPosition(); }
  catch (error) { console.warn('Échec de la localisation de secours :', error); throw new Error('GPS : ' + gpsError.message + ' La localisation réseau de secours a échoué. Vérifiez les autorisations et la connexion, ou recherchez votre commune manuellement.'); }
}
export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
  if (!validCoordinates(lat, lon)) throw new Error('Coordonnées géographiques invalides.');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m', daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,relative_humidity_2m_mean', timezone: 'auto', forecast_days: '7' }).toString();
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(response.status === 429 ? 'Le service météo est temporairement saturé.' : 'Le service météo a refusé la requête.');
    const data = await response.json(); const current = data?.current; const daily = data?.daily;
    if (!current || !daily || !Array.isArray(daily.time) || !Array.isArray(daily.weather_code)) throw new Error('Les données météo reçues sont incomplètes.');
    const mapped = mapWeatherCode(current.weather_code); const humidity = Number(current.relative_humidity_2m);
    const forecast: ForecastDay[] = daily.time.map((date: string, index: number) => {
      const name = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' }); const mappedDay = mapWeatherCode(daily.weather_code[index]);
      return { date, dayName: name.charAt(0).toUpperCase() + name.slice(1), tempMax: Math.round(daily.temperature_2m_max[index]), tempMin: Math.round(daily.temperature_2m_min[index]), humidity: Math.round(daily.relative_humidity_2m_mean?.[index] ?? humidity), condition: mappedDay.description, icon: mappedDay.icon, precipitation: Number(daily.precipitation_sum?.[index] ?? 0) };
    });
    const riskLevel: 'faible' | 'modere' | 'eleve' = humidity > 80 ? 'eleve' : humidity > 60 ? 'modere' : 'faible';
    return { temperature: Math.round(Number(current.temperature_2m)), humidity, windSpeed: Math.round(Number(current.wind_speed_10m)), description: mapped.description, icon: mapped.icon, condition: mapped.condition, riskLevel, forecast };
  } catch (error) {
    console.error('Weather API error:', error);
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Le service météo a dépassé le délai autorisé. Réessayez.');
    throw error instanceof Error ? error : new Error('Impossible de récupérer les données météo.');
  } finally { window.clearTimeout(timeout); }
}
function mapWeatherCode(code: number): { condition: string; description: string; icon: string } {
  if (code === 0) return { condition: 'ensoleille', description: 'Ciel dégagé', icon: '☀️' };
  if (code <= 3) return { condition: 'nuageux', description: 'Partiellement nuageux', icon: '⛅' };
  if (code <= 48) return { condition: 'brumeux', description: 'Brouillard', icon: '🌫️' };
  if (code <= 67) return { condition: 'pluvieux', description: 'Pluie', icon: '🌧️' };
  if (code <= 77) return { condition: 'neigeux', description: 'Neige', icon: '🌨️' };
  if (code <= 82) return { condition: 'pluvieux', description: 'Averses', icon: '🌦️' };
  if (code <= 86) return { condition: 'neigeux', description: 'Averses de neige', icon: '🌨️' };
  if (code <= 99) return { condition: 'orageux', description: 'Orage', icon: '⛈️' };
  return { condition: 'nuageux', description: 'Inconnu', icon: '🌤️' };
}
export function analyzeAgriculturalConditions(weather: WeatherData): { riskFactors: string[]; recommendations: string[]; overallRisk: 'faible' | 'modere' | 'eleve' } {
  const riskFactors: string[] = []; const recommendations: string[] = [];
  if (weather.humidity > 80) { riskFactors.push('Humidité très élevée (>80%) : risque accru de maladies fongiques.'); recommendations.push('Surveiller le mildiou, les taches foliaires et la rouille.', "Éviter l'arrosage du feuillage en soirée."); }
  else if (weather.humidity > 60) { riskFactors.push('Humidité élevée : conditions favorables à certaines maladies fongiques.'); recommendations.push('Inspecter régulièrement les feuilles et améliorer l’aération des cultures.'); }
  else if (weather.humidity < 40) { riskFactors.push('Air sec : stress hydrique possible.'); recommendations.push('Contrôler l’humidité du sol, irriguer aux heures fraîches et pailler.'); }
  if (weather.temperature > 32) { riskFactors.push('Forte chaleur : risque de stress thermique et hydrique.'); recommendations.push('Renforcer le suivi de l’irrigation et protéger les jeunes plants.'); }
  else if (weather.temperature < 10) { riskFactors.push('Température basse : risque pour les cultures sensibles.'); recommendations.push('Protéger les cultures sensibles si nécessaire.'); }
  if ((weather.forecast[0]?.precipitation ?? 0) >= 20) { riskFactors.push('Pluie journalière prévue importante : risque de ruissellement et d’érosion.'); recommendations.push('Vérifier le drainage et éviter les interventions dans les parcelles détrempées.'); }
  const overallRisk: 'faible' | 'modere' | 'eleve' = riskFactors.length >= 3 ? 'eleve' : riskFactors.length ? 'modere' : 'faible';
  if (!recommendations.length) recommendations.push('Maintenir la surveillance régulière des cultures et suivre les prévisions.');
  return { riskFactors, recommendations, overallRisk };
}