
import { GoogleGenAI, Type } from "@google/genai";
import { Category, SongItem, GeneratorConfig } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const songSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    artist: { type: Type.STRING, description: "Nome do artista ou autor da música" },
    category: { type: Type.STRING },
    key: { type: Type.STRING },
    ministration: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING },
        verse: { type: Type.STRING },
        direction: { type: Type.STRING },
      },
      required: ["text", "direction"],
    },
  },
  required: ["title", "artist", "category", "ministration"],
};

const repertorySchema = {
  type: Type.ARRAY,
  items: songSchema,
};

export const generateRepertory = async (
  config: GeneratorConfig
): Promise<SongItem[]> => {
  const categoriesDescription = Object.entries(config.categoryCounts)
    .filter(([_, count]) => count && count > 0)
    .map(([cat, count]) => `${count} música(s) de ${cat}`)
    .join(", ");

  const totalSongs = Object.values(config.categoryCounts).reduce((a, b) => (Number(a) || 0) + (Number(b) || 0), 0);

  const recentSongsBlock = config.recentSongs && config.recentSongs.length > 0
    ? `AVISO DE FREQUÊNCIA: As seguintes músicas foram tocadas nos últimos 30 dias e NÃO devem ser repetidas hoje: ${config.recentSongs.join(", ")}.`
    : "";

  const systemInstruction = `
    Você é um experiente Ministro de Louvor e Teólogo. 
    Sua tarefa é gerar um repertório de louvor cristão edificante com exatamente ${totalSongs} músicas.
    O repertório DEVE conter: ${categoriesDescription}.
    ${recentSongsBlock}
    Para cada música, forneça nome e artista.
    Para cada música, forneça uma ministração profética, curta e bíblica que o ministro deve falar antes de começar a cantar.
    Idiomas: Português Brasileiro.
    Contexto adicional: ${config.globalPrompt}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere o repertório: ${categoriesDescription}.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: repertorySchema,
    },
  });

  const rawData = JSON.parse(response.text || "[]");
  return rawData.map((s: any) => ({ ...s, id: Math.random().toString(36).substr(2, 9) }));
};

export const regenerateSong = async (
  currentSong: SongItem,
  globalPrompt: string,
  individualPrompt: string,
  recentSongs: string[] = []
): Promise<SongItem> => {
  const systemInstruction = `
    Você está ajustando uma música específica. 
    Música anterior: "${currentSong.title}" - ${currentSong.artist}.
    ${recentSongs.length > 0 ? `NÃO use: ${recentSongs.join(", ")}.` : ""}
    Instrução: ${individualPrompt}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Troque a música atendendo ao pedido: ${individualPrompt}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: songSchema,
    },
  });

  const rawData = JSON.parse(response.text || "{}");
  return { ...rawData, id: Math.random().toString(36).substr(2, 9) };
};
