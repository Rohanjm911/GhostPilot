import React, { useState, useEffect } from 'react';
import { Terminal, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';
import { NeoButton } from './NeoButton';

interface StartupSplashScreenProps {
  onComplete: () => void;
  onOpenGuide?: () => void;
}

const BOOT_STEPS = [
  { text: 'Initializing Tauri v2 Desktop Engine & WebView2...', delay: 250 },
  { text: 'Linking Python 3.14 Automation Worker Sidecar...', delay: 650 },
  { text: 'Mounting SQLite Database & Safety Sandbox Barriers...', delay: 1100 },
  { text: 'Hooking Windows Global Spotlight Hotkey [Alt + Space]...', delay: 1550 },
  { text: 'GhostPilot Subsystems 100% Operational & Ready.', delay: 1950 },
];

export const StartupSplashScreen: React.FC<StartupSplashScreenProps> = ({
  onComplete,
  onOpenGuide,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 40);

    const timers = BOOT_STEPS.map((step, idx) =>
      setTimeout(() => {
        setCurrentStepIndex(idx);
      }, step.delay)
    );

    const finishTimer = setTimeout(() => {
      handleFinish();
    }, 2400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(progressInterval);
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 350);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#09090B] text-white select-none transition-all duration-300 ${
        isFadingOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-xl mx-4 bg-[#121215] border-[3.5px] border-lime-acid shadow-[8px_8px_0px_#B8FF00] overflow-hidden">
        <div className="bg-lime-acid text-black px-4 py-2 flex items-center justify-between border-b-[3px] border-black font-mono font-extrabold text-xs tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-black animate-ping" />
            <span>GHOSTPILOT // SYSTEM KERNEL BOOT</span>
          </div>
          <span className="text-[10px] bg-black text-lime-acid px-1.5 py-0.5 border border-black font-bold">
            v1.0.0 (x64)
          </span>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 bg-lime-acid border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_#000] rotate-[-2deg] transition-transform hover:rotate-0">
                <span className="text-4xl select-none animate-bounce">👻</span>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-yellow-electric text-black font-mono font-black text-[10px] px-1 border border-black shadow-[1px_1px_0px_#000]">
                AI
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-mono font-black tracking-tighter text-white uppercase">
                  GHOST<span className="text-lime-acid">PILOT</span>
                </h1>
                <span className="bg-yellow-electric text-black text-[10px] font-mono font-extrabold px-1.5 py-0.5 border border-black">
                  WINDOWS 11
                </span>
              </div>
              <p className="font-mono text-sm text-zinc-400 font-semibold tracking-tight">
                "Command your machine in plain English"
              </p>
            </div>
          </div>

          <div className="bg-black border-[2.5px] border-zinc-700 p-4 font-mono text-xs space-y-1.5 shadow-[3px_3px_0px_#000]">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 border-b border-zinc-800 pb-1 mb-2">
              <span className="flex items-center gap-1.5 text-lime-acid font-bold">
                <Terminal className="w-3.5 h-3.5" /> BOOT DIAGNOSTICS
              </span>
              <span>STANDALONE RUNTIME</span>
            </div>

            {BOOT_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              if (idx > currentStepIndex) return null;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 transition-all ${
                    isCurrent ? 'text-lime-acid font-bold' : isPast ? 'text-zinc-400' : 'text-zinc-600'
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-lime-acid shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 border-2 border-lime-acid border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  <span className="truncate">{step.text}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-electric" /> Subsystem Loading
              </span>
              <span className="font-extrabold text-lime-acid font-mono">{progress}%</span>
            </div>

            <div className="w-full h-4 bg-zinc-900 border-[2px] border-black p-0.5 shadow-[2px_2px_0px_#000]">
              <div
                className="h-full bg-lime-acid transition-all duration-75 border-r border-black"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
            <span className="font-mono text-[11px] text-zinc-500">
              Shortcut: <kbd className="bg-zinc-800 text-zinc-200 px-1 py-0.5 border border-zinc-700">Alt + Space</kbd>
            </span>

            <div className="flex items-center gap-2">
              {onOpenGuide && (
                <button
                  onClick={() => {
                    handleFinish();
                    onOpenGuide();
                  }}
                  className="font-mono text-xs font-bold text-yellow-electric hover:underline px-2 py-1 cursor-pointer"
                >
                  Quick Guide →
                </button>
              )}

              <NeoButton
                variant="primary"
                size="sm"
                onClick={handleFinish}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Enter Studio
              </NeoButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
