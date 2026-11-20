import { useState, useEffect } from 'react';
import { CommandBar } from './components/CommandBar';
import { StudioDashboard } from './components/StudioDashboard';
import { DryRunModal } from './components/DryRunModal';
import { ConsoleMessage } from './components/ConsoleDrawer';
import { StartupSplashScreen } from './components/StartupSplashScreen';
import { HowToUseModal } from './components/HowToUseModal';
import { WorkflowPlan, SimulationResult } from './types';
import { tauriApi } from './lib/tauriClient';

export function App() {
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialMode = urlParams?.get('mode') === 'spotlight' ? 'spotlight' : 'studio';
  const initialSplash = urlParams?.get('splash') === 'false' ? false : true;
  const initialGuide = urlParams?.get('guide') === 'true';

  const [showSplash, setShowSplash] = useState(initialSplash);
  const [showHowToUse, setShowHowToUse] = useState(initialGuide);
  const [injectedPrompt, setInjectedPrompt] = useState<string>('');
  const [viewMode, setViewMode] = useState<'studio' | 'spotlight'>(initialMode);
  const [activePlanForSim, setActivePlanForSim] = useState<WorkflowPlan | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Console messages buffer
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([
    {
      id: 'init_1',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      source: 'TAURI',
      text: 'GhostPilot v1.0.0 desktop shell initialized.',
    },
    {
      id: 'init_2',
      timestamp: new Date().toLocaleTimeString(),
      level: 'SUCCESS',
      source: 'ENGINE',
      text: 'Python automation engine sidecar running with SQLite persistence.',
    },
    {
      id: 'init_3',
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      source: 'WATCHDOG',
      text: 'Filesystem event observer ready. Global shortcut [Alt+Space] registered.',
    },
  ]);

  const addLog = (
    source: 'ENGINE' | 'TAURI' | 'WATCHDOG' | 'SCHEDULER' | 'DRY-RUN',
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS',
    text: string
  ) => {
    const newMsg: ConsoleMessage = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      source,
      text,
    };
    setConsoleLogs((prev) => [...prev.slice(-150), newMsg]);
  };

  // Listen for Tauri backend events & hotkeys
  useEffect(() => {
    const handleToggleSpotlight = () => {
      setViewMode((prev) => {
        const next = prev === 'studio' ? 'spotlight' : 'studio';
        tauriApi.resizeWindowForMode(next).catch(() => {});
        return next;
      });
    };

    const handleSwitchMode = (e: any) => {
      const mode = e.detail || 'studio';
      setViewMode(mode);
      tauriApi.resizeWindowForMode(mode).catch(() => {});
    };

    window.addEventListener('toggle-spotlight', handleToggleSpotlight);
    window.addEventListener('switch-mode', handleSwitchMode);

    // Keyboard fallback listener for Alt+Space inside browser window
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault();
        handleToggleSpotlight();
      } else if (e.key === 'F1') {
        e.preventDefault();
        setShowHowToUse((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('toggle-spotlight', handleToggleSpotlight);
      window.removeEventListener('switch-mode', handleSwitchMode);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auto-open dry-run modal if requested via URL
  useEffect(() => {
    if (urlParams?.get('dryrun') === 'true') {
      tauriApi
        .compilePrompt('Organize all PDFs and ZIPs in my Downloads folder into separate subfolders every night at 10 PM')
        .then((p) => {
          handleOpenDryRun(p);
        });
    }
  }, []);

  // Handle dry-run simulation modal
  const handleOpenDryRun = async (plan: WorkflowPlan) => {
    setActivePlanForSim(plan);
    setIsSimulating(true);
    setSimulationResult(null);
    addLog('DRY-RUN', 'INFO', `Initiating dry-run simulation for "${plan.title}"...`);

    try {
      const res = await tauriApi.executeWorkflow(plan, true, 'MANUAL');
      if (res && res.simulation) {
        setSimulationResult(res.simulation);
        addLog(
          'DRY-RUN',
          'SUCCESS',
          `Simulation completed: ${res.simulation.total_affected_count} affected items previewed.`
        );
      }
    } catch (err: any) {
      addLog('ENGINE', 'ERROR', `Simulation error: ${err.message || err}`);
    } finally {
      setIsSimulating(false);
    }
  };

  // Handle real execution
  const handleExecute = async (plan: WorkflowPlan) => {
    addLog('ENGINE', 'INFO', `Executing workflow: "${plan.title}" (Risk: ${plan.risk_level})`);

    try {
      const res = await tauriApi.executeWorkflow(plan, false, 'MANUAL');
      if (res.success) {
        addLog(
          'ENGINE',
          'SUCCESS',
          `Executed "${plan.title}" in ${res.duration_ms}ms (${res.affected_files_count} items processed).`
        );
        alert(`GhostPilot Execution Completed!\n\nWorkflow: ${plan.title}\nAffected Items: ${res.affected_files_count}\nDuration: ${res.duration_ms}ms`);
      } else {
        addLog('ENGINE', 'ERROR', `Execution failed: ${res.error || 'Unknown error'}`);
        alert(`Execution encountered errors:\n${res.error || 'Check system console logs.'}`);
      }
    } catch (err: any) {
      addLog('ENGINE', 'ERROR', `Execution failed: ${err.message || err}`);
      alert(`Execution failed: ${err.message}`);
    } finally {
      setActivePlanForSim(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas font-sans text-ink">
      {/* Sleek Animated Startup Splash Screen */}
      {showSplash && (
        <StartupSplashScreen
          onComplete={() => setShowSplash(false)}
          onOpenGuide={() => {
            setShowSplash(false);
            setShowHowToUse(true);
          }}
        />
      )}

      {viewMode === 'studio' ? (
        <StudioDashboard
          onOpenDryRun={handleOpenDryRun}
          onExecute={handleExecute}
          onToggleSpotlightMode={() => {
            setViewMode('spotlight');
            tauriApi.resizeWindowForMode('spotlight').catch(() => {});
          }}
          consoleLogs={consoleLogs}
          onClearLogs={() => setConsoleLogs([])}
          onAddLog={addLog}
          onOpenHowToUse={() => setShowHowToUse(true)}
          injectedPrompt={injectedPrompt}
        />
      ) : (
        <div
          className="min-h-screen flex items-center justify-center p-4 bg-black/50 backdrop-blur-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setViewMode('studio');
              tauriApi.resizeWindowForMode('studio').catch(() => {});
            }
          }}
        >
          <CommandBar
            onExpandToStudio={() => {
              setViewMode('studio');
              tauriApi.resizeWindowForMode('studio').catch(() => {});
            }}
            onOpenDryRun={handleOpenDryRun}
            onExecute={handleExecute}
            onClose={() => {
              setViewMode('studio');
              tauriApi.resizeWindowForMode('studio').catch(() => {});
            }}
            onOpenHowToUse={() => setShowHowToUse(true)}
          />
        </div>
      )}

      {/* Interactive How To Use Modal */}
      <HowToUseModal
        isOpen={showHowToUse}
        onClose={() => setShowHowToUse(false)}
        onSelectPrompt={(selected) => {
          setInjectedPrompt(selected);
          setViewMode('studio');
        }}
      />

      {/* Dry-Run Simulation Modal */}
      {activePlanForSim && (
        <DryRunModal
          plan={activePlanForSim}
          simulation={simulationResult}
          isLoading={isSimulating}
          onConfirmExecute={() => {
            const planToRun = activePlanForSim;
            setActivePlanForSim(null);
            handleExecute(planToRun);
          }}
          onClose={() => setActivePlanForSim(null)}
        />
      )}
    </div>
  );
}

export default App;
