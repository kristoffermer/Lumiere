import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini client
// API Key is injected via process.env.API_KEY
// We provide a fallback check to prevent immediate crash if key is missing
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn("Advarsel: Ingen API_KEY funnet i miljøvariabler. AI-funksjoner vil ikke fungere.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "dummy-key-for-init" });

/**
 * Generates a high-quality image for the course cover using Imagen.
 */
export const generateCoverImage = async (prompt: string): Promise<string | null> => {
  if (!apiKey) return null;
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Cinematic, high-resolution editorial photography style: ${prompt}. Soft lighting, minimalist, aesthetic, 4k.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

/**
 * Analyzes a video file to extract key takeaways or summary.
 * Uses gemini-3-pro-preview for video understanding.
 */
export const analyzeVideoContent = async (file: File, prompt: string): Promise<string> => {
  if (!apiKey) return "API-nøkkel mangler. Vennligst konfigurer .env filen.";
  try {
    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          { text: prompt + " Answer in Norwegian." }
        ]
      }
    });

    return response.text || "Kunne ikke analysere videoen.";
  } catch (error) {
    console.error("Error analyzing video:", error);
    return "Feil under videoanalyse. Vennligst prøv igjen.";
  }
};

/**
 * Chat with the AI assistant using Gemini 3 Pro.
 * Handles general queries from students.
 */
export const chatWithAI = async (history: { role: string; text: string }[], message: string): Promise<string> => {
  if (!apiKey) return "Jeg mangler dessverre tilkobling til hjernen min (API-nøkkel mangler).";
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: "Du er en hjelpsom, varm og intellektuell lærerassistent ved navn 'Lumière'. Du hjelper studenter med å forstå kursmateriell med klarhet og dybde. Hold svarene konsise, men innsiktsfulle. Svar alltid på norsk.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const response = await chat.sendMessage({ message });
    return response.text || "Jeg reflekterer over det...";
  } catch (error) {
    console.error("Chat error:", error);
    return "Jeg har problemer med å koble til kunnskapsbasen akkurat nå.";
  }
};

/**
 * Uses Thinking Mode to act as a "Course Architect".
 * Helps the creator structure their course.
 */
export const generateCourseStructure = async (topic: string): Promise<string> => {
  if (!apiKey) return JSON.stringify({ title: "Mangler API Nøkkel", description: "Sjekk .env filen din", acts: [] });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Lag en filmatisk, narrativ-drevet kursoversikt for emnet: "${topic}". 
      Gi en Tittel (Title), en poetisk Beskrivelse (Description), og 3 distinkte "Akter" (Acts / sections) som forteller en historie.
      Output må være på Norsk (Norwegian).
      Format the output as JSON.`,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            acts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return response.text || "{}";
  } catch (error) {
    console.error("Thinking error:", error);
    return "{}";
  }
};

/**
 * Helper to simulate "Magic Paste" intelligence (extracting metadata from text/url context).
 * Also fetches YouTube Thumbnails.
 */
export const enrichBlockContent = async (content: string): Promise<{title: string, description: string, thumbnail?: string}> => {
    // Extract YouTube ID if present to get thumbnail
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = content.match(regExp);
    const youtubeId = (match && match[2].length === 11) ? match[2] : null;
    
    let thumbnail = undefined;
    if (youtubeId) {
        thumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    }

    if (!apiKey) return { title: "Innhold", description: "Beskrivelse (AI Utilgjengelig)", thumbnail };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `I have a link or text content: "${content}". 
            If it's a YouTube link, generate a catchy, educational title and a 1-sentence summary description for it. 
            If it's text, summarize it into a title and description.
            Answer in Norwegian.
            Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING }
                    }
                }
            }
        });
        const data = JSON.parse(response.text || '{"title": "Ny Blokk", "description": ""}');
        return { ...data, thumbnail };
    } catch (e) {
        return { title: "Innholdsblokk", description: "Lagt til innhold", thumbnail };
    }
}