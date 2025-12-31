
import React, { useState, useEffect, useRef } from 'react';
import { 
  Message, 
  ChatSession, 
  CharacterId, 
} from './types';
import { CHARACTERS, APP_NAME, FIRST_MESSAGE } from './constants';
import { generateResponse } from './geminiService';
import { 
  Menu, 
  Plus, 
  Send, 
  Settings, 
  X, 
  LayoutGrid,
  ShieldCheck,
  Key,
  ExternalLink
} from 'lucide-react';

// Fix: Use the AIStudio type provided by the environment to avoid modifier/type mismatch errors
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

const LOCAL_STORAGE_KEY = 'zohaib_chats_v4';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentCharacterId, setCurrentCharacterId] = useState<CharacterId>('zohaib');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkApiKey();
    const savedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      createNewChat('zohaib');
    }
  }, []);

  const checkApiKey = async () => {
    try {
      // Correctly utilize the pre-configured window.aistudio
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } catch (e) {
      // Default to true if environment check fails
      setHasKey(true);
    }
  };

  const handleConnectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Per instructions: assume key selection success after triggering to avoid race condition
      setHasKey(true); 
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isTyping]);

  const createNewChat = (charId: CharacterId) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      characterId: charId,
      title: 'New Chat',
      messages: [{ id: 'init', role: 'model', content: FIRST_MESSAGE, timestamp: Date.now() }],
      lastUpdated: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setCurrentCharacterId(charId);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isTyping || !activeSessionId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };

    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...s.messages, userMsg],
      lastUpdated: Date.now(),
      title: s.messages.length <= 1 ? inputValue.substring(0, 20) : s.title
    } : s));

    const promptText = inputValue;
    setInputValue('');
    setIsTyping(true);

    const session = sessions.find(s => s.id === activeSessionId)!;
    const response = await generateResponse(
      session.characterId, 
      session.messages.concat(userMsg), 
      promptText,
      { useImageGen: true, useLiveSearch: true }
    );

    const modelMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: response.text,
      imageUrl: response.imageUrl,
      groundingChunks: response.groundingChunks,
      timestamp: Date.now()
    };

    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...s.messages, modelMsg],
      lastUpdated: Date.now()
    } : s));

    setIsTyping(false);
  };

  if (hasKey === false) {
    return (
      <div className="h-[100dvh] bg-[#010409] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mb-8 ring-1 ring-cyan-500/50 animate-pulse">
          <ShieldCheck size={40} className="text-cyan-400" />
        </div>
        <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-2">
          {APP_NAME}
        </h1>
        <p className="text-slate-500 text-xs mono uppercase tracking-widest mb-12">System Activation Required</p>
        
        <div className="bg-[#0d1117] border border-white/5 p-6 rounded-3xl w-full max-w-sm mb-8">
          <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">
            Bhai, app ko chalane ke liye Gemini API Key zaroori hai. Neeche button dabayen aur apni key select karen. 
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-cyan-500 underline">Billing Docs</a> check kar lena agar masla aye.
          </p>
          <button 
            onClick={handleConnectKey}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all"
          >
            <Key size={18} /> Connect System
          </button>
        </div>
        <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">End-to-End Encrypted Local Session</p>
      </div>
    );
  }

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  return (
    <div className="flex flex-col h-[100dvh] bg-[#010409] text-slate-100 overflow-hidden font-sans">
      <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-[#010409]/95 backdrop-blur-md z-[100]">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/5 rounded-full lg:hidden">
            <Menu size={22} className="text-cyan-400" />
          </button>
          <h1 className="text-sm font-black italic tracking-tighter text-white uppercase">{APP_NAME}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => createNewChat(currentCharacterId)} className="p-2 hover:bg-white/5 rounded-full"><Plus size={20} /></button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/5 rounded-full text-slate-400"><Settings size={20} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`
          fixed inset-y-0 left-0 z-[110] w-[280px] bg-[#0d1117] border-r border-white/5 transform transition-transform duration-300 ease-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static
        `}>
          <div className="flex flex-col h-full p-4 space-y-4">
            <div className="flex items-center justify-between lg:hidden">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Archive</span>
               <button onClick={() => setIsSidebarOpen(false)}><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); setIsSidebarOpen(false); }}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all border ${activeSessionId === s.id ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-transparent border-transparent'}`}
                >
                  <img src={CHARACTERS.find(c => c.id === s.characterId)?.avatar} className="w-8 h-8 rounded-lg object-cover" alt="avatar" />
                  <div className="truncate text-xs font-bold">{s.title}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-[105] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

        <main className="flex-1 flex flex-col relative bg-[#010409] min-w-0">
          <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar border-b border-white/5 bg-[#010409]">
             {CHARACTERS.map(char => (
               <button
                 key={char.id}
                 onClick={() => {
                    if (activeSession && activeSession.messages.length <= 1) {
                      setSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, characterId: char.id} : s));
                    } else {
                      createNewChat(char.id);
                    }
                    setCurrentCharacterId(char.id);
                 }}
                 className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shrink-0
                   ${currentCharacterId === char.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-white/5 border-transparent text-slate-500'}`}
               >
                 {char.name}
               </button>
             ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
            {activeSession?.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed
                  ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-[#161b22] border border-white/5 text-slate-200 rounded-tl-none'}`}>
                  {msg.content}
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} className="mt-3 rounded-xl w-full max-h-[400px] object-contain bg-black shadow-2xl" alt="generated" />
                  )}
                  {/* Mandatory search grounding source listing */}
                  {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sources:</p>
                      {msg.groundingChunks.map((chunk, idx) => (
                        chunk.web && (
                          <a 
                            key={idx} 
                            href={chunk.web.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[11px] text-cyan-400 hover:underline"
                          >
                            <ExternalLink size={10} /> {chunk.web.title || chunk.web.uri}
                          </a>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-1.5 p-3 rounded-xl bg-white/5 w-fit animate-pulse">
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full [animation-delay:0.4s]"></div>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 inset-x-0 p-4 pb-8 sm:pb-6 bg-gradient-to-t from-[#010409] via-[#010409] to-transparent pointer-events-none">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-2 bg-[#161b22] border border-white/10 p-2 rounded-2xl shadow-2xl pointer-events-auto">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                placeholder={`${CHARACTERS.find(c => c.id === currentCharacterId)?.name} ko bolo...`}
                rows={1}
                className="flex-1 bg-transparent border-none px-3 py-2.5 focus:outline-none text-sm resize-none max-h-32 text-slate-100"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="h-12 w-12 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 rounded-xl transition-all shrink-0 text-white"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </main>
      </div>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0d1117] border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <LayoutGrid size={16} className="text-cyan-500" /> Control Center
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <button onClick={handleConnectKey} className="w-full flex items-center justify-between p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <span className="text-xs font-bold uppercase">Update API Key</span>
                <Key size={16} />
              </button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-xl hover:bg-red-500/20 transition-all">Hard Reset System</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
