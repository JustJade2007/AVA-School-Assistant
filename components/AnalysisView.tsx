
import React from 'react';
import { AnalysisResult } from '../types';
import { CheckCircle, XCircle, AlertCircle, BrainCircuit, Sparkles, Terminal, AlertTriangle } from 'lucide-react';

interface AnalysisViewProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
  autoSelectEnabled: boolean;
  simplifiedMode: boolean;
  themeMode: 'dark' | 'light';
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, isAnalyzing, autoSelectEnabled, simplifiedMode, themeMode }) => {
  const isLight = themeMode === 'light';
  
  // Animation helpers
  const anim = (cls: string) => simplifiedMode ? '' : cls;

  if (isAnalyzing && !result) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="relative">
          <div className={`absolute inset-0 ${isLight ? 'bg-cyan-500/10' : 'bg-cyan-500/20'} blur-xl rounded-full ${anim('animate-pulse')}`}></div>
          <BrainCircuit className={`w-16 h-16 ${isLight ? 'text-cyan-600' : 'text-cyan-400'} ${anim('animate-spin-slow')} relative z-10`} />
        </div>
        <div className="space-y-1 text-center">
           <p className={`${isLight ? 'text-cyan-700' : 'text-cyan-300'} font-mono text-sm tracking-widest ${anim('animate-pulse')}`}>PROCESSING NEURAL LINK...</p>
           <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'} font-mono`}>Decoding Visual Syntax</p>
        </div>
      </div>
    );
  }

  if (result?.error) {
    return (
       <div className={`flex flex-col items-center justify-center h-full p-6 text-center ${anim('animate-fade-in-up')}`}>
         <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border relative ${isLight ? 'bg-red-50 border-red-200' : 'bg-red-500/10 border-red-500/50'}`}>
           <AlertTriangle className="w-8 h-8 text-red-500 relative z-10" />
           {!simplifiedMode && <div className="absolute inset-0 bg-red-500/20 blur-md rounded-full animate-pulse"></div>}
         </div>
         <h3 className={`text-red-500 font-bold tracking-[0.2em] mb-2 font-mono`}>SYSTEM ERROR</h3>
         <div className={`${isLight ? 'bg-red-50 border-red-100' : 'bg-slate-950/80 border-red-900/50'} border p-4 rounded-lg w-full overflow-hidden shadow-inner`}>
           <p className={`text-xs font-mono break-words leading-relaxed ${isLight ? 'text-red-700' : 'text-red-300'}`}>
             {result.error}
           </p>
         </div>
       </div>
    );
  }

  if (!result || !result.hasQuestion) {
    return (
      <div className={`flex flex-col items-center justify-center h-full opacity-60 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
        <div className={`w-20 h-20 border-2 border-dashed rounded-full flex items-center justify-center mb-4 ${isLight ? 'border-slate-300' : 'border-slate-700'}`}>
           <AlertCircle className="w-8 h-8 opacity-50" />
        </div>
        <p className="font-mono text-sm tracking-wider">AWAITING INPUT DATA</p>
      </div>
    );
  }

  const bestOption = result.options.find(o => o.isCorrect);
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div key={result.questionText || Date.now()} className="flex flex-col h-full overflow-hidden">
      <div className={`mb-6 ${anim('animate-fade-in-up')}`} style={{ animationDelay: '100ms' }}>
        <div className="flex items-start gap-3">
           <Terminal className={`w-5 h-5 mt-1 flex-shrink-0 ${isLight ? 'text-cyan-600' : 'text-cyan-500'}`} />
           <h2 className={`text-lg font-bold leading-relaxed tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
             {result.questionText || "Unknown Question Pattern"}
           </h2>
        </div>
        
        <div className="flex items-center mt-3 ml-8 space-x-3 text-[10px] font-mono uppercase tracking-wider">
           <div className={`px-2 py-1 rounded border ${isLight ? 'bg-slate-100 text-cyan-700 border-slate-200' : 'bg-slate-800 text-cyan-400 border-slate-700'}`}>
             Confidence: {bestOption ? Math.round(bestOption.confidenceScore * 100) : 0}%
           </div>
           {autoSelectEnabled && (
             <span className={`flex items-center gap-1 ${anim('animate-pulse')} ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
               <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-emerald-400'}`}></span>
               Auto-Pilot Active
             </span>
           )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {result.options.map((option, idx) => {
           const delay = `${idx * 150 + 200}ms`;
           const isCorrect = option.isCorrect;
           const label = labels[idx] || (idx + 1).toString();

           const correctLight = 'bg-emerald-50 border-emerald-300 shadow-sm';
           const normalLight = 'bg-white border-slate-200 hover:bg-slate-50';
           const textCorrectLight = 'text-emerald-900';
           const textNormalLight = 'text-slate-600';

           const correctDark = 'bg-gradient-to-r from-emerald-900/40 to-emerald-900/10 border-emerald-500/50';
           const normalDark = 'bg-slate-800/20 border-slate-800 hover:bg-slate-800/40';
           const textCorrectDark = 'text-emerald-100';
           const textNormalDark = 'text-slate-400';

           return (
            <div 
              key={idx}
              className={`
                relative p-4 rounded-lg border transition-all duration-500 ${anim('animate-slide-in-right')} opacity-0 fill-mode-forwards flex items-start gap-4
                ${isCorrect 
                  ? (isLight ? correctLight : correctDark)
                  : (isLight ? normalLight : normalDark)
                }
              `}
              style={{ animationDelay: simplifiedMode ? '0ms' : delay, opacity: simplifiedMode ? 1 : 0 }}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center font-mono font-black text-xs shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : (isLight ? 'bg-slate-200 text-slate-500' : 'bg-slate-700 text-slate-400')}`}>
                {label}
              </div>
              <div className="flex-1 flex justify-between items-start gap-4">
                <span className={`text-sm font-medium leading-relaxed ${isCorrect ? (isLight ? textCorrectLight : textCorrectDark) : (isLight ? textNormalLight : textNormalDark)}`}>
                  {option.text}
                </span>
                {isCorrect && (
                  <div className={`${isLight ? 'bg-emerald-100' : 'bg-emerald-500/20'} p-1 rounded-full ${anim('animate-[bounce_1s_ease-in-out_1]')}`}>
                    <CheckCircle className={`w-5 h-5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                  </div>
                )}
              </div>
              {isCorrect && <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${isLight ? 'bg-emerald-400' : 'bg-emerald-500'}`} />}
            </div>
          );
        })}
      </div>

      <div className={`mt-6 ${anim('animate-fade-in-up')} opacity-0 fill-mode-forwards`} style={{ animationDelay: simplifiedMode ? '0ms' : '800ms', opacity: simplifiedMode ? 1 : 0 }}>
        <div className={`border rounded-xl p-4 backdrop-blur-sm relative overflow-hidden group ${isLight ? 'bg-white/80 border-slate-200' : 'bg-slate-900/50 border-slate-800'}`}>
          <div className={`flex items-center gap-2 mb-2 font-mono text-[10px] uppercase tracking-widest ${isLight ? 'text-cyan-700' : 'text-cyan-400/80'}`}>
            <Sparkles className="w-3 h-3" />
            <span>Logic Synthesis</span>
          </div>
          <p className={`text-xs leading-relaxed font-light ${isLight ? 'text-slate-600' : 'text-slate-300 opacity-80'}`}>
            {result.reasoning}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
