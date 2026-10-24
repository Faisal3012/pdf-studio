import { useThemeStore } from '@/store/themeStore'
import type { Theme } from '@/types/editor.types'
import { Tooltip } from './Tooltip'

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  const options: { value: Theme; label: string; icon: string }[] = [
    { value: 'light',  label: 'Light mode',  icon: '☀️' },
    { value: 'dark',   label: 'Dark mode',   icon: '🌙' },
    { value: 'system', label: 'System mode', icon: '💻' },
  ]

  const cycle = () => {
    const idx = options.findIndex((o) => o.value === theme)
    const next = options[(idx + 1) % options.length]
    setTheme(next.value)
  }

  const current = options.find((o) => o.value === theme) ?? options[2]

  return (
    <Tooltip content={`${current.label} (click to change)`}>
      <button
        onClick={cycle}
        aria-label={`Current theme: ${current.label}. Click to change.`}
        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100
                   dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800
                   transition-colors"
      >
        <span aria-hidden="true">{current.icon}</span>
      </button>
    </Tooltip>
  )
}
