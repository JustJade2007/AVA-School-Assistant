import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AnalysisResult, ExternalContext } from '../types';

const FALLBACK_MODEL = "gemini-flash-lite-latest";

/**
 * Validates if the selected model supports the provided context types.
 */
const validateModelSupport = (modelName: string, context: ExternalContext[]): string | null => {
  const isLegacyModel = modelName.includes('1.0'); // Example of a model that might have limited support
  
  for (const item of context) {
    const isVideo = item.type === 'video' || (item.type === 'link' && /\.(mp4|mov|avi|wmv|3gp|mpg|flv)$/i.test(item.value));
    const isImage = item.type === 'image' || (item.type === 'link' && /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(item.value));
    const isPDF = item.type === 'pdf' || (item.type === 'link' && /\.pdf$/i.test(item.value));

    if (isLegacyModel) {
      if (isVideo || isImage || isPDF) {
        return `Model "${modelName}" does not support multimodal context (Images/Video/PDF). Please switch to a newer model like Gemini Flash or Pro.`;
      }
    }
  }
  return null;
};

export const analyzeScreenFrame = async (
  base64Image: string, 
  modelName: string, 
  apiKey?: string,
  onProgress?: (message: string, type?: 'info' | 'warning' | 'success' | 'error') => void,
  ocrText?: string,
  externalContext: ExternalContext[] = [],
  customInstructions?: string
): Promise<AnalysisResult> => {
  // Validate model support for external context
  const supportError = validateModelSupport(modelName, externalContext);
  if (supportError) {
    return {
      hasQuestion: false,
      questions: [],
      questionText: null,
      options: [],
      reasoning: null,
      suggestedAction: null,
      error: supportError
    };
  }

  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });

  try {
    const prompt = `
      Perform a technical analysis of this screen capture:
      ${ocrText ? `REFERENCE TEXT (Extracted via OCR): "${ocrText}"` : ''}
      1. Identify ALL educational assessment content (questions/quizzes) visible on the screen. It is CRITICAL to capture every single question, not just the first one.
      2. Support and categorize multiple question types:
         - 'multiple-choice': Standard format.
         - 'matching': Return correct pairs as options (e.g. "Paris -> France") with isCorrect=true.
         - 'categories': Return items grouped by category (e.g. "Apple -> Fruit") with isCorrect=true.
         - 'fill-in-the-blank': For sentences with a blank (e.g., "The capital of France is ____"). Return the missing word(s) as the correct option.
         - 'multiple-options': Questions with multiple correct answers.
      3. For EACH question detected:
         - Assign the correct 'type' from the list above.
         - Extract the 'questionText' accurately (concise, no options or UI noise). For fill-in-the-blank, ensure the blank is represented as "____".
         - Transcribe all visible 'options' accurately. For Matching/Categories, format them as clear pairs/groups.
         - Determine the logically correct option(s). IMPORTANT: Ignore any existing selections or highlights in the image.
         - Assign a 'confidenceScore' (0.0 to 1.0) to each option.
         - Provide a brief 'reasoning' (justification).
         - Define the normalized 'boundingBox' (ymin, xmin, ymax, xmax).
      
      ${customInstructions ? `USER CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}

      If no questions are detected, set hasQuestion to false and 'questions' to an empty array.
      If questions ARE detected, set hasQuestion to true and populate the 'questions' array.
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
        const useStrictSchema = !isLastAttempt;

        if (onProgress) {
            onProgress(`Analysis Attempt ${attempt}/${maxRetries} using [${currentModel}]${!useStrictSchema ? ' (Schema-less Fallback)' : ''}...`, 'info');
        }

        const cleanBase64 = base64Image.includes('base64,') ? base64Image.split('base64,')[1] : base64Image;

        const requestPrompt = useStrictSchema ? prompt : `${prompt}
          Return JSON in this EXACT format:
          {
            "hasQuestion": boolean,
            "questions": [
              {
                "type": "string",
                "questionText": "string",
                "options": [{"text": "string", "isCorrect": boolean, "confidenceScore": number}],
                "reasoning": "string",
                "suggestedAction": "string",
                "boundingBox": {"ymin": number, "xmin": number, "ymax": number, "xmax": number}
              }
            ]
          }
        `;

        const isProbeAttempt = attempt === maxRetries;
        const currentPrompt = isProbeAttempt 
            ? "Transcribe all visible text in this image accurately. Do not attempt to solve or evaluate it. Return ONLY the transcribed text."
            : requestPrompt;

        const contextParts: any[] = [];
        contextParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });

        for (const item of externalContext) {
          if (item.type === 'image' || item.type === 'pdf' || item.type === 'video') {
            const cleanData = item.value.includes('base64,') ? item.value.split('base64,')[1] : item.value;
            contextParts.push({
              inlineData: {
                mimeType: item.mimeType || (item.type === 'pdf' ? 'application/pdf' : item.type === 'video' ? 'video/mp4' : 'image/jpeg'),
                data: cleanData
              }
            });
          } else if (item.type === 'link') {
            contextParts.push({ text: `External Link Context (${item.name}): ${item.value}` });
          } else if (item.type === 'text') {
            contextParts.push({ text: `External Text Context: ${item.value}` });
          }
        }

        contextParts.push({ text: currentPrompt });

        const result = await ai.models.generateContent({
          model: currentModel,
          contents: { parts: contextParts },
          config: {
            ...(useStrictSchema && !isProbeAttempt ? {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    hasQuestion: { type: Type.BOOLEAN },
                    questions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          type: { type: Type.STRING },
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
                        required: ["type", "questionText", "options"]
                      }
                    }
                  },
                  required: ["hasQuestion", "questions"]
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

        text = (result.text || (result.candidates?.[0]?.content?.parts?.[0]?.text))?.trim();

        if (text && text.length > 0) {
          if (isProbeAttempt) {
             return {
                hasQuestion: true,
                questions: [],
                questionText: text,
                options: [],
                reasoning: "DIAGNOSTIC PROBE SUCCESS",
                suggestedAction: null,
                modelUsed: currentModel,
                attempts: attempt
             };
          }
          const cleanedText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleanedText) as AnalysisResult;
          
          if (parsed.hasQuestion && parsed.questions && parsed.questions.length > 0) {
            const first = parsed.questions[0];
            parsed.questionText = first.questionText;
            parsed.options = first.options;
            parsed.reasoning = first.reasoning;
            parsed.suggestedAction = first.suggestedAction;
            parsed.boundingBox = first.boundingBox;
          } else {
            parsed.questions = parsed.questions || [];
          }

          return {
             ...parsed,
             modelUsed: currentModel,
             attempts: attempt
          };
        }
        throw new Error("Empty response");
      } catch (error: any) {
        if (attempt >= maxRetries) throw error;
        if (currentModel !== FALLBACK_MODEL && attempt >= 2) currentModel = FALLBACK_MODEL;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error("Neural link failed");
  } catch (error: any) {
    return {
      hasQuestion: false,
      questions: [],
      questionText: null,
      options: [],
      reasoning: null,
      suggestedAction: null,
      error: error.message || String(error)
    };
  }
};

export const checkForNewQuestion = async (currentBase64: string, previousBase64: string | null, modelName: string = "gemini-flash-lite-latest", apiKey?: string): Promise<{ isNew: boolean, currentText: string, reason?: string, error?: string }> => {
  const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
  try {
    const cleanCurrent = currentBase64.includes('base64,') ? currentBase64.split('base64,')[1] : currentBase64;
    const cleanPrevious = previousBase64?.includes('base64,') ? previousBase64.split('base64,')[1] : null;
    const prompt = `Compare these two screenshots... (truncated for brevity in instruction, keeping logic)`;
    // I should actually keep the full prompt logic for checkForNewQuestion
    const fullPrompt = `
      Compare these two screenshots of a user's screen.
      
      Image 1 (Optional): Previous stable question screen.
      Image 2: Current screen.
      
      Instructions:
      1. Identify if Image 2 contains a multiple-choice question. If NO question is detected in Image 2, set "isNew" to false and return immediately.
      2. If Image 2 shows the EXACT SAME question as Image 1, set "isNew" to false.
      3. If Image 2 shows the SAME question but with added feedback (e.g. "Correct!", "Incorrect", answer revealed, score update, or a mouse cursor), set "isNew" to false.
      4. If Image 2 shows a FUNDAMENTALLY DIFFERENT question than Image 1, set "isNew" to true.
      5. If Image 1 is missing or blank, and Image 2 has a question, set "isNew" to true.
      6. Extract the text of the question in Image 2.
      7. Provide a short reason for your decision.
      
      Return JSON: { "isNew": boolean, "currentText": string, "reason": string }
    `;

    const parts: any[] = [];
    if (cleanPrevious) parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanPrevious } });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanCurrent } });
    parts.push({ text: fullPrompt });

    const result = await ai.models.generateContent({
      model: modelName, 
      contents: { parts: parts },
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
        }
      }
    });

    const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { isNew: false, currentText: "" };
    return JSON.parse(text.replace(/^```json\s*/, '').replace(/\s*```$/, ''));
  } catch (error: any) {
    return { isNew: false, currentText: "", error: error.message || String(error) };
  }
};
