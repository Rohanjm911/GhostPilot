import React, { useState, useEffect } from 'react';
import { Plus, FolderSearch, Power, RefreshCw } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoBadge } from './NeoBadge';
import { NeoCard } from './NeoCard';
import { WatchdogConfig } from '../types';
import { tauriApi } from '../lib/tauriClient';

interface WatchdogManagerProps {
  onLogMessage: (source: any, level: any, text: string) => void;
}

export const WatchdogManager: React.FC<WatchdogManagerProps> = ({ onLogMessage }) => {
  const [watchdogs, setWatchdogs] = useState<WatchdogConfig[]>([]);
  const [, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [watchPath, setWatchPath] = useState('C:/Users/WindowsUser/Downloads');
  const [patterns, setPatterns] = useState('*.pdf, *.zip');
  const [events, setEvents] = useState('created');

  const fetchWatchdogs = async () => {
    setIsLoading(true);
    try {
      const list = await tauriApi.listWatchdogs();
      setWatchdogs(list);
    } catch (err: any) {
      onLogMessage('WATCHDOG', 'ERROR', `Failed to load watchdogs: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchdogs();
  }, []);

  const handleToggle = async (id: string, currentActive: boolean | number) => {
    const nextState = !currentActive;
    try {
      await tauriApi.toggleWatchdog(id, nextState);
      setWatchdogs((prev) =>
        prev.map((w) => (w.id === id ? { ...w, active: nextState ? 1 : 0 } : w))
      );
      onLogMessage(
        'WATCHDOG',
        'INFO',
        `Watchdog [${id}] ${nextState ? 'ACTIVATED' : 'PAUSED'}.`
      );
    } catch (err: any) {
      onLogMessage('WATCHDOG', 'ERROR', `Failed to toggle watchdog: ${err.message}`);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !watchPath.trim()) return;
    const newWd: WatchdogConfig = {
      id: `wd_${Date.now()}`,
      name,
      watch_path: watchPath,
      file_patterns: patterns,
      events,
      active: 1,
      trigger_count: 0,
    };

    try {
      await tauriApi.saveWatchdog(newWd);
      setWatchdogs([newWd, ...watchdogs]);
      setShowAddModal(false);
      setName('');
      onLogMessage('WATCHDOG', 'SUCCESS', `Created real-time watchdog: "${name}"`);
    } catch (err: any) {
      onLogMessage('WATCHDOG', 'ERROR', `Failed to create watchdog: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <NeoCard
        title="REAL-TIME DIRECTORY WATCHDOGS"
        headerColor="bg-cyan-cyber"
        badge={<NeoBadge label="EVENT-DRIVEN" variant="black" />}
        actions={
          <div className="flex items-center gap-2">
            <NeoButton variant="neutral" size="sm" onClick={fetchWatchdogs} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </NeoButton>
            <NeoButton
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(!showAddModal)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Watcher
            </NeoButton>
          </div>
        }
      >
        <p className="font-mono text-xs text-ink-muted">
          GhostPilot uses Windows native filesystem watchers to listen for file additions, modifications, or deletions in
          designated directories and trigger associated workflows in milliseconds.
        </p>
      </NeoCard>

      {showAddModal && (
        <div className="bg-white border-[2.5px] border-black p-4 shadow-neo space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b-[2px] border-black pb-2">
            <h4 className="font-mono font-bold text-sm uppercase text-black">New Directory Watcher</h4>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-xs font-mono font-bold text-ink-muted hover:text-black"
            >
              [Cancel]
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Watcher Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Downloads PDF Monitor"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Directory Path:</label>
              <input
                type="text"
                value={watchPath}
                onChange={(e) => setWatchPath(e.target.value)}
                placeholder="C:/Users/..."
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">File Patterns (glob):</label>
              <input
                type="text"
                value={patterns}
                onChange={(e) => setPatterns(e.target.value)}
                placeholder="*.pdf, *.zip, *.csv"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Event Types:</label>
              <select
                value={events}
                onChange={(e) => setEvents(e.target.value)}
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none cursor-pointer"
              >
                <option value="created">Created (New File Arrived)</option>
                <option value="modified">Modified (File Changed)</option>
                <option value="created,modified">Created & Modified</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <NeoButton variant="primary" size="sm" onClick={handleCreate} disabled={!name || !watchPath}>
              Save Watchdog
            </NeoButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {watchdogs.length === 0 ? (
          <div className="bg-white border-[2.5px] border-black p-8 text-center shadow-neo space-y-2">
            <FolderSearch className="w-8 h-8 text-black mx-auto" />
            <h4 className="font-mono font-bold text-sm uppercase text-black">No Active Watchdogs</h4>
            <p className="font-mono text-xs text-ink-muted">Create a watcher to monitor directories in real time.</p>
          </div>
        ) : (
          watchdogs.map((wd) => {
            const isActive = Boolean(wd.active);
            return (
              <div
                key={wd.id}
                className="bg-white border-[2.5px] border-black p-4 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-mono font-bold text-sm uppercase text-black">{wd.name}</h4>
                    <NeoBadge
                      label={isActive ? 'WATCHING' : 'PAUSED'}
                      variant={isActive ? 'lime' : 'coral'}
                      dot={isActive}
                    />
                    <NeoBadge label={`${wd.trigger_count || 0} FIRED`} variant="yellow" />
                    <span className="font-mono text-[10px] bg-black text-white px-1.5 py-0.5">
                      EVENTS: {wd.events.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-mono text-xs text-ink break-all">
                      <span className="font-bold text-ink-muted">Path:</span> {wd.watch_path}
                    </div>
                    <div className="font-mono text-xs text-ink">
                      <span className="font-bold text-ink-muted">Filter:</span>{' '}
                      <span className="bg-yellow-electric/30 border border-black px-1 font-bold">
                        {wd.file_patterns}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <NeoButton
                    variant={isActive ? 'danger' : 'primary'}
                    size="sm"
                    icon={<Power className="w-3.5 h-3.5" />}
                    onClick={() => handleToggle(wd.id, wd.active)}
                  >
                    {isActive ? 'Pause' : 'Activate'}
                  </NeoButton>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
