

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

export interface AnalysisResult {
  hasQuestion: boolean;
  questionText: string | null;
  options: QuestionOption[];
  reasoning: string | null;
  suggestedAction: string | null;
  boundingBox?: BoundingBox | null;
  error?: string; // API Error message
}

export interface AppSettings {
  // Master switch
  automationEnabled: boolean;
  
  // Triggers
  triggerTime: boolean;
  triggerSmart: boolean; // Uses local OCR to detect text change

  // Config
  scanIntervalMs: number; // For triggerTime
  smartScanDelay: number; // For triggerSmart (debounce after change)
  smartScanSensitivity: number; // 1-100 (Threshold for what counts as text change)
  
  confidenceThreshold: number;
  autoSelect: boolean; // Simulates clicking

  // Advanced / Appearance
  showLogs: boolean;
  themeMode: 'dark' | 'light';
  simplifiedMode: boolean; // Disables animations
  modelName: string; // The specific Gemini model to use
  speakAnswer: boolean; // Read answer out loud
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
}

/**
 * Interface for the AI Studio key selection utility.
 * Removed local definition to avoid shadowing global AIStudio type.
 */

// Extend the global window object
declare global {
  interface Window {
    electronAPI?: {
      performAction: (action: string, options: QuestionOption[]) => void;
    };
    Tesseract?: any;
    // Removed redundant aistudio declaration as it is already defined on the global Window interface
    // by the environment, which was causing "identical modifiers" and "same type" conflicts.
  }
}