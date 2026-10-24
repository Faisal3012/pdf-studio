import { Link } from 'react-router-dom'
import { Button } from '@/components/UI/Button'
import { ThemeToggle } from '@/components/UI/ThemeToggle'

// ─── Feature Cards Data ───────────────────────────────────────────────────────
const features = [
  { icon: '✏️', title: 'Edit PDF',    description: 'Add, modify, and style text anywhere on your document.' },
  { icon: '🔤', title: 'Add Text',    description: 'Click anywhere to insert a new text box with custom fonts.' },
  { icon: '🖼️', title: 'Add Image',   description: 'Insert PNG, JPG, and WebP images. Resize and rotate freely.' },
  { icon: '✍️', title: 'Sign PDF',    description: 'Draw, type, or upload your signature and place it on any page.' },
  { icon: '🖊️', title: 'Highlight',  description: 'Highlight important content in yellow, green, blue, or red.' },
  { icon: '🎨', title: 'Draw',        description: 'Freehand pencil and highlighter tools with custom colors.' },
  { icon: '📄', title: 'Merge PDF',   description: 'Combine multiple PDFs into a single document.' },
  { icon: '✂️', title: 'Split PDF',   description: 'Extract pages or split by page range.' },
  { icon: '🗜️', title: 'Compress PDF', description: 'Reduce file size while keeping your content readable.' },
]

export function HomePage() {
  return (
    <div className="min-h-screen bg-[#F5F2EA] dark:bg-[#171C19] text-[#202820] dark:text-[#F0F0E8]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#FFFEFA]/90 dark:bg-[#171C19]/90 backdrop-blur border-b border-[#DEDCCF] dark:border-[#39443C]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-base tracking-tight text-[#23483B] dark:text-[#A7C4AD]">
            <span aria-hidden="true" className="text-xl text-[#C3A46B] dark:text-[#D2B77E]">✧</span>
            <span className="uppercase tracking-wider font-semibold text-sm">PDF STUDIO</span>
          </Link>

          {/* Nav */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6 text-xs font-medium text-[#73776E] dark:text-[#ADB5AA]">
            <Link to="/"       className="hover:text-[#202820] dark:hover:text-[#F0F0E8] transition-colors">Home</Link>
            <Link to="/editor" className="hover:text-[#202820] dark:hover:text-[#F0F0E8] transition-colors">PDF Editor</Link>
            <Link to="/tools"  className="hover:text-[#202820] dark:hover:text-[#F0F0E8] transition-colors">PDF Tools</Link>
            <Link to="/about"  className="hover:text-[#202820] dark:hover:text-[#F0F0E8] transition-colors">About</Link>
            <Link to="/help"   className="hover:text-[#202820] dark:hover:text-[#F0F0E8] transition-colors">Help</Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/editor">
              <Button variant="primary" size="sm">Open Editor</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        aria-labelledby="hero-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E5EDE6] dark:bg-[#202722] text-[#23483B] dark:text-[#A7C4AD] border border-[#DEDCCF] dark:border-[#39443C] text-xs font-medium mb-6">
          <span aria-hidden="true">🔒</span>
          <span>100% Client-Side Privacy — Documents never leave your device</span>
        </div>

        <h1
          id="hero-heading"
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#202820] dark:text-[#F0F0E8] mb-6"
        >
          Professional PDF Editing.{' '}
          <span className="text-[#23483B] dark:text-[#A7C4AD]">Precise.</span>{' '}
          Private.
        </h1>

        <p className="text-base text-[#73776E] dark:text-[#ADB5AA] max-w-2xl mx-auto mb-10 leading-relaxed">
          Modify existing document text, annotate, draw, sign, and export standard PDFs with true vector and content stream integrity.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/editor">
            <Button variant="primary" size="lg">
              Start Editing PDF
            </Button>
          </Link>
          <Link to="/editor">
            <Button variant="secondary" size="lg">
              Open Document
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section
        aria-labelledby="features-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 py-16"
      >
        <h2
          id="features-heading"
          className="text-2xl font-bold text-center text-[#202820] dark:text-[#F0F0E8] mb-12"
        >
          Engineered for Document Precision
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.title}
              to="/editor"
              className="group block p-6 rounded-lg border border-[#DEDCCF] dark:border-[#39443C]
                         bg-[#FFFEFA] dark:bg-[#262E29]
                         hover:border-[#C3A46B] dark:hover:border-[#D2B77E]
                         hover:shadow-sm transition-all duration-150"
            >
              <div className="text-2xl mb-3" aria-hidden="true">{feature.icon}</div>
              <h3 className="font-semibold text-[#202820] dark:text-[#F0F0E8] mb-1 group-hover:text-[#23483B] dark:group-hover:text-[#A7C4AD] transition-colors text-sm">
                {feature.title}
              </h3>
              <p className="text-xs text-[#73776E] dark:text-[#ADB5AA] leading-relaxed">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Privacy Banner ── */}
      <section className="bg-[#EAE6DC] dark:bg-[#202722] border-t border-[#DEDCCF] dark:border-[#39443C] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-lg font-semibold text-[#202820] dark:text-[#F0F0E8] mb-2">
            Local Processing, Uncompromised Privacy
          </h2>
          <p className="text-xs text-[#73776E] dark:text-[#ADB5AA] max-w-xl mx-auto leading-relaxed">
            All PDF rendering and content stream modifications execute strictly in your local browser sandbox. No file data is sent to external cloud servers.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#DEDCCF] dark:border-[#39443C] py-6 bg-[#FFFEFA] dark:bg-[#171C19]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#73776E] dark:text-[#ADB5AA]">
          <span>© {new Date().getFullYear()} PDF Studio. Professional browser-based document engineering.</span>
          <div className="flex gap-4">
            <Link to="/help" className="hover:text-[#202820] dark:hover:text-[#F0F0E8]">Help</Link>
            <Link to="/about" className="hover:text-[#202820] dark:hover:text-[#F0F0E8]">About</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
