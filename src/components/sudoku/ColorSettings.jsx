import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X, Check, Save, Trash2 } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
];

export default function ColorSettings({ colors, onColorsChange, onClose }) {
  const [customHex, setCustomHex] = useState('');
  const [activeSection, setActiveSection] = useState('focusDigit');
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sudoku-color-presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load presets', e);
      }
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;
    if (presets.length >= 3) {
      alert('Maximum 3 presets allowed. Delete one to add a new preset.');
      return;
    }

    const newPreset = {
      id: Date.now(),
      name: presetName.trim(),
      colors: { ...colors }
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('sudoku-color-presets', JSON.stringify(updated));
    setPresetName('');
    setShowSaveInput(false);
  };

  const loadPreset = (preset) => {
    onColorsChange(preset.colors);
  };

  const deletePreset = (id) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem('sudoku-color-presets', JSON.stringify(updated));
  };

  const sections = {
    focusDigit: { label: 'Focused Digit', key: 'focusDigit' },
    candidate: { label: 'Focused Candidate', key: 'candidate' },
    cellNumber: { label: 'Cell Numbers', key: 'cellNumber' },
    gridLines: { label: 'Grid Lines', key: 'gridLines' },
    gridBg: { label: 'Grid Background', key: 'gridBg' },
    cellBg: { label: 'Cell Background', key: 'cellBg' },
  };

  const handleColorSelect = (color) => {
    onColorsChange({ ...colors, [activeSection]: color });
  };

  const handleCustomHex = () => {
    if (/^#[0-9A-F]{6}$/i.test(customHex)) {
      handleColorSelect(customHex);
      setCustomHex('');
    }
  };

  const handleReset = () => {
    onColorsChange({
      focusDigit: '#10b981',
      candidate: '#ffffff',
      cellNumber: '#3b82f6',
      gridLines: '#475569',
      gridBg: '#0f172a',
      cellBg: '#020617',
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Color Settings</h3>
                <p className="text-sm text-slate-400">Customize your Sudoku theme</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Saved Presets */}
            {presets.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Saved Presets</h4>
                <div className="space-y-2">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-3 bg-slate-800 rounded-lg p-3 hover:bg-slate-750 transition-colors"
                    >
                      <div className="flex gap-1">
                        {Object.entries(preset.colors).slice(0, 4).map(([key, color]) => (
                          <div
                            key={key}
                            className="w-6 h-6 rounded border border-slate-600"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="flex-1 text-white font-medium">{preset.name}</span>
                      <button
                        onClick={() => loadPreset(preset)}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save Current Colors */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Save Current Theme</h4>
              {showSaveInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Enter preset name..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={20}
                    onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                  />
                  <button
                    onClick={savePreset}
                    disabled={!presetName.trim() || presets.length >= 3}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      presetName.trim() && presets.length < 3
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setShowSaveInput(false);
                      setPresetName('');
                    }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  disabled={presets.length >= 3}
                  className={`w-full py-2 rounded-lg font-medium transition-all ${
                    presets.length < 3
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {presets.length >= 3 ? 'Maximum Presets Reached (3/3)' : `Save Preset (${presets.length}/3)`}
                </button>
              )}
            </div>

            {/* Section Selector */}
            <div className="flex gap-2 flex-wrap">
              {Object.entries(sections).map(([key, section]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm transition-all
                    ${activeSection === key
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }
                  `}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {/* Current Color Preview */}
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Current Color</span>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-slate-600 shadow-inner"
                    style={{ backgroundColor: colors[activeSection] }}
                  />
                  <span className="font-mono text-sm text-slate-400">
                    {colors[activeSection]}
                  </span>
                </div>
              </div>
            </div>

            {/* Preset Colors */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Preset Colors</h4>
              <div className="grid grid-cols-9 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleColorSelect(color.value)}
                    className="relative group"
                    title={color.name}
                  >
                    <div
                      className={`
                        w-full aspect-square rounded-lg border-2 transition-all
                        hover:scale-110 hover:shadow-lg
                        ${colors[activeSection] === color.value
                          ? 'border-white shadow-lg scale-110'
                          : 'border-slate-700'
                        }
                      `}
                      style={{ backgroundColor: color.value }}
                    />
                    {colors[activeSection] === color.value && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Hex Input */}
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Custom Color (Hex)</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                  placeholder="#RRGGBB"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={7}
                />
                <button
                  onClick={handleCustomHex}
                  disabled={!/^#[0-9A-F]{6}$/i.test(customHex)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${/^#[0-9A-F]{6}$/i.test(customHex)
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }
                  `}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-800">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}