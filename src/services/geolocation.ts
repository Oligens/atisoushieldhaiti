export type LocationSource = 'gps' | 'ip' | 'search';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  region?: string;
  country?: string;
  department?: string;
  commune?: string;
  street?: string;
  countryCode?: string;
  source?: LocationSource;
  timestamp: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  description: string;
  icon: string;
  condition: string;
  riskLevel: 'faible' | 'modere' | 'eleve';
  forecast: ForecastDay[];
}

export interface ForecastDay {
  date: string;
  dayName: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  condition: string;
  icon: string;
  precipitation: number;
}

type ReverseAddress = {
  address: string;
  region: string;
  country: string;
  department?: string;
  commune?: string;
  street?: string;
  countryCode?: string;
};

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Le service de localisation a dépassé le délai autorisé.');
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export async function getCurrentPosition(): Promise<LocationData> {
  let gpsError: Error | null = null;

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 120000,
        });
      });

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'gps',
        timestamp: position.timestamp,
      };

      try {
        Object.assign(location, await reverseGeocode(location.latitude, location.longitude));
      } catch (error) {
        console.warn('Reverse geocoding unavailable; keeping GPS coordinates:', error);
        location.address = `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
      }
      return location;
    } catch (error) {
      const geolocationError = error as GeolocationPositionError;
      gpsError = typeof error === 'object' && error !== null && 'code' in error
        ? new Error(geolocationError.code === 1
          ? 'Autorisation GPS refusée.'
          : geolocationError.code === 3
            ? 'Le GPS n’a pas répondu à temps.'
            : 'Position GPS indisponible.')
        : error instanceof Error ? error : new Error('Position GPS indisponible.');
      console.warn('GPS unavailable; trying approximate IP geolocation:', gpsError);
    }
  } else {
    gpsError = new Error('La géolocalisation du navigateur n’est pas disponible.');
  }

  try {
    return await getApproximatePositionByIp();
  } catch (ipError) {
    const detail = ipError instanceof Error ? ipError.message : 'Service IP indisponible.';
    throw new Error(`${gpsError.message} La localisation approximative par Internet a également échoué : ${detail}`);
  }
}

async function getApproximatePositionByIp(): Promise<LocationData> {
  const response = await fetchWithTimeout('https://ipwho.is/', 10000);
  if (!response.ok) throw new Error('Le fournisseur de localisation IP ne répond pas.');
  const data = await response.json();
  if (data.success === false || !Number.isFinite(Number(data.latitude)) || !Number.isFinite(Number(data.longitude))) {
    throw new Error('Aucune position approximative n’a pu être déterminée.');
  }

  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  const country = data.country || 'Pays inconnu';
  const region = data.city || data.region || country;
  return {
    latitude,
    longitude,
    accuracy: 15000,
    address: [data.city, data.region, country].filter(Boolean).join(', '),
    region,
    commune: data.city || undefined,
    department: data.region || undefined,
    country,
    countryCode: typeof data.country_code === 'string' ? data.country_code.toLowerCase() : undefined,
    source: 'ip',
    timestamp: Date.now(),
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<ReverseAddress> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'fr');

  const response = await fetchWithTimeout(url.toString(), 8000);
  if (!response.ok) throw new Error('Le service d’adresse OpenStreetMap est indisponible.');
  const data = await response.json();
  const address = data.address || {};
  const country = address.country || 'Pays non déterminé';
  const department = address.state || address.region || address.county;
  const commune = address.city || address.town || address.village || address.municipality || address.county;
  const street = [address.house_number, address.road || address.pedestrian || address.residential].filter(Boolean).join(' ');
  const region = commune || department || country;

  return {
    address: data.display_name || [street, commune, department, country].filter(Boolean).join(', '),
    region,
    country,
    department,
    commune,
    street: street || undefined,
    countryCode: typeof address.country_code === 'string' ? address.country_code.toLowerCase() : undefined,
  };
}

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Coordonnées géographiques invalides.');
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,weather_code');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  try {
    const response = await fetchWithTimeout(url.toString(), 12000);
    if (!response.ok) throw new Error(response.status === 429
      ? 'Le service météo est temporairement saturé.'
      : 'Le service météo a refusé la requête.');

    const data = await response.json();
    const current = data?.current;
    const daily = data?.daily;
    if (!current || !daily || !Array.isArray(daily.time) || !Array.isArray(daily.weather_code)) {
      throw new Error('Les données météo reçues sont incomplètes.');
    }

    const { condition, description, icon } = mapWeatherCode(Number(current.weather_code));
    const humidity = Number(current.relative_humidity_2m);
    const precipitation = Number(current.precipitation || 0);
    let riskLevel: 'faible' | 'modere' | 'eleve' = 'faible';
    if (humidity >= 85 || precipitation >= 20) riskLevel = 'eleve';
    else if (humidity >= 70 || precipitation >= 5) riskLevel = 'modere';

    const forecast: ForecastDay[] = daily.time.map((date: string, index: number) => {
      const dayDate = new Date(`${date}T12:00:00`);
      const dayName = dayDate.toLocaleDateString('fr-FR', { weekday: 'long' });
      const forecastWeather = mapWeatherCode(Number(daily.weather_code[index]));
      return {
        date,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        tempMax: Math.round(Number(daily.temperature_2m_max?.[index] ?? 0)),
        tempMin: Math.round(Number(daily.temperature_2m_min?.[index] ?? 0)),
        humidity: Math.round(Number(daily.relative_humidity_2m_mean?.[index] ?? humidity)),
        condition: forecastWeather.description,
        icon: forecastWeather.icon,
        precipitation: Number(daily.precipitation_sum?.[index] ?? 0),
      };
    });

    return {
      temperature: Math.round(Number(current.temperature_2m)),
      humidity,
      windSpeed: Math.round(Number(current.wind_speed_10m)),
      precipitation,
      description,
      icon,
      condition,
      riskLevel,
      forecast,
    };
  } catch (error) {
    console.error('Weather API error:', error);
    throw new Error(error instanceof Error ? error.message : 'Impossible de récupérer les données météo.');
  }
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

export function analyzeAgriculturalConditions(weather: WeatherData): {
  riskFactors: string[];
  recommendations: string[];
  overallRisk: 'faible' | 'modere' | 'eleve';
} {
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  if (weather.humidity > 80) {
    riskFactors.push('Humidité très élevée (>80%) - Risque accru de maladies fongiques');
    recommendations.push('Surveillez le mildiou, les taches foliaires et la rouille.');
    recommendations.push('Évitez l’arrosage en soirée et aérez les cultures lorsque possible.');
  } else if (weather.humidity >= 70) {
    riskFactors.push('Humidité élevée - Conditions favorables à certaines maladies fongiques');
    recommendations.push('Inspectez régulièrement les feuilles et les tiges.');
  } else if (weather.humidity < 40) {
    riskFactors.push('Air sec - Stress hydrique possible');
    recommendations.push('Contrôlez l’humidité du sol et adaptez l’irrigation.');
  }

  if (weather.temperature > 32) {
    riskFactors.push('Chaleur forte - Risque de stress thermique');
    recommendations.push('Privilégiez l’irrigation tôt le matin et protégez les jeunes plants.');
  } else if (weather.temperature < 10) {
    riskFactors.push('Température basse - Risque pour les cultures sensibles');
    recommendations.push('Protégez les cultures sensibles si nécessaire.');
  }

  if (weather.precipitation >= 20) {
    riskFactors.push('Précipitations importantes - Risque de ruissellement et d’engorgement');
    recommendations.push('Vérifiez le drainage et évitez de travailler un sol détrempé.');
  } else if (weather.precipitation >= 5) {
    riskFactors.push('Pluie récente - Humectation possible du feuillage et du sol');
    recommendations.push('Surveillez les zones basses et l’apparition de symptômes.');
  }

  let overallRisk: 'faible' | 'modere' | 'eleve' = 'faible';
  if (riskFactors.length >= 3) overallRisk = 'eleve';
  else if (riskFactors.length >= 1) overallRisk = 'modere';
  return { riskFactors, recommendations, overallRisk };
}
