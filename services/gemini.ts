// services/gemini.ts

// Note: Google GenAI imports removed to prevent build errors if dependencies or keys are missing.
// import { GoogleGenAI, Type } from "@google/genai"; 

/**
 * Generates a high-quality image for the course cover using Imagen.
 * (MOCKED: Returns null to avoid API usage)
 */
export const generateCoverImage = async (prompt: string): Promise<string | null> => {
  console.log("AI (Imagen) disabled. Prompt:", prompt);
  return null;
};

/**
 * Analyzes a video file to extract key takeaways or summary.
 * (MOCKED: Returns a static string)
 */
export const analyzeVideoContent = async (file: File, prompt: string): Promise<string> => {
  console.log("AI (Video) disabled. Prompt:", prompt);
  return "AI-analyse er midlertidig deaktivert for å sikre stabil drift av applikasjonen. (Dette er en simulert respons).";
};

/**
 * Chat with the AI assistant using Gemini 3 Pro.
 * (MOCKED: Returns a friendly 'offline' message)
 */
export const chatWithAI = async (history: { role: string; text: string }[], message: string): Promise<string> => {
  console.log("AI (Chat) disabled. Message:", message);
  return "Hei! Jeg er for tiden i hvilemodus mens systemene oppdateres. Jeg kan dessverre ikke gi deg et AI-generert svar akkurat nå, men kos deg med kurset!";
};

/**
 * Uses Thinking Mode to act as a "Course Architect".
 * (MOCKED: Returns a static JSON structure)
 */
export const generateCourseStructure = async (topic: string): Promise<string> => {
  console.log("AI (Structure) disabled. Topic:", topic);
  
  // Return a mock structure so the UI doesn't break
  const mockStructure = {
      title: topic || "Nytt Kurs",
      description: `En strukturert gjennomgang av ${topic || "emnet"}. (AI-generering er deaktivert)`,
      acts: [
          {
              title: "Del 1: Grunnlaget",
              description: "Introduksjon til de viktigste konseptene."
          },
          {
              title: "Del 2: Fordypning",
              description: "Vi går dypere inn i materien og utforsker nyansene."
          },
          {
              title: "Del 3: Mestring",
              description: "Hvordan anvende kunnskapen i praksis."
          }
      ]
  };
  
  return JSON.stringify(mockStructure);
};

/**
 * Helper to simulate "Magic Paste" intelligence.
 * (MOCKED: Only fetches YouTube thumbnail, no text summarization)
 */
export const enrichBlockContent = async (content: string): Promise<{title: string, description: string, thumbnail?: string}> => {
    // Extract YouTube ID if present to get thumbnail (Logic works without API key)
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = content.match(regExp);
    const youtubeId = (match && match[2].length === 11) ? match[2] : null;
    
    let thumbnail = undefined;
    if (youtubeId) {
        thumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    }

    // Mock return without AI call
    return { 
        title: "Ny Innholdsblokk", 
        description: "Beskrivelse hentes automatisk (AI deaktivert)", 
        thumbnail 
    };
}