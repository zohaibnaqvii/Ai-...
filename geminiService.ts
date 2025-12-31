
import { GoogleGenAI, Type } from "@google/genai";
import { Message, CharacterId } from "./types";
import { CHARACTERS } from "./constants";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const generateResponse = async (
  characterId: CharacterId,
  history: Message[],
  userInput: string,
  config: { useImageGen: boolean; useLiveSearch: boolean }
) => {
  const ai = getAIClient();
  const char = CHARACTERS.find(c => c.id === characterId)!;

  // Check for image generation request
  const imageRequestKeywords = ['generate image', 'show me', 'create a picture', 'draw', 'tasveer', 'image banao'];
  const isImageRequest = config.useImageGen && imageRequestKeywords.some(keyword => userInput.toLowerCase().includes(keyword));

  if (isImageRequest) {
    try {
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: userInput }]
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1"
            }
        }
      });

      let imageData = '';
      for (const part of imgResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageData = `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      return { 
        text: "Here is what I created for you.", 
        imageUrl: imageData 
      };
    } catch (error) {
      console.error("Image generation failed:", error);
      // Fallback to text if image fails
    }
  }

  // Regular Chat - Using gemini-3-flash-preview for maximum speed
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  
  // Add current input
  contents.push({ role: 'user', parts: [{ text: userInput }] });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction: char.systemInstruction,
        tools: config.useLiveSearch ? [{ googleSearch: {} }] : undefined,
        temperature: 0.9,
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for fastest response
      }
    });

    return { text: response.text || "...", imageUrl: undefined };
  } catch (error) {
    console.error("Chat generation failed:", error);
    return { text: "Sorry, something went wrong. Try again.", imageUrl: undefined };
  }
};
