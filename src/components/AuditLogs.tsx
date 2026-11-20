import React, { useState, useEffect } from 'react';
import { History, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoBadge } from './NeoBadge';
import { NeoCard } from './NeoCard';
import { AuditLogEntry } from '../types';
import { tauriApi } from '../lib/tauriClient';

interface AuditLogsProps {
  onLogMessage: (source: any, level: any, text: string) => void;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ onLogMessage }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await tauriApi.listAuditLogs(100);
      setLogs(data);
    } catch (err: any) {
      onLogMessage('ENGINE', 'ERROR', `Failed to load audit logs: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClear = async () => {
    if (!window.confirm('Clear all audit logs from SQLite database?')) return;
    try {
      await tauriApi.clearAuditLogs();
      setLogs([]);
      onLogMessage('ENGINE', 'INFO', 'Cleared audit logs table.');
    } catch (err: any) {
      onLogMessage('ENGINE', 'ERROR', `Failed to clear logs: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <NeoBadge label="SUCCESS" variant="lime" dot />;
      case 'SIMULATED':
        return <NeoBadge label="SIMULATED" variant="cyan" dot />;
      case 'FAILED':
        return <NeoBadge label="FAILED" variant="coral" dot />;
      case 'REJECTED':
        return <NeoBadge label="REJECTED" variant="coral" dot />;
      default:
        return <NeoBadge label={status} variant="white" />;
    }
  };

  return (
    <div className="space-y-6">
      <NeoCard
        title="EXECUTION AUDIT LOGS & TRACES"
        headerColor="bg-[#E4E4DC]"
        badge={<NeoBadge label="SQLITE PERSISTED" variant="black" />}
        actions={
          <div className="flex items-center gap-2">
            <NeoButton variant="neutral" size="sm" onClick={fetchLogs} icon={<RefreshCw className="w-3.5 h-3.5" />}>
              Refresh
            </NeoButton>
            <NeoButton variant="danger" size="sm" onClick={handleClear} icon={<Trash2 className="w-3.5 h-3.5" />}>
              Clear
            </NeoButton>
          </div>
        }
      >
        <p className="font-mono text-xs text-ink-muted">
          Every action executed or simulated by GhostPilot is logged with exact timestamps, affected file counts, risk
          ratings, and duration to ensure transparent, accountable Windows 11 system modifications.
        </p>
      </NeoCard>

      <div className="bg-white border-[2.5px] border-black shadow-neo overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <History className="w-8 h-8 text-black mx-auto" />
            <h4 className="font-mono font-bold text-sm uppercase text-black">No Audit Logs Recorded</h4>
            <p className="font-mono text-xs text-ink-muted">Run a workflow or dry-run to generate execution records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-black text-white border-b-[2.5px] border-black select-none">
                <tr>
                  <th className="p-3 w-8"></th>
                  <th className="p-3 uppercase">Timestamp</th>
                  <th className="p-3 uppercase">Workflow</th>
                  <th className="p-3 uppercase">Trigger</th>
                  <th className="p-3 uppercase">Status</th>
                  <th className="p-3 uppercase">Risk</th>
                  <th className="p-3 uppercase text-right">Items</th>
                  <th className="p-3 uppercase text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y-[1.5px] divide-black">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  let detailsObj: any = log.details;
                  if (!detailsObj && log.details_json) {
                    try {
                      detailsObj = JSON.parse(log.details_json);
                    } catch {}
                  }

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className={`hover:bg-lime-acid/10 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-lime-acid/20' : ''
                        }`}
                      >
                        <td className="p-3 text-black">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </td>
                        <td className="p-3 text-ink font-semibold whitespace-nowrap">
                          {log.timestamp.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="p-3 font-bold text-black">{log.workflow_name}</td>
                        <td className="p-3">
                          <span className="bg-zinc-100 border border-black px-1.5 py-0.5 text-[11px] font-bold">
                            {log.trigger_type}
                          </span>
                        </td>
                        <td className="p-3">{getStatusBadge(log.status)}</td>
                        <td className="p-3">
                          <NeoBadge
                            label={log.risk_level}
                            variant={log.risk_level === 'HIGH_RISK' ? 'coral' : 'white'}
                            size="sm"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-black">{log.affected_files_count}</td>
                        <td className="p-3 text-right text-ink-muted">{log.duration_ms}ms</td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-[#F8F8F5]">
                          <td colSpan={8} className="p-4 border-t border-b border-black">
                            <div className="space-y-2">
                              <span className="font-bold text-xs uppercase text-black">Execution Details:</span>
                              <pre className="p-3 bg-black text-lime-acid font-mono text-[11px] overflow-x-auto border border-black max-h-56">
                                {JSON.stringify(detailsObj || log, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
