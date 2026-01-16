import React, { useState } from 'react';
import { AppSettings, LogEntry, ExternalContext } from '../types';
import { Sliders, Zap, MousePointer2, Eye, Timer, PlayCircle, ChevronDown, ChevronUp, Trash2, Sun, Moon, MonitorOff, Activity, Key, Cpu, Sparkles, Volume2, Link, FileText, Image as ImageIcon, Video as VideoIcon, X, Plus, AlignLeft, Download, MessageSquareText, Brain, BrainCircuit } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  onLog: (message: string, type?: LogEntry['type']) => void;
  onClearLogs: () => void;
  logs: LogEntry[];
}

const GEMINI_MODELS = [
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Next-Gen: Advanced reasoning & logic' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Next-Gen: Ultra-fast intelligence' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Preview: Fast & Balanced' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', desc: 'Premium: Best for complex logic' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', desc: 'Default: Highly efficient' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, updateSettings, onLog, onClearLogs, logs }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showExtensionGuide, setShowExtensionGuide] = useState(false);
  const isLight = settings.themeMode === 'light';

  const handleToggle = (key: keyof AppSettings, label: string) => {
    const newValue = !settings[key];
    updateSettings({ [key]: newValue });
    onLog(`${label} ${newValue ? 'ENABLED' : 'DISABLED'}`, 'info');
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    updateSettings({ modelName: newModel });
    onLog(`System Model: ${newModel}`, 'success');
  };

  const handleChangeKey = async () => {
    if (window.aistudio) {
      try {
        onLog("Opening Secure Key Selector...", 'info');
        await window.aistudio.openSelectKey();
        onLog("New Billing Project Active.", 'success');
        return;
      } catch (err) {
        onLog("Selection failed.", 'warning');
      }
    }
    
    // Fallback to manual entry
    setShowKeyInput(!showKeyInput);
    if (!showKeyInput) {
       onLog("Manual Key Entry Enabled.", 'info');
    }
  };

  const [contextInput, setContextInput] = useState('');
  const [isTextInput, setIsTextInput] = useState(false);

  const handleAddLink = () => {
    if (!contextInput) return;
    const newContext: ExternalContext = {
      id: Math.random().toString(36).substr(2, 9),
      type: isTextInput ? 'text' : 'link',
      value: contextInput,
      name: isTextInput ? (contextInput.substring(0, 20) + (contextInput.length > 20 ? '...' : '')) : (contextInput.split('/').pop() || 'Link')
    };
    updateSettings({ externalContext: [...settings.externalContext, newContext] });
    setContextInput('');
    onLog(`Added ${isTextInput ? 'Text' : 'Link'} Context: ${newContext.name}`, 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'pdf' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newContext: ExternalContext = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        value: base64,
        name: file.name,
        mimeType: file.type
      };
      updateSettings({ externalContext: [...settings.externalContext, newContext] });
      onLog(`Uploaded ${type.toUpperCase()}: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const removeContext = (id: string) => {
    const removed = settings.externalContext.find(c => c.id === id);
    updateSettings({ externalContext: settings.externalContext.filter(c => c.id !== id) });
    if (removed) onLog(`Removed Context: ${removed.name}`, 'info');
  };

  const handleDownloadLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}${l.count && l.count > 1 ? ` (x${l.count})` : ''}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ava-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onLog("System log exported successfully.", 'success');
  };

  const containerClass = isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-100";
  const cardClass = isLight ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-700/50";
  const textMuted = isLight ? "text-slate-500" : "text-slate-400";
  const inputBg = isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-800 border-slate-700 text-white";

  return (
    <div className={`p-6 space-y-8 h-full overflow-y-auto custom-scrollbar transition-all duration-300 ${containerClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isLight ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/20 text-cyan-400'}`}>
            <Sliders className="w-6 h-6" />
          </div>
          <span className="font-black text-lg tracking-tight uppercase">System Hub</span>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleDownloadLogs}
                className={`p-2.5 rounded-xl transition-all ${isLight ? 'hover:bg-cyan-50 text-cyan-600' : 'hover:bg-cyan-900/30 text-cyan-400'} flex items-center gap-2 text-xs font-bold uppercase tracking-widest`}
                title="Download Log File"
            >
                <Download className="w-4 h-4" />
            </button>
            <button 
                onClick={onClearLogs}
                className={`p-2.5 rounded-xl transition-all ${isLight ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-900/30 text-red-400'} flex items-center gap-2 text-xs font-bold uppercase tracking-widest`}
                title="Clear Logs"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
      </div>

      {/* SECTION: AUTOMATION ENGINE */}
      <div className="space-y-4">
        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 ${textMuted}`}>Automation Strategy</h3>
        <div className={`p-5 rounded-2xl border-2 transition-all ${settings.automationEnabled ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-transparent'} ${cardClass}`}>
            <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
                <span className="text-base font-black flex items-center gap-2">
                <PlayCircle className={`w-6 h-6 ${settings.automationEnabled ? 'text-cyan-500 animate-pulse' : 'text-slate-500'}`} />
                Auto-Pilot
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>Automated Vision Scan</span>
            </div>
            <button
                onClick={() => handleToggle('automationEnabled', 'Automation')}
                className={`
                w-16 h-9 rounded-full transition-all relative
                ${settings.automationEnabled ? 'bg-cyan-500' : (isLight ? 'bg-slate-300' : 'bg-slate-700')}
                `}
            >
                <div className={`
                w-7 h-7 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-md
                ${settings.automationEnabled ? 'left-8' : 'left-1'}
                `} />
            </button>
            </div>

            <div className={`space-y-6 transition-all duration-500 ${settings.automationEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors" onClick={() => handleToggle('triggerTime', 'Timer')}>
                    <span className="text-sm font-bold flex items-center gap-3">
                    <Timer className="w-5 h-5 text-indigo-400" /> Fixed Timer
                    </span>
                    <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${settings.triggerTime ? 'bg-indigo-500 border-indigo-500 scale-110' : (isLight ? 'border-slate-300' : 'border-slate-600')}`}>
                    {settings.triggerTime && <Sparkles className="w-4 h-4 text-white" />}
                    </div>
                </div>
                {settings.triggerTime && (
                <div className="px-3 animate-fade-in-up">
                    <div className="flex justify-between text-[10px] font-mono font-bold mb-2">
                        <span className={textMuted}>FREQUENCY</span>
                        <span className="text-indigo-400">{settings.scanIntervalMs}ms</span>
                    </div>
                    <input
                        type="range" min="1000" max="10000" step="500"
                        value={settings.scanIntervalMs}
                        onChange={(e) => updateSettings({ scanIntervalMs: parseInt(e.target.value) })}
                        className="w-full h-3 rounded-full appearance-none cursor-pointer bg-slate-700 accent-indigo-400"
                    />
                </div>
                )}

                <div className="flex justify-between items-center cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-colors" onClick={() => handleToggle('triggerSmart', 'Smart Scan')}>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold flex items-center gap-3">
                        <Zap className="w-5 h-5 text-cyan-400" /> Smart Scan (AI)
                        </span>
                        <span className={`text-[9px] ml-8 font-mono tracking-wider opacity-60 ${textMuted}`}>Uses Tokens</span>
                    </div>
                    <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${settings.triggerSmart ? 'bg-cyan-500 border-cyan-500 scale-110' : (isLight ? 'border-slate-300' : 'border-slate-600')}`}>
                    {settings.triggerSmart && <Sparkles className="w-4 h-4 text-white" />}
                    </div>
                </div>
                
                {settings.triggerSmart && (
                <div className="px-3 animate-fade-in-up border-l-2 border-slate-700/50 ml-4 pl-2">
                    <div className="flex justify-between items-center cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors" onClick={() => handleToggle('triggerHybrid', 'Hybrid Filter')}>
                        <div className="flex flex-col">
                            <span className={`text-xs font-bold flex items-center gap-2 ${settings.triggerHybrid ? 'text-emerald-400' : textMuted}`}>
                            <Eye className="w-3 h-3" /> Hybrid Filter
                            </span>
                            <span className={`text-[9px] ml-5 ${textMuted}`}>Saves tokens by detecting changes locally first.</span>
                        </div>
                        <div className={`w-8 h-5 rounded-full relative transition-all ${settings.triggerHybrid ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                            <div className={`w-3 h-3 rounded-full bg-white absolute top-1 transition-all ${settings.triggerHybrid ? 'left-4' : 'left-1'}`} />
                        </div>
                    </div>
                    
                    {settings.triggerHybrid && (
                        <div className="mt-3 px-1">
                            <div className="flex justify-between text-[9px] font-mono font-bold mb-1">
                                <span className={textMuted}>SENSITIVITY</span>
                                <span className="text-emerald-400">{settings.smartScanSensitivity}%</span>
                            </div>
                            <input
                                type="range" min="10" max="100" step="5"
                                value={settings.smartScanSensitivity}
                                onChange={(e) => updateSettings({ smartScanSensitivity: parseInt(e.target.value) })}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-emerald-400"
                            />
                        </div>
                    )}
                </div>
                )}
            </div>
            </div>
        </div>
      </div>

      {/* SECTION: INTELLIGENCE & CONTEXT */}
      <div className="space-y-4">
        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 ${textMuted}`}>Knowledge & Guidance</h3>
        <div className={`p-5 rounded-2xl border-2 border-dashed transition-all ${settings.externalContext.length > 0 ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-700/30'} ${cardClass}`}>
            <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col">
                <span className="text-base font-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" /> Neural Context
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>External Knowledge</span>
            </div>
            </div>

            <div className="space-y-4">
            {/* Link/Text Input Selector */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <button 
                onClick={() => setIsTextInput(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black transition-all ${!isTextInput ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                >
                <Link className="w-3 h-3" /> LINK
                </button>
                <button 
                onClick={() => setIsTextInput(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black transition-all ${isTextInput ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
                >
                <AlignLeft className="w-3 h-3" /> RAW TEXT
                </button>
            </div>

            {/* Context Input Area */}
            <div className="flex flex-col gap-2">
                <div className="relative">
                {isTextInput ? (
                    <textarea
                    value={contextInput}
                    onChange={(e) => setContextInput(e.target.value)}
                    placeholder="Paste context text here..."
                    className={`w-full p-4 rounded-xl text-xs outline-none border-2 focus:border-cyan-500/50 transition-all min-h-[100px] resize-none custom-scrollbar ${inputBg}`}
                    />
                ) : (
                    <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                    <input
                        type="text"
                        value={contextInput}
                        onChange={(e) => setContextInput(e.target.value)}
                        placeholder="Paste link (URL)..."
                        className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs outline-none border-2 focus:border-cyan-500/50 transition-all ${inputBg}`}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                    />
                    </div>
                )}
                </div>
                <button 
                onClick={handleAddLink}
                className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-cyan-600/20"
                >
                <Plus className="w-4 h-4" /> Add to Context
                </button>
            </div>

            {/* File Uploads */}
            <div className="grid grid-cols-3 gap-2">
                <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:bg-white/5 ${isLight ? 'border-slate-300' : 'border-slate-700'}`}>
                <ImageIcon className="w-5 h-5 text-pink-400 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'image')} />
                </label>
                <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:bg-white/5 ${isLight ? 'border-slate-300' : 'border-slate-700'}`}>
                <FileText className="w-5 h-5 text-red-400 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">PDF</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'pdf')} />
                </label>
                <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:bg-white/5 ${isLight ? 'border-slate-300' : 'border-slate-700'}`}>
                <VideoIcon className="w-5 h-5 text-purple-400 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">Video</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload(e, 'video')} />
                </label>
            </div>

            {/* Context List */}
            {settings.externalContext.length > 0 && (
                <div className="space-y-2 mt-4 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                {settings.externalContext.map((ctx) => (
                    <div key={ctx.id} className={`flex items-center justify-between p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                        {ctx.type === 'link' && <Link className="w-3 h-3 text-cyan-400 shrink-0" />}
                        {ctx.type === 'text' && <AlignLeft className="w-3 h-3 text-emerald-400 shrink-0" />}
                        {ctx.type === 'image' && <ImageIcon className="w-3 h-3 text-pink-400 shrink-0" />}
                        {ctx.type === 'pdf' && <FileText className="w-3 h-3 text-red-400 shrink-0" />}
                        {ctx.type === 'video' && <VideoIcon className="w-3 h-3 text-purple-400 shrink-0" />}
                        <span className="text-[10px] font-bold truncate">{ctx.name}</span>
                    </div>
                    <button onClick={() => removeContext(ctx.id)} className="p-1 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                    </div>
                ))}
                </div>
            )}
            </div>
        </div>

        {/* CUSTOM INSTRUCTIONS */}
        <div className={`p-5 rounded-2xl border-2 transition-all ${settings.customInstructions ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-transparent'} ${cardClass}`}>
            <div className="flex flex-col mb-4">
                <span className="text-base font-black flex items-center gap-2">
                <MessageSquareText className={`w-5 h-5 ${settings.customInstructions ? 'text-indigo-400' : 'text-slate-500'}`} />
                AI Persona & Instructions
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>Custom Directives</span>
            </div>
            <textarea
                value={settings.customInstructions || ''}
                onChange={(e) => updateSettings({ customInstructions: e.target.value })}
                placeholder="Ex: 'Be extremely concise', 'Explain like I'm five', 'Focus on the mathematical steps'..."
                className={`w-full p-4 rounded-xl text-xs outline-none border-2 focus:border-indigo-500/50 transition-all min-h-[80px] resize-none custom-scrollbar ${inputBg}`}
            />
        </div>
      </div>

      {/* SECTION: OUTPUT & EXECUTION */}
      <div className="space-y-4">
        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 ${textMuted}`}>Output & Execution</h3>
        <div className="grid grid-cols-1 gap-4">
            {/* SPEAK ANSWER */}
            <div className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${settings.speakAnswer ? 'border-amber-500/50' : 'border-transparent'} ${cardClass}`}>
            <div className="flex flex-col">
                <span className="text-base font-black flex items-center gap-2">
                    <Volume2 className={`w-5 h-5 ${settings.speakAnswer ? 'text-amber-400' : 'text-slate-500'}`} />
                    Voice Output
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>Read Answers Aloud</span>
            </div>
            <button
                onClick={() => handleToggle('speakAnswer', 'Voice Output')}
                className={`
                    w-16 h-9 rounded-full transition-all relative
                    ${settings.speakAnswer ? 'bg-amber-500' : (isLight ? 'bg-slate-300' : 'bg-slate-700')}
                `}
                >
                <div className={`
                    w-7 h-7 rounded-full bg-white absolute top-1 transition-all
                    ${settings.speakAnswer ? 'left-8' : 'left-1'}
                `} />
                </button>
            </div>

            {/* AUTO SELECT */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${settings.autoSelect ? 'border-emerald-500/50' : 'border-transparent'} ${cardClass}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-base font-black flex items-center gap-2">
                    <MousePointer2 className={`w-5 h-5 ${settings.autoSelect ? 'text-emerald-400' : 'text-slate-500'}`} />
                    Auto-Click
                  </span>
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${textMuted}`}>Instant Execution</span>
                </div>
                <button
                  onClick={() => handleToggle('autoSelect', 'Auto-Pilot Click')}
                  className={`
                    w-16 h-9 rounded-full transition-all relative
                    ${settings.autoSelect ? 'bg-emerald-500' : (isLight ? 'bg-slate-300' : 'bg-slate-700')}
                  `}
                >
                  <div className={`
                    w-7 h-7 rounded-full bg-white absolute top-1 transition-all
                    ${settings.autoSelect ? 'left-8' : 'left-1'}
                  `} />
                </button>
              </div>

              {settings.autoSelect && (
                <div className="space-y-4 pt-4 border-t border-slate-700/30 animate-fade-in-up">
                  {/* AUTO NEXT */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-emerald-400" /> Auto-Next
                      </span>
                      <span className={`text-[9px] ${textMuted}`}>Automatically progress to next question</span>
                    </div>
                    <button
                      onClick={() => handleToggle('autoNext', 'Auto-Next')}
                      className={`w-12 h-6 rounded-full relative transition-all ${settings.autoNext ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${settings.autoNext ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* CONFIDENCE THRESHOLD */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" /> Safe Threshold
                      </span>
                      <span className="text-[10px] font-mono font-black text-emerald-400">{(settings.confidenceThreshold * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range" min="0.1" max="1.0" step="0.05"
                      value={settings.confidenceThreshold}
                      onChange={(e) => updateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700 accent-emerald-400"
                    />
                    <p className={`text-[8px] italic leading-tight ${textMuted}`}>
                      Only clicks if AI is at least {Math.round(settings.confidenceThreshold * 100)}% sure.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl text-[9px] font-bold border flex justify-between items-center ${isLight ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                    <span>Requires Browser Extension to be installed.</span>
                    <button 
                      onClick={() => setShowExtensionGuide(true)}
                      className="px-2 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                    >
                      Setup Guide
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* SECTION: SYSTEM CONFIG (ADVANCED) */}
      <div className="space-y-4">
        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 ${textMuted}`}>Hardware & Core</h3>
        <div className={`border-2 rounded-2xl overflow-hidden transition-all duration-500 ${showAdvanced ? 'border-slate-500/30' : 'border-transparent'} ${cardClass}`}>
            <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all`}
            >
            <span className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 ${textMuted}`}>
                <Sparkles className="w-4 h-4" /> Core Config
            </span>
            {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showAdvanced && (
            <div className="p-6 space-y-8 animate-fade-in-up">

                {/* MODEL SELECTION */}
                <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" /> Active Model
                    </label>
                    <div className="relative">
                    <select 
                        value={settings.modelName}
                        onChange={handleModelChange}
                        className={`w-full p-4 rounded-xl text-sm font-bold appearance-none cursor-pointer outline-none border-2 focus:border-cyan-500/50 transition-all ${inputBg}`}
                    >
                        {GEMINI_MODELS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
                    </div>
                    <p className={`text-[10px] font-mono italic px-2 leading-tight ${textMuted}`}>
                    {GEMINI_MODELS.find(m => m.value === settings.modelName)?.desc}
                    </p>
                </div>

                {/* KEY SELECTION */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                        <Key className="w-4 h-4 text-indigo-400" /> Billing Project
                        </label>
                        <a 
                          href="https://aistudio.google.com/app/apikey" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          Get Key <Sparkles className="w-3 h-3" />
                        </a>
                    </div>
                    
                    <div className={`p-4 rounded-xl border-2 border-dashed ${isLight ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-500/5 border-indigo-500/20'}`}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                            <BrainCircuit className="w-3 h-3" /> API Key Guide
                        </h4>
                        <ul className="text-[10px] space-y-1.5 list-disc pl-4 opacity-80">
                            <li>Visit <b>Google AI Studio</b> and create a new API Key.</li>
                            <li>Free Tier: <b>15 RPM</b> / <b>1M TPM</b> / <b>1,500 RPD</b> limit.</li>
                            <li><b>Data Privacy:</b> Google may use free tier data to improve models. Use a paid project to opt-out.</li>
                            <li>429 Errors? Wait 1 min or use a paid key.</li>
                        </ul>
                    </div>

                    <button 
                    onClick={handleChangeKey}
                    className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all hover:scale-[1.02] active:scale-[0.98] ${isLight ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30'}`}
                    >
                    <Key className="w-4 h-4" /> {showKeyInput ? 'Hide Key Input' : (window.aistudio ? 'Switch Billing Key' : 'Enter Custom Key')}
                    </button>
                    
                    {showKeyInput && (
                    <div className="animate-fade-in-up space-y-2">
                        <input
                        type="password"
                        value={settings.apiKey || ''}
                        onChange={(e) => updateSettings({ apiKey: e.target.value })}
                        placeholder="Enter Gemini API Key..."
                        className={`w-full p-3 rounded-xl text-xs font-mono outline-none border-2 focus:border-indigo-500/50 transition-all ${inputBg}`}
                        />
                        <p className={`text-[9px] px-2 italic ${textMuted}`}>
                        Your key is encrypted and stored in your cookies.
                        </p>
                    </div>
                    )}
                </div>

                {/* APPEARANCE TOGGLES */}
                <div className="space-y-5 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                        <Activity className="w-4 h-4 text-blue-400" /> Log Terminal
                    </span>
                    <button onClick={() => handleToggle('showLogs', 'Logs')} className={`w-12 h-7 rounded-full relative ${settings.showLogs ? 'bg-blue-500' : 'bg-slate-700'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${settings.showLogs ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                        {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                        Dark Mode
                    </span>
                    <button onClick={() => updateSettings({ themeMode: isLight ? 'dark' : 'light' })} className={`w-12 h-7 rounded-full relative ${isLight ? 'bg-slate-300' : 'bg-indigo-600'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${!isLight ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                        <MonitorOff className="w-4 h-4 text-purple-400" /> Simplified
                    </span>
                    <button onClick={() => handleToggle('simplifiedMode', 'Performance')} className={`w-12 h-7 rounded-full relative ${settings.simplifiedMode ? 'bg-purple-500' : 'bg-slate-700'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${settings.simplifiedMode ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                        <Brain className="w-4 h-4 text-purple-400" /> Show Thinking (Live)
                    </span>
                    <button onClick={() => handleToggle('showThinking', 'AI Thinking')} className={`w-12 h-7 rounded-full relative ${settings.showThinking ? 'bg-purple-500' : 'bg-slate-700'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${settings.showThinking ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                        <Brain className="w-4 h-4 text-indigo-400" /> Show Thinking (After)
                    </span>
                    <button onClick={() => handleToggle('alwaysShowThinking', 'Post-Analysis Thinking')} className={`w-12 h-7 rounded-full relative ${settings.alwaysShowThinking ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${settings.alwaysShowThinking ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-3">
                        <Activity className="w-4 h-4 text-red-400" /> Debug Mode
                    </span>
                    <button onClick={() => handleToggle('debugMode', 'Debug')} className={`w-12 h-7 rounded-full relative ${settings.debugMode ? 'bg-red-500' : 'bg-slate-700'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${settings.debugMode ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>
                </div>
            </div>
            )}
        </div>
      </div>

      {showExtensionGuide && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-lg p-8 rounded-3xl border-2 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar ${isLight ? 'bg-white border-emerald-200' : 'bg-slate-900 border-emerald-500/30'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4 text-emerald-500">
                <div className="p-3 rounded-2xl bg-emerald-500/10">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Extension Setup</h2>
                  <p className="text-xs font-bold opacity-60">Enable Auto-Click Capabilities</p>
                </div>
              </div>
              <button onClick={() => setShowExtensionGuide(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
                  Load the Extension
                </h3>
                <ol className={`text-xs space-y-3 list-decimal pl-5 ${textMuted}`}>
                  <li>Open your browser (Chrome/Edge/Brave) and go to <b>Extensions</b> (chrome://extensions).</li>
                  <li>Enable <b>Developer Mode</b> (toggle in the top-right corner).</li>
                  <li>Click <b>Load unpacked</b>.</li>
                  <li>Select the <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">extension</code> folder in the project directory.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
                  How it Works
                </h3>
                <p className={`text-xs ${textMuted}`}>
                  Once installed, the extension acts as a bridge. When AVA detects an answer, it sends a secure message to the extension, which then finds and clicks the corresponding button on your school website.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase text-emerald-400 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
                  Permissions
                </h3>
                <p className={`text-xs ${textMuted}`}>
                  The extension requires "Host Permissions" to interact with the school websites. It only activates when you trigger a scan in the AVA dashboard.
                </p>
              </div>

              <button 
                onClick={() => setShowExtensionGuide(false)}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/30"
              >
                Got it, let's go!
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`text-[9px] ${textMuted} font-mono text-center opacity-50`}>
        AVA v1.2 // Neural Interface Ready
      </div>
    </div>
  );
};

export default SettingsPanel;
