import React from 'react';
import { ActionStep } from '../types';
import { FolderSearch, FolderPlus, ArrowRightLeft, Trash2, Terminal, Bell, AppWindow } from 'lucide-react';
import { NeoBadge } from './NeoBadge';

interface WorkflowNodeCardProps {
  step: ActionStep;
  index: number;
  totalSteps: number;
}

export const WorkflowNodeCard: React.FC<WorkflowNodeCardProps> = ({ step, index, totalSteps }) => {
  const getActionIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SCAN_FILES':
        return <FolderSearch className="w-5 h-5 text-black" />;
      case 'CREATE_DIR':
        return <FolderPlus className="w-5 h-5 text-black" />;
      case 'ORGANIZE_FILES':
      case 'MOVE_FILES':
      case 'BATCH_RENAME':
        return <ArrowRightLeft className="w-5 h-5 text-black" />;
      case 'CLEAN_TEMP_FILES':
      case 'DELETE_FILES':
        return <Trash2 className="w-5 h-5 text-white" />;
      case 'LAUNCH_APP':
        return <AppWindow className="w-5 h-5 text-black" />;
      case 'NOTIFICATION':
        return <Bell className="w-5 h-5 text-black" />;
      default:
        return <Terminal className="w-5 h-5 text-black" />;
    }
  };

  const getHeaderStyle = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SCAN_FILES':
        return 'bg-cyan-cyber text-black';
      case 'CREATE_DIR':
        return 'bg-yellow-electric text-black';
      case 'ORGANIZE_FILES':
      case 'MOVE_FILES':
        return 'bg-lime-acid text-black';
      case 'CLEAN_TEMP_FILES':
      case 'DELETE_FILES':
      case 'KILL_PROCESS':
        return 'bg-coral-danger text-white';
      default:
        return 'bg-[#E4E4DC] text-black';
    }
  };

  return (
    <div className="relative flex flex-col">
      <div className="bg-white border-[2.5px] border-black shadow-neo transition-transform hover:-translate-y-0.5">
        <div className={`px-3 py-2 border-b-[2.5px] border-black flex items-center justify-between ${getHeaderStyle(step.type)}`}>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white border border-black shadow-[1px_1px_0px_#000]">
              {getActionIcon(step.type)}
            </div>
            <span className="font-mono font-bold text-xs uppercase tracking-wider">
              NODE 0{index + 1} // {step.type}
            </span>
          </div>
          <NeoBadge label={`STEP ${index + 1}/${totalSteps}`} variant="white" size="sm" />
        </div>

        <div className="p-3.5 space-y-2.5">
          <h4 className="font-bold text-sm text-ink tracking-tight">{step.title}</h4>

          {(step.path || step.source) && (
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">Target Path:</span>
              <div className="bg-[#F4F4F0] border-[1.5px] border-black p-1.5 font-mono text-xs break-all shadow-[1px_1px_0px_#000]">
                {step.path || step.source}
              </div>
            </div>
          )}

          {step.filter && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">Filter:</span>
              {step.filter.map((f, i) => (
                <span
                  key={i}
                  className="font-mono text-[11px] font-bold bg-yellow-electric/30 border border-black px-1.5 py-0.5 shadow-[1px_1px_0px_#000]"
                >
                  {f}
                </span>
              ))}
            </div>
          )}

          {step.rules && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">Sorting Rules:</span>
              <div className="space-y-1">
                {step.rules.map((r, i) => (
                  <div key={i} className="text-[11px] font-mono flex items-center gap-1.5 text-black">
                    <span className="bg-lime-acid/60 border border-black px-1 font-bold">*.{r.extension}</span>
                    <span>→</span>
                    <span className="truncate max-w-[200px] text-ink-muted">{r.target.split('/').pop()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {index < totalSteps - 1 && (
        <div className="flex justify-center items-center py-2 text-black">
          <div className="w-1 h-3 bg-black"></div>
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black translate-y-2 -translate-x-[5px]"></div>
        </div>
      )}
    </div>
  );
};
