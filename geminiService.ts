
import { GoogleGenAI } from "@google/genai";
import { Message, CharacterId } from "./types";
import { CHARACTERS } from "./constants";

export const generateResponse = async (
  characterId: CharacterId,
  history: Message[],
  userInput: string,
  config: { useImageGen: boolean; useLiveSearch: boolean }
) => {
  // Always create a fresh instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  const char = CHARACTERS.find(c => c.id === characterId)!;

  // Check for image generation request
  const imageRequestKeywords = ['generate image', 'draw', 'picture', 'tasveer', 'image banao', 'bana k do'];
  const isImageRequest = config.useImageGen && imageRequestKeywords.some(keyword => userInput.toLowerCase().includes(keyword));

  if (isImageRequest) {
    try {
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: userInput }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let imageData = '';
      const candidate = imgResponse.candidates?.[0];
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            imageData = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      
      if (imageData) {
        return { text: "Le bhai, teri tasveer tayyar ha.", imageUrl: imageData };
      }
    } catch (error) {
      console.error("Img Gen Error:", error);
    }
  }

  // Map history to Gemini format, filtering out any corrupt entries
  // Limit history to last 10 messages for performance and speed
  const recentHistory = history.slice(-10).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: recentHistory,
      config: {
        systemInstruction: char.systemInstruction,
        tools: config.useLiveSearch ? [{ googleSearch: {} }] : undefined,
        temperature: 0.9,
      }
    });

    const text = response.text || "Kuch samajh nahi aya, dubara bol.";
    return { text, imageUrl: undefined };
  } catch (error) {
    console.error("API Error:", error);
    return { 
      text: "Bhai connection me masla ha ya API key check kr le. (Something went wrong)", 
      imageUrl: undefined 
    };
  }
};
