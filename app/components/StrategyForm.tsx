'use client'

import { useState } from 'react'

const PRESET_STRATEGIES = [
  { name: 'Left-hand rule', prompt: 'Follow the left-hand rule: if left is clear, turn left and move forward. Otherwise if front is clear, move forward. Otherwise turn right.' },
  { name: 'Right-hand rule', prompt: 'Follow the right-hand rule: if right is clear, turn right and move forward. Otherwise if front is clear, move forward. Otherwise turn left.' },
  { name: 'Explorer', prompt: 'Prefer unexplored paths. If multiple options, choose the one you have visited least. Avoid backtracking unless necessary.' },
  { name: 'Random walker', prompt: 'Move randomly but avoid hitting walls. If stuck, turn around.' },
]

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-w-lg w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-xl font-bold text-center mb-6">Strategy Guide</h2>

        <div className="space-y-5">
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">👁️</span> What Your Mouse Sees
            </h3>
            <ul className="text-sm text-zinc-300 space-y-1">
              <li>• The cell <strong>in front</strong>, <strong>to the left</strong>, and <strong>to the right</strong></li>
              <li>• A <strong>memory map</strong> of the maze it has explored so far</li>
              <li>• Each cell can be: <strong>path</strong>, <strong>wall</strong>, <strong>start</strong>, or <strong>exit</strong></li>
            </ul>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4">
            <h3 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">🎮</span> What Your Mouse Can Do
            </h3>
            <ul className="text-sm text-zinc-300 space-y-1">
              <li>• <strong>Turn left</strong> — rotate 90° counterclockwise</li>
              <li>• <strong>Turn right</strong> — rotate 90° clockwise</li>
              <li>• <strong>Move forward</strong> — step into the cell ahead (fails if wall)</li>
            </ul>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4">
            <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">📋</span> Each Turn
            </h3>
            <p className="text-sm text-zinc-300">
              One action per turn: <strong>turn left</strong>, <strong>turn right</strong>, or <strong>move forward</strong>.
            </p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4">
            <h3 className="text-purple-400 font-semibold mb-2 flex items-center gap-2">
              <span className="text-lg">🏷️</span> Legend
            </h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-green-500/20 flex items-center justify-center text-green-500 text-xs font-bold">^</span>
                <span className="text-zinc-300">Your mouse</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-yellow-900/30 flex items-center justify-center text-yellow-500/80 text-xs font-bold">S</span>
                <span className="text-zinc-300">Start</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-900/40 flex items-center justify-center text-emerald-400 text-xs font-bold">E</span>
                <span className="text-zinc-300">Exit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StrategyFormProps {
  title: string
  name: string
  setName: (name: string) => void
  prompt: string
  setPrompt: (prompt: string) => void
  onSubmit: () => void
  submitLabel: string
  submitting?: boolean
  error?: string | null
  namePlaceholder?: string
}

export function StrategyForm({
  title,
  name,
  setName,
  prompt,
  setPrompt,
  onSubmit,
  submitLabel,
  submitting = false,
  error = null,
  namePlaceholder = 'Player',
}: StrategyFormProps) {
  const [showHelp, setShowHelp] = useState(false)

  return (
    <div className="p-4 rounded-xl border bg-zinc-900/50 border-zinc-800">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          maxLength={20}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-zinc-500">Strategy</label>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-zinc-500 hover:text-emerald-400 transition-colors"
              title="Strategy guide"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the strategy of your AI mouse..."
            maxLength={500}
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {PRESET_STRATEGIES.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => setPrompt(s.prompt)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                prompt === s.prompt
                  ? 'bg-emerald-600/30 text-emerald-400'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !prompt.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          {submitting ? 'Please wait...' : submitLabel}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
