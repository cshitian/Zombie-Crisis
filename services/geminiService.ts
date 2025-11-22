
import { GoogleGenAI } from "@google/genai";
import { GameState, Coordinates } from '../types';

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateRadioChatter = async (
  gameState: GameState, 
  location: Coordinates,
  event: 'START' | 'RESCUE' | 'WAVE_CLEARED' | 'LOW_HEALTH' // Reusing types for now, mapping loosely
): Promise<string> => {
  if (!ai) return "指挥中心连接中断...";

  const prompts = {
    START: "你是指挥官。报告城市街区爆发丧尸病毒。语气严峻。1句话。",
    RESCUE: "你是运输机飞行员或特种部队队长。确认补给投送或增援抵达。军事术语。简短有力。",
    WAVE_CLEARED: "你是总统。病毒已被肃清。简短的表扬。",
    LOW_HEALTH: "你是情报分析员。感染率急剧上升。惊恐。简短警告。"
  };

  // Map events to new context
  let promptKey = event;
  if (event === 'LOW_HEALTH') promptKey = 'LOW_HEALTH'; // Used when infection spreads fast
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context: 俯视视角的丧尸爆发模拟游戏战报。请使用中文。
      生存者: ${gameState.healthyCount}, 感染者: ${gameState.infectedCount}.
      Task: ${prompts[promptKey]}`,
      config: {
        maxOutputTokens: 40,
      }
    });

    return response.text?.trim() || "信号干扰...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "通讯链路不稳定";
  }
};
