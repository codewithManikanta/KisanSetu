
import { GoogleGenAI, Type, Modality } from "@google/genai";

/**
 * Manual implementation of base64 decoding to avoid external dependencies as per guidelines.
 */
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Standard audio decoding helper for raw PCM data returned by Gemini TTS.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Fallback to browser-native SpeechSynthesis if Gemini TTS is unavailable or quota is exceeded.
 */
const fallbackSpeak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    // Attempt to find a suitable Indian-English or local voice if possible
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 0.9; // Slightly slower for better clarity for rural users
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.error("Browser does not support Speech Synthesis and Gemini TTS failed.");
  }
};

const hasValidKey = () => {
  const key = process.env.API_KEY;
  return key && key.length > 0 && key !== 'undefined' && key !== 'null';
};

let geminiDisabled = false;

const shouldDisableGemini = (error: any) => {
  const details = error?.error?.details;
  if (Array.isArray(details) && details.some((d: any) => d?.reason === 'API_KEY_INVALID')) return true;
  const message = String(error?.error?.message || error?.message || '');
  if (message.toLowerCase().includes('api key not valid')) return true;
  return false;
};

export const geminiService = {
  /**
   * Translates text to target language with retry logic for 429s
   */
  async translate(text: string, targetLang: string, retries = 2): Promise<string> {
    if (!hasValidKey()) {
      console.warn("Gemini API key missing, skipping translation.");
      return text;
    }
    if (geminiDisabled) return text;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following text into ${targetLang}. Only return the translation. Text: "${text}"`,
      });
      return response.text?.trim() || text;
    } catch (error: any) {
      if (retries > 0 && error?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.translate(text, targetLang, retries - 1);
      }
      if (shouldDisableGemini(error)) {
        geminiDisabled = true;
        return text;
      }
      console.error("Translation error", error);
      return text;
    }
  },

  /**
   * Fetches real-time market prices for a crop in a location
   */
  async getMarketPrice(crop: string, location: string, retries = 1) {
    if (!hasValidKey()) {
      console.warn("Gemini API key missing, returning null for market price.");
      return null;
    }
    if (geminiDisabled) return null;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Fetch current market price (mandi bhav) for ${crop} in ${location}. Return as JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              crop: { type: Type.STRING },
              location: { type: Type.STRING },
              minPrice: { type: Type.NUMBER, description: 'Min price per quintal' },
              maxPrice: { type: Type.NUMBER },
              avgPrice: { type: Type.NUMBER },
              unit: { type: Type.STRING, description: 'per quintal or per kg' },
              date: { type: Type.STRING }
            },
            required: ['avgPrice', 'minPrice', 'maxPrice']
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error: any) {
      if (retries > 0 && error?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.getMarketPrice(crop, location, retries - 1);
      }
      if (shouldDisableGemini(error)) {
        geminiDisabled = true;
        return null;
      }
      console.error("Price extraction error", error);
      return null;
    }
  },

  /**
   * Gets AI crop recommendations based on location and seasonal demand with 429 retry logic
   */
  async getCropRecommendations(location: string, retries = 1) {
    if (!hasValidKey()) {
      console.warn("Gemini API key missing, returning default recommendations.");
      return [
        { cropName: "Tomato", reason: "Shortage in nearby Mandis due to seasonal shift", demand: "High", trend: "Rising" },
        { cropName: "Onion", reason: "End of season storage depletion reported locally", demand: "High", trend: "Stable" },
        { cropName: "Wheat", reason: "Stable procurement rates at local mandis", demand: "Medium", trend: "Stable" }
      ];
    }
    if (geminiDisabled) {
      return [
        { cropName: "Tomato", reason: "Shortage in nearby Mandis due to seasonal shift", demand: "High", trend: "Rising" },
        { cropName: "Onion", reason: "End of season storage depletion reported locally", demand: "High", trend: "Stable" },
        { cropName: "Wheat", reason: "Stable procurement rates at local mandis", demand: "Medium", trend: "Stable" }
      ];
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on current market trends and agricultural season in ${location}, suggest 3 crops that farmers should list now for best prices. Include crop name, reason, and estimated demand level (High/Medium). Return as JSON array.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                cropName: { type: Type.STRING },
                reason: { type: Type.STRING },
                demand: { type: Type.STRING },
                trend: { type: Type.STRING, description: 'Rising, Stable, or Peak' }
              },
              required: ['cropName', 'reason', 'demand']
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error: any) {
      // Check for 429 (Resource Exhausted/Rate Limit)
      const isRateLimit = error?.status === 429 || (error?.message && error.message.includes('429')) || (error?.error?.code === 429);
      
      if (retries > 0 && isRateLimit) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.getCropRecommendations(location, retries - 1);
      }
      if (shouldDisableGemini(error)) {
        geminiDisabled = true;
        return [
          { cropName: "Tomato", reason: "Shortage in nearby Mandis due to seasonal shift", demand: "High", trend: "Rising" },
          { cropName: "Onion", reason: "End of season storage depletion reported locally", demand: "High", trend: "Stable" },
          { cropName: "Wheat", reason: "Stable procurement rates at local mandis", demand: "Medium", trend: "Stable" }
        ];
      }
      
      console.error("Recommendation error", error);
      // Return helpful defaults if API is exhausted
      return [
        { cropName: "Tomato", reason: "Shortage in nearby Mandis due to seasonal shift", demand: "High", trend: "Rising" },
        { cropName: "Onion", reason: "End of season storage depletion reported locally", demand: "High", trend: "Stable" },
        { cropName: "Wheat", reason: "Stable procurement rates at local mandis", demand: "Medium", trend: "Stable" }
      ];
    }
  },

  /**
   * Text to Speech using Gemini with automatic fallback to Web Speech API on quota exhaustion (429)
   */
  async speak(text: string, voice: 'Kore' | 'Puck' | 'Charon' = 'Kore') {
    if (!hasValidKey()) {
      console.warn("Gemini API key missing, falling back to browser speech.");
      fallbackSpeak(text);
      return;
    }
    if (geminiDisabled) {
      fallbackSpeak(text);
      return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        fallbackSpeak(text);
        return;
      }

      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
      );

      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.start();
    } catch (error: any) {
      if (shouldDisableGemini(error)) {
        geminiDisabled = true;
        fallbackSpeak(text);
        return;
      }
      console.warn("Gemini TTS failed. Falling back to browser speech.", error);
      fallbackSpeak(text);
    }
  }
  ,

  async getQualityGradeFromImages(images: string[], retries = 1): Promise<'Premium' | 'Good' | 'Average' | 'Fair'> {
    if (!hasValidKey() || geminiDisabled) return 'Good';
    if (!images || images.length === 0) return 'Good';

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `You are grading a farmer's crop harvest quality based on photos.\nReturn ONLY JSON: {"grade": "Premium" | "Good" | "Average" | "Fair"}.\nRules:\n- Premium: very uniform color/size, clean, no visible defects.\n- Good: minor defects, generally good.\n- Average: noticeable defects/mixed maturity.\n- Fair: visible defects, bruising, rot, heavy dirt.\nIf unsure, choose Good.`;

    const parts: any[] = [{ text: prompt }];
    for (const img of images.slice(0, 4)) {
      const match = String(img).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
      if (!match) continue;
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              grade: { type: Type.STRING }
            },
            required: ['grade']
          }
        }
      });

      const json = JSON.parse(response.text || '{}');
      const grade = String(json.grade || '').trim();
      if (grade === 'Premium' || grade === 'Good' || grade === 'Average' || grade === 'Fair') return grade;
      return 'Good';
    } catch (error: any) {
      if (retries > 0 && error?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.getQualityGradeFromImages(images, retries - 1);
      }
      if (shouldDisableGemini(error)) {
        geminiDisabled = true;
        return 'Good';
      }
      return 'Good';
    }
  }
};
