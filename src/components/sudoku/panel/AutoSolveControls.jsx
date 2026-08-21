import React from 'react';
import { Play, Pause, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SPEEDS = [
  { label: '0.5×', value: 2000 },
  { label: '1×', value: 1000 },
  { label: '2×', value: 500 },
  { label: '16×', value: 63 },
];

/** Auto-solve play/pause, skip, and speed selection. */
export default function AutoSolveControls({
  isPlaying,
  onPlayPause,
  onSkipStep,
  playSpeed,
  onSpeedChange,
  noAssistMode,
}) {
  return (
    <div className={`bg-slate-900 rounded-2xl shadow-lg shadow-black/50 p-5 border border-slate-700 ${noAssistMode ? 'opacity-50' : ''}`}>
      <h4 className="text-lg font-semibold text-white mb-3">Auto-Solve</h4>
      <div className="flex gap-2">
        <Button
          onClick={onPlayPause}
          disabled={noAssistMode}
          aria-label={isPlaying ? 'Pause auto-solve' : 'Start auto-solve'}
          className={`${isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          onClick={onSkipStep}
          disabled={noAssistMode}
          variant="outline"
          aria-label="Apply current step and find the next one"
          className="border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
        {SPEEDS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onSpeedChange(value)}
            disabled={noAssistMode}
            aria-label={`Auto-solve speed ${label}`}
            aria-pressed={playSpeed === value}
            className={`px-3 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              playSpeed === value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
