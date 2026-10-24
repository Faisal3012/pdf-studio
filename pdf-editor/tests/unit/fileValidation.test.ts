import { describe, it, expect } from 'vitest'
import { validateFileSync, validatePDFHeader, MAX_FILE_SIZE_BYTES } from '@/utils/fileValidation'

// Helper to create a mock File
function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes).fill(0)
  return new File([content], name, { type })
}

// Helper to create a File with specific byte content
function makeFileWithBytes(name: string, type: string, bytes: number[]): File {
  return new File([new Uint8Array(bytes)], name, { type })
}

describe('validateFileSync', () => {
  it('accepts a valid PDF file', () => {
    const file = makeFile('document.pdf', 'application/pdf', 1000)
    expect(validateFileSync(file).valid).toBe(true)
  })

  it('rejects non-.pdf extension', () => {
    const file = makeFile('image.png', 'application/pdf', 1000)
    const result = validateFileSync(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid-extension')
    expect(result.message).toContain('.pdf')
  })

  it('rejects wrong MIME type', () => {
    const file = makeFile('document.pdf', 'image/png', 1000)
    const result = validateFileSync(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid-mime')
  })

  it('accepts empty MIME type (some OS do not set it)', () => {
    // When type is empty string, MIME check should be skipped
    const file = makeFile('document.pdf', '', 1000)
    expect(validateFileSync(file).valid).toBe(true)
  })

  it('rejects file exceeding size limit', () => {
    const file = makeFile('big.pdf', 'application/pdf', MAX_FILE_SIZE_BYTES + 1)
    const result = validateFileSync(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('file-too-large')
    expect(result.message).toContain('MB')
  })

  it('accepts file exactly at size limit', () => {
    const file = makeFile('exact.pdf', 'application/pdf', MAX_FILE_SIZE_BYTES)
    expect(validateFileSync(file).valid).toBe(true)
  })
})

describe('validatePDFHeader', () => {
  it('accepts a file starting with %PDF- magic bytes', async () => {
    // %PDF- = 0x25 0x50 0x44 0x46 0x2D
    const file = makeFileWithBytes('valid.pdf', 'application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2D, 0, 0, 0])
    const result = await validatePDFHeader(file)
    expect(result.valid).toBe(true)
  })

  it('rejects a file without %PDF- magic bytes', async () => {
    const file = makeFileWithBytes('fake.pdf', 'application/pdf', [0x00, 0x01, 0x02, 0x03, 0x04])
    const result = await validatePDFHeader(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid-pdf-header')
  })

  it('rejects a file that looks like a PNG (wrong magic bytes)', async () => {
    // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D
    const file = makeFileWithBytes('image.pdf', 'application/pdf', [0x89, 0x50, 0x4E, 0x47, 0x0D])
    const result = await validatePDFHeader(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('invalid-pdf-header')
  })
})
