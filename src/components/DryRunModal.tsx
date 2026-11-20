import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Play, X, FileWarning, AlertTriangle, Copy, Check } from 'lucide-react';
import { NeoBadge } from './NeoBadge';
import { NeoButton } from './NeoButton';
import { WorkflowPlan, SimulationResult } from '../types';

interface DryRunModalProps {
  plan: WorkflowPlan;
  simulation: SimulationResult | null;
  isLoading: boolean;
  onConfirmExecute: () => void;
  onClose: () => void;
}

export const DryRunModal: React.FC<DryRunModalProps> = ({
  plan,
  simulation,
  isLoading,
  onConfirmExecute,
  onClose,
}) => {
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [copiedPaths, setCopiedPaths] = useState(false);

  const isHighRisk = plan.risk_level === 'HIGH_RISK' || simulation?.risk_assessment.overall_risk === 'HIGH_RISK';
  const isElevated = plan.risk_level === 'ELEVATED' || simulation?.risk_assessment.overall_risk === 'ELEVATED';
  const requiresAcknowledgment = isHighRisk || isElevated;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleCopyPaths = () => {
    if (!simulation?.affected_items_preview) return;
    navigator.clipboard.writeText(simulation.affected_items_preview.join('\n'));
    setCopiedPaths(true);
    setTimeout(() => setCopiedPaths(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-none animate-in fade-in duration-150 select-none">
      <div className="bg-canvas border-[3.5px] border-black shadow-[8px_8px_0px_#000] max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {requiresAcknowledgment && (
          <div
            className="h-4 border-b-[2.5px] border-black shrink-0 w-full"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #FFD600, #FFD600 12px, #000000 12px, #000000 24px)',
            }}
          />
        )}

        <div
          className={`px-4 py-3 border-b-[3px] border-black flex items-center justify-between ${
            isHighRisk ? 'bg-coral-danger text-white' : isElevated ? 'bg-yellow-electric text-black' : 'bg-lime-acid text-black'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isHighRisk ? (
              <div className="p-1 bg-black text-white border border-black shadow-[1px_1px_0px_#000]">
                <ShieldAlert className="w-5 h-5 text-coral-danger" />
              </div>
            ) : isElevated ? (
              <div className="p-1 bg-black text-white border border-black shadow-[1px_1px_0px_#000]">
                <AlertTriangle className="w-5 h-5 text-yellow-electric" />
              </div>
            ) : (
              <div className="p-1 bg-black text-white border border-black shadow-[1px_1px_0px_#000]">
                <ShieldCheck className="w-5 h-5 text-lime-acid" />
              </div>
            )}
            <span className="font-mono font-black text-sm uppercase tracking-wider">
              DRY-RUN SIMULATION // {isHighRisk ? 'HIGH RISK ACTION' : isElevated ? 'ELEVATED MODIFICATION' : 'SAFE PIPELINE'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <NeoBadge
              label={isHighRisk ? 'HIGH RISK' : isElevated ? 'ELEVATED' : 'SAFE'}
              variant={isHighRisk ? 'black' : 'white'}
              size="sm"
              dot
            />
            <button
              onClick={onClose}
              className="p-1.5 border-[2px] border-black bg-white text-black hover:bg-zinc-200 shadow-[1.5px_1.5px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {requiresAcknowledgment && (
          <div className="bg-yellow-electric border-b-[2.5px] border-black px-4 py-2 flex items-center justify-between font-mono text-xs font-black text-black">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>HAZARD ALERT: THIS ACTION MODIFIES FILES OR PROCESSES ON DISK</span>
            </div>
            <span className="bg-black text-yellow-electric px-1.5 py-0.5 text-[10px] border border-black">
              DRY-RUN VERIFIED
            </span>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="bg-white border-[2.5px] border-black p-4 shadow-neo space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-mono font-black text-sm uppercase text-black">{plan.title}</h4>
              <span className="font-mono text-[10px] font-bold bg-black text-white px-2 py-0.5">
                {plan.actions.length} ATOMIC STEPS
              </span>
            </div>
            <p className="text-xs font-mono text-ink-muted">{plan.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border-[2.5px] border-black p-3.5 shadow-neo">
              <span className="text-[10px] font-mono font-black text-ink-muted uppercase">Files Affected</span>
              <div className="text-2xl font-mono font-black text-black mt-1">
                {simulation ? simulation.total_affected_count : '...'}
              </div>
            </div>

            <div className="bg-white border-[2.5px] border-black p-3.5 shadow-neo">
              <span className="text-[10px] font-mono font-black text-ink-muted uppercase">Storage Footprint</span>
              <div className="text-2xl font-mono font-black text-black mt-1">
                {simulation ? formatBytes(simulation.total_bytes_affected) : '...'}
              </div>
            </div>

            <div className="bg-white border-[2.5px] border-black p-3.5 shadow-neo">
              <span className="text-[10px] font-mono font-black text-ink-muted uppercase">Execution Mode</span>
              <div className="text-base font-mono font-black text-lime-acid bg-black px-2 py-1 mt-1 text-center truncate">
                0 BYTES CHANGED
              </div>
            </div>
          </div>

          {simulation?.risk_assessment.reasons && simulation.risk_assessment.reasons.length > 0 && (
            <div className="bg-coral-danger/10 border-[2.5px] border-black p-4 space-y-1.5 shadow-neo">
              <div className="flex items-center gap-2 text-coral-danger font-mono font-black text-xs uppercase">
                <FileWarning className="w-4 h-4" />
                <span>Safety Sandbox Assessment:</span>
              </div>
              <ul className="list-disc list-inside text-xs font-mono text-black space-y-1 pl-1">
                {simulation.risk_assessment.reasons.map((r, i) => (
                  <li key={i} className="font-semibold">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {simulation && simulation.affected_items_preview.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-ink uppercase tracking-wider flex items-center gap-2">
                  <span>Exact Windows File Paths Affected ({simulation.total_affected_count}):</span>
                </span>
                <button
                  onClick={handleCopyPaths}
                  className="font-mono text-[10px] font-bold bg-white border border-black px-2 py-0.5 shadow-[1px_1px_0px_#000] hover:bg-lime-acid flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedPaths ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPaths ? 'Copied Paths' : 'Copy All Paths'}</span>
                </button>
              </div>

              <div className="bg-[#0B0B0E] border-[2.5px] border-black p-3 max-h-40 overflow-y-auto space-y-1.5 font-mono text-xs shadow-neo text-zinc-300">
                {simulation.affected_items_preview.map((f, i) => (
                  <div key={i} className="text-zinc-200 break-all border-b border-zinc-800 pb-1 flex items-start gap-2">
                    <span className="text-lime-acid shrink-0 font-bold">[{i + 1}]</span>
                    <span className="text-zinc-100 font-mono text-[11px]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {simulation?.steps && (
            <div className="space-y-2">
              <span className="text-xs font-mono font-black text-ink uppercase tracking-wider">
                Simulated Execution Sequence:
              </span>
              <div className="space-y-1.5">
                {simulation.steps.map((st, i) => (
                  <div
                    key={i}
                    className="bg-white border-[2px] border-black p-2.5 flex items-center justify-between text-xs font-mono shadow-[2px_2px_0px_#000]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-lime-acid border border-black px-1.5 py-0.5 font-black text-[11px]">
                        STEP {st.step_index}
                      </span>
                      <span className="font-bold text-black">{st.title}</span>
                    </div>
                    <span className="text-ink-muted text-[11px] font-mono bg-[#F4F4F0] border border-zinc-400 px-1.5 py-0.5">
                      {st.preview}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requiresAcknowledgment && (
            <div className="bg-yellow-electric/30 border-[2.5px] border-black p-4 space-y-2 shadow-neo">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={safetyAcknowledged}
                  onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                  className="w-5 h-5 mt-0.5 accent-black border-[2.5px] border-black cursor-pointer shrink-0"
                />
                <span className="text-xs font-mono font-black text-black leading-relaxed">
                  I have verified the exact Windows paths and file counts listed above. I acknowledge that this action will modify files on disk and I authorize execution.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-[#EAEAE4] border-t-[3px] border-black flex items-center justify-between">
          <div className="text-xs font-mono font-bold text-ink-muted">
            {isLoading ? 'Running simulation...' : 'Dry-Run Simulation: 0 bits altered'}
          </div>

          <div className="flex items-center gap-2.5">
            <NeoButton variant="neutral" size="sm" onClick={onClose}>
              Cancel
            </NeoButton>
            <NeoButton
              variant={isHighRisk ? 'danger' : isElevated ? 'secondary' : 'primary'}
              size="sm"
              icon={<Play className="w-4 h-4" />}
              disabled={requiresAcknowledgment && !safetyAcknowledged}
              onClick={onConfirmExecute}
            >
              {requiresAcknowledgment ? 'EXECUTE ANYWAY' : 'EXECUTE WORKFLOW'}
            </NeoButton>
          </div>
        </div>
      </div>
    </div>
  );
};
