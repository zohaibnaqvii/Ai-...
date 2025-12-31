
import { GoogleGenAI } from "@google/genai";
import { Message, CharacterId } from "./types";
import { CHARACTERS } from "./constants";

export const generateResponse = async (
  characterId: CharacterId,
  history: Message[],
  userInput: string,
  config: { useImageGen: boolean; useLiveSearch: boolean }
) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === '') {
    return { 
      text: "ERROR: Bhai API Key missing ha! Vercel Dashboard me 'API_KEY' name se environment variable add karo aur redeploy karo.", 
      imageUrl: undefined 
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const char = CHARACTERS.find(c => c.id === characterId)!;

  // 1. Image Check
  const triggers = ['bana', 'image', 'picture', 'draw', 'photo', 'tasveer'];
  const wantsImage = config.useImageGen && triggers.some(t => userInput.toLowerCase().includes(t));

  if (wantsImage) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: userInput }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      
      const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        return { 
          text: "Lo bhai, tasveer hazir ha.", 
          imageUrl: `data:image/png;base64,${part.inlineData.data}` 
        };
      }
    } catch (e: any) {
      console.error("Img error:", e);
    }
  }

  // 2. Chat
  const chatHistory = history.slice(-6).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: chatHistory,
      config: {
        systemInstruction: char.systemInstruction,
        tools: config.useLiveSearch ? [{ googleSearch: {} }] : undefined,
        temperature: 0.9,
      }
    });

    return { text: response.text || "Pata nahi kia hua, dubara pucho.", imageUrl: undefined };
  } catch (err: any) {
    console.error("Gemini Error:", err);
    let msg = "Connection issue! Dubara try karo ya API key check karo.";
    if (err.message?.includes("401") || err.message?.includes("API_KEY_INVALID")) {
      msg = "API Key galat ha bhai! AI Studio se sahi key lo.";
    } else if (err.message?.includes("429")) {
      msg = "Thora ruk jao, limits cross ho rahi hain.";
    }
    return { text: msg, imageUrl: undefined };
  }
};
