
import { GoogleGenAI, Type } from "@google/genai";
import { Category, SongItem, GeneratorConfig } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const songSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    artist: { type: Type.STRING },
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

  const systemInstruction = `
    Você é um Ministro de Louvor sênior organizando um culto com a seguinte sequência litúrgica FIXA:
    
    1. ABERTURA (Harpa Cristã): Hinos tradicionais para iniciar o culto.
    2. LOUVOR PRINCIPAL (Jornada do Tabernáculo):
       - O CAMINHO (Átrio): Celebração e Gratidão.
       - A VERDADE (Lugar Santo): Santidade e Palavra.
       - A VIDA (Santo dos Santos): Intimidade e Glória.
    3. DÍZIMOS E OFERTAS: Músicas de gratidão, fidelidade e entrega.

    Sua tarefa é gerar as músicas na ordem correta da liturgia acima.
    Para cada música, crie uma ministração profética curta.
    Evite repetir músicas tocadas nos últimos 30 dias: ${config.recentSongs?.join(", ") || "Nenhuma"}.
    Contexto: ${config.globalPrompt}.
    Idioma: Português Brasileiro.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere o repertório completo seguindo a sequência Harpa -> Louvor (Tabernáculo) -> Dízimos para as quantidades: ${categoriesDescription}.`,
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
    Substitua esta música respeitando seu lugar na liturgia (Categoria: ${currentSong.category}).
    Instrução: ${individualPrompt}
    Não use: ${recentSongs.join(", ")}.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Substitua "${currentSong.title}" por outra música adequada para o momento de ${currentSong.category}.`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: songSchema,
    },
  });

  const rawData = JSON.parse(response.text || "{}");
  return { ...rawData, id: Math.random().toString(36).substr(2, 9) };
};
