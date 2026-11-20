import { WorkflowPlan, WatchdogConfig, ScheduleConfig, AuditLogEntry, SystemStats, AppSettings } from '../types';

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

async function invokeTauri<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (e: any) {
      console.warn(`[Tauri Invoke Error: ${cmd}]`, e);
      throw e;
    }
  } else {
    return mockHandler<T>(cmd, args);
  }
}

export const tauriApi = {
  compilePrompt: (prompt: string) => invokeTauri<WorkflowPlan>('compile_prompt', { prompt }),
  executeWorkflow: (plan: WorkflowPlan, dryRun: boolean, triggerType?: string) =>
    invokeTauri<any>('execute_workflow', { plan, dryRun, triggerType }),
  getSystemStats: () => invokeTauri<SystemStats>('get_system_stats'),
  listWorkflows: () => invokeTauri<any[]>('list_workflows'),
  saveWorkflow: (workflow: any) => invokeTauri<{ id: string }>('save_workflow', { workflow }),
  deleteWorkflow: (workflowId: string) => invokeTauri<{ deleted: boolean }>('delete_workflow', { workflowId }),
  listWatchdogs: () => invokeTauri<WatchdogConfig[]>('list_watchdogs'),
  saveWatchdog: (watchdog: WatchdogConfig) => invokeTauri<{ id: string }>('save_watchdog', { watchdog }),
  toggleWatchdog: (watchdogId: string, active: boolean) =>
    invokeTauri<{ id: string; active: boolean }>('toggle_watchdog', { watchdogId, active }),
  listSchedules: () => invokeTauri<ScheduleConfig[]>('list_schedules'),
  saveSchedule: (schedule: ScheduleConfig) => invokeTauri<{ id: string }>('save_schedule', { schedule }),
  toggleSchedule: (scheduleId: string, active: boolean) =>
    invokeTauri<{ id: string; active: boolean }>('toggle_schedule', { scheduleId, active }),
  listAuditLogs: (limit?: number) => invokeTauri<AuditLogEntry[]>('list_audit_logs', { limit }),
  clearAuditLogs: () => invokeTauri<{ cleared: boolean }>('clear_audit_logs'),
  getSettings: () => invokeTauri<AppSettings>('get_settings'),
  updateSettings: (settings: Partial<AppSettings>) => invokeTauri<{ updated: boolean }>('update_settings', { settings }),
  resizeWindowForMode: (mode: 'spotlight' | 'studio') =>
    invokeTauri<void>('resize_window_for_mode', { mode }),
};

async function mockHandler<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  await new Promise((r) => setTimeout(r, 180));

  if (cmd === 'get_system_stats') {
    return {
      cpu_percent: 28.4,
      ram_percent: 64.2,
      ram_used_gb: 10.3,
      ram_total_gb: 16.0,
      active_watchdogs: 2,
      active_schedules: 1,
    } as T;
  }

  if (cmd === 'compile_prompt') {
    const prompt = (args?.prompt || '').toLowerCase();
    const isDestructive = prompt.includes('delete') || prompt.includes('kill') || prompt.includes('purge');
    const isDownloads = prompt.includes('download');

    return {
      id: `wf_${Date.now()}`,
      title: isDownloads ? 'Organize Downloads (PDFs & ZIPs)' : `Process Automation: ${args?.prompt?.slice(0, 30)}...`,
      description: `Automated plan generated from prompt: "${args?.prompt}"`,
      trigger: {
        type: prompt.includes('every') || prompt.includes('night') ? 'SCHEDULED' : 'MANUAL',
        expression: prompt.includes('night') ? 'Daily at 22:00' : 'Manual 1-click',
      },
      risk_level: isDestructive ? 'HIGH_RISK' : 'SAFE',
      actions: [
        {
          id: 'step_1',
          type: 'SCAN_FILES',
          title: 'Scan target directory for matching file patterns',
          path: 'C:/Users/WindowsUser/Downloads',
          filter: ['*.pdf', '*.zip'],
        },
        {
          id: 'step_2',
          type: 'CREATE_DIR',
          title: 'Ensure destination subfolders exist',
          path: 'C:/Users/WindowsUser/Downloads/PDFs',
          params: { dirs: ['C:/Users/WindowsUser/Downloads/PDFs', 'C:/Users/WindowsUser/Downloads/Archives'] },
        },
        {
          id: 'step_3',
          type: 'ORGANIZE_FILES',
          title: 'Move categorized files with collision resolution',
          source: 'C:/Users/WindowsUser/Downloads',
          rules: [
            { extension: 'pdf', target: 'C:/Users/WindowsUser/Downloads/PDFs' },
            { extension: 'zip', target: 'C:/Users/WindowsUser/Downloads/Archives' },
          ],
        },
      ],
      risk_assessment: {
        overall_risk: isDestructive ? 'HIGH_RISK' : 'SAFE',
        reasons: isDestructive ? ['Action permanently affects system or file state.'] : [],
        requires_confirmation: isDestructive,
      },
    } as T;
  }

  if (cmd === 'execute_workflow') {
    const isDry = args?.dryRun;
    return {
      success: true,
      dry_run: isDry,
      workflow_title: args?.plan?.title || 'Execution',
      affected_files_count: 14,
      duration_ms: 120,
      simulation: isDry
        ? {
            risk_assessment: { overall_risk: 'SAFE', reasons: [], requires_confirmation: false },
            total_affected_count: 14,
            total_bytes_affected: 45218940,
            affected_items_preview: [
              'C:/Users/WindowsUser/Downloads/invoice_october.pdf',
              'C:/Users/WindowsUser/Downloads/dataset_backup.zip',
              'C:/Users/WindowsUser/Downloads/contract_signed.pdf',
              '... and 11 more files',
            ],
            steps: [
              { step_index: 1, title: 'Scan Downloads', type: 'SCAN_FILES', items_count: 14, preview: 'Found 14 files' },
              { step_index: 2, title: 'Create Subdirs', type: 'CREATE_DIR', items_count: 2, preview: 'Created 2 subdirs' },
              { step_index: 3, title: 'Organize Files', type: 'ORGANIZE_FILES', items_count: 14, preview: 'Organized 14 files' },
            ],
            simulation_logs: [
              '[SIMULATION START] Plan validated',
              '[STEP 1] 14 items matched filter (*.pdf, *.zip)',
              '[STEP 2] Subdirectories ready',
              '[STEP 3] Destination paths verified',
              '[SIMULATION COMPLETED] 0 errors. Dry-run verified.',
            ],
          }
        : undefined,
      steps: [
        { step_index: 1, title: 'Scan Files', type: 'SCAN_FILES', success: true, affected_count: 14 },
        { step_index: 2, title: 'Create Dirs', type: 'CREATE_DIR', success: true, affected_count: 2 },
        { step_index: 3, title: 'Move Files', type: 'ORGANIZE_FILES', success: true, affected_count: 14 },
      ],
    } as T;
  }

  if (cmd === 'list_watchdogs') {
    return [
      {
        id: 'wd_downloads_live',
        name: 'Downloads Watcher (PDFs & ZIPs)',
        watch_path: 'C:/Users/WindowsUser/Downloads',
        file_patterns: '*.pdf, *.zip',
        events: 'created',
        active: 1,
        trigger_count: 7,
        last_triggered_at: new Date().toISOString(),
      },
      {
        id: 'wd_desktop_cleanup',
        name: 'Desktop Screenshot Watcher',
        watch_path: 'C:/Users/WindowsUser/Desktop',
        file_patterns: 'Screenshot_*.png',
        events: 'created',
        active: 1,
        trigger_count: 3,
        last_triggered_at: new Date().toISOString(),
      },
    ] as T;
  }

  if (cmd === 'list_schedules') {
    return [
      {
        id: 'sched_nightly_downloads',
        name: 'Nightly Downloads Cleanup',
        schedule_type: 'CRON',
        expression: 'Every day at 22:00',
        active: 1,
        next_run_at: 'Today at 22:00',
      },
      {
        id: 'sched_temp_hourly',
        name: 'Hourly Temp Cache Sweep',
        schedule_type: 'INTERVAL',
        expression: 'Every 60 minutes',
        active: 1,
        next_run_at: 'In 45 minutes',
      },
    ] as T;
  }

  if (cmd === 'list_audit_logs') {
    return [
      {
        id: 'log_1',
        timestamp: new Date().toISOString(),
        trigger_type: 'WATCHDOG',
        workflow_name: 'Auto-Organize Downloads',
        status: 'SUCCESS',
        risk_level: 'SAFE',
        affected_files_count: 4,
        duration_ms: 18,
        details: { message: 'Sorted 4 newly created PDFs into /Downloads/PDFs' },
      },
      {
        id: 'log_2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        trigger_type: 'SCHEDULED',
        workflow_name: 'Nightly Downloads Cleanup',
        status: 'SUCCESS',
        risk_level: 'SAFE',
        affected_files_count: 12,
        duration_ms: 45,
        details: { message: 'Processed 12 files' },
      },
      {
        id: 'log_3',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        trigger_type: 'COMMAND_BAR',
        workflow_name: 'Clean Temp Files',
        status: 'SIMULATED',
        risk_level: 'ELEVATED',
        affected_files_count: 28,
        duration_ms: 22,
        details: { simulation: true, message: 'Dry-run previewed 28 candidate temp files' },
      },
    ] as T;
  }

  if (cmd === 'get_settings') {
    return {
      llm_provider: 'ollama',
      ollama_host: 'http://localhost:11434',
      ollama_model: 'qwen2.5-coder',
      openai_api_key: '',
      openai_model: 'gpt-4o-mini',
      gemini_api_key: '',
      gemini_model: 'gemini-2.0-flash',
      safety_sandbox_level: 'strict',
      dry_run_default: false,
      spotlight_hotkey: 'Alt+Space',
      autostart_on_login: true,
      notify_on_completion: true,
    } as T;
  }

  return {} as T;
}
