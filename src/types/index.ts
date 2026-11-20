export type RiskLevel = 'SAFE' | 'ELEVATED' | 'HIGH_RISK';

export type TriggerType = 'MANUAL' | 'SCHEDULED' | 'WATCHDOG' | 'COMMAND_BAR';

export interface ActionStep {
  id: string;
  type: string;
  title: string;
  path?: string;
  source?: string;
  destination?: string | Record<string, string>;
  filter?: string[];
  rules?: Array<{ extension: string; target: string }>;
  params?: Record<string, any>;
}

export interface WorkflowPlan {
  id: string;
  title: string;
  description: string;
  trigger: {
    type: TriggerType;
    expression?: string;
    path?: string;
  };
  risk_level: RiskLevel;
  actions: ActionStep[];
  risk_assessment?: {
    overall_risk: RiskLevel;
    reasons: string[];
    requires_confirmation: boolean;
  };
}

export interface WatchdogConfig {
  id: string;
  name: string;
  watch_path: string;
  file_patterns: string;
  events: string;
  workflow_id?: string;
  active: number | boolean;
  trigger_count?: number;
  last_triggered_at?: string;
  created_at?: string;
}

export interface ScheduleConfig {
  id: string;
  name: string;
  schedule_type: 'INTERVAL' | 'CRON';
  expression: string;
  workflow_id?: string;
  active: number | boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  trigger_type: string;
  workflow_name: string;
  status: 'SUCCESS' | 'FAILED' | 'SIMULATED' | 'REJECTED';
  risk_level: RiskLevel;
  affected_files_count: number;
  duration_ms: number;
  details_json?: string;
  details?: Record<string, any>;
}

export interface SystemStats {
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  active_watchdogs?: number;
  active_schedules?: number;
}

export interface AppSettings {
  llm_provider: 'ollama' | 'openai' | 'gemini' | 'heuristics';
  ollama_host: string;
  ollama_model: string;
  openai_api_key: string;
  openai_model: string;
  gemini_api_key: string;
  gemini_model: string;
  safety_sandbox_level: 'strict' | 'standard' | 'relaxed';
  dry_run_default: boolean;
  spotlight_hotkey: string;
  autostart_on_login: boolean;
  notify_on_completion: boolean;
}

export interface SimulationResult {
  risk_assessment: {
    overall_risk: RiskLevel;
    reasons: string[];
    requires_confirmation: boolean;
  };
  total_affected_count: number;
  total_bytes_affected: number;
  affected_items_preview: string[];
  steps: Array<{
    step_index: number;
    title: string;
    type: string;
    items_count: number;
    preview: string;
  }>;
  simulation_logs: string[];
}
