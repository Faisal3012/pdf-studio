import { openDB, type IDBPDatabase } from 'idb'
import type { Annotation } from '@/types/annotation.types'
import type { PDFDocumentMeta } from '@/types/pdf.types'
import type { ProjectFile } from '@/types/project.types'

// ─── Database Schema ───────────────────────────────────────────────────────────

const DB_NAME = 'pdf-editor-db'
export const DB_VERSION = 2

/** localStorage key that holds the active session ID — never stores large data */
export const SESSION_ID_KEY = 'pdf-editor-session-id'

import type { ExistingTextEdit } from '@/types/existingText.types'

interface PDFEditorDB {
  pdfs: {
    key: string
    value: { sessionId: string; data: ArrayBuffer; filename: string; storedAt: string }
  }
  annotations: {
    key: string
    value: { sessionId: string; byPage: Record<number, Annotation[]>; updatedAt: string }
  }
  existingTextEdits: {
    key: string
    value: { sessionId: string; byPage: Record<number, ExistingTextEdit[]>; updatedAt: string }
  }
  sessions: {
    key: string
    value: { sessionId: string; document: PDFDocumentMeta; pageOrder: number[]; pageRotations: Record<number, 0 | 90 | 180 | 270>; createdAt: string; updatedAt: string }
  }
  projects: {
    key: string
    value: ProjectFile & { id: string }
  }
}

// ─── DB Instance & Migration ──────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<PDFEditorDB>> | null = null

function setupStores(db: IDBPDatabase<PDFEditorDB>) {
  if (!db.objectStoreNames.contains('pdfs')) {
    db.createObjectStore('pdfs', { keyPath: 'sessionId' })
  }
  if (!db.objectStoreNames.contains('annotations')) {
    db.createObjectStore('annotations', { keyPath: 'sessionId' })
  }
  if (!db.objectStoreNames.contains('existingTextEdits')) {
    db.createObjectStore('existingTextEdits', { keyPath: 'sessionId' })
  }
  if (!db.objectStoreNames.contains('sessions')) {
    db.createObjectStore('sessions', { keyPath: 'sessionId' })
  }
  if (!db.objectStoreNames.contains('projects')) {
    db.createObjectStore('projects', { keyPath: 'id' })
  }
}

export function closeDB(): void {
  if (dbPromise) {
    dbPromise.then((db) => db.close()).catch(() => {})
    dbPromise = null
  }
}

function openDatabase(version = DB_VERSION): Promise<IDBPDatabase<PDFEditorDB>> {
  return openDB<PDFEditorDB>(DB_NAME, version, {
    upgrade(db) {
      setupStores(db)
    },
    blocked() {
      console.warn('[IndexedDB] Database upgrade blocked by another connection.')
    },
    blocking() {
      console.warn('[IndexedDB] Database version change requested, closing connection.')
      closeDB()
    },
    terminated() {
      console.warn('[IndexedDB] Database connection terminated abnormally.')
      dbPromise = null
    },
  })
}

export async function getDB(): Promise<IDBPDatabase<PDFEditorDB>> {
  if (!dbPromise) {
    dbPromise = openDatabase(DB_VERSION).catch((err) => {
      dbPromise = null
      throw err
    })
  }

  const db = await dbPromise

  // Self-healing check: Verify all required stores exist in case of an older schema
  const requiredStores: (keyof PDFEditorDB)[] = ['pdfs', 'annotations', 'existingTextEdits', 'sessions', 'projects']
  const hasAllStores = requiredStores.every((s) => db.objectStoreNames.contains(s))

  if (!hasAllStores) {
    console.warn('[IndexedDB] Detected missing stores in open database. Upgrading schema...')
    db.close()
    dbPromise = null
    const nextVersion = Math.max(DB_VERSION, db.version + 1)
    dbPromise = openDatabase(nextVersion).catch((err) => {
      dbPromise = null
      throw err
    })
    return dbPromise
  }

  return db
}

// ─── Session ID Helpers ───────────────────────────────────────────────────────

export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(SESSION_ID_KEY)
}

export function setActiveSessionId(sessionId: string): void {
  localStorage.setItem(SESSION_ID_KEY, sessionId)
}

export function clearActiveSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY)
}

// ─── PDF Storage ──────────────────────────────────────────────────────────────

/** Store the raw PDF ArrayBuffer — keyed by sessionId */
export async function storePDF(
  sessionId: string,
  data: ArrayBuffer,
  filename: string
): Promise<void> {
  const db = await getDB()
  await db.put('pdfs', {
    sessionId,
    data,
    filename,
    storedAt: new Date().toISOString(),
  })
}

/** Retrieve the raw PDF ArrayBuffer for a session */
export async function getPDF(
  sessionId: string
): Promise<ArrayBuffer | null> {
  const db = await getDB()
  const record = await db.get('pdfs', sessionId)
  return record?.data ?? null
}

/** Delete the stored PDF for a session */
export async function deletePDF(sessionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('pdfs', sessionId)
}

// ─── Annotation Storage ────────────────────────────────────────────────────────

/** Store all annotation data for a session */
export async function storeAnnotations(
  sessionId: string,
  byPage: Record<number, Annotation[]>
): Promise<void> {
  const db = await getDB()
  await db.put('annotations', {
    sessionId,
    byPage,
    updatedAt: new Date().toISOString(),
  })
}

/** Retrieve annotation data for a session */
export async function getAnnotations(
  sessionId: string
): Promise<Record<number, Annotation[]> | null> {
  const db = await getDB()
  const record = await db.get('annotations', sessionId)
  return record?.byPage ?? null
}

/** Delete annotation data for a session */
export async function deleteAnnotations(sessionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('annotations', sessionId)
}

// ─── Existing-Text Edits Storage ───────────────────────────────────────────────

/** Store existing text edits for a session */
export async function storeExistingTextEdits(
  sessionId: string,
  byPage: Record<number, ExistingTextEdit[]>
): Promise<void> {
  const db = await getDB()
  await db.put('existingTextEdits', {
    sessionId,
    byPage,
    updatedAt: new Date().toISOString(),
  })
}

/** Retrieve existing text edits for a session */
export async function getExistingTextEdits(
  sessionId: string
): Promise<Record<number, ExistingTextEdit[]> | null> {
  const db = await getDB()
  const record = await db.get('existingTextEdits', sessionId)
  return record?.byPage ?? null
}

/** Delete existing text edits for a session */
export async function deleteExistingTextEdits(sessionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('existingTextEdits', sessionId)
}

// ─── Session Metadata ─────────────────────────────────────────────────────────

/** Store session metadata (document info, page order, rotations) */
export async function storeSession(
  sessionId: string,
  document: PDFDocumentMeta,
  pageOrder: number[],
  pageRotations: Record<number, 0 | 90 | 180 | 270>
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('sessions', sessionId)
  await db.put('sessions', {
    sessionId,
    document,
    pageOrder,
    pageRotations,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

/** Retrieve session metadata */
export async function getSession(sessionId: string): Promise<{
  document: PDFDocumentMeta
  pageOrder: number[]
  pageRotations: Record<number, 0 | 90 | 180 | 270>
  createdAt: string
  updatedAt: string
} | null> {
  const db = await getDB()
  const record = await db.get('sessions', sessionId)
  if (!record) return null
  return {
    document: record.document,
    pageOrder: record.pageOrder,
    pageRotations: record.pageRotations,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

/** Delete session metadata */
export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB()
  await db.delete('sessions', sessionId)
}

// ─── Full Session Clear ────────────────────────────────────────────────────────

/**
 * Clear ALL data for a session from IndexedDB AND remove the localStorage pointer.
 * Only called on explicit Close / Discard — NOT on export.
 */
export async function clearFullSession(sessionId: string): Promise<void> {
  await Promise.all([
    deletePDF(sessionId),
    deleteAnnotations(sessionId),
    deleteExistingTextEdits(sessionId),
    deleteSession(sessionId),
  ])
  clearActiveSessionId()
}

// ─── Project Storage ──────────────────────────────────────────────────────────

/** Save a named project file to IndexedDB */
export async function storeProject(id: string, project: ProjectFile): Promise<void> {
  const db = await getDB()
  await db.put('projects', { ...project, id })
}

/** Retrieve a project by ID */
export async function getProject(id: string): Promise<ProjectFile | null> {
  const db = await getDB()
  const record = await db.get('projects', id)
  if (!record) return null
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...project } = record
  return project as ProjectFile
}

/** List all saved project IDs and names */
export async function listProjects(): Promise<Array<{ id: string; filename: string; updatedAt: string }>> {
  const db = await getDB()
  const all = await db.getAll('projects')
  return all.map((p) => ({
    id: p.id,
    filename: p.document.filename,
    updatedAt: p.updatedAt,
  }))
}
