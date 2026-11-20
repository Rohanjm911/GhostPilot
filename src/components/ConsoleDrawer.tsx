import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronUp, ChevronDown, Trash2, Copy, Check } from 'lucide-react';
import { NeoButton } from './NeoButton';

export interface ConsoleMessage {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  source: 'ENGINE' | 'TAURI' | 'WATCHDOG' | 'SCHEDULER' | 'DRY-RUN';
  text: string;
}

interface ConsoleDrawerProps {
  logs: ConsoleMessage[];
  onClear: () => void;
}

export const ConsoleDrawer: React.FC<ConsoleDrawerProps> = ({ logs, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.source}] [${l.level}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderBadge = (log: ConsoleMessage) => {
    if (log.source === 'DRY-RUN' || log.text.toLowerCase().includes('dry-run') || log.text.toLowerCase().includes('simulation')) {
      return (
        <span className="bg-yellow-electric text-black border border-black px-1.5 py-0.2 font-mono text-[9px] font-black shrink-0 shadow-[1px_1px_0px_#000]">
          [DRY-RUN]
        </span>
      );
    }

    if (log.source === 'WATCHDOG' || log.text.toLowerCase().includes('watchdog')) {
      return (
        <span className="bg-cyan-cyber text-black border border-black px-1.5 py-0.2 font-mono text-[9px] font-black shrink-0 shadow-[1px_1px_0px_#000]">
          [WATCHDOG]
        </span>
      );
    }

    if (log.level === 'ERROR') {
      return (
        <span className="bg-coral-danger text-white border border-black px-1.5 py-0.2 font-mono text-[9px] font-black shrink-0 shadow-[1px_1px_0px_#000]">
          [ERROR]
        </span>
      );
    }

    if (log.level === 'SUCCESS') {
      return (
        <span className="bg-lime-acid text-black border border-black px-1.5 py-0.2 font-mono text-[9px] font-black shrink-0 shadow-[1px_1px_0px_#000]">
          [SUCCESS]
        </span>
      );
    }

    if (log.level === 'WARN') {
      return (
        <span className="bg-yellow-electric text-black border border-black px-1.5 py-0.2 font-mono text-[9px] font-black shrink-0 shadow-[1px_1px_0px_#000]">
          [WARN]
        </span>
      );
    }

    return (
      <span className="bg-white text-black border border-black px-1.5 py-0.2 font-mono text-[9px] font-black shrink-0 shadow-[1px_1px_0px_#000]">
        [INFO]
      </span>
    );
  };

  return (
    <div className="border-t-[3px] border-black bg-black text-white select-none transition-all font-mono">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-zinc-950 border-b border-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-acid border border-black animate-pulse inline-block" />
            <Terminal className="w-4 h-4 text-lime-acid" />
          </div>

          <span className="font-mono font-black text-xs uppercase tracking-wider text-lime-acid">
            SYSTEM CONSOLE // LIVE WORKER LOGS
          </span>

          <span className="font-mono text-[10px] font-bold bg-zinc-900 border border-zinc-700 px-2 py-0.5 text-zinc-300 shadow-[1px_1px_0px_#000]">
            {logs.length} EVENTS
          </span>
        </div>

        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <NeoButton
              variant="neutral"
              size="sm"
              onClick={handleCopy}
              icon={copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'COPIED!' : 'COPY LOGS'}
            </NeoButton>

            <NeoButton
              variant="danger"
              size="sm"
              onClick={onClear}
              icon={<Trash2 className="w-3.5 h-3.5 text-white" />}
            >
              CLEAR
            </NeoButton>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            {isOpen ? <ChevronDown className="w-4 h-4 text-lime-acid" /> : <ChevronUp className="w-4 h-4 text-zinc-300" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          ref={scrollRef}
          className="p-3.5 h-56 overflow-y-auto font-mono text-xs space-y-1.5 bg-[#09090C] selection:bg-lime-acid selection:text-black border-t border-zinc-900"
        >
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic py-6 text-center font-mono">
              [SYSTEM IDLE] Zero events logged. Ready for input.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 leading-relaxed hover:bg-zinc-900/50 px-2 py-1 border-b border-zinc-900/80 transition-colors"
              >
                <span className="text-zinc-500 shrink-0 text-[11px] font-mono">
                  {log.timestamp}
                </span>

                <span className="text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 text-[9px] font-bold shrink-0">
                  {log.source}
                </span>

                {renderBadge(log)}

                <span
                  className={`break-all font-mono text-xs ${
                    log.level === 'ERROR'
                      ? 'text-coral-danger font-bold'
                      : log.level === 'SUCCESS'
                      ? 'text-lime-acid'
                      : log.level === 'WARN'
                      ? 'text-yellow-electric'
                      : 'text-zinc-200'
                  }`}
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
