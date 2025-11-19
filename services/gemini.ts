import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini client
// API Key is injected via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a high-quality image for the course cover using Imagen.
 */
export const generateCoverImage = async (prompt: string): Promise<string | null> => {
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
          { text: prompt }
        ]
      }
    });

    return response.text || "Could not analyze video.";
  } catch (error) {
    console.error("Error analyzing video:", error);
    return "Error analyzing video content. Please try again.";
  }
};

/**
 * Chat with the AI assistant using Gemini 3 Pro.
 * Handles general queries from students.
 */
export const chatWithAI = async (history: { role: string; text: string }[], message: string): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        systemInstruction: "You are a helpful, warm, and intellectual teaching assistant named 'Lumière'. You help students understand course material with clarity and depth. Keep responses concise but insightful.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const response = await chat.sendMessage({ message });
    return response.text || "I'm reflecting on that...";
  } catch (error) {
    console.error("Chat error:", error);
    return "I'm having trouble connecting to the knowledge base right now.";
  }
};

/**
 * Uses Thinking Mode to act as a "Course Architect".
 * Helps the creator structure their course.
 */
export const generateCourseStructure = async (topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Create a cinematic, narrative-driven course outline for the topic: "${topic}". 
      Provide a Title, a poetic Description, and 3 distinct "Acts" (sections) that tell a story.
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

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `I have a link or text content: "${content}". 
            If it's a YouTube link, generate a catchy, educational title and a 1-sentence summary description for it. 
            If it's text, summarize it into a title and description.
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
        const data = JSON.parse(response.text || '{"title": "New Block", "description": ""}');
        return { ...data, thumbnail };
    } catch (e) {
        return { title: "Content Block", description: "Added content", thumbnail };
    }
}