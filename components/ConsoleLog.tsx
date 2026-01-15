import React, { useEffect, useRef } from 'react';
import { Terminal, Activity } from 'lucide-react';
import { LogEntry } from '../types';

interface ConsoleLogProps {
  logs: LogEntry[];
}

const ConsoleLog: React.FC<ConsoleLogProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-32 bg-slate-950 border-t border-slate-800 flex flex-col font-mono text-[10px] relative group shrink-0">
      <div className="absolute top-2 right-2 opacity-30 flex items-center gap-1 text-slate-500 pointer-events-none select-none">
        <Activity className="w-3 h-3" /> LIVE_LOG
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-slate-700 italic flex items-center gap-2 opacity-50">
            <Terminal className="w-3 h-3" />
            <span>System initialized. Waiting for events...</span>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 hover:bg-white/5 px-1 rounded -mx-1 transition-colors">
            <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
            <span className={`
              break-all
              ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
              ${log.type === 'warning' ? 'text-amber-400' : ''}
              ${log.type === 'success' ? 'text-emerald-400' : ''}
              ${log.type === 'info' ? 'text-cyan-200/70' : ''}
            `}>
              {log.type === 'error' && '!! '}
              {log.type === 'warning' && '>> '}
              {log.message}
              {log.count && log.count > 1 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[8px] font-bold border border-slate-700">
                  x{log.count}
                </span>
              )}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
export default ConsoleLog;
