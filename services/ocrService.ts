// Simple wrapper around Tesseract.js
// We assume Tesseract is loaded globally via index.html script tag

let worker: any = null;

export const initializeOCR = async () => {
  if (!window.Tesseract) {
    throw new Error("Tesseract.js not loaded");
  }
  if (!worker) {
    worker = await window.Tesseract.createWorker('eng');
  }
  return worker;
};

export const detectText = async (base64Image: string): Promise<string> => {
  try {
    if (!worker) {
       await initializeOCR();
    }
    
    // Perform OCR
    const ret = await worker.recognize(base64Image);
    const text = ret.data.text;
    
    // Basic cleanup
    return text.trim();
  } catch (err) {
    console.error("OCR Error:", err);
    return "";
  }
};

export const calculateTextSimilarity = (text1: string, text2: string): number => {
    // Simple Jaccard similarity on words for speed
    if (!text1 || !text2) return 0;
    
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
};