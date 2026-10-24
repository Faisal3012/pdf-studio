import { Link } from 'react-router-dom'
import { ThemeToggle } from '@/components/UI/ThemeToggle'
import { Badge } from '@/components/UI/Badge'

const tools = [
  { icon: '✏️', title: 'Edit PDF',       path: '/editor',          ready: false },
  { icon: '📎', title: 'Merge PDF',       path: '/tools/merge',     ready: false },
  { icon: '✂️', title: 'Split PDF',       path: '/tools/split',     ready: false },
  { icon: '🗜️', title: 'Compress PDF',   path: '/tools/compress',  ready: false },
  { icon: '🔄', title: 'Rotate PDF',      path: '/editor',          ready: false },
  { icon: '🗑️', title: 'Delete Pages',   path: '/editor',          ready: false },
  { icon: '📑', title: 'Reorder Pages',  path: '/editor',          ready: false },
  { icon: '🖼️', title: 'PDF to Images',  path: '/tools/images',    ready: false },
  { icon: '📄', title: 'Images to PDF',  path: '/tools/pdf',       ready: false },
]

/**
 * PDF Tools landing page — individual tools implemented in Phase 8.
 */
export function ToolsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg text-blue-600 dark:text-blue-400"
            aria-label="Go to homepage"
          >
            <span aria-hidden="true">📄</span>
            <span>PDF Editor</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <Link to="/"      className="hover:text-slate-900 dark:hover:text-white transition-colors">Home</Link>
            <Link to="/editor" className="hover:text-slate-900 dark:hover:text-white transition-colors">PDF Editor</Link>
            <Link to="/tools" className="text-blue-600 dark:text-blue-400 font-semibold">PDF Tools</Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">PDF Tools</h1>
          <p className="text-slate-500 dark:text-slate-400">
            All tools run locally in your browser. No uploads, no accounts required.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.title}
              className="p-6 rounded-xl border border-slate-200 dark:border-slate-800
                         bg-white dark:bg-slate-900 opacity-60 cursor-not-allowed"
              aria-label={`${tool.title} — coming soon`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl" aria-hidden="true">{tool.icon}</span>
                <Badge variant="default">Coming soon</Badge>
              </div>
              <h2 className="font-semibold text-slate-900 dark:text-white">{tool.title}</h2>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-400">
          Tools will be available in Phase 8 of the implementation.
        </p>
      </main>
    </div>
  )
}
