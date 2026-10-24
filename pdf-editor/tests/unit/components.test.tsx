import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Button } from '@/components/UI/Button'
import { Badge } from '@/components/UI/Badge'
import { Spinner } from '@/components/UI/Spinner'
import { Tooltip } from '@/components/UI/Tooltip'
import { Modal } from '@/components/UI/Modal'
import { ErrorBoundary } from '@/components/UI/ErrorBoundary'

// ─── Button ──────────────────────────────────────────────────────────────────
describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick when clicked', () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handler = vi.fn()
    render(<Button disabled onClick={handler}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('applies primary variant classes', () => {
    render(<Button variant="primary">Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-[#23483B]')
  })

  it('applies danger variant classes', () => {
    render(<Button variant="danger">Danger</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-[#B94B45]')
  })
})

// ─── Badge ────────────────────────────────────────────────────────────────────
describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Test</Badge>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('applies success variant', () => {
    render(<Badge variant="success">OK</Badge>)
    expect(screen.getByText('OK').className).toContain('bg-green-100')
  })
})

// ─── Spinner ──────────────────────────────────────────────────────────────────
describe('Spinner', () => {
  it('renders with role status', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders the sr-only label', () => {
    render(<Spinner label="Please wait" />)
    expect(screen.getByText('Please wait')).toBeInTheDocument()
  })
})

// ─── Tooltip ─────────────────────────────────────────────────────────────────
describe('Tooltip', () => {
  it('does not show tooltip content initially', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows tooltip on mouse enter', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByText('Hover me').parentElement!)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Tooltip text')).toBeInTheDocument()
  })

  it('hides tooltip on mouse leave', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    const wrapper = screen.getByText('Hover me').parentElement!
    fireEvent.mouseEnter(wrapper)
    fireEvent.mouseLeave(wrapper)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})

// ─── Modal ────────────────────────────────────────────────────────────────────
describe('Modal', () => {
  it('does not render when open is false', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Test Modal">
        Content
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open is true', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Test Modal">
        Modal content
      </Modal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )
    fireEvent.click(screen.getByLabelText('Close dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has aria-modal and aria-labelledby attributes', () => {
    render(
      <Modal open={true} onClose={() => {}} title="Accessible Modal">
        Content
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title')
  })
})

// ─── ErrorBoundary ───────────────────────────────────────────────────────────
describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('renders fallback UI when a child throws', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Bomb() {
      throw new Error('Test explosion')
    }

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Test explosion')).toBeInTheDocument()

    spy.mockRestore()
  })
})

// ─── Homepage smoke test ──────────────────────────────────────────────────────
describe('HomePage', () => {
  // Lazy import to avoid module loading issues
  it('renders the hero heading', async () => {
    const { HomePage } = await import('@/pages/Home/index')
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    expect(
      screen.getByRole('heading', { level: 1 })
    ).toBeInTheDocument()
    expect(screen.getByText(/Professional PDF Editing/i)).toBeInTheDocument()
  })

  it('renders the Open Editor CTA', async () => {
    const { HomePage } = await import('@/pages/Home/index')
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const links = screen.getAllByRole('link', { name: /open editor/i })
    expect(links.length).toBeGreaterThan(0)
  })

  it('renders all 9 feature cards', async () => {
    const { HomePage } = await import('@/pages/Home/index')
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )
    const featureTitles = [
      'Edit PDF', 'Add Text', 'Add Image', 'Sign PDF',
      'Highlight', 'Draw', 'Merge PDF', 'Split PDF', 'Compress PDF',
    ]
    for (const title of featureTitles) {
      // Use getAllByText because some titles (e.g. "Edit PDF") may appear
      // in both the nav area and the feature card grid
      const matches = screen.getAllByText(title)
      expect(matches.length).toBeGreaterThanOrEqual(1)
    }
  })
})
