import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Monitor, StopCircle, Video, Scan, Aperture, Github } from 'lucide-react';
import { AnalysisResult, AppSettings, AppState, LogEntry } from './types';
import { analyzeScreenFrame, checkForNewQuestion, verifySelection } from './services/geminiService';
import { detectText, calculateTextSimilarity, isTextSubset } from './services/ocrService';
import { getCookie, setCookie, encryptData, decryptData } from './services/storageService';
import AnalysisView from './components/AnalysisView';
import SettingsPanel from './components/SettingsPanel';
import ConsoleLog from './components/ConsoleLog';

const DEFAULT_SETTINGS: AppSettings = {
  automationEnabled: false,
  triggerTime: false,
  triggerSmart: true,
  triggerHybrid: true,
  scanIntervalMs: 3000,
  smartScanDelay: 1000,
  smartScanSensitivity: 50,
  confidenceThreshold: 0.7,
  autoSelect: false,
  autoNext: false,
  showLogs: true,
  themeMode: 'dark',
  simplifiedMode: false,
  modelName: 'gemini-flash-lite-latest',
  speakAnswer: false,
  debugMode: false,
  customInstructions: '',
  externalContext: [],
  showThinking: true,
  alwaysShowThinking: false,
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [boundingBoxStyle, setBoundingBoxStyle] = useState<React.CSSProperties | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const automationTimeoutRef = useRef<number | null>(null);
  const processingRef = useRef<boolean>(false); 
  const lastOcrTextRef = useRef<string>("");
  const lastScreenshotRef = useRef<string | null>(null);
  const isAutomationRunningRef = useRef<boolean>(false);
  const ocrStabilityCounterRef = useRef<number>(0);

  const isLight = settings.themeMode === 'light';

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
        
        // Consolidate repetitive logs if not in debug mode
        if (!settings.debugMode && prev.length > 0) {
           const lastLog = prev[prev.length - 1];
           if (lastLog.message === message && lastLog.type === type) {
              const updatedLog = {
                 ...lastLog,
                 count: (lastLog.count || 1) + 1,
                 timestamp // Update timestamp to latest occurrence
              };
              return [...prev.slice(0, -1), updatedLog];
           }
        }

        const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp,
          message,
          type,
          count: 1
        };
        return [...prev.slice(-49), newLog]; 
    });
  }, [settings.debugMode]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog("System logs cleared.", 'info');
  }, [addLog]);

  /**
   * Voice Synthesis helper
   */
  const speakAnswer = useCallback((result: AnalysisResult) => {
    if (!settings.speakAnswer || !result.hasQuestion || !result.options) return;
    
    const correctOptions = result.options
      .map((o, idx) => ({ ...o, label: ['A', 'B', 'C', 'D', 'E', 'F'][idx] || (idx + 1).toString() }))
      .filter(o => o.isCorrect);

    if (correctOptions.length === 0) return;

    let message = "";
    if (correctOptions.length === 1) {
      message = `The answer is ${correctOptions[0].label}. ${correctOptions[0].text}`;
    } else {
      const labels = correctOptions.map(o => o.label).join(", ");
      const texts = correctOptions.map(o => `${o.label}: ${o.text}`).join(". ");
      message = `There are ${correctOptions.length} correct answers: ${labels}. ${texts}`;
    }

    const utterance = new SpeechSynthesisUtterance(message);
    
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

  const handleAutoPilot = async (option: any, nextButtonBox: any, clickNext: boolean) => {
      addLog(`[AUTO-PILOT] TARGET IDENTIFIED: "${option.text.substring(0, 30)}..."`, 'success');
      
      let attempts = 0;
      const maxRetries = 5;
      let verified = false;

      while (attempts < maxRetries && !verified) {
          attempts++;
          addLog(`[AUTO-PILOT] EXECUTION ATTEMPT ${attempts}/${maxRetries}...`, 'info');

          // Build Sequence
          const sequence: any[] = [];
          
          if (option.boundingBox) {
              const { ymin, xmin, ymax, xmax } = option.boundingBox;
              const x = (xmin + xmax) / 2;
              const y = (ymin + ymax) / 2;
              sequence.push({ 
                type: 'click', 
                x, 
                y, 
                description: `[Coord] Select: ${option.text.substring(0, 15)}...` 
              });
          }
          
          sequence.push({ 
             type: 'text_click', 
             text: option.text, 
             description: `[Text] Select: ${option.text.substring(0, 15)}...` 
          });

          window.postMessage({
              type: 'AVA_ACTION',
              action: 'EXECUTE_SEQUENCE',
              payload: { sequence }
          }, '*');

          // Wait for click to register
          await new Promise(r => setTimeout(r, 2000));

          // Verify
          addLog(`[AUTO-PILOT] Verifying selection...`, 'info');
          const verifyImg = captureFrame();
          if (verifyImg) {
              const verification = await verifySelection(verifyImg, option.text, settings.modelName, settings.apiKey);
              if (verification.isSelected) {
                  verified = true;
                  addLog(`[AUTO-PILOT] SELECTION CONFIRMED (Confidence: ${(verification.confidence * 100).toFixed(0)}%)`, 'success');
              } else {
                  addLog(`[AUTO-PILOT] Verification Failed. Retrying...`, 'warning');
              }
          }
      }

      if (verified && clickNext) {
          addLog(`[AUTO-PILOT] Proceeding to Next Question...`, 'info');
          const nextSeq: any[] = [];
          if (nextButtonBox) {
              const { ymin, xmin, ymax, xmax } = nextButtonBox;
              nextSeq.push({ type: 'click', x: (xmin + xmax)/2, y: (ymin + ymax)/2, description: 'Click Next' });
          } else {
              nextSeq.push({ type: 'next_click', description: 'Click Next (Search)' });
          }
          window.postMessage({
              type: 'AVA_ACTION',
              action: 'EXECUTE_SEQUENCE',
              payload: { sequence: nextSeq }
          }, '*');
      } else if (!verified) {
          addLog(`[AUTO-PILOT] Failed to verify selection after ${maxRetries} attempts. Stopping.`, 'error');
      }
  };

  const performAnalysis = async (base64Image: string, shouldFlash: boolean = true) => {
      if (!settings.apiKey) {
        setShowApiKeyModal(true);
        addLog("API Key is missing. Please provide a valid API key.", 'error');
        return;
      }
      processingRef.current = true;
      if (!settings.simplifiedMode && shouldFlash) {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);
      }

      addLog("Initiating Neural Analysis...", 'info');

      try {
          const rawBase64 = base64Image.split(',')[1];
          
          if (settings.debugMode) addLog("Initiating local OCR scan...", 'info');
          const localOcrText = await detectText(base64Image);

          const result = await analyzeScreenFrame(
              rawBase64, 
              settings.modelName, 
              settings.apiKey,
              settings.debugMode ? addLog : undefined,
              localOcrText,
              settings.externalContext,
              settings.customInstructions
          );
          
          const activeModel = result.modelUsed || settings.modelName;
          const attemptInfo = result.attempts && result.attempts > 1 ? ` (Attempt ${result.attempts})` : '';

          if (result.error) {
             addLog(`Gemini [${activeModel}]: ${result.error}${attemptInfo}`, 'error');
             if (result.error.includes('Quota') || result.error.includes('429')) {
                 setSettings(s => ({ ...s, automationEnabled: false }));
                 addLog("Recommendation: Select a paid Billing Key in settings.", 'warning');
             }
          } else if (result.hasQuestion) {
             const fallbackIndicator = result.modelUsed && result.modelUsed !== settings.modelName ? ' [FALLBACK]' : '';
             addLog(`Analysis [${activeModel}]${fallbackIndicator}: Detected ${result.questions.length} question(s).${attemptInfo}`, 'success');
             lastScreenshotRef.current = base64Image; 
             speakAnswer(result);
          } else if (settings.debugMode) {
             addLog(`Analysis [${activeModel}]: No question found.${attemptInfo}`, 'info');
          }

          setLastResult(result);

          if (settings.autoSelect && result.hasQuestion && result.options) {
             const correctOption = result.options.find(o => o.isCorrect);
             
             if (correctOption) {
                if (correctOption.confidenceScore >= settings.confidenceThreshold) {
                   await handleAutoPilot(correctOption, result.nextButton, settings.autoNext);
                } else {
                   addLog(`[AUTO-PILOT] ABORTED: Confidence too low (${(correctOption.confidenceScore * 100).toFixed(0)}% < ${(settings.confidenceThreshold * 100).toFixed(0)}%). Manual confirmation required.`, 'warning');
                }
             } else {
                addLog(`[AUTO-PILOT] No clear answer identified for selection.`, 'warning');
             }
          }
      } catch (e) {
          addLog("Neural link failed.", 'error');
      } finally {
          processingRef.current = false;
          addLog("Neural Analysis Complete.", 'info');
      }
  };

  const runAutomationLoop = useCallback(async () => {
    if (!isAutomationRunningRef.current || !stream) return;

    let nextRunDelay = 1000;

    if (settings.triggerTime) {
        nextRunDelay = settings.scanIntervalMs;
        const img = captureFrame();
        if (img) await performAnalysis(img, false);
    } 
    else if (settings.triggerSmart) {
        nextRunDelay = 1000;
        if (!processingRef.current) {
            const img = captureFrame();
            if (img) {
                let shouldCheckAI = true;

                if (settings.triggerHybrid) {
                    shouldCheckAI = false;
                    const rawText = await detectText(img);
                    
                    const text = rawText
                        .replace(/\d+/g, '#') 
                        .replace(/[^a-zA-Z#\s]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();

                    const isMouseCovering = isTextSubset(lastOcrTextRef.current, text);
                    const isFeedbackAdded = isTextSubset(text, lastOcrTextRef.current);
                    const similarity = calculateTextSimilarity(text, lastOcrTextRef.current);
                    
                    const sensitivityFactor = settings.smartScanSensitivity / 100; 
                    const threshold = 0.2 + (sensitivityFactor * 0.6); 
                    
                    const rawChange = !isMouseCovering && !isFeedbackAdded && similarity < threshold && text.length > 15;

                    if (settings.debugMode) {
                         const msg = `[DEBUG] OCR: "${text.substring(0, 15)}..." | Ref: "${lastOcrTextRef.current.substring(0, 15)}..." | Sim: ${similarity.toFixed(2)} | Stab: ${ocrStabilityCounterRef.current}`;
                         addLog(msg, 'info');
                    }

                    if (rawChange) {
                        ocrStabilityCounterRef.current += 1;
                        if (ocrStabilityCounterRef.current >= 3) {
                             shouldCheckAI = true;
                             lastOcrTextRef.current = text; 
                             ocrStabilityCounterRef.current = 0;
                        }
                    } else {
                        ocrStabilityCounterRef.current = 0;
                    }
                }

                if (shouldCheckAI) {
                    const { isNew, currentText, error } = await checkForNewQuestion(img, lastScreenshotRef.current, settings.modelName, settings.apiKey);
                    
                    if (error) {
                        addLog(`AI Watchdog Error: ${error}`, 'error');
                    } else if (isNew) {
                         addLog(`AI Watchdog: New question detected.`, 'success');
                         lastScreenshotRef.current = img; 
                         if (!settings.triggerHybrid) {
                             lastOcrTextRef.current = currentText;
                         }
                         await performAnalysis(img, false);
                    }
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

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    if (newSettings.apiKey !== undefined) {
      if (newSettings.apiKey) {
        const encrypted = await encryptData(newSettings.apiKey);
        setCookie('ava_api_key', encrypted, 30);
      } else {
        setCookie('ava_api_key', '', -1);
      }
    }
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  useEffect(() => {
    const loadKey = async () => {
      const savedKey = getCookie('ava_api_key');
      if (savedKey) {
        const decrypted = await decryptData(savedKey);
        if (decrypted) {
          setSettings(prev => ({ ...prev, apiKey: decrypted }));
        }
      }
    };
    loadKey();

    // Listen for extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'AVA_EXTENSION_READY') {
        if (!extensionConnected) {
           setExtensionConnected(true);
           addLog("Bridge Connected: Browser Extension Detected", 'success');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [extensionConnected]);

  useEffect(() => {
    let interval: number | undefined;
    if (appState === AppState.STREAMING && settings.automationEnabled && settings.triggerTime) {
      const startTime = Date.now();
      interval = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = (elapsed % settings.scanIntervalMs) / settings.scanIntervalMs * 100;
        setScanProgress(progress);
      }, 50);
    } else {
      setScanProgress(0);
    }
    return () => clearInterval(interval);
  }, [appState, settings.automationEnabled, settings.triggerTime, settings.scanIntervalMs]);

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
    <div className={`h-screen font-sans overflow-hidden flex flex-col transition-all duration-700 ${bgClass}`}>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
        <div className={`lg:col-span-8 flex flex-col border-r relative z-10 h-full min-h-0 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
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
              <div className="flex items-center gap-3">
                 <a 
                   href="https://github.com/JustJade2007/AVA-School-Assistant" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className={`p-2 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                   title="View on GitHub"
                 >
                    <Github className="w-4 h-4" />
                 </a>
                 <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                    <div className={`w-2.5 h-2.5 rounded-full ${appState === AppState.STREAMING ? 'bg-emerald-500' : 'bg-red-500'} ${!settings.simplifiedMode && appState === AppState.STREAMING ? 'animate-pulse' : ''}`} />
                    <span className={`font-black text-[10px] tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{appState === AppState.STREAMING ? 'SIGNAL_ACTIVE' : 'SIGNAL_LOST'}</span>
                 </div>
                 {/* Extension Status */}
                 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${extensionConnected ? (isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30') : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-slate-800')}`} title={extensionConnected ? "Extension Active" : "Extension Not Detected"}>
                    <div className={`w-2 h-2 rounded-full ${extensionConnected ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    <span className={`font-black text-[9px] tracking-widest ${extensionConnected ? 'text-emerald-500' : 'text-slate-500'}`}>BRIDGE</span>
                 </div>
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
           {settings.triggerTime && settings.automationEnabled && appState === AppState.STREAMING && (
             <div className="absolute top-0 left-0 w-full h-1 bg-slate-800/30 z-50">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-75 ease-linear"
                  style={{ width: `${scanProgress}%` }}
                />
             </div>
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
        <div className={`lg:col-span-4 backdrop-blur-3xl border-l flex flex-col h-full z-20 min-h-0 overflow-hidden ${hudClass}`}>
           <div className="flex-1 min-h-0 overflow-hidden relative flex flex-col p-6">
               <div className={`mb-6 flex items-center justify-between border-b pb-4 relative overflow-hidden ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                  <span className={`font-black text-xs font-mono tracking-widest uppercase flex items-center gap-3 ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
                    <Scan className={`w-4 h-4 ${processingRef.current ? 'animate-spin' : ''}`} /> 
                    Neural Analysis
                  </span>
                  {processingRef.current && (
                    <>
                      <span className="text-[10px] font-bold animate-pulse text-cyan-500">SYNCING...</span>
                      <div className="absolute bottom-0 left-0 h-[1px] bg-cyan-500 animate-scan w-full" />
                    </>
                  )}
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <AnalysisView 
                    result={lastResult} 
                    isAnalyzing={processingRef.current} 
                    autoSelectEnabled={settings.autoSelect} 
                    simplifiedMode={settings.simplifiedMode} 
                    themeMode={settings.themeMode} 
                    showThinking={settings.showThinking}
                    alwaysShowThinking={settings.alwaysShowThinking}
                  />
               </div>
           </div>
           <div className={`flex-1 min-h-0 border-t flex flex-col overflow-hidden ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950'}`}>
               <SettingsPanel settings={settings} updateSettings={updateSettings} onLog={addLog} onClearLogs={clearLogs} logs={logs} />
           </div>
        </div>
      </div>

      {showApiKeyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-8 rounded-3xl border-2 shadow-2xl ${isLight ? 'bg-white border-red-200' : 'bg-slate-900 border-red-500/30'}`}>
            <div className="flex items-center gap-4 mb-6 text-red-500">
              <div className="p-3 rounded-2xl bg-red-500/10">
                <Monitor className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">API Key Required</h2>
                <p className="text-xs font-bold opacity-60">Authentication failed: Neural link inactive</p>
              </div>
            </div>
            
            <p className={`text-sm mb-6 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              To use AVA's neural analysis, you must provide a valid Gemini API key. Your key will be encrypted and saved for future sessions.
            </p>

            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter Gemini API Key..."
                className={`w-full p-4 rounded-xl text-sm font-mono outline-none border-2 focus:border-red-500 transition-all ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800 border-slate-700 text-white'}`}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && settings.apiKey && setShowApiKeyModal(false)}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowApiKeyModal(false)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                >
                  Later
                </button>
                <button 
                  onClick={() => settings.apiKey && setShowApiKeyModal(false)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/30"
                >
                  Save & Connect
                </button>
              </div>
              <p className="text-[10px] text-center opacity-40 font-bold uppercase tracking-widest">
                Safe & Encrypted Storage Active
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
