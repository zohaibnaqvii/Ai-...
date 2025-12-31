
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Search,
  Image as ImageIcon,
  MoreVertical,
  ChevronLeft,
  Moon,
  Sun
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
    anonymousId: 'anon_' + Math.random().toString(36).substr(2, 9)
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const savedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
    const savedSettings = localStorage.getItem(SETTINGS_KEY);

    if (savedSettings) setSettings(JSON.parse(savedSettings));
    
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      // Create first chat
      createNewChat('zohaib');
    }
  }, []);

  // Save Sessions
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save Settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessions, isTyping, activeSessionId]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createNewChat = (charId: CharacterId) => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      characterId: charId,
      title: 'New Chat',
      messages: [
        {
          id: 'first_msg',
          role: 'model',
          content: FIRST_MESSAGE,
          timestamp: Date.now()
        }
      ],
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

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          lastUpdated: Date.now(),
          title: s.messages.length === 1 ? inputValue.substring(0, 30) : s.title
        };
      }
      return s;
    }));

    setInputValue('');
    setIsTyping(true);

    const session = sessions.find(s => s.id === activeSessionId)!;
    const response = await generateResponse(
      session.characterId, 
      session.messages, 
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

    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, modelMsg],
          lastUpdated: Date.now()
        };
      }
      return s;
    }));

    setIsTyping(false);
  };

  const clearHistory = () => {
    if (window.confirm("Delete all chats?")) {
      setSessions([]);
      setActiveSessionId(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      createNewChat('zohaib');
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  return (
    <div className={`h-screen flex flex-col bg-gray-950 text-white overflow-hidden`}>
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/50 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-800 rounded-lg lg:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col">
             <span className="text-sm font-bold tracking-tight">{APP_NAME}</span>
             <span className="text-[10px] text-gray-500 uppercase font-mono">{activeSession?.characterId || 'ZOHAIB'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={() => createNewChat(currentCharacterId)}
                className="p-2 hover:bg-gray-800 rounded-lg"
                title="New Chat"
            >
                <Plus size={20} />
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-gray-800 rounded-lg"
            >
                <Settings size={20} />
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Desktop & Mobile overlay */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-gray-900 border-r border-gray-800 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-auto lg:z-0
        `}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between lg:hidden">
              <span className="font-bold">History</span>
              <button onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="p-3">
              <button 
                onClick={() => createNewChat(currentCharacterId)}
                className="w-full flex items-center gap-2 p-3 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                <Plus size={16} /> New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveSessionId(s.id);
                    setCurrentCharacterId(s.characterId);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between group transition-all
                    ${activeSessionId === s.id ? 'bg-gray-800 border-l-4 border-blue-500' : 'hover:bg-gray-800/50'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img 
                      src={CHARACTERS.find(c => c.id === s.characterId)?.avatar} 
                      className="w-8 h-8 rounded-full object-cover shrink-0 grayscale group-hover:grayscale-0 transition-all"
                      alt=""
                    />
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{s.title}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{s.characterId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center">
                        <User size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold">Local User</span>
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">{settings.anonymousId.substring(0, 10)}</span>
                    </div>
                </div>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-gray-950">
          {/* Character Selector Bar */}
          <div className="p-2 border-b border-gray-800 flex gap-2 overflow-x-auto no-scrollbar bg-gray-900/20">
            {CHARACTERS.map(char => (
              <button
                key={char.id}
                onClick={() => {
                   if (activeSession && activeSession.messages.length <= 1) {
                      // Change persona for new empty chat
                      setSessions(prev => prev.map(s => s.id === activeSessionId ? {...s, characterId: char.id} : s));
                   } else {
                      createNewChat(char.id);
                   }
                   setCurrentCharacterId(char.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium transition-all
                  ${currentCharacterId === char.id 
                    ? `bg-${char.color}-600/20 text-${char.color}-400 ring-1 ring-${char.color}-600/50` 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                <img src={char.avatar} className="w-5 h-5 rounded-full" />
                {char.name}
              </button>
            ))}
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-6"
          >
            {activeSession?.messages.map((msg, idx) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`flex gap-3 max-w-[85%] lg:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <img src={CHARACTERS.find(c => c.id === activeSession.characterId)?.avatar} className="rounded-full" />}
                  </div>
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.imageUrl && (
                        <div className="mt-3 overflow-hidden rounded-lg shadow-xl border border-gray-700">
                          <img src={msg.imageUrl} className="w-full h-auto max-h-96 object-contain bg-black" alt="AI Generated" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <img src={CHARACTERS.find(c => c.id === currentCharacterId)?.avatar} className="rounded-full" />
                </div>
                <div className="flex gap-1 px-4 py-3 rounded-2xl bg-gray-800 border border-gray-700">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-md">
            <form 
              onSubmit={handleSendMessage}
              className="max-w-4xl mx-auto relative flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Chat with ${CHARACTERS.find(c => c.id === currentCharacterId)?.name}...`}
                  rows={1}
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none min-h-[48px] max-h-32 scrollbar-hide"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                  }}
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  {settings.useImageGen && (
                    <button 
                      type="button" 
                      title="Try image generation keywords: 'draw...', 'image...'"
                      className="p-1.5 text-gray-500 hover:text-blue-400"
                    >
                      <ImageIcon size={18} />
                    </button>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="p-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                <Send size={20} />
              </button>
            </form>
            <p className="text-[10px] text-gray-600 text-center mt-2 uppercase tracking-widest font-mono">
              End-to-end local storage • AI Persona: {currentCharacterId}
            </p>
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Settings size={18} /> Settings
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-gray-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ImageIcon size={18} className="text-blue-400" />
                    <div>
                      <p className="text-sm font-medium">Image Generation</p>
                      <p className="text-[10px] text-gray-500">Enable AI image creation via prompts</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({...prev, useImageGen: !prev.useImageGen}))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${settings.useImageGen ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.useImageGen ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Search size={18} className="text-green-400" />
                    <div>
                      <p className="text-sm font-medium">Live Search</p>
                      <p className="text-[10px] text-gray-500">Ground responses with real-time web data</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings(prev => ({...prev, useLiveSearch: !prev.useLiveSearch}))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${settings.useLiveSearch ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.useLiveSearch ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <button 
                  onClick={clearHistory}
                  className="w-full flex items-center justify-center gap-2 p-3 border border-red-500/50 text-red-500 rounded-xl hover:bg-red-500/10 transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} /> Clear All Chat History
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-gray-600 text-center uppercase">Privacy & Identity</p>
                <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                   <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">Anonymous ID</span>
                      <span className="font-mono text-blue-400">{settings.anonymousId}</span>
                   </div>
                   <p className="text-[10px] text-gray-500">This ID is unique to your browser. Your data is never shared or sold.</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-800/50 border-t border-gray-800 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
