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
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', desc: 'Next-Gen: Advanced reasoning & logic' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', desc: 'Next-Gen: Ultra-fast intelligence' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Default: Fast & Balanced' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', desc: 'Premium: Best for complex logic' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', desc: 'Eco: Highly efficient' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, updateSettings, onLog, onClearLogs }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
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
        <button 
          onClick={onClearLogs}
          className={`p-2.5 rounded-xl transition-all ${isLight ? 'hover:bg-red-50 text-red-500' : 'hover:bg-red-900/30 text-red-400'} flex items-center gap-2 text-xs font-bold uppercase tracking-widest`}
        >
          <Trash2 className="w-4 h-4" />
          Clear Log
        </button>
      </div>

      {/* AUTOMATION ENGINE */}
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

      {/* VOICE AND AUTO SELECT */}
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
        <div className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${settings.autoSelect ? 'border-emerald-500/50' : 'border-transparent'} ${cardClass}`}>
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
      </div>

      {/* ADVANCED DRAWER */}
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
                <label className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-400" /> Billing Project
                </label>
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
                      Your key is stored only in local memory for this session.
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

      <div className={`text-[9px] ${textMuted} font-mono text-center opacity-50`}>
        AVA v1.2 // Neural Interface Ready
      </div>
    </div>
  );
};

export default SettingsPanel;
