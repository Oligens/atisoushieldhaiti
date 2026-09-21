import { useState, useRef, useEffect } from 'react';

interface AIAssistantProps { isDesktop: boolean; }
interface Message { id: number; type: 'user' | 'bot'; text: string; timestamp: string; }

const suggestedQuestions = [
  "Comment guérir une plante affectée par le mildiou ?",
  "Quelles précautions adopter contre la rouille du caféier ?",
  "Quels biopesticides naturels pour les tomates ?",
];

const aiResponses: Record<string, string> = {
  mildiou: `🔍 **Diagnostic probable :** Mildiou (Phytophthora infestans)\n\n🌿 **Solutions curatives (Biopesticides) :**\n• Bouillie bordelaise (cuivre + chaux)\n• Extrait de prêle des champs\n• Bicarbonate de soude (5g/litre)\n\n⚠️ **Précautions chimiques :**\n• Éviter les fongicides à base de métalaxyl\n• Respecter le délai de carence de 7 jours\n\n🛡️ **Prévention :**\n• Espacement suffisant entre les plants\n• Rotation des cultures tous les 2 ans`,
  rouille: `🔍 **Diagnostic probable :** Rouille du caféier\n\n🌿 **Solutions curatives :**\n• Pulvérisation de soufre mouillable\n• Extrait de neem\n• Trichoderma harzianum\n\n🛡️ **Prévention :**\n• Planter des variétés résistantes\n• Taille régulière pour l'aération`,
  default: `🌱 **AtisouShield — Assistant IA**\n\nMerci pour votre question ! Pour un diagnostic précis, utilisez notre scanner photo.\n\n🌿 Privilégiez toujours les biopesticides locaux\n⚠️ Les produits chimiques peuvent affecter le foie et les reins`,
};

function getAIResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('mildiou')) return aiResponses.mildiou;
  if (p.includes('rouille') || p.includes('café')) return aiResponses.rouille;
  return aiResponses.default;
}

export default function AIAssistant({ isDesktop }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([{ id: 1, type: 'bot', text: '🌱 Bonjour ! Je suis Atisou, votre assistant agricole intelligent. Posez-moi vos questions sur les maladies des cultures, les traitements naturels ou les précautions sanitaires.', timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: Message = { id: messages.length + 1, type: 'user', text: messageText, timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const botMsg: Message = { id: messages.length + 2, type: 'bot', text: getAIResponse(messageText), timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className={`${isDesktop ? 'p-8 h-[calc(100vh)]' : 'pt-14 pb-20'} flex flex-col animate-fade-in`}>
      <div className="mb-6">
        <h1 className={`${isDesktop ? 'text-3xl' : 'text-xl'} font-bold gradient-text flex items-center gap-3`}>
          <span className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} glass-panel neon-border-cyan rounded-full flex items-center justify-center animate-glow-pulse`}>
            <i className="fa-solid fa-robot icon-gold"></i>
          </span>
          ASSISTANT IA ATISOU
        </h1>
        <p className="text-sm text-body-secondary mt-2 flex items-center gap-2">
          <i className="fa-solid fa-brain icon-gold"></i>Diagnostic intelligent, traitements & prévention
        </p>
      </div>

      <div className={`${isDesktop ? 'grid grid-cols-3 gap-6 flex-1' : 'flex-1 flex flex-col'} min-h-0`}>
        <div className={`${isDesktop ? 'col-span-2' : 'flex-1'} glass-panel rounded-2xl flex flex-col overflow-hidden`}>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[75%] rounded-2xl px-5 py-4 ${msg.type === 'user' ? 'cyber-button rounded-br-md' : 'glass-panel text-body rounded-bl-md'}`}>
                  <p className="text-sm whitespace-pre-line leading-relaxed">{msg.text}</p>
                  <p className={`text-[10px] mt-2 ${msg.type === 'user' ? 'text-gold-light' : 'text-body-secondary'}`}>{msg.timestamp}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="glass-panel rounded-2xl rounded-bl-md px-5 py-4">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 bg-neon-cyan rounded-full animate-bounce"></span>
                    <span className="w-2.5 h-2.5 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2.5 h-2.5 bg-neon-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-6 py-4 border-t border-cyber-border">
            <div className="flex items-center gap-3">
              <button className="w-11 h-11 rounded-full glass-panel flex items-center justify-center text-body-secondary hover:glass-panel-hover transition-colors">
                <i className="fa-solid fa-paperclip icon-gold"></i>
              </button>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ex: Comment guérir ma plante de maïs qui jaunit ?" className="cyber-input flex-1 rounded-full px-5 py-3.5 text-sm" />
              <button onClick={() => handleSend()} disabled={!input.trim()} className="w-11 h-11 rounded-full cyber-button flex items-center justify-center disabled:opacity-40">
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>

        {isDesktop && (
          <div className="space-y-4 overflow-y-auto">
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="text-sm font-bold text-body mb-3 flex items-center gap-2"><i className="fa-solid fa-lightbulb icon-gold"></i><span className="gradient-text">QUESTIONS SUGGÉRÉES</span></h3>
              <div className="space-y-2">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} onClick={() => handleSend(q)} className="w-full text-left text-xs glass-panel text-gold px-4 py-3 rounded-xl font-medium hover:glass-panel-hover transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
            <div className="glass-panel neon-border-amber rounded-2xl p-5">
              <h3 className="text-sm font-bold text-body mb-2 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation icon-gold"></i><span className="text-gold text-glow-amber">RAPPEL SANTÉ</span></h3>
              <p className="text-xs text-body leading-relaxed">Les produits chimiques agricoles peuvent affecter le <strong>foie</strong> et les <strong>reins</strong>. Privilégiez les alternatives naturelles.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
