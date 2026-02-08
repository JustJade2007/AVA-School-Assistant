

export interface QuestionOption {
  text: string;
  isCorrect: boolean;
  confidenceScore: number; // 0 to 1
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface QuestionData {
  type?: 'multiple-choice' | 'matching' | 'categories' | 'fill-in-the-blank' | 'multiple-options';
  questionText: string | null;
  options: QuestionOption[];
  reasoning: string | null;
  suggestedAction: string | null;
  boundingBox?: BoundingBox | null;
}

export interface AnalysisResult {
  hasQuestion: boolean;
  questions: QuestionData[]; // Support multiple questions
  error?: string; // API Error message
  modelUsed?: string;
  attempts?: number;
  
  // Legacy support for single question access
  questionText?: string | null;
  options?: QuestionOption[];
  reasoning?: string | null;
  suggestedAction?: string | null;
  boundingBox?: BoundingBox | null;
}

export interface ExternalContext {
  id: string;
  type: 'link' | 'image' | 'pdf' | 'video' | 'text';
  value: string; // URL, Base64, or Raw Text
  name: string;
  mimeType?: string;
}

export interface AppSettings {
  // Master switch
  automationEnabled: boolean;
  
  // Triggers
  triggerTime: boolean;
  triggerSmart: boolean; // Uses AI to detect text change
  triggerHybrid: boolean; // Uses local OCR to filter static screens before AI check

  // Config
  scanIntervalMs: number; // For triggerTime
  smartScanDelay: number; // For triggerSmart (debounce after change)
  smartScanSensitivity: number; // 1-100 (Threshold for local OCR change detection)
  
  confidenceThreshold: number;
  autoSelect: boolean; // Simulates clicking

  // Advanced / Appearance
  showLogs: boolean;
  themeMode: 'dark' | 'light';
  simplifiedMode: boolean; // Disables animations
  modelName: string; // The specific Gemini model to use
  speakAnswer: boolean; // Read answer out loud
  debugMode: boolean; // Show verbose logs for OCR/AI
  apiKey?: string; // Custom Gemini API Key
  customInstructions?: string; // Custom AI Instructions
  externalContext: ExternalContext[];
  showThinking: boolean; // Show AI thinking while generating
  alwaysShowThinking: boolean; // Show AI thinking after answer is displayed
}

export enum AppState {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  ANALYZING = 'ANALYZING',
  ERROR = 'ERROR'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  count?: number;
}

/**
 * Interface for the AI Studio key selection utility.
 */

// Extend the global window object
declare global {
  interface Window {
    electronAPI?: {
      performAction: (action: string, options: QuestionOption[]) => void;
    };
    Tesseract?: any;
    aistudio?: {
      openSelectKey: () => Promise<void>;
    };
  }
}
