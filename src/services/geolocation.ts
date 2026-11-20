export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  region?: string;
  country?: string;
  timestamp: number;
  source?: 'gps' | 'ip';
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
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

interface IpLocationResponse {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  accuracy?: number;
}

function isValidCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation du navigateur n'est pas disponible."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      const messages: Record<number, string> = {
        1: "L'accès à la position précise n'a pas été autorisé.",
        2: 'La position GPS est momentanément indisponible.',
        3: 'Le GPS met trop de temps à répondre.',
      };
      reject(new Error(messages[error.code] || "Impossible d'obtenir la position GPS."));
    }, {
      enableHighAccuracy: false,
      timeout: 12000,
      maximumAge: 300000,
    });
  });
}

async function getIpBasedPosition(): Promise<LocationData> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  let response: Response;
  try {
    response = await fetch('/api/location', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(response.status === 503
      ? "La localisation approximative par réseau n'est pas disponible."
      : 'Le service de localisation est momentanément indisponible.');
  }

  const data = await response.json() as IpLocationResponse;
  if (!isValidCoordinates(data.latitude, data.longitude)) {
    throw new Error('Le service de localisation a renvoyé des coordonnées invalides.');
  }

  const location: LocationData = {
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy || 25000,
    region: data.city || data.region || undefined,
    country: data.country,
    timestamp: Date.now(),
    source: 'ip',
  };

  try {
    const addressData = await reverseGeocode(location.latitude, location.longitude);
    location.address = addressData.address;
    location.region = addressData.region || location.region;
    location.country = addressData.country || location.country;
  } catch (error) {
    console.warn('IP location reverse geocoding failed:', error);
    location.address = [location.region, location.country].filter(Boolean).join(', ');
  }

  return location;
}

/**
 * Obtient d'abord la position du navigateur. Si le GPS est refusé, indisponible
 * ou trop lent, utilise automatiquement la géolocalisation IP de Vercel.
 */
export async function getCurrentPosition(): Promise<LocationData> {
  let gpsError: Error | null = null;

  try {
    const position = await getBrowserPosition();
    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      source: 'gps',
    };

    try {
      const addressData = await reverseGeocode(location.latitude, location.longitude);
      location.address = addressData.address;
      location.region = addressData.region;
      location.country = addressData.country;
    } catch (error) {
      console.warn('GPS reverse geocoding failed:', error);
    }

    return location;
  } catch (error) {
    gpsError = error instanceof Error ? error : new Error('Position GPS indisponible.');
  }

  try {
    return await getIpBasedPosition();
  } catch (fallbackError) {
    console.warn('Automatic IP geolocation fallback failed:', fallbackError);
    throw new Error(
      `GPS : ${gpsError.message} La localisation réseau de secours a également échoué. Vérifiez la connexion ou réessayez.`
    );
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<{
  address: string;
  region: string;
  country: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  let response: Response;
  try {
    response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=fr`,
      { signal: controller.signal, headers: { Accept: 'application/json' } }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) throw new Error('Reverse geocoding failed');

  const data = await response.json();
  const address = data.address || {};

  let country = address.country;
  if (!country && data.display_name) {
    const parts = data.display_name.split(',').map((part: string) => part.trim());
    country = parts[parts.length - 1] || 'Localisation';
  }
  if (!country) country = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

  let region = address.state || address.county || address.city || address.town || address.village;
  if (!region && data.display_name) {
    const parts = data.display_name.split(',').map((part: string) => part.trim());
    region = parts[1] || parts[2] || country;
  }
  if (!region) region = country;

  return {
    address: data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
    region,
    country,
  };
}

export async function getWeatherData(lat: number, lon: number): Promise<WeatherData> {
  if (!isValidCoordinates(lat, lon)) {
    throw new Error('Coordonnées géographiques invalides.');
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=7`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error(response.status === 429 ? 'Le service météo est temporairement saturé.' : 'Le service météo a refusé la requête.');

    const data = await response.json();
    const current = data?.current;
    const daily = data?.daily;
    if (!current || !daily || !Array.isArray(daily.time) || !Array.isArray(daily.weather_code)) {
      throw new Error('Les données météo reçues sont incomplètes.');
    }

    const weatherCode = current.weather_code;
    const { condition, description, icon } = mapWeatherCode(weatherCode);
    const humidity = current.relative_humidity_2m;
    let riskLevel: 'faible' | 'modere' | 'eleve' = 'faible';
    if (humidity > 80) riskLevel = 'eleve';
    else if (humidity > 60) riskLevel = 'modere';

    const forecast: ForecastDay[] = daily.time.map((date: string, index: number) => {
      const dayDate = new Date(date);
      const dayName = dayDate.toLocaleDateString('fr-FR', { weekday: 'long' });
      const forecastWeather = mapWeatherCode(daily.weather_code[index]);
      return {
        date,
        dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
        tempMax: Math.round(daily.temperature_2m_max[index]),
        tempMin: Math.round(daily.temperature_2m_min[index]),
        humidity: 70,
        condition: forecastWeather.description,
        icon: forecastWeather.icon,
        precipitation: daily.precipitation_sum[index] || 0,
      };
    });

    return {
      temperature: Math.round(current.temperature_2m),
      humidity,
      windSpeed: Math.round(current.wind_speed_10m),
      description,
      icon,
      condition,
      riskLevel,
      forecast,
    };
  } catch (error) {
    console.error('Weather API error:', error);
    throw new Error(error instanceof Error && error.message.includes('trop') ? error.message : 'Impossible de récupérer les données météo. Vérifiez la connexion et réessayez.');
  }
}

function mapWeatherCode(code: number): {
  condition: string;
  description: string;
  icon: string;
} {
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
    riskFactors.push('Humidité très élevée (>80%) - Risque de maladies fongiques');
    recommendations.push('Surveillez les signes de mildiou et rouille');
    recommendations.push("Évitez l'arrosage en soirée");
  } else if (weather.humidity > 60) {
    riskFactors.push('Humidité modérée (60-80%) - Conditions favorables aux champignons');
    recommendations.push('Inspectez régulièrement vos cultures');
  } else if (weather.humidity < 40) {
    riskFactors.push('Air sec (<40%) - Stress hydrique possible');
    recommendations.push("Augmentez l'irrigation");
    recommendations.push('Paillez le sol pour conserver l’humidité');
  }

  if (weather.temperature > 30) {
    riskFactors.push('Température élevée (>30°C) - Stress thermique');
    recommendations.push('Arrosez tôt le matin ou en soirée');
  } else if (weather.temperature < 10) {
    riskFactors.push('Température basse (<10°C) - Risque de gel');
    recommendations.push('Protégez les cultures sensibles');
  }

  let overallRisk: 'faible' | 'modere' | 'eleve' = 'faible';
  if (riskFactors.length >= 3) overallRisk = 'eleve';
  else if (riskFactors.length >= 1) overallRisk = 'modere';

  return { riskFactors, recommendations, overallRisk };
}
