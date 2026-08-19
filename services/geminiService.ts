import { postJson } from '../lib/api';

export const getGeminiResponse = async (
  message: string,
  history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<string> => {
  try {
    const data = await postJson<{ text?: string }>('/api/gemini/chat', { message, history });
    return data?.text || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    return "I am currently experiencing connection issues or invalid API configuration. Please try again later.";
  }
};
