'use client'

import { useState } from 'react'

const PRESET_STRATEGIES = [
  { name: 'Right-hand rule', prompt: 'Follow the right-hand rule: if right is clear, turn right and move forward. Otherwise if front is clear, move forward. Otherwise turn left.' },
  { name: 'Left-hand rule', prompt: 'Follow the left-hand rule: if left is clear, turn left and move forward. Otherwise if front is clear, move forward. Otherwise turn right.' },
  { name: 'Explorer', prompt: 'Prefer unexplored paths. If multiple options, choose the one you have visited least. Avoid backtracking unless necessary.' },
  { name: 'Random walker', prompt: 'Move randomly but avoid hitting walls. If stuck, turn around.' },
]

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
  const [showPresets, setShowPresets] = useState(false)

  const selectPreset = (p: string) => {
    setPrompt(p)
    setShowPresets(false)
  }

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
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your AI strategy..."
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
              onClick={() => selectPreset(s.prompt)}
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
    </div>
  )
}
