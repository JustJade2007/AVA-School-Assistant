
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AnalysisResult } from '../types';

const FALLBACK_MODEL = "gemini-flash-lite-latest";

export const analyzeScreenFrame = async (
  base64Image: string, 
  modelName: string, 
  apiKey?: string,
  onProgress?: (message: string, type?: 'info' | 'warning' | 'success' | 'error') => void,
  ocrText?: string
): Promise<AnalysisResult> => {
  // Create a new instance right before making an API call to ensure 
  // it uses the most up-to-date API key (especially after a key switch).
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });

  try {
    const prompt = `
      Perform a technical analysis of this screen capture:
      ${ocrText ? `REFERENCE TEXT (Extracted via OCR): "${ocrText}"` : ''}
      1. Identify educational assessment content (questions/quizzes).
      2. ${ocrText ? "Review the provided REFERENCE TEXT and the image." : "Transcribe question text and all visible options accurately."}
      3. Determine the logically correct option based on standard knowledge.
      4. Assign a confidence score (0.0 to 1.0).
      5. Provide a brief justification (reasoning) for the selection.
      6. Define the normalized bounding box (ymin, xmin, ymax, xmax) for the question area.
      
      ${ocrText ? "IMPORTANT: Do NOT repeat the question text verbatim in your response to avoid copyright blocks. Set questionText to 'USE_LOCAL_OCR'." : ""}
      If no question is detected, set hasQuestion to false.
      Return strictly as valid JSON.
    `;

    let text: string | undefined;
    let attempt = 0;
    const maxRetries = 3;
    let currentModel = modelName;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const isLastAttempt = attempt === maxRetries;
        const useStrictSchema = !isLastAttempt; // Use schema for first 2 attempts, then try schema-less for final attempt

        if (onProgress) {
            onProgress(`Analysis Attempt ${attempt}/${maxRetries} using [${currentModel}]${!useStrictSchema ? ' (Schema-less Fallback)' : ''}...`, 'info');
        }

        // Robust base64 cleanup
        const cleanBase64 = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

        const requestPrompt = useStrictSchema ? prompt : `${prompt}
          Return JSON in this EXACT format:
          {
            "hasQuestion": boolean,
            "questionText": "string",
            "options": [{"text": "string", "isCorrect": boolean, "confidenceScore": number}],
            "reasoning": "string",
            "suggestedAction": "string",
            "boundingBox": {"ymin": number, "xmin": number, "ymax": number, "xmax": number}
          }
        `;

        const isProbeAttempt = attempt === maxRetries;
        const currentPrompt = isProbeAttempt 
            ? "Transcribe all visible text in this image accurately. Do not attempt to solve or evaluate it. Return ONLY the transcribed text."
            : requestPrompt;

        const result = await ai.models.generateContent({
          model: currentModel,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64
                }
              },
              { text: currentPrompt }
            ]
          },
          config: {
            // Only use strict JSON mode for the first few attempts (and not for probe)
            ...(useStrictSchema && !isProbeAttempt ? {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    hasQuestion: { type: Type.BOOLEAN },
                    questionText: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    suggestedAction: { type: Type.STRING },
                    boundingBox: {
                       type: Type.OBJECT,
                       properties: {
                         ymin: { type: Type.NUMBER }, xmin: { type: Type.NUMBER }, ymax: { type: Type.NUMBER }, xmax: { type: Type.NUMBER }
                       }
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
                        required: ["text", "isCorrect", "confidenceScore"]
                      }
                    }
                  },
                  required: ["hasQuestion", "options"]
                }
            } : {}),
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
          }
        });

        // Robust text extraction
        text = (result.text || (result.candidates?.[0]?.content?.parts?.[0]?.text))?.trim();

        if (text && text.length > 0) {
          if (isProbeAttempt) {
             // Diagnostic Probe Success
             if (onProgress) onProgress(`Diagnostic Probe Success! Text found: ${text.substring(0, 30)}...`, 'success');
             return {
                hasQuestion: true,
                questionText: text,
                options: [],
                reasoning: "DIAGNOSTIC PROBE SUCCESS: Model is willing to transcribe, but refusal occurs during solving.",
                suggestedAction: null,
                modelUsed: currentModel,
                attempts: attempt
             };
          }
          const cleanedText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleanedText) as AnalysisResult;
          return {
             ...parsed,
             modelUsed: currentModel,
             attempts: attempt
          };
        }
        
        // Deep diagnostics for empty response
        const diag = {
            finishReason: result.candidates?.[0]?.finishReason,
            safetyRatings: result.candidates?.[0]?.safetyRatings,
            hasCandidates: !!result.candidates?.length,
            partsCount: result.candidates?.[0]?.content?.parts?.length || 0,
            hasContent: !!result.candidates?.[0]?.content
        };
        
        console.warn("Gemini Diagnostic Info:", diag);
        if (onProgress) {
            onProgress(`DEBUG: Finish=${diag.finishReason} Candidates=${diag.hasCandidates} Content=${diag.hasContent}`, 'error');
        }
        
        throw new Error(`Empty response (${diag.finishReason || 'unknown'})`);

      } catch (error: any) {
        const errorMsg = error.message || String(error);
        const isOverloaded = errorMsg.includes('503') || errorMsg.toLowerCase().includes('overloaded') || errorMsg.includes('SERVICE_UNAVAILABLE');
        const isEmpty = errorMsg.includes("Empty response");
        
        if (onProgress) {
            onProgress(`Attempt ${attempt} Failed: ${isOverloaded ? 'Model Overloaded' : (isEmpty ? 'Empty Response' : 'API Error')}`, 'warning');
        }

        if (attempt >= maxRetries) {
          throw error;
        }

        // Determine if we should switch to fallback
        if (currentModel !== FALLBACK_MODEL && (isOverloaded || isEmpty || attempt >= 2)) {
            if (onProgress) onProgress(`Switching to stable fallback: ${FALLBACK_MODEL}`, 'info');
            currentModel = FALLBACK_MODEL;
        }

        // Exponential backoff
        const delay = 1000 * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error("Neural link failed after multiple attempts.");

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

export const checkForNewQuestion = async (currentBase64: string, previousBase64: string | null, apiKey?: string): Promise<{ isNew: boolean, currentText: string, reason?: string, error?: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });

  try {
    // Ensure base64 is raw (no data URI prefix)
    const cleanCurrent = currentBase64.includes('base64,') ? currentBase64.split('base64,')[1] : currentBase64;
    const cleanPrevious = previousBase64?.includes('base64,') ? previousBase64.split('base64,')[1] : null;

    const prompt = `
      Compare these two screenshots of a user's screen.
      
      Image 1 (Optional): Previous stable question screen.
      Image 2: Current screen.
      
      Instructions:
      1. Identify the multiple-choice question in both images.
      2. If Image 2 shows the EXACT SAME question as Image 1, set "isNew" to false.
      3. If Image 2 shows the SAME question but with added feedback (e.g. "Correct!", "Incorrect", answer revealed, score update, or a mouse cursor), set "isNew" to false.
      4. If Image 2 shows a FUNDAMENTALLY DIFFERENT question than Image 1, set "isNew" to true.
      5. If Image 1 is missing or blank, and Image 2 has a question, set "isNew" to true.
      6. Extract the text of the question in Image 2.
      7. Provide a short reason for your decision.
      
      Return JSON: { "isNew": boolean, "currentText": string, "reason": string }
    `;

    const parts: any[] = [];
    if (cleanPrevious) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanPrevious } });
    }
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanCurrent } });
    parts.push({ text: prompt });

    let text: string | undefined;
    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
      try {
        const result = await ai.models.generateContent({
          model: "gemini-flash-lite-latest", 
          contents: {
            parts: parts
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isNew: { type: Type.BOOLEAN },
                currentText: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["isNew", "currentText", "reason"]
            },
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
          }
        });

        // Robust text extraction
        text = result.text || 
               (result.candidates?.[0]?.content?.parts?.[0]?.text);

        if (text) break;
        throw new Error("Empty response received from Gemini API");
      } catch (error: any) {
        attempt++;
        if (attempt >= maxRetries || error.message !== "Empty response received from Gemini API") {
          throw error;
        }
        console.warn(`Gemini API empty response, retrying (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!text) return { isNew: false, currentText: "" };
    const clean = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(clean);

  } catch (error: any) {
    console.error("Smart Check Error:", error);
    return { isNew: false, currentText: "", error: error.message || String(error) };
  }
};
