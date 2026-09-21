import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ nom: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!formData.nom || !formData.email || !formData.password) throw new Error('Tous les champs sont requis');
        if (formData.password !== formData.confirmPassword) throw new Error('Les mots de passe ne correspondent pas');
        if (formData.password.length < 6) throw new Error('Le mot de passe doit contenir au moins 6 caractères');
        const success = await register(formData.nom, formData.email, formData.password);
        if (!success) throw new Error('Cet email est déjà utilisé');
      } else {
        if (!formData.email || !formData.password) throw new Error('Email et mot de passe requis');
        const success = await login(formData.email, formData.password);
        if (!success) throw new Error('Email ou mot de passe incorrect');
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-green/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="glass-panel hud-corner neon-border-cyan rounded-3xl p-8 w-full max-w-md relative z-10 animate-glow-pulse">
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/30 mx-auto mb-4 animate-glow-pulse">
            <img src="/favicon.svg" alt="AtisouShield Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">ATISOUSHIELD HAÏTI</h1>
          <p className="text-sm text-gold mt-2 text-glow-cyan">SYSTÈME CYBER-AGRO</p>
          <p className="text-xs text-body-secondary mt-1">Sentinelle intelligente des cultures</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-sm font-medium text-body block mb-1">Nom complet</label>
              <input type="text" value={formData.nom} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} className="cyber-input w-full px-4 py-3 rounded-xl" placeholder="Jean-Baptiste" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-body block mb-1">Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="cyber-input w-full px-4 py-3 rounded-xl" placeholder="votre@email.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-body block mb-1">Mot de passe</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="cyber-input w-full px-4 py-3 rounded-xl" placeholder="••••••••" />
          </div>
          {isRegister && (
            <div>
              <label className="text-sm font-medium text-body block mb-1">Confirmer le mot de passe</label>
              <input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="cyber-input w-full px-4 py-3 rounded-xl" placeholder="••••••••" />
            </div>
          )}
          {error && (
            <div className="glass-panel neon-border-amber rounded-xl p-3">
              <p className="text-sm text-neon-amber flex items-center gap-2 text-glow-amber">
                <i className="fa-solid fa-triangle-exclamation"></i>{error}
              </p>
            </div>
          )}
          <button type="submit" disabled={loading} className="cyber-button w-full rounded-xl py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {loading ? (<><div className="w-5 h-5 border-2 border-neon-green border-t-transparent rounded-full animate-spin"></div>INITIALISATION...</>) : (<><i className="fa-solid fa-right-to-bracket"></i>{isRegister ? 'CRÉER UN COMPTE' : 'CONNEXION'}</>)}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-body-secondary">
            {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
            <button onClick={() => { setIsRegister(!isRegister); setError(''); setFormData({ nom: '', email: '', password: '', confirmPassword: '' }); }} className="text-gold font-medium ml-1 hover:text-neon-green transition-colors text-glow-cyan">
              {isRegister ? 'Connexion' : 'Inscription'}
            </button>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-cyber-border text-center">
          <p className="text-xs text-body-secondary">🌍 <span className="text-gold text-glow-cyan">AGRICULTURE INTELLIGENTE</span> • HAÏTI</p>
        </div>
      </div>
    </div>
  );
}
