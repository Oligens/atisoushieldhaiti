import { useEffect, useRef, useState } from 'react';
import { askAgriculturalAI } from '../services/agriculturalAI';

interface AIAssistantProps { isDesktop: boolean; }
interface Message { id: string; type: 'user' | 'bot'; text: string; timestamp: string; }

const suggestedQuestions = [
  'Comment reconnaître une maladie sur mes plants de tomate ?',
  'Comment réduire les traitements chimiques dans ma parcelle ?',
  'Quels facteurs météo favorisent les maladies du maïs ?',
];

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function AIAssistant({ isDesktop }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || isTyping) return;
    const userMsg: Message = { id: crypto.randomUUID(), type: 'user', text: messageText, timestamp: now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setError('');
    setIsTyping(true);
    try {
      const answer = await askAgriculturalAI(messageText);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), type: 'bot', text: answer, timestamp: now() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assistant IA indisponible.');
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={`${isDesktop ? 'p-8 h-[calc(100vh)]' : 'pt-14 pb-20'} flex flex-col animate-fade-in`}>
      <div className="mb-6">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} glass-panel neon-border-cyan rounded-full flex items-center justify-center animate-glow-pulse`}><i className="fa-solid fa-robot icon-gold"></i></span>
          ASSISTANT IA ATISOU
        </h1>
        <p className="text-sm text-body-secondary mt-2">Assistant agricole connecté à un moteur IA sécurisé côté serveur.</p>
      </div>

      <div className={`${isDesktop ? 'grid grid-cols-3 gap-6 flex-1' : 'flex-1 flex flex-col'} min-h-0`}>
        <div className={`${isDesktop ? 'col-span-2' : 'flex-1'} glass-panel rounded-2xl flex flex-col overflow-hidden`}>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
            {messages.length === 0 && <div className="h-full flex items-center justify-center text-center"><div><div className="text-5xl mb-4">🌱</div><h2 className="text-lg font-bold text-body">Atisou est prêt</h2><p className="text-sm text-body-secondary mt-2">Posez une question agricole pour démarrer.</p></div></div>}
            {messages.map(msg => <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}><div className={`max-w-[80%] rounded-2xl px-5 py-4 ${msg.type === 'user' ? 'cyber-button rounded-br-md' : 'glass-panel rounded-bl-md'}`}><p className="text-sm whitespace-pre-line leading-relaxed text-body">{msg.text}</p><p className="text-[10px] mt-2 text-body-secondary">{msg.timestamp}</p></div></div>)}
            {isTyping && <div className="glass-panel rounded-2xl rounded-bl-md px-5 py-4 w-fit"><span className="text-xs text-body-secondary">Atisou analyse la question…</span></div>}
            {error && <div className="glass-panel neon-border-amber rounded-xl p-3 text-xs text-gold">{error}</div>}
            <div ref={messagesEndRef} />
          </div>
          <div className="px-6 py-4 border-t border-cyber-border">
            <div className="flex items-center gap-3">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ex. Comment réduire le risque de maladie sur mes tomates ?" className="cyber-input flex-1 rounded-full px-5 py-3.5 text-sm" />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="w-11 h-11 rounded-full cyber-button flex items-center justify-center disabled:opacity-40"><i className="fa-solid fa-paper-plane"></i></button>
            </div>
          </div>
        </div>
        {isDesktop && <div className="space-y-4 overflow-y-auto">
          <div className="glass-panel rounded-2xl p-5"><h3 className="text-sm font-bold text-gold mb-3">QUESTIONS DE DÉMARRAGE</h3><div className="space-y-2">{suggestedQuestions.map(q => <button key={q} onClick={() => handleSend(q)} className="w-full text-left glass-panel rounded-xl p-3 text-xs text-body hover:glass-panel-hover">{q}</button>)}</div></div>
          <div className="glass-panel neon-border-amber rounded-2xl p-5"><h3 className="text-sm font-bold text-gold mb-2">MODE RECHERCHE</h3><p className="text-xs text-body-secondary">Les réponses sont générées par IA et doivent être confrontées aux observations de terrain et aux sources agronomiques.</p></div>
        </div>}
      </div>
    </div>
  );
}
