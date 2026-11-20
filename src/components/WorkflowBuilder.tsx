import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Eye, Save, Zap, HelpCircle } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoBadge } from './NeoBadge';
import { NeoCard } from './NeoCard';
import { WorkflowNodeCard } from './WorkflowNodeCard';
import { WorkflowPipelineView } from './WorkflowPipelineView';
import { WorkflowPlan } from '../types';
import { tauriApi } from '../lib/tauriClient';

interface WorkflowBuilderProps {
  onOpenDryRun: (plan: WorkflowPlan) => void;
  onExecute: (plan: WorkflowPlan) => void;
  onLogMessage: (source: any, level: any, text: string) => void;
  injectedPrompt?: string;
  onOpenHowToUse?: () => void;
}

const TEMPLATE_PROMPTS = [
  {
    title: 'Downloads Organizer',
    prompt: 'Organize all PDFs and ZIPs in my Downloads folder into separate subfolders every night at 10 PM',
    tag: 'FILE OPS',
  },
  {
    title: 'Purge Temp Files',
    prompt: 'Clean up temporary files in Temp folder older than 24 hours',
    tag: 'CLEANUP',
  },
  {
    title: 'Batch Rename Screenshots',
    prompt: 'Batch rename all screenshots in Pictures to Screenshot-YYYY-MM-DD',
    tag: 'RENAME',
  },
  {
    title: 'Dev Workspace Launcher',
    prompt: 'Launch Visual Studio Code and Spotify when starting work',
    tag: 'GUI MACRO',
  },
  {
    title: 'High RAM Process Guard',
    prompt: 'Terminate unresponsive Chrome or Node processes when RAM exceeds 85%',
    tag: 'PROCESS',
  },
];

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  onOpenDryRun,
  onExecute,
  onLogMessage,
  injectedPrompt,
  onOpenHowToUse,
}) => {
  const [prompt, setPrompt] = useState(
    'Organize all PDFs and ZIPs in my Downloads folder into separate subfolders every night at 10 PM'
  );
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledPlan, setCompiledPlan] = useState<WorkflowPlan | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (injectedPrompt) {
      setPrompt(injectedPrompt);
      handleCompile(injectedPrompt);
    } else {
      handleCompile();
    }
  }, [injectedPrompt]);

  const handleCompile = async (customPrompt?: string) => {
    const text = (customPrompt || prompt).trim();
    if (!text) return;

    setIsCompiling(true);
    setSavedSuccess(false);
    onLogMessage('ENGINE', 'INFO', `Compiling natural language prompt: "${text}"`);

    try {
      const plan = await tauriApi.compilePrompt(text);
      setCompiledPlan(plan);
      onLogMessage(
        'ENGINE',
        'SUCCESS',
        `Compiled "${plan.title}" (${plan.actions.length} action nodes, Risk: ${plan.risk_level})`
      );
    } catch (err: any) {
      onLogMessage('ENGINE', 'ERROR', `Compilation failed: ${err.message || err}`);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!compiledPlan) return;
    try {
      await tauriApi.saveWorkflow({
        id: compiledPlan.id,
        name: compiledPlan.title,
        prompt: prompt,
        plan_json: compiledPlan,
        trigger_type: compiledPlan.trigger.type,
        trigger_meta: compiledPlan.trigger,
        risk_level: compiledPlan.risk_level,
      });
      setSavedSuccess(true);
      onLogMessage('ENGINE', 'SUCCESS', `Workflow "${compiledPlan.title}" saved to local database.`);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      onLogMessage('ENGINE', 'ERROR', `Failed to save workflow: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <NeoCard
        title="NATURAL LANGUAGE WORKFLOW COMPILER"
        headerColor="bg-lime-acid"
        badge={<NeoBadge label="AI ENGINE" variant="black" />}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-xs font-bold uppercase text-black flex items-center justify-between">
              <span>Command Prompt (Plain English):</span>
              <span className="text-[11px] text-ink-muted lowercase">Natural Windows 11 commands</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCompile()}
                placeholder="e.g. Organize all PDFs and ZIPs in Downloads every night at 10 PM..."
                className="flex-1 font-mono text-sm px-3.5 py-2.5 bg-[#F4F4F0] border-[2.5px] border-black text-black placeholder-zinc-400 focus:outline-none shadow-neo-sm"
              />
              <NeoButton
                variant="primary"
                size="md"
                onClick={() => handleCompile()}
                disabled={isCompiling || !prompt.trim()}
                icon={<Sparkles className="w-4 h-4" />}
              >
                {isCompiling ? 'Compiling...' : 'Compile Plan'}
              </NeoButton>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">
                Template Inspirations:
              </span>
              {onOpenHowToUse && (
                <button
                  onClick={onOpenHowToUse}
                  className="font-mono text-[11px] font-extrabold text-black hover:underline flex items-center gap-1 cursor-pointer bg-yellow-electric/60 border border-black px-2 py-0.5 shadow-[1px_1px_0px_#000]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How to Use Guide & Cheat Sheet →</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_PROMPTS.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(t.prompt);
                    handleCompile(t.prompt);
                  }}
                  className="font-mono text-xs px-2.5 py-1.5 bg-white border-[1.5px] border-black hover:bg-yellow-electric transition-colors shadow-neo-sm flex items-center gap-1.5 cursor-pointer text-black"
                >
                  <span className="font-bold">{t.title}</span>
                  <span className="text-[10px] bg-black text-white px-1">[{t.tag}]</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </NeoCard>

      {compiledPlan ? (
        <div className="space-y-4">
          <div className="bg-white border-[2.5px] border-black p-4 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-mono font-bold text-base uppercase text-black">{compiledPlan.title}</h3>
                <NeoBadge
                  label={compiledPlan.risk_level}
                  variant={
                    compiledPlan.risk_level === 'HIGH_RISK'
                      ? 'coral'
                      : compiledPlan.risk_level === 'ELEVATED'
                      ? 'yellow'
                      : 'lime'
                  }
                  dot
                />
                <NeoBadge label={compiledPlan.trigger.type} variant="cyan" />
              </div>
              <p className="font-mono text-xs text-ink-muted">{compiledPlan.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <NeoButton
                variant="neutral"
                size="sm"
                icon={<Eye className="w-4 h-4" />}
                onClick={() => onOpenDryRun(compiledPlan)}
              >
                Dry-Run Sim
              </NeoButton>

              <NeoButton
                variant={compiledPlan.risk_level === 'HIGH_RISK' ? 'danger' : 'primary'}
                size="sm"
                icon={<Play className="w-4 h-4" />}
                onClick={() => onExecute(compiledPlan)}
              >
                Execute Now
              </NeoButton>

              <NeoButton
                variant="secondary"
                size="sm"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSaveWorkflow}
              >
                {savedSuccess ? 'Saved!' : 'Save'}
              </NeoButton>
            </div>
          </div>

          <WorkflowPipelineView plan={compiledPlan} />

          <div className="space-y-1">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                Execution Pipeline ({compiledPlan.actions.length} Nodes):
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                Trigger: {compiledPlan.trigger.expression || 'Manual'}
              </span>
            </div>

            <div className="space-y-0">
              {compiledPlan.actions.map((act, index) => (
                <WorkflowNodeCard
                  key={act.id}
                  step={act}
                  index={index}
                  totalSteps={compiledPlan.actions.length}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-[2.5px] border-dashed border-black/40 p-12 text-center bg-white/40 space-y-3">
          <div className="w-12 h-12 bg-yellow-electric border-[2px] border-black mx-auto flex items-center justify-center shadow-neo-sm">
            <Zap className="w-6 h-6 text-black" />
          </div>
          <h4 className="font-mono font-bold text-sm uppercase text-black">No Workflow Compiled Yet</h4>
          <p className="font-mono text-xs text-ink-muted max-w-md mx-auto">
            Type your repetitive Windows task above or click any inspiration template to compile a validated, deterministic
            action pipeline.
          </p>
        </div>
      )}
    </div>
  );
};
