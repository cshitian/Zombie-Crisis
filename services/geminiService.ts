import { GoogleGenAI } from "@google/genai";
import i18n from '../i18n';
import { GameState, Coordinates, Building } from '../types';
import { LocationInfo } from './mapDataService';

let ai: GoogleGenAI | null = null;

const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
if (key && key !== 'undefined' && key !== 'your_api_key_here') {
  ai = new GoogleGenAI({ 
    apiKey: key,
  });
}

export const generateRadioChatter = async (
  gameState: GameState, 
  location: Coordinates,
  event: 'START' | 'RESCUE' | 'WAVE_CLEARED' | 'LOW_HEALTH' | 'RANDOM' | 'DISCOVERY',
  locationInfo?: any // LocationInfo type from mapDataService
): Promise<string> => {
  if (!ai) return i18n.t('ai_offline');

  const { healthyCount, infectedCount, soldierCount } = gameState;
  const loc = locationInfo || { name: i18n.t('unknown_area') };
  
  const envDetail = [
    loc.road ? `${i18n.t('prompt_road')}: ${loc.road}` : null,
    loc.feature ? `${i18n.t('prompt_landmark')}: ${loc.feature}` : null,
    loc.suburb ? `${i18n.t('prompt_area')}: ${loc.suburb}` : null,
    loc.type ? `${i18n.t('prompt_type')}: ${loc.type}` : null
  ].filter(Boolean).join(', ');

  const systemPrompt = `You are a copywriter for a realistic zombie outbreak simulation game.
  Current environment: ${loc.name}. ${envDetail ? `Detailed context: ${envDetail}` : ''}.
  Survivors: ${healthyCount}, Infected: ${infectedCount}, Combat Troops: ${soldierCount}.
  Rules: 
  1. Construct dialogue based on provided geography, street, or building names.
  2. Tone must be realistic and immersive (tense, desperate, or cold military style).
  3. No generic templates. Mention specific environment details (e.g., "at the corner of ${loc.road || 'this street'}", "near ${loc.feature || 'building'}").
  4. Exactly 1 sentence, concise and powerful.
  5. Output language: ${i18n.language}.`;

  const eventPrompts = {
    START: i18n.t('prompt_event_start'),
    RESCUE: i18n.t('prompt_event_rescue'),
    WAVE_CLEARED: i18n.t('prompt_event_wave_cleared'),
    LOW_HEALTH: i18n.t('prompt_event_low_health'),
    RANDOM: i18n.t('prompt_event_random'),
    DISCOVERY: i18n.t('prompt_event_discovery')
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n任务: ${eventPrompts[event]}` }] }]
    });
    return response.text?.trim() || i18n.t('signal_interference');
  } catch (error) {
    console.error("Gemini Error:", error);
    return i18n.t('comm_unstable');
  }
};

export const generateTacticalAnalysis = async (
  building: Building,
  nearbyFeatures: string[],
  locationInfo: LocationInfo | null,
  nearbyStats: { zombies: number; soldiers: number; civilians: number }
): Promise<{ survivalGuide: string; tacticalReport: string }> => {
  if (!ai) {
    return {
      survivalGuide: i18n.t('ai_offline'),
      tacticalReport: i18n.t('ai_nearby_stats', { zombies: nearbyStats.zombies, soldiers: nearbyStats.soldiers, civilians: nearbyStats.civilians })
    };
  }

  const landmarks = nearbyFeatures.length > 0 ? nearbyFeatures.slice(0, 5).join(', ') : i18n.t('no_landmarks');
  const road = locationInfo?.road || i18n.t('unknown_street');
  const context = `${i18n.t('prompt_build_name')}: ${building.name}, ${i18n.t('prompt_type')}: ${building.type}, ${i18n.t('prompt_road')}: ${road}. ${i18n.t('prompt_landmarks')}: ${landmarks}.
  ${i18n.t('prompt_stats')}: ${nearbyStats.zombies}${i18n.t('prompt_zombies')}, ${nearbyStats.soldiers}${i18n.t('prompt_soldiers')}, ${nearbyStats.civilians}${i18n.t('prompt_civilians')}.`;

  const systemPrompt = `You are an AI tactical reconnaissance system for a realistic zombie simulation game.
  Generate two short reports based on geographic coordinates, street names, nearby real landmarks, and real-time hostile/friendly status.
  NOTE: Content MUST be specific! Mention specific streets or landmarks!
  
  Requirements:
  1. Survival Guide: 1-2 sentences. Analyze building's defensive value, combine with real street names or landmarks for evac/hold suggestions.
  2. Tactical Report: 1-2 sentences. Based on zombie/soldier counts, give direct military advice, using landmarks as defense lines or ambush points.
  
  Tone: Cold, professional, tech-heavy.
  Language: ${i18n.language}. Output format must be JSON: {"survivalGuide": "...", "tacticalReport": "..."}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n当前上下文: ${context}` }] }],
      config: { responseMimeType: "application/json" }
    });
    
    let text = response.text || JSON.stringify({ "survivalGuide": i18n.t('ai_scan_fail_guide'), "tacticalReport": i18n.t('ai_scan_fail_report', { zombies: nearbyStats.zombies }) });
    // Handle cases where Gemini might wrap the JSON in markdown code blocks
    if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0].trim();
    } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0].trim();
    }
    
    const result = JSON.parse(text);
    return result;
  } catch (error) {
    console.error("Gemini Tactical Analysis Error:", error);
    return {
      survivalGuide: i18n.t('ai_scan_fail_guide'),
      tacticalReport: i18n.t('ai_scan_fail_report', { zombies: nearbyStats.zombies })
    };
  }
};
