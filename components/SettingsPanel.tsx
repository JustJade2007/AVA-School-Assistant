import React, { useState } from 'react';
import { AppSettings, LogEntry } from '../types';
import { Sliders, Zap, MousePointer2, Eye, Timer, PlayCircle, ChevronDown, ChevronUp, Trash2, Sun, Moon, MonitorOff, Activity, Key, Cpu, Sparkles, Volume2 } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  onLog: (message: string, type?: LogEntry['type']) => void;
  onClearLogs: () => void;
}

const GEMINI_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Default: Fast & Balanced' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', desc: 'Premium: Best for complex logic' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', desc: 'Eco: Highly efficient' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, updateSettings, onLog, onClearLogs }) => {
  const [showAdvanced, setShowAdvanced] = useState(