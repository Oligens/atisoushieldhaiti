import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AIAssistant from './components/AIAssistant';
import PlantScanner from './components/PlantScanner';
import ChemicalSafety from './components/ChemicalSafety';
import LocationAnalysis from './components/LocationAnalysis';
import Settings from './components/Settings';
import ResearchMode from './components/ResearchMode';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

export type Screen = 'dashboard' | 'assistant' | 'scanner' | 'safety' | 'location' | 'research' | 'settings';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => setIsDesktop(window.innerWidth >= 1024);
    checkScreenSize();
    const online = () => setIsOnline(true); const offline = () => setIsOnline(false);
    window.addEventListener('resize', checkScreenSize); window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { window.removeEventListener('resize', checkScreenSize); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  if (!isAuthenticated) return <Login />;

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <Dashboard onNavigate={setActiveScreen} isDesktop={isDesktop} />;
      case 'assistant': return <AIAssistant isDesktop={isDesktop} />;
      case 'scanner': return <PlantScanner isDesktop={isDesktop} />;
      case 'safety': return <ChemicalSafety isDesktop={isDesktop} />;
      case 'location': return <LocationAnalysis isDesktop={isDesktop} />;
      case 'research': return <ResearchMode isDesktop={isDesktop} />;
      case 'settings': return <Settings isDesktop={isDesktop} />;
      default: return <Dashboard onNavigate={setActiveScreen} isDesktop={isDesktop} />;
    }
  };

  if (isDesktop) {
    return (
      <div className="min-h-screen flex relative">
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 cursor-pointer glass-panel ${isOnline ? 'neon-border-green text-neon-green' : 'neon-border-amber text-neon-amber'}`} aria-label="État de la connexion réseau">
          <div className={`status-dot ${isOnline ? 'status-dot-green' : 'status-dot-amber'}`}></div>
          <span className="text-glow-cyan">{isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}</span>
        </div>
        <Sidebar active={activeScreen} onNavigate={setActiveScreen} />
        <main className="flex-1 ml-64 overflow-y-auto">{renderScreen()}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative">
      <div className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 glass-panel ${isOnline ? 'neon-border-green text-neon-green' : 'neon-border-amber text-neon-amber'}`}>
        <div className={`status-dot ${isOnline ? 'status-dot-green' : 'status-dot-amber'}`}></div>
        <span className="text-glow-cyan">{isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}</span>
      </div>
      <main className="flex-1 pb-20 overflow-y-auto scrollbar-hide">{renderScreen()}</main>
      <BottomNav active={activeScreen} onNavigate={setActiveScreen} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
