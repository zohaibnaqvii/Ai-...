
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
  ChevronRight
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'zohaib_chats_v1';
const SETTINGS_KEY = 'zohaib_settings';

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
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [sessions, isTyping]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createNewChat = (charId: CharacterId) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      characterId: charId,
      title: 'Naya Daur',
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

    const currentInput = inputValue;
    setInputValue('');
    setIsTyping(true);

    const session = sessions.find(s => s.id === activeSessionId)!;
    const response = await generateResponse(
      session.characterId, 
      session.messages.concat(userMsg), 
      currentInput,
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

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (activeSessionId === id) setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      return updated;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-[#010409] text-slate-100 overflow-hidden font-sans">
      {/* Navbar */}
      <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-[#010409]/80 backdrop-blur-xl z-[60]">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-white/5 rounded-full lg:hidden transition-all">
            <Menu size={20} className="text-cyan-500" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-base font-black italic tracking-tighter text-white uppercase leading-none">
              {APP_NAME}
            </h1>
            <span className="text-[8px] mono text-cyan-500/80 font-bold uppercase tracking-widest mt-0.5">Live Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => createNewChat(currentCharacterId)} className="p-2 hover:bg-white/5 rounded-full text-white">
            <Plus size={20} />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-[80] w-[280px] bg-[#0d1117] border-r border-white/5 transform transition-transform duration-300 ease-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-0
        `}>
          <div className="flex flex-col h-full">
            <div className="p-6 flex items-center justify-between lg:hidden">
              <span className="font-bold text-slate-400 text-xs tracking-widest uppercase">Memory Bank</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {sessions.map(s => {
                const char = CHARACTERS.find(c => c.id === s.characterId);
                const isActive = activeSessionId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSessionId(s.id); setCurrentCharacterId(s.characterId); setIsSidebarOpen(false); }}
                    className={`w-full group relative p-3 rounded-lg transition-all flex items-center gap-3 border ${isActive ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}
                  >
                    <img src={char?.avatar} className={`w-8 h-8 rounded-md object-cover ring-1 ring-white/10 ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold truncate text-slate-200">{s.title}</p>
                      <p className="text-[9px] mono uppercase text-slate-500 font-bold">{char?.name}</p>
                    </div>
                    <Trash2 
                      size={14} 
                      onClick={(e) => deleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all shrink-0" 
                    />
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-white/5 bg-[#010409]">
               <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center shadow-lg">
                    <User size={16} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Operator</span>
                    <span className="text-[9px] mono text-cyan-400 font-bold">{settings.anonymousId}</span>
                  </div>
               </div>
            </div>
          </div>
        </aside>

        {/* Chat Content */}
        <main className="flex-1 flex flex-col relative bg-[#010409]">
          {/* Persona Bar */}
          <div className="px-4 py-3 border-b border-white/5 bg-[#010409] flex gap-2 overflow-x-auto no-scrollbar items-center shrink-0">
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
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border shrink-0
                   ${currentCharacterId === char.id 
                    ? `bg-cyan-500/10 border-cyan-500/50 text-cyan-400` 
                    : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 <img src={char.avatar} className="w-3 h-3 rounded-full" />
                 {char.name}
               </button>
             ))}
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth pb-32">
            {activeSession?.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-msg`}>
                <div className={`flex gap-3 max-w-[92%] sm:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ring-1 ring-white/10
                    ${msg.role === 'user' ? 'bg-cyan-600' : 'bg-[#161b22]'}`}>
                    {msg.role === 'user' ? <User size={14} /> : <img src={CHARACTERS.find(c => c.id === activeSession.characterId)?.avatar} className="rounded-md w-full h-full object-cover" />}
                  </div>
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm
                      ${msg.role === 'user' 
                        ? 'bg-cyan-600 text-white rounded-tr-none' 
                        : 'bg-[#161b22] border border-white/5 text-slate-200 rounded-tl-none'}`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.imageUrl && (
                        <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
                          <img src={msg.imageUrl} className="w-full h-auto max-h-[300px] object-contain bg-black" alt="AI" />
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] mono text-slate-600 mt-1 uppercase font-bold px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#161b22] flex items-center justify-center animate-pulse">
                    <img src={CHARACTERS.find(c => c.id === currentCharacterId)?.avatar} className="rounded-md opacity-40" />
                </div>
                <div className="flex gap-1 px-4 py-3 rounded-2xl bg-[#161b22]/50">
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Fixed Area */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-[#010409] via-[#010409] to-transparent">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  placeholder={`Command ${CHARACTERS.find(c => c.id === currentCharacterId)?.name}...`}
                  rows={1}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-2xl pl-4 pr-10 py-3.5 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none min-h-[52px] max-h-32 text-sm"
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                  }}
                />
                <div className="absolute right-3 bottom-3.5">
                   <Zap size={16} className={`${isTyping ? 'text-cyan-500 animate-pulse' : 'text-slate-600'}`} />
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="h-[52px] w-[52px] flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-white/5 disabled:text-slate-700 rounded-2xl transition-all shadow-lg shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0d1117] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-black italic tracking-tighter flex items-center gap-2 text-white uppercase">
                <LayoutGrid size={20} className="text-cyan-500" /> Options
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <ImageIcon size={18} className="text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-tight">Image Gen</span>
                </div>
                <button onClick={() => setSettings(p => ({...p, useImageGen: !p.useImageGen}))} className={`w-10 h-5 rounded-full transition-all relative ${settings.useImageGen ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.useImageGen ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <LayoutGrid size={18} className="text-green-400" />
                  <span className="text-xs font-bold uppercase tracking-tight">Web Search</span>
                </div>
                <button onClick={() => setSettings(p => ({...p, useLiveSearch: !p.useLiveSearch}))} className={`w-10 h-5 rounded-full transition-all relative ${settings.useLiveSearch ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.useLiveSearch ? 'left-5.5' : 'left-0.5'}`} />
                </button>
              </div>

              <div className="pt-4">
                <button onClick={() => { if(confirm("Sab uda doon?")) { setSessions([]); localStorage.removeItem(LOCAL_STORAGE_KEY); setIsSettingsOpen(false); createNewChat('zohaib'); }}} className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all text-xs font-black uppercase tracking-widest">
                  <Trash2 size={16} /> Wipe Memory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
