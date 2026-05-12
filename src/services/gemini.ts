import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateQuote = async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a daily motivational quote for a personal development app. Keep it concise (max 20 words) and inspire focus or persistence. Return it as JSON with fields 'text' and 'author'.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            author: { type: Type.STRING }
          },
          required: ["text", "author"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating quote:", error);
    return { text: "Focus moves mountains.", author: "Ancient Proverb" };
  }
};

export const getRewardSuggestion = async (taskTitle: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The user just finished the task: "${taskTitle}". Suggest a small, healthy, non-gamified reward (e.g., listen to a specific song, get a coffee, 2-min stretch). Return as JSON with fields 'reward' and 'message'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reward: { type: Type.STRING },
            message: { type: Type.STRING }
          },
          required: ["reward", "message"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return { reward: "A glass of water", message: "Stay hydrated after that hard work!" };
  }
};
