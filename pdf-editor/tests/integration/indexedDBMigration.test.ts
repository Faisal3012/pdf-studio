import 'fake-indexeddb/auto'
import { openDB } from 'idb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getDB,
  closeDB,
  storeExistingTextEdits,
  getExistingTextEdits,
  getAnnotations,
  getPDF,
  getSession,
  DB_VERSION,
} from '@/services/storage/indexedDB'
import { persistCurrentDocument } from '@/hooks/useAutosave'
import { useEditorStore } from '@/store/editorStore'

describe('IndexedDB Migration & Resilience Integration Tests', () => {
  const sessionId = 'test-migration-session'

  beforeEach(() => {
    localStorage.clear()
    closeDB()
  })

  afterEach(() => {
    closeDB()
  })

  it('migrates a v1 database to v2, preserves legacy data, and creates existingTextEdits', async () => {
    // 1. Manually simulate a legacy user browser with DB version 1 without existingTextEdits
    const v1DB = await openDB('pdf-editor-db', 1, {
      upgrade(db) {
        db.createObjectStore('pdfs', { keyPath: 'sessionId' })
        db.createObjectStore('annotations', { keyPath: 'sessionId' })
        db.createObjectStore('sessions', { keyPath: 'sessionId' })
        db.createObjectStore('projects', { keyPath: 'id' })
      },
    })

    // Confirm that existingTextEdits does NOT exist in v1
    expect(v1DB.objectStoreNames.contains('existingTextEdits')).toBe(false)

    // Write existing legacy data to v1
    const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer
    await v1DB.put('pdfs', {
      sessionId,
      data: dummyBuffer,
      filename: 'legacy.pdf',
      storedAt: new Date().toISOString(),
    })
    await v1DB.put('annotations', {
      sessionId,
      byPage: { 0: [] },
      updatedAt: new Date().toISOString(),
    })
    v1DB.close()

    // 2. Now call getDB() through the application's storage service
    const upgradedDB = await getDB()
    expect(upgradedDB.version).toBeGreaterThanOrEqual(DB_VERSION)
    expect(upgradedDB.objectStoreNames.contains('existingTextEdits')).toBe(true)
    expect(upgradedDB.objectStoreNames.contains('pdfs')).toBe(true)
    expect(upgradedDB.objectStoreNames.contains('annotations')).toBe(true)
    expect(upgradedDB.objectStoreNames.contains('sessions')).toBe(true)

    // 3. Verify legacy data was preserved during the schema migration
    const preservedPDF = await getPDF(sessionId)
    expect(preservedPDF).toBeDefined()
    expect(preservedPDF?.byteLength).toBe(4)

    const preservedAnnotations = await getAnnotations(sessionId)
    expect(preservedAnnotations).toBeDefined()
    expect(preservedAnnotations?.[0]).toEqual([])

    // 4. Verify existingTextEdits can be written and read without throwing NotFoundError
    await storeExistingTextEdits(sessionId, {
      0: [
        {
          id: 'edit-1',
          pageIndex: 0,
          originalText: 'Old',
          replacementText: 'New',
          pdfX: 10,
          pdfY: 20,
          viewX: 10,
          viewY: 20,
          width: 50,
          height: 12,
          fontSize: 12,
          fontFamily: 'Helvetica',
        },
      ],
    })

    const retrievedEdits = await getExistingTextEdits(sessionId)
    expect(retrievedEdits).toBeDefined()
    expect(retrievedEdits?.[0]?.length).toBe(1)
    expect(retrievedEdits?.[0]?.[0].replacementText).toBe('New')
  })

  it('persistCurrentDocument writes full state, updates saveStatus to saved, and clears hasUnsavedChanges', async () => {
    // Setup store
    const store = useEditorStore.getState()
    const docMeta = {
      filename: 'test.pdf',
      pageCount: 1,
      pageDimensions: [{ pageIndex: 0, width: 600, height: 800 }],
      fileSize: 1000,
    }
    store.setDocument(docMeta, sessionId)
    store.setHasUnsavedChanges(true)

    store.upsertExistingTextEdit({
      id: 'edit-persist-1',
      pageIndex: 0,
      originalText: 'Before',
      replacementText: 'After',
      pdfX: 20,
      pdfY: 30,
      viewX: 20,
      viewY: 30,
      width: 40,
      height: 10,
      fontSize: 12,
      fontFamily: 'Helvetica',
    })

    const success = await persistCurrentDocument()
    expect(success).toBe(true)

    const updatedStore = useEditorStore.getState()
    expect(updatedStore.saveStatus).toBe('saved')
    expect(updatedStore.lastSaveError).toBeNull()
    expect(updatedStore.hasUnsavedChanges).toBe(false)

    // Verify stored session and edits in IndexedDB
    const savedSession = await getSession(sessionId)
    expect(savedSession).toBeDefined()
    expect(savedSession?.document.filename).toBe('test.pdf')

    const savedEdits = await getExistingTextEdits(sessionId)
    expect(savedEdits?.[0]?.[0].replacementText).toBe('After')
  })

  it('recovers cleanly on retry after document state is provided', async () => {
    // When no document or session is set, persistCurrentDocument returns false
    const store = useEditorStore.getState()
    store.clearDocument()

    const result = await persistCurrentDocument()
    expect(result).toBe(false)

    // Set document and verify clean recovery
    const docMeta = {
      filename: 'recovered.pdf',
      pageCount: 1,
      pageDimensions: [{ pageIndex: 0, width: 600, height: 800 }],
      fileSize: 500,
    }
    useEditorStore.getState().setDocument(docMeta, 'recovered-session')
    useEditorStore.getState().setHasUnsavedChanges(true)

    const retryResult = await persistCurrentDocument()
    expect(retryResult).toBe(true)
    expect(useEditorStore.getState().saveStatus).toBe('saved')
    expect(useEditorStore.getState().lastSaveError).toBeNull()
  })
})
