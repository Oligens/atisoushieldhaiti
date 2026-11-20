import type { LocationData, WeatherData } from '../services/geolocation';
import { calculateAgriculturalRisk } from '../services/agriculturalRisk';
import LocationMap, { countryFlagEmoji } from './LocationMap';

interface LocationOverviewProps {
  location: LocationData;
  weather: WeatherData;
}

export default function LocationOverview({ location, weather }: LocationOverviewProps) {
  const risk = calculateAgriculturalRisk({
    temperature: weather.temperature,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    rainfallMm: weather.precipitation,
  });
  const riskStyle = risk.level === 'eleve' ? 'neon-border-amber' : risk.level === 'modere' ? 'neon-border-cyan' : 'neon-border-green';

  return (
    <div className="space-y-4 mb-6">
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gold tracking-widest mb-2"><i className="fa-solid fa-location-crosshairs mr-2"></i>LOCALISATION DE RÉFÉRENCE</p>
            <h2 className="text-lg font-bold text-body flex items-center gap-2">
              <span className="text-2xl" aria-label="Drapeau du pays">{countryFlagEmoji(location.countryCode)}</span>
              {location.commune || location.region || 'Zone localisée'}
            </h2>
            <p className="text-sm text-body-secondary mt-1">{location.country || 'Pays non déterminé'}</p>
          </div>
          <span className="rounded-full border border-[#D4AF37]/40 px-3 py-1 text-xs text-gold">
            {location.source === 'gps' ? 'GPS précis' : location.source === 'ip' ? 'Position IP approximative' : 'Lieu recherché'}
          </span>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
          <div><dt className="text-xs text-body-secondary">Département / région</dt><dd className="text-body font-medium">{location.department || location.region || 'Non disponible'}</dd></div>
          <div><dt className="text-xs text-body-secondary">Commune / ville</dt><dd className="text-body font-medium">{location.commune || location.region || 'Non disponible'}</dd></div>
          <div><dt className="text-xs text-body-secondary">Rue / adresse</dt><dd className="text-body font-medium">{location.street || (location.source === 'ip' ? 'Non déterminable par adresse IP' : 'Adresse de rue non fournie par la carte')}</dd></div>
          <div><dt className="text-xs text-body-secondary">Pays</dt><dd className="text-body font-medium">{location.country || 'Non disponible'}</dd></div>
        </dl>
        <p className="text-[11px] text-body-secondary mt-3 break-words">{location.address}</p>
        <p className="text-[10px] text-body-secondary mt-2">
          Coordonnées : {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          {location.accuracy > 0 ? ` • précision estimée ±${Math.round(location.accuracy)} m` : ''}
        </p>
        {location.source === 'ip' && <p className="text-xs text-amber-300 mt-3">La position IP est une estimation de votre zone de connexion. Elle ne permet pas d’identifier votre rue ni votre parcelle agricole.</p>}
      </section>

      <section className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-body"><i className="fa-solid fa-seedling icon-gold mr-2"></i>RISQUES AGRICOLES ESTIMÉS</h3>
            <p className="text-xs text-body-secondary mt-1">Évaluation indicative basée sur la météo actuelle et les précipitations observées</p>
          </div>
          <span className={`rounded-xl border px-3 py-2 text-sm font-bold text-gold ${riskStyle}`}>{risk.level.toUpperCase()} • {risk.score}/100</span>
        </div>
        {risk.factors.length > 0 ? (
          <ul className="space-y-2">{risk.factors.map((factor, index) => <li key={index} className="text-sm text-body flex gap-2"><span className="text-gold">•</span>{factor}</li>)}</ul>
        ) : <p className="text-sm text-body-secondary">Aucun facteur météorologique majeur détecté avec les seuils actuels. La surveillance phytosanitaire reste nécessaire.</p>}
        <div className="mt-4">
          <p className="text-xs font-bold text-gold mb-2">RECOMMANDATIONS (48–72 H)</p>
          <ul className="space-y-2">{risk.recommendations.map((item, index) => <li key={index} className="text-sm text-body flex gap-2"><span className="text-gold">✓</span>{item}</li>)}</ul>
        </div>
        <p className="text-[10px] text-body-secondary mt-3">Cet indicateur ne constitue pas un diagnostic phytosanitaire : le risque réel dépend aussi de la culture, du stade végétatif, du sol et des observations de terrain.</p>
      </section>

      <LocationMap latitude={location.latitude} longitude={location.longitude} title="Carte de votre zone" />
    </div>
  );
}
