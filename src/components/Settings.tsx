import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getCurrentPosition, LocationData } from '../services/geolocation';

interface SettingsProps {
  isDesktop: boolean;
}

export default function Settings({ isDesktop }: SettingsProps) {
  const { user, updateUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => { fetchLocation(); }, []);

  const fetchLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    try {
      const pos = await getCurrentPosition();
      setLocation(pos);
      if (pos.region && !user?.region) updateUser({ region: pos.region });
    } catch (error: any) {
      setLocationError(error.message);
    }
    setIsLoadingLocation(false);
  };

  const handleLogout = () => {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) logout();
  };

  return (
    <div className={isDesktop ? 'p-8 animate-fade-in' : 'pt-14 pb-20 min-h-screen px-4 animate-fade-in'}>
      <div className="mb-6">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} glass-panel neon-border-cyan rounded-full flex items-center justify-center animate-glow-pulse`}>
            <i className="fa-solid fa-gear icon-gold"></i>
          </span>
          PARAMÈTRES
        </h1>
        <p className={`text-sm text-body-secondary mt-2 flex items-center gap-2`}>
          <i className="fa-solid fa-sliders icon-gold"></i>Gérez votre profil et vos préférences
        </p>
      </div>

      {/* Theme Toggle */}
      <div className="glass-panel rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
          <i className={`fa-solid ${isDark ? 'fa-moon' : 'fa-sun'} icon-gold`}></i>
          <span className="gradient-text">APPARENCE</span>
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-body">Mode {isDark ? 'Sombre' : 'Clair'}</p>
            <p className="text-xs text-body-secondary mt-1">{isDark ? 'Interface cyber-agro avec effets néon' : 'Interface claire et épurée'}</p>
          </div>
          <button onClick={toggleTheme} className={`relative w-16 h-8 rounded-full transition-all duration-300 ${isDark ? 'bg-cyber-bg-deep border border-neon-cyan/30' : 'bg-green-pale border-2 border-green-primary'}`}>
            <div className={`absolute top-1 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center ${isDark ? 'left-9 bg-neon-cyan shadow-lg shadow-neon-cyan/50' : 'left-1 bg-green-primary shadow-lg shadow-green-primary/50'}`}>
              <i className={`fa-solid ${isDark ? 'fa-moon text-xs text-cyber-bg-deep' : 'fa-sun text-xs text-white'}`}></i>
            </div>
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="glass-panel rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
          <i className="fa-solid fa-user icon-gold"></i>
          <span className="gradient-text">PROFIL UTILISATEUR</span>
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-cyber-border">
            <span className="text-sm text-body-secondary">Nom</span>
            <span className="text-sm font-medium text-body">{user?.nom}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-cyber-border">
            <span className="text-sm text-body-secondary">Email</span>
            <span className="text-sm font-medium text-body">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-cyber-border">
            <span className="text-sm text-body-secondary">Région</span>
            <span className="text-sm font-medium text-body">{user?.region || 'Non définie'}</span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="glass-panel rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
          <i className="fa-solid fa-location-dot icon-gold"></i>
          <span className="gradient-text">GÉOLOCALISATION</span>
        </h2>
        {isLoadingLocation ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-neon-cyan mt-4 text-glow-cyan">Obtention de votre position...</p>
          </div>
        ) : locationError ? (
          <div className="glass-panel neon-border-amber rounded-xl p-4">
            <p className="text-sm text-neon-amber text-glow-amber mb-2"><i className="fa-solid fa-triangle-exclamation mr-2"></i>Erreur</p>
            <p className="text-xs text-body mb-3">{locationError}</p>
            <button onClick={fetchLocation} className="cyber-button-alert rounded-lg px-4 py-2 text-sm font-medium">Réessayer</button>
          </div>
        ) : location ? (
          <div className="space-y-3">
            <div className="glass-panel neon-border-cyan rounded-xl p-4">
              <p className="text-xs text-gold mb-1">Position actuelle</p>
              <p className="text-sm text-body font-medium">{location.address || 'Adresse non disponible'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs text-body-secondary">Latitude</p>
                <p className="text-sm font-medium text-body">{location.latitude.toFixed(4)}°</p>
              </div>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs text-body-secondary">Longitude</p>
                <p className="text-sm font-medium text-body">{location.longitude.toFixed(4)}°</p>
              </div>
            </div>
            <button onClick={fetchLocation} className="cyber-button rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2 w-full">
              <i className="fa-solid fa-rotate-right"></i>Actualiser la position
            </button>
          </div>
        ) : (
          <button onClick={fetchLocation} className="cyber-button rounded-lg py-3 font-medium w-full">Activer la géolocalisation</button>
        )}
      </div>

      {/* Logout */}
      <div className="glass-panel neon-border-amber rounded-2xl p-6">
        <h2 className="text-lg font-bold text-body mb-4 flex items-center gap-2">
          <i className="fa-solid fa-right-from-bracket icon-gold"></i>
          <span className="gradient-text">SESSION</span>
        </h2>
        <p className="text-sm text-body-secondary mb-4">Connecté : <strong className="text-body">{user?.email}</strong></p>
        <button onClick={handleLogout} className="w-full cyber-button-alert rounded-lg py-3 font-medium">Se déconnecter</button>
      </div>
    </div>
  );
}
