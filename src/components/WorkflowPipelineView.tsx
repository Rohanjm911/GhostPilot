import React, { useState } from 'react';
import {
  Clock,
  Filter,
  Play,
  Code2,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';
import { WorkflowPlan } from '../types';
import { NeoBadge } from './NeoBadge';
import { NeoButton } from './NeoButton';
import { generatePythonScript, generatePowerShellScript } from '../lib/scriptGenerator';

interface WorkflowPipelineViewProps {
  plan: WorkflowPlan;
}

export const WorkflowPipelineView: React.FC<WorkflowPipelineViewProps> = ({ plan }) => {
  const [showScriptInspector, setShowScriptInspector] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'python' | 'powershell'>('python');
  const [copied, setCopied] = useState(false);

  const firstAction = plan.actions[0] || {};
  const filterList = firstAction.filter || [];
  const targetPath = firstAction.path || firstAction.source || '%USERPROFILE%\\Downloads';

  const pythonCode = generatePythonScript(plan);
  const powerShellCode = generatePowerShellScript(plan);
  const activeCode = selectedLang === 'python' ? pythonCode : powerShellCode;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 select-none">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-black uppercase tracking-wider text-black flex items-center gap-2">
          <span>// VISUAL AUTOMATION PIPELINE</span>
          <NeoBadge label="3 STAGES" variant="black" size="sm" />
        </span>

        <NeoButton
          variant={showScriptInspector ? 'secondary' : 'neutral'}
          size="sm"
          onClick={() => setShowScriptInspector(!showScriptInspector)}
          icon={<Code2 className="w-4 h-4" />}
        >
          {showScriptInspector ? 'Hide Script' : 'Inspect Script (Python / PS)'}
        </NeoButton>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch gap-3 overflow-x-auto pb-2">
        <div className="flex-1 bg-white border-[2.5px] border-black shadow-neo flex flex-col justify-between min-w-[220px]">
          <div>
            <div className="bg-yellow-electric border-b-[2.5px] border-black px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-black" />
                <span className="font-mono font-black text-xs uppercase tracking-wider text-black">
                  [TRIGGER]
                </span>
              </div>
              <NeoBadge label={plan.trigger.type} variant="black" size="sm" />
            </div>

            <div className="p-3.5 space-y-2">
              <div className="font-mono text-xs font-bold text-black">
                {plan.trigger.type === 'SCHEDULED' && '⏰ Recurring Schedule'}
                {plan.trigger.type === 'WATCHDOG' && '📂 Real-time Folder Observer'}
                {plan.trigger.type === 'MANUAL' && '⚡ Manual / Spotlight Hotkey'}
                {plan.trigger.type === 'COMMAND_BAR' && '⚡ Alt + Space Launcher'}
              </div>

              <div className="bg-[#F4F4F0] border-[1.5px] border-black p-2 font-mono text-[11px] text-zinc-800 break-all shadow-[1px_1px_0px_#000]">
                {plan.trigger.expression || plan.trigger.path || 'Triggered on user demand / Alt+Space'}
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 border-t-[1.5px] border-black bg-[#FAFAF8] text-[10px] font-mono font-bold text-ink-muted">
            STAGE 01 // EVENT SOURCE
          </div>
        </div>

        <div className="flex items-center justify-center shrink-0 py-1 lg:py-0">
          <div className="w-9 h-9 bg-black text-lime-acid border-[2.5px] border-black font-mono font-black text-base flex items-center justify-center shadow-[2px_2px_0px_#B8FF00] rotate-90 lg:rotate-0">
            ➔
          </div>
        </div>

        <div className="flex-1 bg-white border-[2.5px] border-black shadow-neo flex flex-col justify-between min-w-[240px]">
          <div>
            <div className="bg-cyan-cyber border-b-[2.5px] border-black px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-black" />
                <span className="font-mono font-black text-xs uppercase tracking-wider text-black">
                  [CONDITION]
                </span>
              </div>
              <NeoBadge label="SANDBOX PASS" variant="white" size="sm" />
            </div>

            <div className="p-3.5 space-y-2.5">
              <div>
                <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">
                  Target Windows Path:
                </span>
                <span className="font-mono text-xs font-bold text-black break-all block bg-[#F4F4F0] border-[1.5px] border-black px-2 py-1 shadow-[1px_1px_0px_#000]">
                  {targetPath}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block pb-1">
                  Active Filter Rules:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {filterList.length > 0 ? (
                    filterList.map((f, i) => (
                      <span
                        key={i}
                        className="bg-yellow-electric border border-black px-1.5 py-0.5 font-mono text-[10px] font-black shadow-[1px_1px_0px_#000]"
                      >
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="bg-[#E4E4DC] border border-black px-1.5 py-0.5 font-mono text-[10px] font-bold">
                      MATCH ALL (*.*)
                    </span>
                  )}
                  <span className="bg-white border border-black px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
                    Safe Collision Policy
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 border-t-[1.5px] border-black bg-[#FAFAF8] text-[10px] font-mono font-bold text-ink-muted">
            STAGE 02 // SCOPE &amp; BOUNDARIES
          </div>
        </div>

        <div className="flex items-center justify-center shrink-0 py-1 lg:py-0">
          <div className="w-9 h-9 bg-black text-lime-acid border-[2.5px] border-black font-mono font-black text-base flex items-center justify-center shadow-[2px_2px_0px_#B8FF00] rotate-90 lg:rotate-0">
            ➔
          </div>
        </div>

        <div className="flex-1 bg-white border-[2.5px] border-black shadow-neo flex flex-col justify-between min-w-[260px]">
          <div>
            <div className="bg-lime-acid border-b-[2.5px] border-black px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-black" />
                <span className="font-mono font-black text-xs uppercase tracking-wider text-black">
                  [ACTION]
                </span>
              </div>
              <NeoBadge
                label={plan.risk_level}
                variant={plan.risk_level === 'HIGH_RISK' ? 'coral' : plan.risk_level === 'ELEVATED' ? 'yellow' : 'black'}
                size="sm"
                dot
              />
            </div>

            <div className="p-3.5 space-y-2">
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase block">
                Atomic Execution Sequence:
              </span>
              <div className="space-y-1.5">
                {plan.actions.map((act, i) => (
                  <div
                    key={act.id || i}
                    className="flex items-center justify-between bg-[#F4F4F0] border-[1.5px] border-black px-2.5 py-1.5 text-xs font-mono shadow-[1px_1px_0px_#000]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-black text-lime-acid px-1 font-mono text-[9px] font-black">
                        #{i + 1}
                      </span>
                      <span className="font-bold text-black truncate max-w-[150px]">{act.title}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-white border border-black px-1">
                      {act.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-3.5 py-2 border-t-[1.5px] border-black bg-[#FAFAF8] text-[10px] font-mono font-bold text-ink-muted flex items-center justify-between">
            <span>STAGE 03 // OS DISPATCH</span>
            <span className="text-black font-extrabold">{plan.actions.length} ATOMIC OPS</span>
          </div>
        </div>
      </div>

      {showScriptInspector && (
        <div className="bg-[#0D0D11] border-[2.5px] border-black shadow-neo-lg text-white font-mono overflow-hidden animate-in fade-in zoom-in-98 duration-150">
          <div className="bg-[#18181E] border-b-[2px] border-black px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-lime-acid" />
              <span className="font-black text-xs uppercase tracking-wider text-lime-acid">
                GENERATED CODE INSPECTOR
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex border-[1.5px] border-black bg-black">
                <button
                  onClick={() => setSelectedLang('python')}
                  className={`px-3 py-1 text-xs font-black uppercase transition-all cursor-pointer ${
                    selectedLang === 'python'
                      ? 'bg-lime-acid text-black'
                      : 'bg-black text-zinc-400 hover:text-white'
                  }`}
                >
                  Python 3 (Sidecar)
                </button>
                <button
                  onClick={() => setSelectedLang('powershell')}
                  className={`px-3 py-1 text-xs font-black uppercase transition-all cursor-pointer border-l border-zinc-700 ${
                    selectedLang === 'powershell'
                      ? 'bg-cyan-cyber text-black'
                      : 'bg-black text-zinc-400 hover:text-white'
                  }`}
                >
                  PowerShell 7 (Win11)
                </button>
              </div>

              <NeoButton
                variant="neutral"
                size="sm"
                onClick={handleCopyCode}
                icon={copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copied ? 'COPIED!' : 'COPY CODE'}
              </NeoButton>
            </div>
          </div>

          <div className="p-4 overflow-x-auto max-h-72 overflow-y-auto text-xs leading-relaxed selection:bg-lime-acid selection:text-black">
            <pre className="font-mono text-zinc-300">
              {activeCode.split('\n').map((line, idx) => (
                <div key={idx} className="flex hover:bg-zinc-900/60 px-1 py-0.5">
                  <span className="w-8 shrink-0 text-zinc-600 select-none text-right pr-3 font-semibold">
                    {idx + 1}
                  </span>
                  <span
                    className={
                      line.startsWith('#')
                        ? 'text-zinc-500 italic'
                        : line.startsWith('import') || line.startsWith('def') || line.startsWith('if')
                        ? 'text-lime-acid font-bold'
                        : line.includes('print(') || line.includes('Write-Host')
                        ? 'text-yellow-electric'
                        : line.includes('Path(') || line.includes('Join-Path')
                        ? 'text-cyan-cyber'
                        : 'text-zinc-200'
                    }
                  >
                    {line}
                  </span>
                </div>
              ))}
            </pre>
          </div>

          <div className="bg-[#121216] border-t border-zinc-800 px-4 py-1.5 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Syntax: {selectedLang === 'python' ? 'Python 3.14 (Standalone Engine)' : 'Microsoft PowerShell 7 Native'}</span>
            <span className="text-lime-acid font-bold">100% Offline Executable</span>
          </div>
        </div>
      )}
    </div>
  );
};
