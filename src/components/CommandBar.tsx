import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Play, Eye, Maximize2, ShieldAlert, CheckCircle2, X, HelpCircle } from 'lucide-react';
import { NeoBadge } from './NeoBadge';
import { NeoButton } from './NeoButton';
import { WorkflowPlan } from '../types';
import { tauriApi } from '../lib/tauriClient';

interface CommandBarProps {
  onExpandToStudio: () => void;
  onPlanCompiled?: (plan: WorkflowPlan) => void;
  onOpenDryRun: (plan: WorkflowPlan) => void;
  onExecute: (plan: WorkflowPlan) => void;
  onClose?: () => void;
  onOpenHowToUse?: () => void;
}

const EXAMPLE_PROMPTS = [
  'Organize all PDFs and ZIPs in my Downloads folder into separate subfolders every night at 10 PM',
  'Clean up temporary cache files in Temp folder older than 24 hours',
  'Batch rename all screenshots in Pictures to Screenshot-YYYY-MM-DD',
  'Launch VS Code and Spotify when starting workspace',
];

export const CommandBar: React.FC<CommandBarProps> = ({
  onExpandToStudio,
  onPlanCompiled,
  onOpenDryRun,
  onExecute,
  onClose,
  onOpenHowToUse,
}) => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<'READY' | 'COMPILING' | 'SAFE' | 'RISK_DETECTED'>('READY');
  const [compiledPlan, setCompiledPlan] = useState<WorkflowPlan | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCompile = async (textToCompile?: string) => {
    const text = (textToCompile || prompt).trim();
    if (!text) return;

    setStatus('COMPILING');
    setErrorMsg(null);

    try {
      const plan = await tauriApi.compilePrompt(text);
      setCompiledPlan(plan);
      if (onPlanCompiled) onPlanCompiled(plan);

      if (plan.risk_level === 'HIGH_RISK') {
        setStatus('RISK_DETECTED');
      } else {
        setStatus('SAFE');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to compile workflow.');
      setStatus('READY');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!compiledPlan) {
        handleCompile();
      } else {
        onExecute(compiledPlan);
      }
    } else if (e.key === 'Escape') {
      if (onClose) onClose();
    }
  };

  return (
    <div className="w-full max-w-[680px] mx-auto bg-canvas border-[3px] border-black shadow-neo-xl select-none animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-black text-white px-4 py-2.5 flex items-center justify-between border-b-[2.5px] border-black">
        <div className="flex items-center gap-2.5">
          {/* Retro Window Dot Controls */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-coral-danger border border-black inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-electric border border-black inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-lime-acid border border-black inline-block" />
          </div>

          <span className="font-mono font-black text-xs tracking-wider uppercase text-lime-acid flex items-center gap-1.5">
            <span>👻</span>
            <span>GHOSTPILOT // SPOTLIGHT</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 border border-zinc-700 shadow-[1px_1px_0px_#000]">
            ALT + SPACE
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status === 'READY' && <NeoBadge label="READY" variant="lime" dot />}
          {status === 'COMPILING' && <NeoBadge label="COMPILING..." variant="yellow" dot />}
          {status === 'SAFE' && <NeoBadge label="SAFE" variant="lime" dot />}
          {status === 'RISK_DETECTED' && <NeoBadge label="RISK DETECTED" variant="coral" dot />}

          {onOpenHowToUse && (
            <button
              onClick={onOpenHowToUse}
              title="How to Use Guide (?)"
              className="p-1.5 hover:bg-zinc-800 border border-zinc-700 text-lime-acid transition-all cursor-pointer hover:border-lime-acid"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onExpandToStudio}
            title="Expand to Full Studio Dashboard"
            className="p-1.5 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-all cursor-pointer hover:border-zinc-500"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="p-1.5 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-all cursor-pointer hover:border-coral-danger hover:text-coral-danger"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Input Field */}
      <div className="p-4 bg-white border-b-[2.5px] border-black">
        <div className="flex items-center gap-3">
          <div className="bg-lime-acid border-[2.5px] border-black p-2 shadow-neo-sm">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (compiledPlan) setCompiledPlan(null);
              setStatus('READY');
            }}
            onKeyDown={handleKeyDown}
            placeholder="Command your machine in plain English..."
            className="w-full font-mono text-sm font-bold text-black placeholder-zinc-400 focus:outline-none"
          />
          <NeoButton
            variant="primary"
            size="sm"
            onClick={() => handleCompile()}
            disabled={status === 'COMPILING' || !prompt.trim()}
          >
            {status === 'COMPILING' ? (
              <span className="animate-spin inline-block">⚡</span>
            ) : (
              <span className="flex items-center gap-1">
                <span>RUN</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
          </NeoButton>
        </div>
      </div>

      {/* Error Message if any */}
      {errorMsg && (
        <div className="bg-coral-danger/10 border-b-[2px] border-black px-4 py-2 flex items-center gap-2 text-xs font-mono font-bold text-coral-danger">
          <ShieldAlert className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Compiled Execution Preview in Spotlight */}
      {compiledPlan && (
        <div className="p-4 bg-[#F8F8F5] border-b-[2.5px] border-black space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-black" />
              <h4 className="font-mono font-bold text-xs uppercase tracking-tight text-black">
                {compiledPlan.title}
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] bg-white border border-black px-1.5 py-0.5">
                {compiledPlan.actions.length} ACTIONS
              </span>
              <span className="font-mono text-[10px] bg-yellow-electric border border-black px-1.5 py-0.5 font-bold">
                {compiledPlan.trigger.type}
              </span>
            </div>
          </div>

          <p className="text-xs text-ink-muted font-mono">{compiledPlan.description}</p>

          {/* Quick Actions in Spotlight */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <NeoButton
              variant="neutral"
              size="sm"
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => onOpenDryRun(compiledPlan)}
            >
              Dry-Run Sim
            </NeoButton>
            <NeoButton
              variant={compiledPlan.risk_level === 'HIGH_RISK' ? 'danger' : 'primary'}
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => onExecute(compiledPlan)}
            >
              Execute
            </NeoButton>
          </div>
        </div>
      )}

      {/* Prompt Suggestions */}
      {!compiledPlan && (
        <div className="p-3.5 bg-canvas space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-black text-ink-muted uppercase tracking-wider">
              Quick Prompt Templates:
            </span>
            <span className="text-[10px] font-mono text-zinc-500">1-click to auto-load</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {EXAMPLE_PROMPTS.slice(0, 3).map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setPrompt(item);
                  handleCompile(item);
                }}
                className="text-left font-mono text-xs px-3 py-2 bg-white border-[2px] border-black hover:bg-lime-acid/30 hover:border-black hover:translate-x-1 transition-all flex items-center justify-between group shadow-[2px_2px_0px_#000] cursor-pointer"
              >
                <span className="truncate pr-2 text-ink font-semibold flex items-center gap-2">
                  <span className="text-lime-acid font-bold bg-black px-1 text-[9px]">#{idx + 1}</span>
                  <span>{item}</span>
                </span>
                <span className="font-bold text-black bg-lime-acid border border-black px-1.5 py-0.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                  RUN ↵
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Hint Footer */}
      <div className="bg-[#EAEAE4] px-4 py-2 border-t-[2px] border-black flex items-center justify-between text-[11px] font-mono text-ink-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-black px-1.5 py-0.5 text-[10px] font-bold text-black shadow-[1px_1px_0px_#000]">↵</kbd> Compile &amp; Run
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-white border border-black px-1.5 py-0.5 text-[10px] font-bold text-black shadow-[1px_1px_0px_#000]">Esc</kbd> Dismiss
          </span>
        </div>
        <button
          onClick={onExpandToStudio}
          className="font-bold text-black hover:text-lime-acid hover:bg-black px-2 py-0.5 border border-transparent hover:border-black transition-all inline-flex items-center gap-1 cursor-pointer"
        >
          Open Full Studio →
        </button>
      </div>
    </div>
  );
};
