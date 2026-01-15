
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, StopCircle, Video, Scan, Aperture } from 'lucide-react';
import { AnalysisResult, AppSettings, AppState, LogEntry } from './types';
import { analyzeScreenFrame } from './services/geminiService';
import { detectText, calculateTextSimilarity } from './services/ocrService';
import AnalysisView from './components/AnalysisView';
import SettingsPanel from './components/SettingsPanel';
import ConsoleLog from './components/ConsoleLog';

const DEFAULT_SETTINGS: AppSettings = {
  automationEnabled: false,
  triggerTime: false,
  triggerSmart: true,
  scanIntervalMs: 3000,
  smartScanDelay: 1000,
  smartScanSensitivity: 80,
  confidenceThreshold: 0.7,
  autoSelect: false,
  showLogs: true,
  themeMode: 'dark',
  simplifiedMode: false,
  modelName: 'gemini-3-flash-preview',
  speakAnswer: false,
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [boundingBoxStyle, setBoundingBoxStyle] = useState<React.CSSProperties | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const automationTimeoutRef = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false); 
  const lastOcrTextRef = useRef<string>("");
  const isAutomationRunningRef = useRef<boolean>(false);

  const isLight = settings.themeMode === 'light';

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => {
        const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' }),
          message,
          type
        };
        return [...prev.slice(-49), newLog]; 
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog("System logs cleared.", 'info');
  }, [addLog]);

  /**
   * Voice Synthesis helper
   */
  const speakAnswer = useCallback((result: AnalysisResult) => {
    if (!settings.speakAnswer || !result.hasQuestion) return;
    
    const correctIdx = result.options.findIndex(o => o.isCorrect);
    if (correctIdx === -1) return;

    const label = ['A', 'B', 'C', 'D', 'E', 'F'][correctIdx] || (correctIdx + 1).toString();
    const answerText = result.options[correctIdx].text;
    const utterance = new SpeechSynthesisUtterance(`The answer is ${label}. ${answerText}`);
    
    // Aesthetic tuning for voice
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    
    window.speechSynthesis.cancel(); // Stop current speaking to prevent queue overlap
    window.speechSynthesis.speak(utterance);
  }, [settings.speakAnswer]);

  const captureFrame = (): string | null => {
      if (!videoRef.current || !canvasRef.current) return null;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context || video.readyState < 2 || video.paused) return null;

      const scale = Math.min(1, 1280 / video.videoWidth); 
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.8);
  };

  const performAnalysis = async (base64Image: string) => {
      processingRef.current = true;
      if (!settings.simplifiedMode) {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);
      }

      try {
          const rawBase64 = base64Image.split(',')[1];
          const result = await analyzeScreenFrame(rawBase64, settings.modelName);
          
          if (result.error) {
             addLog(`Gemini [${settings.modelName}]: ${result.error}`, 'error');
             if (result.error.includes('Quota') || result.error.includes('429')) {
                 setSettings(s => ({ ...s, automationEnabled: false }));
                 addLog("Recommendation: Select a paid Billing Key in settings.", 'warning');
             }
          } else if (result.hasQuestion) {
             addLog(`Analysis [${settings.modelName}]: Detected question.`, 'success');
             // Trigger Voice Output
             speakAnswer(result);
          }

          setLastResult(result);

          if (settings.autoSelect && result.hasQuestion && result.suggestedAction) {
             if (window.electronAPI) {
                window.electronAPI.performAction(result.suggestedAction, result.options);
             }
          }
      } catch (e) {
          addLog("Neural link failed.", 'error');
      } finally {
          processingRef.current = false;
      }
  };

  const runAutomationLoop = useCallback(async () => {
    if (!isAutomationRunningRef.current || !stream) return;

    let nextRunDelay = 1000;

    if (settings.triggerTime) {
        nextRunDelay = settings.scanIntervalMs;
        const img = captureFrame();
        if (img) await performAnalysis(img);
    } 
    else if (settings.triggerSmart) {
        nextRunDelay = 1000;
        if (!processingRef.current) {
            const img = captureFrame();
            if (img) {
                const text = await detectText(img);
                const similarity = calculateTextSimilarity(text, lastOcrTextRef.current);
                const sensitivityFactor = settings.smartScanSensitivity / 100; 
                const threshold = 0.3 + (sensitivityFactor * 0.65);
                const hasChanged = similarity < threshold && text.length > 20;

                if (hasChanged) {
                    addLog("Smart Trigger: Text delta detected.", 'success');
                    lastOcrTextRef.current = text;
                    if (settings.smartScanDelay > 0) {
                        await new Promise(r => setTimeout(r, settings.smartScanDelay));
                    }
                    const freshImg = captureFrame();
                    if (freshImg) await performAnalysis(freshImg);
                }
            }
        }
    }

    if (isAutomationRunningRef.current) {
        automationTimeoutRef.current = window.setTimeout(runAutomationLoop, nextRunDelay);
    }
  }, [settings, stream, addLog]);

  useEffect(() => {
    if (appState === AppState.STREAMING && settings.automationEnabled) {
        if (!isAutomationRunningRef.current) {
            isAutomationRunningRef.current = true;
            addLog("Automation Engine: ONLINE", 'success');
            runAutomationLoop();
        }
    } else {
        if (isAutomationRunningRef.current) {
            isAutomationRunningRef.current = false;
            if (automationTimeoutRef.current) clearTimeout(automationTimeoutRef.current);
            addLog("Automation Engine: OFFLINE", 'warning');
        }
    }
    return () => {
        isAutomationRunningRef.current = false;
        if (automationTimeoutRef.current) clearTimeout(automationTimeoutRef.current);
    };
  }, [appState, settings.automationEnabled, runAutomationLoop, addLog]);

  const startCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any, 
        audio: false
      });
      setStream(mediaStream);
      setAppState(AppState.STREAMING);
      addLog("Display capture stream established.", 'success');
      mediaStream.getVideoTracks()[0].onended = () => stopCapture();
    } catch (err) {
      addLog("Stream access denied.", 'error');
    }
  };

  const stopCapture = useCallback(() => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setAppState(AppState.IDLE);
    setLastResult(null);
    setSettings(prev => ({ ...prev, automationEnabled: false }));
    addLog("Session terminated.", 'info');
  }, [stream, addLog]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  useEffect(() => {
    const updateBox = () => {
      const video = videoRef.current;
      if (!video || !lastResult?.boundingBox || !lastResult.hasQuestion) {
        setBoundingBoxStyle(null);
        return;
      }
      const { videoWidth, videoHeight, offsetWidth, offsetHeight } = video;
      if (!videoWidth || !videoHeight) return;
      const videoRatio = videoWidth / videoHeight;
      const elementRatio = offsetWidth / offsetHeight;
      let renderWidth, renderHeight, top, left;
      if (elementRatio > videoRatio) {
        renderHeight = offsetHeight;
        renderWidth = offsetHeight * videoRatio;
        top = 0;
        left = (offsetWidth - renderWidth) / 2;
      } else {
        renderWidth = offsetWidth;
        renderHeight = offsetWidth / videoRatio;
        left = 0;
        top = (offsetHeight - renderHeight) / 2;
      }
      const box = lastResult.boundingBox;
      setBoundingBoxStyle({
        top: top + (box.ymin * renderHeight),
        left: left + (box.xmin * renderWidth),
        width: (box.xmax - box.xmin) * renderWidth,
        height: (box.ymax - box.ymin) * renderHeight,
      });
    };
    updateBox();
    window.addEventListener('resize', updateBox);
    return () => window.removeEventListener('resize', updateBox);
  }, [lastResult, stream]);

  const bgClass = isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-white grid-bg";
  const controlBarClass = isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800";
  const hudClass = isLight ? "bg-white/95 border-slate-200" : "bg-slate-900/95 border-slate-800";

  return (
    <div className={`min-h-screen font-sans overflow-hidden flex flex-col transition-all duration-700 ${bgClass}`}>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div className={`lg:col-span-8 flex flex-col border-r relative z-10 h-full ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
           <div className={`p-5 flex justify-between items-center shrink-0 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-cyan-500/20">
                    <Aperture className="text-white w-7 h-7" />
                 </div>
                 <div>
                    <h1 className={`text-2xl font-black tracking-tighter ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>AVA <span className="text-cyan-500 text-sm font-bold uppercase ml-1">BETA</span></h1>
                    <p className={`text-[10px] font-mono tracking-widest uppercase opacity-60`}>Project: Neural Eye</p>
                 </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                 <div className={`w-2.5 h-2.5 rounded-full ${appState === AppState.STREAMING ? 'bg-emerald-500' : 'bg-red-500'} ${!settings.simplifiedMode && appState === AppState.STREAMING ? 'animate-pulse' : ''}`} />
                 <span className={`font-black text-[10px] tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{appState === AppState.STREAMING ? 'SIGNAL_ACTIVE' : 'SIGNAL_LOST'}</span>
              </div>
           </div>
           <div className={`flex-1 relative flex flex-col justify-center items-center overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-black'}`}>
              {stream ? (
                <div className={`relative w-full h-full flex items-center justify-center ${isLight ? 'bg-slate-200' : 'bg-slate-900'}`}>
                   <video ref={(node) => { if (videoRef) (videoRef as any).current = node; if (node && stream) node.srcObject = stream; }} autoPlay playsInline muted className="max-w-full max-h-full object-contain" />
                   {isFlashing && <div className="absolute inset-0 bg-white/20 z-50 animate-flash pointer-events-none" />}
                   {boundingBoxStyle && (
                      <div className={`absolute border-4 z-20 transition-all duration-300 rounded-lg ${!settings.simplifiedMode ? 'animate-lock-on' : ''} ${isLight ? 'border-amber-500 bg-amber-500/5' : 'border-amber-400 bg-amber-400/5'}`} style={boundingBoxStyle}>
                         <div className={`absolute -top-7 left-0 text-[10px] font-black px-3 py-0.5 rounded-t-md font-mono flex items-center gap-2 shadow-lg ${isLight ? 'bg-amber-500 text-white' : 'bg-amber-400 text-black'}`}><Scan className="w-3 h-3" /> TRACKING_ID: {Math.floor(Math.random()*1000)}</div>
                      </div>
                   )}
                </div>
              ) : (
                <div className={`${isLight ? 'text-slate-300' : 'text-slate-700'} flex flex-col items-center gap-4`}>
                   <Monitor className="w-24 h-24 opacity-20" />
                   <p className="font-mono text-xs font-bold tracking-[0.3em] opacity-30">INITIATE DISPLAY LINK</p>
                </div>
              )}
           </div>
           {settings.showLogs && (
             <div className={`h-40 border-t shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}><ConsoleLog logs={logs} /></div>
           )}
           <div className={`h-20 border-t flex items-center justify-between px-8 shrink-0 shadow-2xl ${controlBarClass}`}>
              {!stream ? (
                 <button onClick={startCapture} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-cyan-600/30"><Video className="w-5 h-5" /> Connect Neural Link</button>
              ) : (
                <button onClick={stopCapture} className="px-6 py-3 bg-red-600/10 border-2 border-red-500/50 hover:bg-red-600 hover:text-white text-red-500 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all"><StopCircle className="w-5 h-5" /> Cut Connection</button>
              )}
              {stream && (
                 <div className="flex items-center gap-6">
                    <button onClick={() => { const img = captureFrame(); if (img) { performAnalysis(img); } }} className={`border-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:bg-slate-700/50 ${isLight ? 'bg-white border-slate-300 text-cyan-600' : 'bg-slate-800 border-slate-700 text-cyan-400'}`}>Manual Scan</button>
                    <div className="flex flex-col items-end gap-1">
                       <span className={`text-[9px] font-black tracking-widest ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>AUTO-PILOT</span>
                       <span className={`text-xs font-black ${settings.automationEnabled ? 'text-emerald-500' : 'text-slate-500'}`}>{settings.automationEnabled ? 'ACTIVE' : 'STANDBY'}</span>
                    </div>
                 </div>
              )}
           </div>
        </div>
        <div className={`lg:col-span-4 backdrop-blur-3xl border-l flex flex-col h-full z-20 ${hudClass}`}>
           <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col p-6">
               <div className={`mb-6 flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                  <span className={`font-black text-xs font-mono tracking-widest uppercase flex items-center gap-3 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}><Scan className="w-4 h-4" /> Neural Analysis</span>
                  {processingRef.current && <span className={`text-[10px] font-bold ${!settings.simplifiedMode ? 'animate-pulse' : ''} text-cyan-500`}>SYNCING...</span>}
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <AnalysisView result={lastResult} isAnalyzing={processingRef.current} autoSelectEnabled={settings.autoSelect} simplifiedMode={settings.simplifiedMode} themeMode={settings.themeMode} />
               </div>
           </div>
           <div className={`h-[55%] min-h-[400px] border-t ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'}`}>
               <SettingsPanel settings={settings} updateSettings={updateSettings} onClearLogs={clearLogs} />
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
