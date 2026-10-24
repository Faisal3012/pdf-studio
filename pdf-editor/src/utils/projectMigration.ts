import type { ProjectFile } from '@/types/project.types'
import { PDFEDITOR_FORMAT, PDFEDITOR_VERSION } from '@/types/project.types'

// ─── Project File Migration ────────────────────────────────────────────────────
// Validates the .pdfeditor file format and migrates older versions to current.
// Currently only v1 exists, so this is mostly a validator.
// When v2 is introduced, add a migrateV1ToV2() function here.

export class ProjectMigrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectMigrationError'
  }
}

/**
 * Validate and migrate a parsed .pdfeditor file to the current version.
 * Throws ProjectMigrationError if the file is invalid or from an unknown version.
 */
export function migrateProject(raw: unknown): ProjectFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new ProjectMigrationError('Invalid project file: not an object.')
  }

  const obj = raw as Record<string, unknown>

  // Check format identifier
  if (obj.format !== PDFEDITOR_FORMAT) {
    throw new ProjectMigrationError(
      `Invalid project file: expected format "${PDFEDITOR_FORMAT}", got "${String(obj.format)}".`
    )
  }

  // Check version
  const version = obj.version
  if (typeof version !== 'number') {
    throw new ProjectMigrationError('Invalid project file: missing version number.')
  }

  if (version > PDFEDITOR_VERSION) {
    throw new ProjectMigrationError(
      `This project was saved with a newer version of PDF Editor (v${version}). ` +
        `Please update the app to open it.`
    )
  }

  if (version === 1) {
    return validateV1(obj)
  }

  throw new ProjectMigrationError(`Unknown project file version: ${version}.`)
}

/** Validate the shape of a v1 project file */
function validateV1(obj: Record<string, unknown>): ProjectFile {
  const required = ['format', 'version', 'createdAt', 'updatedAt', 'document', 'pages', 'annotations', 'settings']
  for (const key of required) {
    if (!(key in obj)) {
      throw new ProjectMigrationError(`Invalid project file: missing required field "${key}".`)
    }
  }

  if (!obj.document || typeof obj.document !== 'object') {
    throw new ProjectMigrationError('Invalid project file: "document" must be an object.')
  }

  if (!Array.isArray(obj.pages)) {
    throw new ProjectMigrationError('Invalid project file: "pages" must be an array.')
  }

  if (!Array.isArray(obj.annotations)) {
    throw new ProjectMigrationError('Invalid project file: "annotations" must be an array.')
  }

  // Cast — TypeScript can't validate at runtime beyond these checks
  return obj as unknown as ProjectFile
}
