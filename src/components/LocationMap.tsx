import { useState } from 'react';

interface LocationMapProps {
  latitude: number;
  longitude: number;
  title?: string;
}

export function countryFlagEmoji(countryCode?: string) {
  if (!countryCode || !/^[a-z]{2}$/i.test(countryCode)) return '🌍';
  return countryCode.toUpperCase().replace(/[A-Z]/g, (letter) =>
    String.fromCodePoint(letter.charCodeAt(0) + 127397)
  );
}

export default function LocationMap({ latitude, longitude, title = 'Carte de la zone' }: LocationMapProps) {
  const [layer, setLayer] = useState<'m' | 'k'>('k');
  const valid = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapUrl = valid
    ? `https://www.google.com/maps?q=${latitude},${longitude}&t=${layer}&z=15&output=embed`
    : '';

  if (!valid) return null;

  return (
    <section className="glass-panel rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-bold text-body"><i className="fa-solid fa-map-location-dot icon-gold mr-2"></i>{title}</h3>
        <div className="flex gap-2" role="group" aria-label="Type de carte">
          <button type="button" onClick={() => setLayer('m')} aria-pressed={layer === 'm'} className={`rounded-lg px-3 py-2 text-xs border ${layer === 'm' ? 'border-[#D4AF37] text-gold' : 'border-cyber-border text-body-secondary'}`}>Plan</button>
          <button type="button" onClick={() => setLayer('k')} aria-pressed={layer === 'k'} className={`rounded-lg px-3 py-2 text-xs border ${layer === 'k' ? 'border-[#D4AF37] text-gold' : 'border-cyber-border text-body-secondary'}`}>Satellite</button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-cyber-border">
        <iframe
          title={title}
          src={mapUrl}
          className="w-full h-64 sm:h-80"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <p className="text-[10px] text-body-secondary mt-2">Carte en ligne • Coordonnées : {latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
    </section>
  );
}
