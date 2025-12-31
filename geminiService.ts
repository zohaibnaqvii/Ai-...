
import { GoogleGenAI } from "@google/genai";
import { Message, CharacterId } from "./types";
import { CHARACTERS } from "./constants";

export const generateResponse = async (
  characterId: CharacterId,
  history: Message[],
  userInput: string,
  config: { useImageGen: boolean; useLiveSearch: boolean }
) => {
  // Always create a new instance right before the call to ensure the latest API key is used
  // and strictly follow the named parameter initialization: { apiKey: ... }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const char = CHARACTERS.find(c => c.id === characterId)!;

  // 1. Image Generation Logic
  const imgTriggers = ['bana', 'image', 'picture', 'tasveer', 'photo', 'drawing', 'draw'];
  const wantsImage = config.useImageGen && imgTriggers.some(t => userInput.toLowerCase().includes(t));

  if (wantsImage) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: userInput }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      
      // Guidelines: Iterate through all parts to find the image part, do not assume index 0
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return { 
            text: "System response: Image generated successfully.", 
            imageUrl: `data:image/png;base64,${part.inlineData.data}`,
            groundingChunks: undefined
          };
        }
      }
    } catch (e: any) {
      console.error("Image error", e);
    }
  }

  // 2. Chat Logic
  const chatHistory = history.slice(-10).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: chatHistory,
      config: {
        systemInstruction: char.systemInstruction,
        // Google Search grounding setup
        tools: config.useLiveSearch ? [{ googleSearch: {} }] : undefined,
        temperature: 0.8,
      }
    });

    return { 
      // response.text is a getter, not a method
      text: response.text || "Bhai, dimagh kaam nahi kar raha, dubara try karo.", 
      imageUrl: undefined,
      // Mandatory: Extract URLs/Chunks for grounding display
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (err: any) {
    console.error("Gemini Error:", err);
    
    if (err.message?.includes("not found") || err.message?.includes("key")) {
      return { 
        text: "ERROR: Bhai API Key ka masla ha. Settings mein ja kar dobara connect karo ya check karo ke key active ha.", 
        imageUrl: undefined,
        groundingChunks: undefined
      };
    }
    
    return { 
      text: "Connection weak ha, ya API limit cross ho gayi ha. Thora ruk k try karo.", 
      imageUrl: undefined,
      groundingChunks: undefined
    };
  }
};
