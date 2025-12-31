
import React, { useState, useEffect, useRef } from 'react';
import { 
  Message, 
  ChatSession, 
  CharacterId, 
  AppSettings 
} from './types';
import { CHARACTERS, APP_NAME, FIRST_MESSAGE } from './constants';
import { generateResponse } from './geminiService';
import { 
  Menu, 
  Plus, 
  Send, 
  Settings, 
  User, 
  Trash2, 
  X, 
  Image as ImageIcon,
  Zap,
  LayoutGrid,
  AlertCircle
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'zohaib_chats_v3';
const SETTINGS_KEY = 'zohaib_settings_v3';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentCharacterId, setCurrentCharacterId] = useState<CharacterId>('zohaib');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    useImageGen: true,
    useLiveSearch: true,
    theme: 'dark',
    anonymousId: 'Z-X-' + Math.random().toString(36).substring(2, 6).toUpperCase()
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      createNewChat('zohaib');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isTyping]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

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
      { useImageGen: settings.useImageGen, useLiveSearch: settings.useLiveSearch }
    );

    const modelMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      content: response.text,
      imageUrl: response.imageUrl,
      timestamp: Date.now()
    };

    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...s.messages, modelMsg],
      lastUpdated: Date.now()
    } : s));

    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#010409] text-slate-100 overflow-hidden">
      {/* Navbar */}
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
        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-[110] w-[280px] bg-[#0d1117] border-r border-white/5 transform transition-transform duration-300 ease-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static
        `}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5 flex items-center justify-between lg:hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">History</span>
              <button onClick={() => setIsSidebarOpen(false)}><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setActiveSessionId(s.id); setIsSidebarOpen(false); }}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${activeSessionId === s.id ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent'}`}
                >
                   <div className="w-8 h-8 rounded bg-cyan-900/30 flex items-center justify-center shrink-0">
                     <img src={CHARACTERS.find(c => c.id === s.characterId)?.avatar} className="w-full h-full object-cover rounded opacity-70" />
                   </div>
                   <div className="truncate text-xs font-bold text-slate-300">{s.title}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-black/60 z-[105] lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

        {/* Chat Content */}
        <main className="flex-1 flex flex-col relative bg-[#010409] min-w-0">
          {/* Persona Switcher */}
          <div className="px-4 py-3 bg-[#010409] flex gap-2 overflow-x-auto no-scrollbar shrink-0 border-b border-white/5 shadow-xl">
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
                 className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shrink-0
                   ${currentCharacterId === char.id ? `bg-cyan-500/20 border-cyan-500 text-cyan-400` : 'bg-white/5 border-transparent text-slate-500'}`}
               >
                 {char.name}
               </button>
             ))}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
            {activeSession?.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-msg`}>
                <div className={`max-w-[90%] sm:max-w-[80%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-[14px] shadow-lg
                    ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-tr-none' : 'bg-[#161b22] border border-white/5 text-slate-200 rounded-tl-none'}`}>
                    {msg.content}
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} className="mt-3 rounded-lg w-full max-h-[300px] object-contain bg-black/40" alt="Generated" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start px-2">
                <div className="flex gap-1.5 p-3 rounded-xl bg-white/5 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Box - Elevated and Padded for Mobile Keyboard Visibility */}
          <div className="absolute bottom-0 inset-x-0 p-4 pb-6 sm:pb-4 bg-gradient-to-t from-[#010409] via-[#010409] to-transparent pointer-events-none">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-2 bg-[#161b22] border border-white/10 p-1.5 rounded-2xl shadow-2xl pointer-events-auto">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                placeholder="Message likho..."
                rows={1}
                className="flex-1 bg-transparent border-none px-3 py-3 focus:outline-none text-sm resize-none max-h-32 text-slate-200"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="h-11 w-11 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:opacity-20 rounded-xl transition-all shrink-0 shadow-lg shadow-cyan-900/20"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black italic tracking-tighter uppercase text-white">System Config</h2>
              <button onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="space-y-3">
              <button onClick={() => setSettings(p => ({...p, useImageGen: !p.useImageGen}))} className={`w-full flex justify-between p-4 rounded-xl border transition-all ${settings.useImageGen ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white/5 border-transparent'}`}>
                <span className="text-xs font-bold uppercase">Image Engine</span>
                <Zap size={16} className={settings.useImageGen ? 'text-cyan-400' : 'text-slate-600'} />
              </button>
              <button onClick={() => { localStorage.clear(); location.reload(); }} className="w-full p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-xl">Clear All Memory</button>
            </div>

            {/* API Key Status Check */}
            {!process.env.API_KEY && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex gap-3">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-[10px] text-red-200 font-bold uppercase leading-tight">Bhai Vercel me API_KEY set nahi hai! Deployment settings check karo.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
