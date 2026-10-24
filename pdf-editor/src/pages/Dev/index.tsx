import { useState } from 'react'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Spinner } from '@/components/UI/Spinner'
import { Tooltip } from '@/components/UI/Tooltip'
import { Modal } from '@/components/UI/Modal'
import { ErrorBoundary } from '@/components/UI/ErrorBoundary'
import { ThemeToggle } from '@/components/UI/ThemeToggle'
import { Link } from 'react-router-dom'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
        {title}
      </h2>
      <div className="flex flex-wrap gap-3 items-center">{children}</div>
    </section>
  )
}

function ThrowError(): never {
  throw new Error('Test error from ErrorBoundary demo')
}

/**
 * Dev-only page — visual preview of all shared UI components.
 * Route: /dev (only accessible in development).
 */
export function DevPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [showError, setShowError] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">UI Component Preview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dev-only route — <code>/dev</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            ← Home
          </Link>
        </div>
      </div>

      {/* Button variants */}
      <Section title="Button — Variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="primary" loading>Loading</Button>
      </Section>

      {/* Button sizes */}
      <Section title="Button — Sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Section>

      {/* Button with icon */}
      <Section title="Button — With Icon">
        <Button variant="primary" icon={<span>📄</span>}>Upload PDF</Button>
        <Button variant="secondary" icon={<span>💾</span>}>Save Project</Button>
        <Button variant="ghost" icon={<span>⬇️</span>}>Download</Button>
      </Section>

      {/* Badges */}
      <Section title="Badge — Variants">
        <Badge variant="default">Default</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="info">Info</Badge>
      </Section>

      {/* Spinners */}
      <Section title="Spinner — Sizes">
        <Spinner size="sm" label="Small spinner" />
        <Spinner size="md" label="Medium spinner" />
        <Spinner size="lg" label="Large spinner" />
      </Section>

      {/* Tooltips */}
      <Section title="Tooltip — Positions">
        <Tooltip content="Tooltip on top" position="top">
          <Button variant="secondary" size="sm">Top</Button>
        </Tooltip>
        <Tooltip content="Tooltip on bottom" position="bottom">
          <Button variant="secondary" size="sm">Bottom</Button>
        </Tooltip>
        <Tooltip content="Tooltip on left" position="left">
          <Button variant="secondary" size="sm">Left</Button>
        </Tooltip>
        <Tooltip content="Tooltip on right" position="right">
          <Button variant="secondary" size="sm">Right</Button>
        </Tooltip>
      </Section>

      {/* Modal */}
      <Section title="Modal">
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          Open Modal
        </Button>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Example Modal"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This modal has focus trapping. Tab cycles within it. Esc closes it.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
            </div>
          </div>
        </Modal>
      </Section>

      {/* ErrorBoundary */}
      <Section title="ErrorBoundary">
        <ErrorBoundary onReset={() => setShowError(false)}>
          {showError ? (
            <ThrowError />
          ) : (
            <Button variant="danger" onClick={() => setShowError(true)}>
              Trigger Error Boundary
            </Button>
          )}
        </ErrorBoundary>
      </Section>

      {/* Theme */}
      <Section title="Theme Toggle">
        <ThemeToggle />
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Click to cycle: Light → Dark → System
        </span>
      </Section>
    </div>
  )
}
