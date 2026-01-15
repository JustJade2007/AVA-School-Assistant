import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Sliders, Zap, ChevronDown, ChevronUp, Trash2, Sun, Moon, Key, Cpu, Sparkles, Volume2 } from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearLogs: () => void;
}

const GEMINI_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Default: Fast & Balanced' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', desc: 'Premium: Best for complex logic' },
  { value: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', desc: 'Eco: Highly efficient' },
];

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, updateSettings, onClearLogs }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h3 className="section-title"><Sliders size={16} /> General</h3>
        <div className="setting">
          <label htmlFor="automationEnabled">Automation Enabled</label>
          <input
            type="checkbox"
            id="automationEnabled"
            checked={settings.automationEnabled}
            onChange={(e) => updateSettings({ automationEnabled: e.target.checked })}
          />
        </div>
        <div className="setting">
          <label htmlFor="autoSelect">Auto-Select Answer</label>
          <input
            type="checkbox"
            id="autoSelect"
            checked={settings.autoSelect}
            onChange={(e) => updateSettings({ autoSelect: e.target.checked })}
          />
        </div>
        <div className="setting">
          <label htmlFor="confidenceThreshold">Confidence Threshold</label>
          <input
            type="range"
            id="confidenceThreshold"
            min="0"
            max="1"
            step="0.05"
            value={settings.confidenceThreshold}
            onChange={(e) => updateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
          />
          <span>{(settings.confidenceThreshold * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title"><Zap size={16} /> Triggers</h3>
        <div className="setting">
          <label htmlFor="triggerTime">Time-based Trigger</label>
          <input
            type="checkbox"
            id="triggerTime"
            checked={settings.triggerTime}
            onChange={(e) => updateSettings({ triggerTime: e.target.checked })}
          />
        </div>
        {settings.triggerTime && (
          <div className="setting">
            <label htmlFor="scanIntervalMs">Scan Interval (ms)</label>
            <input
              type="number"
              id="scanIntervalMs"
              value={settings.scanIntervalMs}
              onChange={(e) => updateSettings({ scanIntervalMs: parseInt(e.target.value, 10) })}
            />
          </div>
        )}
        <div className="setting">
          <label htmlFor="triggerSmart">Smart Trigger (OCR)</label>
          <input
            type="checkbox"
            id="triggerSmart"
            checked={settings.triggerSmart}
            onChange={(e) => updateSettings({ triggerSmart: e.target.checked })}
          />
        </div>
      </div>

      <div className="settings-section advanced-section">
        <h3 className="section-title" onClick={() => setShowAdvanced(!showAdvanced)}>
          <Key size={16} /> Advanced Settings {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </h3>
        {showAdvanced && (
          <div className="advanced-content">
            <div className="setting">
              <label htmlFor="modelName"><Cpu size={14} /> AI Model</label>
              <select
                id="modelName"
                value={settings.modelName}
                onChange={(e) => updateSettings({ modelName: e.target.value })}
              >
                {GEMINI_MODELS.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>
            <div className="setting">
              <label htmlFor="themeMode"><Sun size={14} /> Theme</label>
              <div className="theme-switcher">
                <button onClick={() => updateSettings({ themeMode: 'light' })} className={settings.themeMode === 'light' ? 'active' : ''}><Sun size={16} /></button>
                <button onClick={() => updateSettings({ themeMode: 'dark' })} className={settings.themeMode === 'dark' ? 'active' : ''}><Moon size={16} /></button>
              </div>
            </div>
             <div className="setting">
                <label htmlFor="simplifiedMode"><Sparkles size={14} /> UI Mode</label>
                <select
                    id="simplifiedMode"
                    value={settings.simplifiedMode.toString()}
                    onChange={(e) => updateSettings({ simplifiedMode: e.target.value === 'true' })}>
                    <option value="false">Full</option>
                    <option value="true">Simplified</option>
                </select>
            </div>
            <div className="setting">
                <label htmlFor="speakAnswer"><Volume2 size={14} /> Speak Answer</label>
                <input
                    type="checkbox"
                    id="speakAnswer"
                    checked={settings.speakAnswer}
                    onChange={(e) => updateSettings({ speakAnswer: e.target.checked })}
                />
            </div>
            <div className="setting log-controls">
                <label>Logs</label>
                <button onClick={onClearLogs}><Trash2 size={16} /> Clear Logs</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
