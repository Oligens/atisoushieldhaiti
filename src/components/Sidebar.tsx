import { Screen } from '../App';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  active: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems: { id: Screen; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'fa-house', label: 'Tableau de bord' },
  { id: 'location', icon: 'fa-map-location-dot', label: 'Analyse de lieu' },
  { id: 'assistant', icon: 'fa-comments', label: 'Assistant IA' },
  { id: 'scanner', icon: 'fa-camera', label: 'Scanner' },
  { id: 'safety', icon: 'fa-shield-halved', label: 'Guide biopesticides' },
  { id: 'settings', icon: 'fa-gear', label: 'Paramètres' },
];

export default function Sidebar({ active, onNavigate }: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 glass-panel border-r border-cyber-border flex flex-col z-30">
      <div className="p-6 border-b border-cyber-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 animate-glow-pulse">
            <img src="/favicon.svg" alt="AtisouShield Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold gradient-text">ATISOUSHIELD</h1>
            <p className="text-[11px] text-gold text-glow-cyan">HAÏTI • CYBER-AGRO</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
              active === item.id ? 'glass-panel neon-border-cyan text-gold text-glow-cyan' : 'text-body-secondary hover:glass-panel-hover hover:text-gold'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-base w-5 text-center icon-gold`}></i>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-cyber-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 glass-panel neon-border-green rounded-full flex items-center justify-center text-lg">👨‍🌾</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-body">{user?.nom || 'Utilisateur'}</p>
            <p className="text-[11px] text-gold text-glow-cyan">{user?.region || 'Haïti'}</p>
          </div>
          <button onClick={() => onNavigate('settings')} className="text-body-secondary hover:text-gold transition-colors">
            <i className="fa-solid fa-gear text-sm icon-gold"></i>
          </button>
        </div>
      </div>

      <div className="px-6 pb-4">
        <p className="text-[10px] text-body-secondary text-center"><span className="text-gold text-glow-cyan">v2.0</span> • Agriculture Intelligente</p>
      </div>
    </aside>
  );
}
