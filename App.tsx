
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
  ShieldAlert,
  Zap,
  LayoutGrid
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
    anonymousId: 'Z-X-' + Math.random().toString(36).substring(2, 7).toUpperCase()
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
      title: 'New Session',
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
      title: s.messages.length <= 1 ? inputValue.substring(0, 25) : s.title
    } : s));

    setInputValue('');
    setIsTyping(true);

    const session = sessions.find(s => s.id === activeSessionId)!;
    const response = await generateResponse(
      session.characterId, 
      session.messages.concat(userMsg), 
      userMsg.content,
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
    <div className="h-screen flex flex-col bg-[#020617] text-slate-100 selection:bg-cyan-500/30">
      {/* Dynamic Header */}
      <header className="h-16 border-b border-slate-800/50 glass flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-800/50 rounded-lg lg:hidden transition-all">
            <Menu size={22} className="text-cyan-400" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 uppercase italic">
              {APP_NAME}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[9px] mono uppercase tracking-widest text-slate-500 font-bold">Encrypted Connection</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => createNewChat(currentCharacterId)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 rounded-full border border-slate-700 transition-all text-xs font-bold">
            <Plus size={16} /> <span className="hidden sm:inline">New Chat</span>
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-800/50 rounded-full text-slate-400 hover:text-cyan-400 transition-all">
            <Settings size={22} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Modern Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-[60] w-80 glass border-r border-slate-800/50 transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1)
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static
        `}>
          <div className="flex flex-col h-full">
            <div className="p-6 flex items-center justify-between">
              <span className="font-black text-xl italic text-slate-400 tracking-tighter">ARCHIVE</span>
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 space-y-2">
              {sessions.map(s => {
                const char = CHARACTERS.find(c => c.id === s.characterId);
                const isActive = activeSessionId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSessionId(s.id); setCurrentCharacterId(s.characterId); setIsSidebarOpen(false); }}
                    className={`w-full group relative p-4 rounded-xl transition-all duration-300 border ${isActive ? 'bg-slate-800/50 border-cyan-500/50 glow-blue' : 'bg-transparent border-transparent hover:bg-slate-900/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={char?.avatar} className={`w-10 h-10 rounded-lg object-cover ring-2 ring-slate-800 ${isActive ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'}`} />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold truncate">{s.title}</p>
                        <p className={`text-[10px] mono uppercase font-black tracking-tighter ${isActive ? 'text-cyan-400' : 'text-slate-600'}`}>{char?.name}</p>
                      </div>
                      <Trash2 
                        size={16} 
                        onClick={(e) => deleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-500 transition-all" 
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-6 border-t border-slate-800/50 bg-slate-900/30">
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-900 flex items-center justify-center shadow-lg shadow-cyan-900/20">
                    <User size={24} className="text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">OPERATOR</span>
                    <span className="text-[10px] mono text-cyan-500 font-bold tracking-widest">{settings.anonymousId}</span>
                  </div>
               </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col relative bg-[#020617]">
          {/* Persona Switcher - The "Pawa" Bar */}
          <div className="px-6 py-3 border-b border-slate-800/30 bg-slate-900/20 flex gap-4 overflow-x-auto no-scrollbar items-center">
             <span className="text-[10px] mono text-slate-500 font-bold rotate-90 sm:rotate-0">PERSONA</span>
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
                 className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black tracking-tighter transition-all border
                   ${currentCharacterId === char.id 
                    ? `bg-${char.color}-500/10 border-${char.color}-500/50 text-${char.color}-400 ring-4 ring-${char.color}-500/5` 
                    : 'bg-slate-800/30 border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                 <img src={char.avatar} className="w-4 h-4 rounded-full" />
                 {char.name.toUpperCase()}
               </button>
             ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
            {activeSession?.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-msg`}>
                <div className={`flex gap-4 max-w-[90%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border-2 
                    ${msg.role === 'user' ? 'bg-cyan-600 border-cyan-400' : 'bg-slate-800 border-slate-700'}`}>
                    {msg.role === 'user' ? <User size={20} /> : <img src={CHARACTERS.find(c => c.id === activeSession.characterId)?.avatar} className="rounded-lg" />}
                  </div>
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-xl
                      ${msg.role === 'user' 
                        ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-none' 
                        : 'bg-slate-900/80 border border-slate-800 text-slate-100 rounded-tl-none'}`}
                    >
                      <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                      {msg.imageUrl && (
                        <div className="mt-4 rounded-xl overflow-hidden border-2 border-slate-700 glow-blue">
                          <img src={msg.imageUrl} className="w-full h-auto" alt="AI Output" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] mono text-slate-600 mt-2 font-black uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
                    <img src={CHARACTERS.find(c => c.id === currentCharacterId)?.avatar} className="rounded-lg opacity-50" />
                </div>
                <div className="h-10 px-6 flex items-center gap-1 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Interface */}
          <div className="p-6 bg-gradient-to-t from-slate-950 to-transparent">
            <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto flex items-end gap-3">
              <div className="flex-1 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-3xl blur opacity-10 group-focus-within:opacity-20 transition-all duration-500"></div>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                  placeholder={`Command ${CHARACTERS.find(c => c.id === currentCharacterId)?.name.toUpperCase()}...`}
                  rows={1}
                  className="relative w-full bg-slate-900 border border-slate-800 rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none min-h-[56px] max-h-48 text-sm font-medium"
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = `${Math.min(t.scrollHeight, 192)}px`;
                  }}
                />
                <div className="absolute right-4 bottom-4 flex items-center gap-2">
                   <Zap size={18} className={`${isTyping ? 'text-cyan-500 animate-pulse' : 'text-slate-600'}`} />
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="h-[56px] w-[56px] flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl transition-all shadow-2xl shadow-cyan-900/40 shrink-0"
              >
                <Send size={24} className={isTyping ? 'animate-ping' : ''} />
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border-t-2 border-t-cyan-500">
            <div className="p-8 flex items-center justify-between border-b border-slate-800">
              <h2 className="text-2xl font-black italic tracking-tighter flex items-center gap-3 text-cyan-400">
                <LayoutGrid size={28} /> CORE SETTINGS
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><ImageIcon size={20} className="text-blue-400" /></div>
                    <div>
                      <p className="font-bold">IMAGINE MODE</p>
                      <p className="text-[10px] mono text-slate-500">Auto-detect image prompts</p>
                    </div>
                  </div>
                  <button onClick={() => setSettings(p => ({...p, useImageGen: !p.useImageGen}))} className={`w-14 h-7 rounded-full transition-all relative ${settings.useImageGen ? 'bg-cyan-600 shadow-lg shadow-cyan-600/30' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${settings.useImageGen ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><ShieldAlert size={20} className="text-green-400" /></div>
                    <div>
                      <p className="font-bold">LIVE INTELLIGENCE</p>
                      <p className="text-[10px] mono text-slate-500">Web grounding via Google Search</p>
                    </div>
                  </div>
                  <button onClick={() => setSettings(p => ({...p, useLiveSearch: !p.useLiveSearch}))} className={`w-14 h-7 rounded-full transition-all relative ${settings.useLiveSearch ? 'bg-cyan-600 shadow-lg shadow-cyan-600/30' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${settings.useLiveSearch ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <button onClick={() => { if(confirm("Wipe all data?")) { setSessions([]); localStorage.removeItem(LOCAL_STORAGE_KEY); setIsSettingsOpen(false); createNewChat('zohaib'); }}} className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl border border-red-500/30 transition-all font-black italic tracking-tighter">
                  <Trash2 size={20} /> WIPE ALL MEMORY
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
