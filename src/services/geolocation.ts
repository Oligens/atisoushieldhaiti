export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  region?: string;
  country?: string;
  timestamp: number;
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

export async function getCurrentPosition(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n\'est pas supportée'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

        try {
          const addressData = await reverseGeocode(locationData.latitude, locationData.longitude);
          locationData.address = addressData.address;
          locationData.region = addressData.region;
          locationData.country = addressData.country;
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
        }

        resolve(locationData);
      },
      (error) => {
        let message = 'Impossible d\'obtenir votre position';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Vous avez refusé l\'accès à votre position';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Position indisponible';
            break;
          case error.TIMEOUT:
            message = 'Délai d\'attente dépassé';
            break;
        }
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<{
  address: string;
  region: string;
  country: string;
}> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=fr`
  );
  
  if (!response.ok) throw new Error('Reverse geocoding failed');

  const data = await response.json();
  const address = data.address || {};

  let country = address.country;
  if (!country && data.display_name) {
    const parts = data.display_name.split(',').map((p: string) => p.trim());
    country = parts[parts.length - 1] || 'Localisation';
  }
  if (!country) country = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

  let region = address.state || address.county || address.city || address.town || address.village;
  if (!region && data.display_name) {
    const parts = data.display_name.split(',').map((p: string) => p.trim());
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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&timezone=auto&forecast_days=7`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');

    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

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
    throw new Error('Impossible de récupérer les données météo');
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
    recommendations.push('Évitez l\'arrosage en soirée');
  } else if (weather.humidity > 60) {
    riskFactors.push('Humidité modérée (60-80%) - Conditions favorables aux champignons');
    recommendations.push('Inspectez régulièrement vos cultures');
  } else if (weather.humidity < 40) {
    riskFactors.push('Air sec (<40%) - Stress hydrique possible');
    recommendations.push('Augmentez l\'irrigation');
    recommendations.push('Paillez le sol pour conserver l\'humidité');
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
