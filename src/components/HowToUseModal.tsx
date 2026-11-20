import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Keyboard,
  Sparkles,
  ShieldCheck,
  FolderSearch,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Compass,
} from 'lucide-react';
import { NeoBadge } from './NeoBadge';
import { NeoButton } from './NeoButton';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

const GUIDE_TABS = [
  { id: 'quickstart', label: '1. Quick Start', icon: <Compass className="w-4 h-4" /> },
  { id: 'prompts', label: '2. Prompt Cheat Sheet', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'safety', label: '3. Safety Sandbox', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'automation', label: '4. Watchdogs & Cron', icon: <Clock className="w-4 h-4" /> },
  { id: 'shortcuts', label: '5. Shortcuts', icon: <Keyboard className="w-4 h-4" /> },
];

const PROMPT_EXAMPLES = [
  {
    category: 'FILE OPERATIONS',
    badgeVariant: 'lime' as const,
    title: 'Sort Downloads by Filetype',
    prompt: 'Organize all PDFs and ZIPs in my Downloads folder into separate subfolders every night at 10 PM',
    description: 'Scans Downloads folder, creates dedicated subdirectories, and moves files safely with conflict renaming.',
  },
  {
    category: 'DISK CLEANUP',
    badgeVariant: 'yellow' as const,
    title: 'Purge Old Temp Cache',
    prompt: 'Clean up temporary files in Temp folder older than 24 hours',
    description: 'Finds stale temporary cache files in %TEMP% and removes them to free up disk space.',
  },
  {
    category: 'BATCH RENAMING',
    badgeVariant: 'cyan' as const,
    title: 'Standardize Screenshots',
    prompt: 'Batch rename all screenshots in Pictures to Screenshot-YYYY-MM-DD',
    description: 'Iterates through screenshot captures and applies uniform date-stamped naming conventions.',
  },
  {
    category: 'APP LAUNCHING',
    badgeVariant: 'lime' as const,
    title: 'Dev Workspace Launcher',
    prompt: 'Launch Visual Studio Code and Spotify when starting work',
    description: 'Spawns development tools and background music players in 1-click or via the Spotlight bar.',
  },
  {
    category: 'PROCESS MONITORING',
    badgeVariant: 'coral' as const,
    title: 'Kill Unresponsive Processes',
    prompt: 'Terminate unresponsive node.exe processes',
    description: 'Scans the Windows process table via psutil and terminates orphaned or frozen development servers.',
  },
];

export const HowToUseModal: React.FC<HowToUseModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
}) => {
  const [activeTab, setActiveTab] = useState('quickstart');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  };

  const handleTry = (prompt: string) => {
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-none animate-in fade-in duration-150 select-none">
      <div className="bg-[#F4F4F0] border-[3.5px] border-black shadow-[8px_8px_0px_#000] max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="bg-lime-acid border-b-[3px] border-black px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-black text-white p-1 border border-black shadow-[1px_1px_0px_#000]">
              <HelpCircle className="w-5 h-5 text-lime-acid" />
            </div>
            <div>
              <h3 className="font-mono font-black text-base uppercase text-black tracking-tight flex items-center gap-2">
                HOW TO USE GHOSTPILOT
                <span className="text-[10px] bg-black text-white px-1.5 py-0.5 border border-black">
                  OFFICIAL USER GUIDE
                </span>
              </h3>
              <p className="font-mono text-xs text-black/80 font-semibold">
                Master OS-level Windows 11 automation in plain English
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-white border-[2px] border-black text-black hover:bg-black hover:text-white transition-colors cursor-pointer shadow-[2px_2px_0px_#000]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-[#E5E5DE] border-b-[2.5px] border-black px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
          {GUIDE_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`font-mono text-xs font-bold uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5 border-[2px] transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-black text-lime-acid border-black shadow-[2px_2px_0px_#000]'
                    : 'bg-white text-black border-black/70 hover:bg-white hover:border-black'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F4F4F0]">
          {/* TAB 1: QUICK START */}
          {activeTab === 'quickstart' && (
            <div className="space-y-5">
              <div className="bg-white border-[2.5px] border-black p-4 shadow-neo-sm space-y-2">
                <span className="font-mono text-xs font-extrabold uppercase text-lime-acid bg-black px-2 py-0.5 inline-block">
                  The Core Concept
                </span>
                <p className="font-mono text-xs text-ink leading-relaxed">
                  GhostPilot lets you control Windows 11 without writing code. Simply describe what repetitive system task
                  you want performed—from file sorting to scheduled cleanups—and GhostPilot's AI compiler turns it into a
                  validated, deterministic execution pipeline.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  {
                    step: '01',
                    title: 'Hit Alt + Space',
                    desc: 'Press Alt + Space from any application to summon the Spotlight launcher command bar instantly.',
                    color: 'bg-yellow-electric',
                  },
                  {
                    step: '02',
                    title: 'Type in Plain English',
                    desc: 'Write what you want done (e.g. "Sort all PDFs in Downloads into a new PDFs folder").',
                    color: 'bg-cyan-cyber',
                  },
                  {
                    step: '03',
                    title: 'Review or Dry-Run',
                    desc: 'Inspect the generated action nodes or click "Dry-Run Sim" to safely preview affected files with zero risk.',
                    color: 'bg-lime-acid',
                  },
                  {
                    step: '04',
                    title: 'Execute & Automate',
                    desc: 'Click Execute Now or save the workflow into background Watchdogs or Scheduled Jobs.',
                    color: 'bg-white',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border-[2px] border-black p-3.5 shadow-neo-sm space-y-1.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-xs font-extrabold px-1.5 py-0.5 border border-black ${item.color}`}>
                        STEP {item.step}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-zinc-400">WINDOWS 11</span>
                    </div>
                    <h4 className="font-mono font-bold text-sm text-black uppercase">{item.title}</h4>
                    <p className="font-mono text-xs text-ink-muted leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PROMPTS CHEAT SHEET */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-black">
                  Recommended Workflow Prompts:
                </span>
                <span className="font-mono text-[11px] text-ink-muted">Click any prompt to try it</span>
              </div>

              <div className="space-y-2.5">
                {PROMPT_EXAMPLES.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-[2px] border-black p-3.5 shadow-neo-sm hover:translate-x-1 transition-transform space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <NeoBadge label={item.category} variant={item.badgeVariant} size="sm" />
                        <h4 className="font-mono font-bold text-xs uppercase text-black">{item.title}</h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(item.prompt, idx)}
                          title="Copy Prompt"
                          className="font-mono text-[11px] font-bold px-2 py-1 bg-[#F4F4F0] border border-black hover:bg-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 text-lime-acid" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                        <NeoButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleTry(item.prompt)}
                          icon={<ArrowRight className="w-3 h-3" />}
                        >
                          Compile
                        </NeoButton>
                      </div>
                    </div>

                    <div className="bg-[#F8F8F5] border-[1.5px] border-black p-2 font-mono text-xs text-black font-semibold">
                      "{item.prompt}"
                    </div>
                    <p className="font-mono text-[11px] text-ink-muted">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SAFETY SANDBOX */}
          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="bg-white border-[2.5px] border-black p-4 shadow-neo-sm space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-black" />
                  <h4 className="font-mono font-bold text-sm uppercase text-black">
                    Multi-Layer OS Safety Sandbox
                  </h4>
                </div>
                <p className="font-mono text-xs text-ink-muted leading-relaxed">
                  GhostPilot never performs destructive disk modifications blindly. Every prompt is inspected against strict
                  safety barriers before running.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-lime-acid/20 border-[2px] border-black p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <NeoBadge label="SAFE" variant="lime" dot />
                    <span className="font-bold text-black uppercase">Standard Read & Sort Operations</span>
                  </div>
                  <p className="text-ink">
                    Scans directories, creates subfolders, sorts files with collision-safe renaming (never overwrites).
                  </p>
                </div>

                <div className="bg-yellow-electric/25 border-[2px] border-black p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <NeoBadge label="ELEVATED" variant="yellow" dot />
                    <span className="font-bold text-black uppercase">Batch & Modification Tasks</span>
                  </div>
                  <p className="text-ink">
                    Batch renaming more than 20 files, clearing user temp folders, killing user-level spawned processes.
                  </p>
                </div>

                <div className="bg-coral-danger/15 border-[2px] border-black p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <NeoBadge label="HIGH_RISK" variant="coral" dot />
                    <span className="font-bold text-black uppercase">Strictly Gated Operations</span>
                  </div>
                  <p className="text-ink">
                    Permanent file deletions require mandatory Dry-Run simulation and explicit checkbox acknowledgement.
                    System paths (<code className="bg-white px-1">C:\Windows</code>, <code className="bg-white px-1">System32</code>, <code className="bg-white px-1">Program Files</code>) are permanently locked against modifications.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WATCHDOGS & CRON */}
          {activeTab === 'automation' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-white border-[2.5px] border-black p-4 shadow-neo-sm space-y-2">
                <h4 className="font-bold text-sm uppercase text-black flex items-center gap-2">
                  <FolderSearch className="w-4 h-4 text-black" /> Event-Driven Watchdogs
                </h4>
                <p className="text-ink-muted leading-relaxed">
                  Real-time Windows filesystem watchers monitor folders (e.g. <code className="bg-[#EAEAE4] px-1 font-bold">Downloads</code>, <code className="bg-[#EAEAE4] px-1 font-bold">Desktop</code>) via the Python <code className="font-bold">watchdog</code> library. Whenever a file matching your glob arrives (e.g. <code className="bg-yellow-electric px-1">*.pdf</code>), your workflow runs automatically in milliseconds.
                </p>
              </div>

              <div className="bg-white border-[2.5px] border-black p-4 shadow-neo-sm space-y-2">
                <h4 className="font-bold text-sm uppercase text-black flex items-center gap-2">
                  <Clock className="w-4 h-4 text-black" /> Recurring Scheduled Jobs
                </h4>
                <p className="text-ink-muted leading-relaxed">
                  Automate tasks on an interval timer (e.g. <em>"Every 60 minutes"</em>) or at a specific daily time (e.g. <em>"Every day at 22:00"</em>). The scheduler executes silently in the background worker without any CMD prompt interruption.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: SHORTCUTS CHEAT SHEET */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3 font-mono text-xs">
              <span className="font-bold uppercase tracking-wider text-black block pb-1">
                Windows Global & App Shortcuts:
              </span>

              <div className="bg-white border-[2px] border-black shadow-neo-sm divide-y divide-black">
                {[
                  { key: 'Alt + Space', desc: 'Toggle the floating Spotlight launcher on top of any active window' },
                  { key: 'Enter', desc: 'Compile plain English prompt or execute compiled workflow' },
                  { key: 'Esc', desc: 'Dismiss Spotlight command bar / Close modals / Return to Studio' },
                  { key: 'F1 or ?', desc: 'Open this interactive "How to Use" Guide anytime' },
                  { key: 'Ctrl + /', desc: 'Focus the command input field in Studio or Spotlight' },
                ].map((s, i) => (
                  <div key={i} className="p-3 flex items-center justify-between">
                    <kbd className="bg-black text-lime-acid font-bold px-2 py-1 border border-black shadow-[1.5px_1.5px_0px_#000] text-xs">
                      {s.key}
                    </kbd>
                    <span className="text-ink font-semibold">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#EAEAE4] border-t-[3px] border-black flex items-center justify-between">
          <span className="font-mono text-xs text-ink-muted">
            GhostPilot v1.0.0 // Standalone Edition
          </span>

          <NeoButton variant="primary" size="sm" onClick={onClose}>
            Got It! Close Guide
          </NeoButton>
        </div>
      </div>
    </div>
  );
};
