import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { persistAiDecision } from '../../lib/aiProvenance';
import { getServiceClient } from '../db/supabase';
import { isValidKey } from '../config/env';

export const GEMINI_FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

export const UG_SOURCES = [
  'https://rid.ug.edu.gh/news',
  'https://orid1.ug.edu.gh/news/',
  'https://www.noguchimedres.org/',
  'https://waccbip.ug.edu.gh/news-events/news',
  'https://biotech.ug.edu.gh/',
  'https://dig.ug.edu.gh/',
  'https://www.iast.ug.edu.gh/',
  'https://www.ug.edu.gh/academics/centres-institutes',
  'https://www.ug.edu.gh/chs/medical-school',
  'https://ugmedicalcentre.org/',
  'https://chs.ug.edu.gh/',
  'https://pharmacy.ug.edu.gh/',
  'https://sbahs.ug.edu.gh/',
  'https://bcmb.ug.edu.gh/',
  'https://microbiology.ug.edu.gh/',
  'https://immunology.ug.edu.gh/',
  'https://caw.ug.edu.gh/',
  'https://csd.ug.edu.gh/',
  'https://rips.ug.edu.gh/',
  'https://isser.ug.edu.gh/',
  'https://ug.edu.gh/ugiep',
];

export const GLOBAL_ACCREDITED = [
  'WHO (World Health Organization)',
  'FDA (U.S. Food and Drug Administration)',
  'Nature Medicine Journal',
  'The Lancet Infectious Diseases',
  'GAVI Vaccine Alliance',
];

const getGeminiKey = (): string => process.env.GEMINI_API_KEY || '';
const getAssistantReviewerKey = (): string => process.env.ASSISTANT_REVIEWER_KEY || '';
const getGroqKey = (): string => process.env.GROQ_API_KEY || '';

export const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = getGeminiKey();
  if (!isValidKey(apiKey)) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
};

export const getGroqClient = (): Groq | null => {
  const apiKey = getGroqKey();
  if (!isValidKey(apiKey)) return null;
  return new Groq({ apiKey });
};

export const getAssistantReviewerClient = (): GoogleGenAI | null => {
  const apiKey = getAssistantReviewerKey();
  if (!apiKey.startsWith('AIza')) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
};

export const generateWithFallback = async (ai: GoogleGenAI, modelList: string[], contents: any, config?: any): Promise<any> => {
  let lastError: any;
  for (const modelName of modelList) {
    try {
      const response = await ai.models.generateContent({ model: modelName, contents, config });
      if (response && response.text) return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed:`, err?.message || err);
    }
  }
  throw lastError || new Error('All models failed.');
};

export const generateWithProviders = async (
  prompt: string,
  opts?: { json?: boolean; system?: string },
): Promise<{ provider: string; model: string; text: string } | null> => {
  const ai = getGeminiClient();
  if (ai) {
    let lastError: any;
    for (const modelName of GEMINI_FALLBACK_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: opts?.json ? { responseMimeType: 'application/json' } : undefined,
        });
        if (response && response.text) {
          return { provider: 'google', model: modelName, text: response.text };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Gemini primary model ${modelName} failed:`, err?.message || err);
      }
    }
    if (lastError) {
      console.warn('All Gemini primary models failed, trying Groq fallback:', lastError?.message || lastError);
    }
  }

  const groq = getGroqClient();
  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: opts?.system || 'You are a helpful assistant for the University of Ghana Virtual Industry Hub.' },
          { role: 'user', content: prompt },
        ],
        ...(opts?.json ? { response_format: { type: 'json_object' } } : {}),
      });
      const content = completion.choices[0]?.message?.content;
      if (content) {
        return { provider: 'groq', model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b', text: content };
      }
    } catch (err: any) {
      console.warn('Groq fallback call failed:', err?.message || err);
    }
  }

  return null;
};

export const generateWithAssistantReviewer = async (prompt: string): Promise<{ provider: string; model: string; text: string } | null> => {
  const reviewerKey = getAssistantReviewerKey();
  const reviewer = getAssistantReviewerClient();
  if (reviewer) {
    const model = process.env.ASSISTANT_REVIEWER_MODEL || 'gemini-3.6-flash';
    try {
      const response = await reviewer.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      if (response?.text) return { provider: 'assistant_reviewer', model, text: response.text };
    } catch (error: any) {
      console.warn('Assistant reviewer call failed:', error?.message || error);
    }
  }
  if (reviewerKey && !reviewerKey.startsWith('AIza')) {
    const baseUrl = (process.env.ASSISTANT_REVIEWER_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.ASSISTANT_REVIEWER_MODEL || 'gpt-4o-mini';
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${reviewerKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are the University of Ghana Virtual Industry Hub assistant reviewer. Return advisory findings only. Never provide legal clearance or a publication decision.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Assistant reviewer HTTP ${response.status}`);
      const payload: any = await response.json();
      const text = payload?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.trim()) return { provider: 'assistant_reviewer', model, text };
    } catch (error: any) {
      console.warn('OpenAI-compatible assistant reviewer call failed:', error?.message || error);
    }
  }
  return generateWithProviders(prompt, {
    json: true,
    system: 'You are the University of Ghana Virtual Industry Hub assistant reviewer. Return advisory findings only. Never provide legal clearance or a publication decision.',
  });
};

export const recordAiDecision = async (entry: {
  decision_type: string;
  subject_id?: string | null;
  provider?: string | null;
  model?: string | null;
  prompt_version?: string | null;
  input_hash?: string | null;
  output_hash?: string | null;
  result?: unknown;
}) => {
  await persistAiDecision(getServiceClient(), entry);
};
