import { Screen } from '../App';

interface BottomNavProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems: { id: Screen; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'fa-house', label: 'Accueil' },
  { id: 'location', icon: 'fa-map-location-dot', label: 'Lieu' },
  { id: 'research', icon: 'fa-flask', label: 'Recherche' },
  { id: 'assistant', icon: 'fa-comments', label: 'IA' },
  { id: 'scanner', icon: 'fa-camera', label: 'Scanner' },
  { id: 'settings', icon: 'fa-gear', label: 'Réglages' },
];

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass-panel border-t border-cyber-border z-40">
      <div className="flex justify-center items-center py-2 border-b border-cyber-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#D4AF37] shadow-sm shadow-[#D4AF37]/20">
            <img src="/favicon.svg" alt="AtisouShield" className="w-full h-full object-cover" />
          </div>
          <span className="text-xs font-bold gradient-text">ATISOUSHIELD</span>
        </div>
      </div>
      
      <div className="flex justify-around items-center py-2 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 ${
              active === item.id ? 'glass-panel neon-border-cyan text-gold text-glow-cyan scale-105' : 'text-body-secondary hover:text-gold'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg icon-gold`}></i>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
