import React, { useState, useEffect } from 'react';
import {
  Eye,
  Clock,
  History,
  Settings,
  Sparkles,
  Cpu,
  HardDrive,
  Minimize2,
  HelpCircle,
} from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoBadge } from './NeoBadge';
import { WorkflowBuilder } from './WorkflowBuilder';
import { WatchdogManager } from './WatchdogManager';
import { ScheduleManager } from './ScheduleManager';
import { AuditLogs } from './AuditLogs';
import { SettingsView } from './SettingsView';
import { ConsoleDrawer, ConsoleMessage } from './ConsoleDrawer';
import { WorkflowPlan, SystemStats } from '../types';
import { tauriApi } from '../lib/tauriClient';

interface StudioDashboardProps {
  onOpenDryRun: (plan: WorkflowPlan) => void;
  onExecute: (plan: WorkflowPlan) => void;
  onToggleSpotlightMode: () => void;
  consoleLogs: ConsoleMessage[];
  onClearLogs: () => void;
  onAddLog: (source: any, level: any, text: string) => void;
  onOpenHowToUse: () => void;
  injectedPrompt?: string;
}

export const StudioDashboard: React.FC<StudioDashboardProps> = ({
  onOpenDryRun,
  onExecute,
  onToggleSpotlightMode,
  consoleLogs,
  onClearLogs,
  onAddLog,
  onOpenHowToUse,
  injectedPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<
    'studio' | 'watchdogs' | 'schedules' | 'audit' | 'settings'
  >('studio');

  const [stats, setStats] = useState<SystemStats>({
    cpu_percent: 22.4,
    ram_percent: 68.1,
    ram_used_gb: 10.9,
    ram_total_gb: 16.0,
    active_watchdogs: 1,
    active_schedules: 1,
  });

  // Query system stats periodically (optimized for low-end hardware & background tab throttling)
  useEffect(() => {
    const updateStats = async () => {
      if (document.hidden) return;
      try {
        const s = await tauriApi.getSystemStats();
        if (s) setStats(s);
      } catch {}
    };
    updateStats();
    const interval = setInterval(updateStats, 8000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'studio', label: 'Command Studio', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'watchdogs', label: 'Active Watchdogs', icon: <Eye className="w-4 h-4" /> },
    { id: 'schedules', label: 'Scheduled Jobs', icon: <Clock className="w-4 h-4" /> },
    { id: 'audit', label: 'Execution Logs', icon: <History className="w-4 h-4" /> },
    { id: 'settings', label: 'AI & Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink select-none">
      {/* Global Studio Top Header */}
      <header className="bg-white border-b-[3px] border-black px-6 py-3 flex items-center justify-between shadow-neo sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-lime-acid border-[2.5px] border-black p-2 shadow-neo-sm flex items-center justify-center text-xl">
            👻
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono font-black text-lg tracking-tight text-black uppercase flex items-center gap-1.5">
                <span>GHOST</span>
                <span className="bg-lime-acid px-1.5 py-0.2 border border-black shadow-[1.5px_1.5px_0px_#000]">PILOT</span>
              </h1>
              <NeoBadge label="v1.0.0" variant="black" size="sm" />
              <NeoBadge label="ONLINE" variant="lime" size="sm" dot />
            </div>
            <p className="font-mono text-xs text-ink-muted">Command your machine in plain English</p>
          </div>
        </div>

        {/* Live System Performance Pills & Launcher Button */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2.5 font-mono text-xs">
            <div className="bg-[#F4F4F0] border-[2px] border-black px-3 py-1.5 flex items-center gap-2 shadow-[2px_2px_0px_#000]">
              <Cpu className="w-3.5 h-3.5 text-black" />
              <span className="font-bold">
                CPU: <span className={stats.cpu_percent > 80 ? 'text-coral-danger font-black' : 'text-black'}>{stats.cpu_percent}%</span>
              </span>
            </div>
            <div className="bg-[#F4F4F0] border-[2px] border-black px-3 py-1.5 flex items-center gap-2 shadow-[2px_2px_0px_#000]">
              <HardDrive className="w-3.5 h-3.5 text-black" />
              <span className="font-bold">
                RAM: <span className={stats.ram_percent > 85 ? 'text-coral-danger font-black' : 'text-black'}>{stats.ram_percent}%</span>
              </span>
            </div>
          </div>

          <NeoButton
            variant="primary"
            size="sm"
            onClick={onOpenHowToUse}
            icon={<HelpCircle className="w-3.5 h-3.5" />}
          >
            How to Use (?)
          </NeoButton>

          <NeoButton
            variant="secondary"
            size="sm"
            onClick={onToggleSpotlightMode}
            icon={<Minimize2 className="w-3.5 h-3.5" />}
          >
            Spotlight [Alt+Space]
          </NeoButton>
        </div>
      </header>

      {/* Main Studio Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r-[3px] border-black bg-[#EAEAE4] flex flex-col justify-between shrink-0">
          <div className="p-4 space-y-2">
            <span className="text-[10px] font-mono font-black text-ink-muted uppercase tracking-wider block px-1 pb-0.5">
              // Control Modules
            </span>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full font-mono text-xs font-black uppercase tracking-wider px-3.5 py-3 flex items-center justify-between border-[2.5px] border-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-lime-acid shadow-neo text-black translate-x-1.5'
                      : 'bg-white shadow-[2px_2px_0px_#000] hover:bg-white hover:translate-x-1 text-black'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="font-bold text-xs">→</span>}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-4 border-t-[2px] border-black bg-white space-y-2.5">
            <button
              onClick={onOpenHowToUse}
              className="w-full font-mono text-xs font-black uppercase tracking-wider py-2 px-3 bg-yellow-electric border-[2px] border-black shadow-[2px_2px_0px_#000] hover:bg-yellow-300 flex items-center justify-center gap-1.5 cursor-pointer text-black active:translate-x-[1px] active:translate-y-[1px]"
            >
              <HelpCircle className="w-4 h-4" />
              <span>How to Use Guide</span>
            </button>

            <div className="font-mono text-[11px] text-ink-muted">
              <div>Target OS: Windows 11 x64</div>
              <div>Desktop Engine: Tauri v2</div>
              <div>Worker: Python 3.14 Sidecar</div>
            </div>
            <div className="pt-0.5">
              <span className="font-mono text-[10px] font-bold bg-lime-acid/60 border border-black px-1.5 py-0.5 block text-center">
                HOTKEY: ALT + SPACE
              </span>
            </div>
          </div>
        </aside>

        {/* Tab Content Panel */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            {activeTab === 'studio' && (
              <WorkflowBuilder
                onOpenDryRun={onOpenDryRun}
                onExecute={onExecute}
                onLogMessage={onAddLog}
                injectedPrompt={injectedPrompt}
                onOpenHowToUse={onOpenHowToUse}
              />
            )}
            {activeTab === 'watchdogs' && <WatchdogManager onLogMessage={onAddLog} />}
            {activeTab === 'schedules' && <ScheduleManager onLogMessage={onAddLog} />}
            {activeTab === 'audit' && <AuditLogs onLogMessage={onAddLog} />}
            {activeTab === 'settings' && <SettingsView onLogMessage={onAddLog} />}
          </div>
        </main>
      </div>

      {/* Persistent Live Console Drawer */}
      <ConsoleDrawer logs={consoleLogs} onClear={onClearLogs} />
    </div>
  );
};
