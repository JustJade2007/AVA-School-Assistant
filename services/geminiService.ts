import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

export const analyzeScreenFrame = async (base64Image: string, modelName: string): Promise<AnalysisResult> => {
  // Create a new instance right before making an API call to ensure 
  // it uses the most up-to-date API key (especially after a key switch).
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `
      Analyze this image. It is a screenshot of a user's screen.
      1. Detect if there is a multiple-choice question or a quiz visible.
      2. If found, identify the question text and all available options.
      3. Determine the correct answer based on your knowledge.
      4. Provide a confidence score (0.0 to 1.0) for your answer.
      5. Briefly explain the reasoning.
      6. Identify the bounding box for the entire question block (question text + options). Return as normalized coordinates (0-1).
      
      If no question is found, set hasQuestion to false.
      Return ONLY valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasQuestion: { type: Type.BOOLEAN, description: "Whether a question was detected on screen." },
            questionText: { type: Type.STRING, description: "The text of the question, if found." },
            reasoning: { type: Type.STRING, description: "Why this answer was chosen." },
            suggestedAction: { type: Type.STRING, description: "A short action directive, e.g., 'Click Option A'" },
            boundingBox: {
               type: Type.OBJECT,
               description: "The bounding box of the detected question area (ymin, xmin, ymax, xmax). Normalized 0 to 1.",
               properties: {
                 ymin: { type: Type.NUMBER },
                 xmin: { type: Type.NUMBER },
                 ymax: { type: Type.NUMBER },
                 xmax: { type: Type.NUMBER }
               },
               required: ["ymin", "xmin", "ymax", "xmax"]
            },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                  confidenceScore: { type: Type.NUMBER }
                },
                required: ["text", "isCorrect", "confidenceScore"],
                propertyOrdering: ["text", "isCorrect", "confidenceScore"]
              }
            }
          },
          required: ["hasQuestion", "options"],
          propertyOrdering: ["hasQuestion", "questionText", "options", "reasoning", "suggestedAction", "boundingBox"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini API");
    }

    const cleanedText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(cleanedText) as AnalysisResult;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    let errorMessage = "Unknown Error";

    if (error.message && error.message.includes('{')) {
        try {
            const match = error.message.match(/\{.*\}/s);
            if (match) {
                const errorObj = JSON.parse(match[0]);
                if (errorObj.error) {
                    if (errorObj.error.code === 429 || errorObj.error.status === 'RESOURCE_EXHAUSTED') {
                        errorMessage = "Quota Exceeded (429): Use 'Advanced Settings' to switch to a paid Billing Project for more tokens.";
                    } else if (errorObj.error.code === 404) {
                        errorMessage = `Model "${modelName}" not found or unauthorized.`;
                    } else {
                        errorMessage = `${errorObj.error.message} (${errorObj.error.code})`;
                    }
                }
            }
        } catch (e) {
            errorMessage = error.message;
        }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    } else {
        errorMessage = String(error);
    }
    
    if (errorMessage.includes('429')) errorMessage = "Quota Exceeded: Please switch to a personal API key/project in Advanced Settings.";

    return {
      hasQuestion: false,
      questionText: null,
      options: [],
      reasoning: null,
      suggestedAction: null,
      error: errorMessage
    };
  }
};