import React, { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Save, Check } from 'lucide-react';
import { NeoButton } from './NeoButton';
import { NeoBadge } from './NeoBadge';
import { NeoCard } from './NeoCard';
import { AppSettings } from '../types';
import { tauriApi } from '../lib/tauriClient';

interface SettingsViewProps {
  onLogMessage: (source: any, level: any, text: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onLogMessage }) => {
  const [settings, setSettings] = useState<AppSettings>({
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
  });

  const [saved, setSaved] = useState(false);
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await tauriApi.getSettings();
        if (s && Object.keys(s).length > 0) {
          setSettings((prev) => ({ ...prev, ...s }));
        }
      } catch (err: any) {
        onLogMessage('ENGINE', 'WARN', `Could not load settings: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      await tauriApi.updateSettings(settings);
      setSaved(true);
      onLogMessage('ENGINE', 'SUCCESS', 'Settings updated successfully.');
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      onLogMessage('ENGINE', 'ERROR', `Failed to save settings: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <NeoCard
        title="AI ENGINE & SYSTEM PREFERENCES"
        headerColor="bg-lime-acid"
        badge={<NeoBadge label="CORE CONFIG" variant="black" />}
        actions={
          <NeoButton
            variant="primary"
            size="sm"
            onClick={handleSave}
            icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          >
            {saved ? 'Saved!' : 'Save Config'}
          </NeoButton>
        }
      >
        <p className="font-mono text-xs text-ink-muted">
          Configure local or cloud LLM providers for natural language translation and adjust safety sandbox verification
          thresholds for Windows 11 desktop execution.
        </p>
      </NeoCard>

      <div className="bg-white border-[2.5px] border-black p-5 shadow-neo space-y-4">
        <div className="border-b-[2px] border-black pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-black" />
            <h4 className="font-mono font-bold text-sm uppercase text-black">LLM & Prompt Compiler Provider</h4>
          </div>
          <NeoBadge label="LOCAL / CLOUD" variant="yellow" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'ollama', label: 'Local Ollama', badge: 'OFFLINE/PRIVATE' },
            { id: 'heuristics', label: 'Offline Rules', badge: 'ZERO SETUP' },
            { id: 'openai', label: 'OpenAI API', badge: 'CLOUD' },
            { id: 'gemini', label: 'Gemini API', badge: 'CLOUD' },
          ].map((prov) => {
            const isSelected = settings.llm_provider === prov.id;
            return (
              <button
                key={prov.id}
                onClick={() => setSettings({ ...settings, llm_provider: prov.id as any })}
                className={`p-3 text-left border-[2px] border-black font-mono transition-all cursor-pointer ${
                  isSelected ? 'bg-lime-acid shadow-neo-sm' : 'bg-white hover:bg-zinc-100'
                }`}
              >
                <div className="font-bold text-xs uppercase text-black">{prov.label}</div>
                <div className="text-[10px] text-ink-muted mt-1">[{prov.badge}]</div>
              </button>
            );
          })}
        </div>

        {settings.llm_provider === 'ollama' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Ollama Endpoint:</label>
              <input
                type="text"
                value={settings.ollama_host}
                onChange={(e) => setSettings({ ...settings, ollama_host: e.target.value })}
                placeholder="http://localhost:11434"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Model Tag:</label>
              <input
                type="text"
                value={settings.ollama_model}
                onChange={(e) => setSettings({ ...settings, ollama_model: e.target.value })}
                placeholder="qwen2.5-coder, llama3.2"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>
          </div>
        )}

        {settings.llm_provider === 'openai' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">OpenAI API Key:</label>
              <input
                type="password"
                value={settings.openai_api_key}
                onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                placeholder="sk-..."
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Model Name:</label>
              <input
                type="text"
                value={settings.openai_model}
                onChange={(e) => setSettings({ ...settings, openai_model: e.target.value })}
                placeholder="gpt-4o-mini"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>
          </div>
        )}

        {settings.llm_provider === 'gemini' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Gemini API Key:</label>
              <input
                type="password"
                value={settings.gemini_api_key}
                onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-black">Model Name:</label>
              <input
                type="text"
                value={settings.gemini_model}
                onChange={(e) => setSettings({ ...settings, gemini_model: e.target.value })}
                placeholder="gemini-2.0-flash"
                className="w-full font-mono text-xs p-2 bg-[#F4F4F0] border-[2px] border-black focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-[2.5px] border-black p-5 shadow-neo space-y-4">
        <div className="border-b-[2px] border-black pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-black" />
            <h4 className="font-mono font-bold text-sm uppercase text-black">Safety Sandbox & Desktop Integration</h4>
          </div>
          <NeoBadge label="SANDBOX" variant="coral" />
        </div>

        <div className="space-y-3 font-mono text-xs">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.dry_run_default}
              onChange={(e) => setSettings({ ...settings, dry_run_default: e.target.checked })}
              className="w-4 h-4 accent-black border-[2px] border-black cursor-pointer"
            />
            <span className="font-bold text-black">
              Always execute in Dry-Run Simulation Mode first before applying live disk changes
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autostart_on_login}
              onChange={(e) => setSettings({ ...settings, autostart_on_login: e.target.checked })}
              className="w-4 h-4 accent-black border-[2px] border-black cursor-pointer"
            />
            <span className="font-bold text-black">
              Launch GhostPilot in background system tray upon Windows login
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notify_on_completion}
              onChange={(e) => setSettings({ ...settings, notify_on_completion: e.target.checked })}
              className="w-4 h-4 accent-black border-[2px] border-black cursor-pointer"
            />
            <span className="font-bold text-black">
              Display native Windows 11 notification toast on workflow completion
            </span>
          </label>
        </div>

        <div className="pt-2 border-t border-zinc-200 flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-ink-muted">Global Hotkey:</span>
          <span className="font-mono text-xs font-bold bg-yellow-electric border border-black px-2 py-1 shadow-neo-sm">
            {settings.spotlight_hotkey}
          </span>
        </div>
      </div>
    </div>
  );
};
