import { Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { HomePage } from '@/pages/Home'
import { EditorPage } from '@/pages/Editor'
import { ToolsPage } from '@/pages/Tools'
import { DevPage } from '@/pages/Dev'

// Simple placeholder for routes not yet implemented
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <p className="text-slate-500 dark:text-slate-400">Coming soon.</p>
        <a href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to home
        </a>
      </div>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Public pages */}
        <Route path="/"       element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/tools"  element={<ToolsPage />} />
        <Route path="/about"  element={<PlaceholderPage title="About" />} />
        <Route path="/help"   element={<PlaceholderPage title="Help" />} />

        {/* Tools sub-routes (Phase 8) */}
        <Route path="/tools/merge"    element={<PlaceholderPage title="Merge PDF" />} />
        <Route path="/tools/split"    element={<PlaceholderPage title="Split PDF" />} />
        <Route path="/tools/compress" element={<PlaceholderPage title="Compress PDF" />} />
        <Route path="/tools/images"   element={<PlaceholderPage title="PDF to Images" />} />
        <Route path="/tools/pdf"      element={<PlaceholderPage title="Images to PDF" />} />

        {/* Dev preview — UI components */}
        <Route path="/dev" element={<DevPage />} />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
