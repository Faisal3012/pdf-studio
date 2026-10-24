import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateSessionId,
  getActiveSessionId,
  setActiveSessionId,
  clearActiveSessionId,
  SESSION_ID_KEY,
} from '@/services/storage/indexedDB'

// ─── IndexedDB unit tests ──────────────────────────────────────────────────────
// Full IndexedDB CRUD tests require a real IndexedDB environment (fake-indexeddb).
// These tests cover the session ID helpers and localStorage interaction,
// which are testable in jsdom.
// The full async CRUD is covered by integration tests in Phase 4.

describe('Session ID helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('generateSessionId returns a non-empty string', () => {
    const id = generateSessionId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('generateSessionId generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateSessionId()))
    expect(ids.size).toBe(100)
  })

  it('generateSessionId starts with "session-"', () => {
    expect(generateSessionId().startsWith('session-')).toBe(true)
  })

  it('getActiveSessionId returns null when nothing stored', () => {
    expect(getActiveSessionId()).toBeNull()
  })

  it('setActiveSessionId writes to localStorage under SESSION_ID_KEY', () => {
    setActiveSessionId('test-session-123')
    expect(localStorage.getItem(SESSION_ID_KEY)).toBe('test-session-123')
  })

  it('getActiveSessionId returns the stored session ID', () => {
    setActiveSessionId('my-session')
    expect(getActiveSessionId()).toBe('my-session')
  })

  it('clearActiveSessionId removes the key from localStorage', () => {
    setActiveSessionId('to-be-cleared')
    clearActiveSessionId()
    expect(localStorage.getItem(SESSION_ID_KEY)).toBeNull()
    expect(getActiveSessionId()).toBeNull()
  })

  it('SESSION_ID_KEY is a non-empty string', () => {
    expect(typeof SESSION_ID_KEY).toBe('string')
    expect(SESSION_ID_KEY.length).toBeGreaterThan(0)
  })
})

// ─── projectMigration tests ───────────────────────────────────────────────────
describe('projectMigration', () => {
  it('throws on non-object input', async () => {
    const { migrateProject } = await import('@/utils/projectMigration')
    expect(() => migrateProject('string')).toThrow()
    expect(() => migrateProject(null)).toThrow()
    expect(() => migrateProject(42)).toThrow()
  })

  it('throws when format is wrong', async () => {
    const { migrateProject } = await import('@/utils/projectMigration')
    expect(() => migrateProject({ format: 'wrong', version: 1, createdAt: '', updatedAt: '', document: {}, pages: [], annotations: [], settings: {} })).toThrow(/format/)
  })

  it('throws when version is missing', async () => {
    const { migrateProject } = await import('@/utils/projectMigration')
    expect(() => migrateProject({ format: 'pdfeditor', createdAt: '', updatedAt: '', document: {}, pages: [], annotations: [], settings: {} })).toThrow(/version/)
  })

  it('throws when version is newer than current', async () => {
    const { migrateProject } = await import('@/utils/projectMigration')
    expect(() => migrateProject({ format: 'pdfeditor', version: 999, createdAt: '', updatedAt: '', document: {}, pages: [], annotations: [], settings: {} })).toThrow(/newer version/)
  })

  it('throws when required fields are missing', async () => {
    const { migrateProject } = await import('@/utils/projectMigration')
    expect(() => migrateProject({ format: 'pdfeditor', version: 1 })).toThrow(/missing/)
  })

  it('returns the object for a valid v1 file', async () => {
    const { migrateProject } = await import('@/utils/projectMigration')
    const valid = {
      format: 'pdfeditor',
      version: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      document: { filename: 'test.pdf', pageCount: 1, pageDimensions: [] },
      pages: [],
      annotations: [],
      settings: { zoom: 100, currentPage: 0, theme: 'light' },
    }
    const result = migrateProject(valid)
    expect(result).toBeDefined()
    expect(result.format).toBe('pdfeditor')
    expect(result.version).toBe(1)
  })
})

// ─── projectFile helpers tests ────────────────────────────────────────────────
describe('projectFile — sanitizeFilename (via downloadProjectFile)', () => {
  it('decodePDFFromProject returns null when no pdfBase64', async () => {
    const { decodePDFFromProject } = await import('@/services/storage/projectFile')
    const project = {
      format: 'pdfeditor' as const,
      version: 1 as const,
      createdAt: '',
      updatedAt: '',
      document: { filename: 'test.pdf', pageCount: 1, pageDimensions: [] },
      pages: [],
      annotations: [],
      settings: { zoom: 100, currentPage: 0, theme: 'light' as const },
    }
    expect(decodePDFFromProject(project)).toBeNull()
  })

  it('decodePDFFromProject decodes valid base64 to ArrayBuffer', async () => {
    const { decodePDFFromProject } = await import('@/services/storage/projectFile')
    // Base64 of '%PDF-' = 'JVBERi0='
    const project = {
      format: 'pdfeditor' as const,
      version: 1 as const,
      createdAt: '',
      updatedAt: '',
      document: { filename: 'test.pdf', pageCount: 1, pageDimensions: [] },
      pages: [],
      annotations: [],
      settings: { zoom: 100, currentPage: 0, theme: 'light' as const },
      pdfBase64: 'JVBERi0=',
    }
    const result = decodePDFFromProject(project)
    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(result!.byteLength).toBe(5)
  })

  it('loadProjectFile throws for non-.pdfeditor files', async () => {
    const { loadProjectFile } = await import('@/services/storage/projectFile')
    const file = new File(['{}'], 'test.pdf', { type: 'application/pdf' })
    await expect(loadProjectFile(file)).rejects.toThrow('Invalid file type')
  })

  it('loadProjectFile throws for invalid JSON', async () => {
    const { loadProjectFile } = await import('@/services/storage/projectFile')
    const file = new File(['not json'], 'project.pdfeditor', { type: 'application/json' })
    await expect(loadProjectFile(file)).rejects.toThrow('Could not read')
  })

  it('loadProjectFile throws for wrong format', async () => {
    const { loadProjectFile } = await import('@/services/storage/projectFile')
    const file = new File([JSON.stringify({ format: 'wrong', version: 1 })], 'project.pdfeditor', { type: 'application/json' })
    await expect(loadProjectFile(file)).rejects.toThrow()
  })

  it('loadProjectFile preserves existingTextEdits when present', async () => {
    const { loadProjectFile } = await import('@/services/storage/projectFile')
    const validWithEdits = {
      format: 'pdfeditor',
      version: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      document: { filename: 'test.pdf', pageCount: 1, pageDimensions: [] },
      pages: [],
      annotations: [],
      existingTextEdits: [
        {
          id: 'item-1',
          pageIndex: 0,
          originalText: 'Original text',
          replacementText: 'Edited text',
          pdfX: 50,
          pdfY: 700,
          viewX: 50,
          viewY: 92,
          width: 100,
          height: 14,
          fontSize: 12,
          fontFamily: 'Helvetica',
        },
      ],
      settings: { zoom: 100, currentPage: 0, theme: 'light' },
    }
    const file = new File([JSON.stringify(validWithEdits)], 'project.pdfeditor', { type: 'application/json' })
    const result = await loadProjectFile(file)
    expect(result.existingTextEdits).toBeDefined()
    expect(result.existingTextEdits?.length).toBe(1)
    expect(result.existingTextEdits?.[0].replacementText).toBe('Edited text')
  })
})
