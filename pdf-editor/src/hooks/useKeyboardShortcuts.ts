import { useEffect, useRef } from 'react'
import { clampZoom, ZOOM_LEVELS } from '@/utils/coordinateMapping'

interface UseKeyboardShortcutsOptions {
  zoom: number
  setZoom: (zoom: number) => void
  onUndo?: () => void
  onRedo?: () => void
  onDelete?: () => void
  onSelectAll?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts({
  zoom,
  setZoom,
  onUndo,
  onRedo,
  onDelete,
  onEscape,
}: UseKeyboardShortcutsOptions) {
  const optionsRef = useRef({ zoom, setZoom, onUndo, onRedo, onDelete, onEscape })
  optionsRef.current = { zoom, setZoom, onUndo, onRedo, onDelete, onEscape }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input or textarea
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey

      // Zoom In: Ctrl + Plus or Ctrl + '='
      if (isCtrlOrCmd && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const current = optionsRef.current.zoom
        const next = ZOOM_LEVELS.find((lvl) => lvl > current) ?? current + 25
        optionsRef.current.setZoom(clampZoom(next))
        return
      }

      // Zoom Out: Ctrl + Minus
      if (isCtrlOrCmd && e.key === '-') {
        e.preventDefault()
        const current = optionsRef.current.zoom
        const reversed = [...ZOOM_LEVELS].reverse()
        const prev = reversed.find((lvl) => lvl < current) ?? current - 25
        optionsRef.current.setZoom(clampZoom(prev))
        return
      }

      // Reset Zoom: Ctrl + 0
      if (isCtrlOrCmd && e.key === '0') {
        e.preventDefault()
        optionsRef.current.setZoom(100)
        return
      }

      // Undo: Ctrl + Z
      if (isCtrlOrCmd && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        optionsRef.current.onUndo?.()
        return
      }

      // Redo: Ctrl + Y or Ctrl + Shift + Z
      if (
        (isCtrlOrCmd && e.key.toLowerCase() === 'y') ||
        (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault()
        optionsRef.current.onRedo?.()
        return
      }

      // Delete: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        optionsRef.current.onDelete?.()
        return
      }

      // Escape
      if (e.key === 'Escape') {
        optionsRef.current.onEscape?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
