import React, { useState, useEffect } from 'react';
import { Clock, Plus, Power, RefreshCw } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoBadge } from './NeoBadge';
import { NeoCard } from './NeoCard';
import { ScheduleConfig } from '../types';
import { tauriApi } from '../lib/tauriClient';

interface ScheduleManagerProps {
  onLogMessage: (source: any, level: any, text: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ onLogMessage }) => {
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [scheduleType, setScheduleType] = useState<'INTERVAL' | 'CRON'>('CRON');
  const [expression, setExpression] = useState('Every day at 22:00');

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const list = await tauriApi.listSchedules();
      setSchedules(list);
    } catch (err: any) {
      onLogMessage('SCHEDULER', 'ERROR', `Failed to load schedules: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleToggle = async (id: string, currentActive: boolean | number) => {
    const nextState = !currentActive;
    try {
      await tauriApi.toggleSchedule(id, nextState);
      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: nextState ? 1 : 0 } : s))
      );
      onLogMessage(
        'SCHEDULER',
        'INFO',
        `Schedule [${id}] ${nextState ? 'ENABLED' : 'DISABLED'}.`
      );
    } catch (err: any) {
      onLogMessage('SCHEDULER', 'ERROR', `Failed to toggle schedule: ${err.message}`);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !expression.trim()) return;
    const newSched: ScheduleConfig = {
      id: `sched_${Date.now()}`,
      name,
      schedule_type: scheduleType,
      expression,
      active: 1,
    };

    try {
      await tauriApi.saveSchedule(newSched);
      setSchedules([newSched, ...schedules]);
      setShowAddModal(false);
      setName('');
      onLogMessage('SCHEDULER', 'SUCCESS', `Created background schedule: "${name}"`);
    } catch (err: any) {
      onLogMessage('SCHEDULER', 'ERROR', `Failed to create schedule: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <NeoCard
        title="BACKGROUND RECURRING SCHEDULES"
        headerColor="bg-yellow-electric"
        badge={<NeoBadge label="CRON / INTERVALS" variant="black" />}
        actions={
          <div className="flex items-center gap-2">
            <NeoButton variant="neutral" size="sm" onClick={fetchSchedules} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </NeoButton>
            <NeoButton
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(!showAddModal)}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Schedule
            </NeoButton>
          </div>
        }
      >
        <p className="font-mono text-xs text-ink-muted">
          Schedules run seamlessly in the Windows 11 system background worker, triggering disk cleanup, automated backups,
          or batch operations at designated times without manual intervention.
        </p>
      </NeoCard>

      {showAddModal && (
        <div className="bg-white border-[2.5px] border-black p-4 shadow-neo space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b-[2px] border-black pb-2">
            <h4 className="font-mono font-bold text-sm uppercase text-black">New Recurring Schedule</h4>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-xs font-mono font-bold text-ink-muted hover:text-black"
            >
              [Cancel]
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Schedule Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nightly Downloads Sweep"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Type:</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as any)}
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none cursor-pointer"
              >
                <option value="CRON">Daily Time (e.g. 22:00)</option>
                <option value="INTERVAL">Recurring Interval (e.g. Every 30 mins)</option>
              </select>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-mono font-bold uppercase text-black">Expression:</label>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. Every day at 22:00 or Every 45 minutes"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <NeoButton variant="primary" size="sm" onClick={handleCreate} disabled={!name || !expression}>
              Save Schedule
            </NeoButton>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="bg-white border-[2.5px] border-black p-8 text-center shadow-neo space-y-2">
            <Clock className="w-8 h-8 text-black mx-auto" />
            <h4 className="font-mono font-bold text-sm uppercase text-black">No Scheduled Jobs</h4>
            <p className="font-mono text-xs text-ink-muted">Set up recurring intervals or daily cron times.</p>
          </div>
        ) : (
          schedules.map((sc) => {
            const isActive = Boolean(sc.active);
            return (
              <div
                key={sc.id}
                className="bg-white border-[2.5px] border-black p-4 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-mono font-bold text-sm uppercase text-black">{sc.name}</h4>
                    <NeoBadge
                      label={isActive ? 'SCHEDULED' : 'DISABLED'}
                      variant={isActive ? 'yellow' : 'coral'}
                      dot={isActive}
                    />
                    <NeoBadge label={sc.schedule_type} variant="cyan" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="font-mono text-xs text-ink">
                      <span className="font-bold text-ink-muted">Schedule:</span>{' '}
                      <span className="bg-lime-acid/30 border border-black px-1 font-bold">{sc.expression}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <NeoButton
                    variant={isActive ? 'danger' : 'primary'}
                    size="sm"
                    icon={<Power className="w-3.5 h-3.5" />}
                    onClick={() => handleToggle(sc.id, sc.active)}
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
