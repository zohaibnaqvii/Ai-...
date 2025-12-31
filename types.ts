
export type CharacterId = 'zohaib' | 'evil' | 'ella';

export interface Character {
  id: CharacterId;
  name: string;
  description: string;
  avatar: string;
  systemInstruction: string;
  color: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  imageUrl?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  characterId: CharacterId;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export interface AppSettings {
  useImageGen: boolean;
  useLiveSearch: boolean;
  theme: 'light' | 'dark' | 'auto';
  anonymousId: string;
}
