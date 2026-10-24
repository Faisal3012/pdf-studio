import type { CompatibilityResult } from '@/utils/browserCompat'

interface Props {
  result: CompatibilityResult
}

export function CompatibilityWarning({ result }: Props) {
  if (result.compatible && result.warnings.length === 0) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6"
    >
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
        {/* Icon */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3m0 3h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {result.compatible ? 'Browser Warning' : 'Browser Not Supported'}
          </h1>
        </div>

        {!result.compatible && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your browser is missing required features for the PDF Editor.
              Please upgrade to a modern browser.
            </p>
            <ul className="space-y-1">
              {result.missing.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <span aria-hidden="true">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {result.warnings.length > 0 && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Some features may not work correctly:
            </p>
            <ul className="space-y-1">
              {result.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <span aria-hidden="true">⚠</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-500">
          Recommended browsers: Chrome 90+, Edge 90+, Firefox 90+
        </p>
      </div>
    </div>
  )
}
