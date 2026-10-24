import { inflate, deflate } from 'pako'
import {
  PDFDocument,
  PDFFont,
  PDFName,
  PDFArray,
  PDFRawStream,
  StandardFonts,
  rgb,
  degrees,
} from 'pdf-lib'
import type { ExistingTextEdit } from '@/types/existingText.types'

/**
 * Escapes characters for PDF literal strings (e.g., \( \))
 */
export function escapePdfString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
}

/**
 * Converts a string to hexadecimal representation format <48656C6C6F>
 */
export function stringToPdfHex(str: string): string {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) & 0xff
    hex += code.toString(16).padStart(2, '0').toUpperCase()
  }
  return hex
}

/**
 * Parses hex string back to ascii/utf-8 characters
 */
export function hexToString(hex: string): string {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, '')
  let str = ''
  for (let i = 0; i < clean.length; i += 2) {
    str += String.fromCharCode(parseInt(clean.substring(i, i + 2), 16))
  }
  return str
}

/**
 * Safely decodes a PDF stream's content bytes handling FlateDecode compression.
 */
export function decodePdfStream(stream: PDFRawStream): Uint8Array {
  const rawBytes = stream.getContents()
  const dict = stream.dict
  const filter = dict.get(PDFName.of('Filter'))

  const isFlate =
    filter === PDFName.of('FlateDecode') ||
    (filter instanceof PDFArray &&
      filter.asArray().some((f) => f === PDFName.of('FlateDecode')))

  if (isFlate) {
    try {
      return inflate(rawBytes)
    } catch {
      // Return raw bytes if decompression fails
      return rawBytes
    }
  }

  return rawBytes
}

/**
 * Parses RGB hex '#rrggbb' to pdf-lib rgb(r, g, b)
 */
export function parseColorToRgb(colorHex: string) {
  const clean = (colorHex || '#000000').replace('#', '')
  const r = parseInt(clean.substring(0, 2) || '00', 16) / 255
  const g = parseInt(clean.substring(2, 4) || '00', 16) / 255
  const b = parseInt(clean.substring(4, 6) || '00', 16) / 255
  return rgb(r, g, b)
}

/**
 * Maps font family name and styles to StandardFonts
 */
export function resolveStandardFont(family: string, isBold: boolean, isItalic: boolean): StandardFonts {
  const lower = (family || '').toLowerCase()
  if (lower.includes('times') || lower.includes('serif')) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic
    if (isBold) return StandardFonts.TimesRomanBold
    if (isItalic) return StandardFonts.TimesRomanItalic
    return StandardFonts.TimesRoman
  }
  if (lower.includes('courier') || lower.includes('mono')) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique
    if (isBold) return StandardFonts.CourierBold
    if (isItalic) return StandardFonts.CourierOblique
    return StandardFonts.Courier
  }
  // Default to Helvetica
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique
  if (isBold) return StandardFonts.HelveticaBold
  if (isItalic) return StandardFonts.HelveticaOblique
  return StandardFonts.Helvetica
}

/**
 * Parses items inside a TJ array: string literals, hex strings, and numbers.
 */
interface TjItem {
  raw: string
  type: 'literal' | 'hex' | 'num'
  decoded: string
}

function parseTjArrayItems(innerArrayContent: string): TjItem[] {
  const items: TjItem[] = []
  let i = 0
  const len = innerArrayContent.length

  while (i < len) {
    const ch = innerArrayContent[i]

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      i++
      continue
    }

    // Literal string: ( ... )
    if (ch === '(') {
      let parenCount = 1
      const start = i
      i++
      let literal = ''
      while (i < len && parenCount > 0) {
        if (innerArrayContent[i] === '\\' && i + 1 < len) {
          const next = innerArrayContent[i + 1]
          if (next === '(' || next === ')' || next === '\\') {
            literal += next
          } else if (next === 'r') {
            literal += '\r'
          } else if (next === 'n') {
            literal += '\n'
          } else {
            literal += next
          }
          i += 2
          continue
        }
        if (innerArrayContent[i] === '(') parenCount++
        if (innerArrayContent[i] === ')') parenCount--
        if (parenCount > 0) {
          literal += innerArrayContent[i]
        }
        i++
      }
      const raw = innerArrayContent.substring(start, i)
      items.push({ raw, type: 'literal', decoded: literal })
      continue
    }

    // Hex string: < ... >
    if (ch === '<') {
      const start = i
      i++
      while (i < len && innerArrayContent[i] !== '>') {
        i++
      }
      if (i < len && innerArrayContent[i] === '>') i++
      const raw = innerArrayContent.substring(start, i)
      const hexBody = raw.replace(/[<>\s]/g, '')
      items.push({ raw, type: 'hex', decoded: hexToString(hexBody) })
      continue
    }

    // Number or other token
    const start = i
    while (i < len && !' \t\r\n(<'.includes(innerArrayContent[i])) {
      i++
    }
    const raw = innerArrayContent.substring(start, i)
    items.push({ raw, type: 'num', decoded: '' })
  }

  return items
}

/**
 * Redacts a text target from a raw content stream string.
 * Supports:
 * 1. Direct (targetText) Tj
 * 2. Hex <targetHex> Tj
 * 3. Exact (targetText) inside TJ array
 * 4. Hex <targetHex> inside TJ array
 * 5. Split/kerned text across consecutive items in a TJ array: [ (P) -2 (a) 1 (g) (e) ] TJ
 */
export function redactTextFromContentStream(
  content: string,
  targetText: string
): { modifiedContent: string; redacted: boolean } {
  if (!targetText || targetText.length === 0) {
    return { modifiedContent: content, redacted: false }
  }

  let modifiedContent = content
  let redacted = false

  // 1. Literal representation: (targetText) Tj
  const escaped = escapePdfString(targetText)
  const literalPattern = new RegExp(`\\(${escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*Tj`, 'g')
  if (literalPattern.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(literalPattern, '() Tj')
    redacted = true
  }

  // 2. Hex representation: <HEX> Tj
  const hex = stringToPdfHex(targetText)
  const hexPattern = new RegExp(`<${hex}>\\s*Tj`, 'gi')
  if (hexPattern.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(hexPattern, '<> Tj')
    redacted = true
  }

  // 3. Exact literal inside TJ array
  const escapedInTJ = new RegExp(`\\(${escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g')
  if (escapedInTJ.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(escapedInTJ, '()')
    redacted = true
  }

  // 4. Exact hex inside TJ array
  const hexInTJ = new RegExp(`<${hex}>`, 'gi')
  if (hexInTJ.test(modifiedContent)) {
    modifiedContent = modifiedContent.replace(hexInTJ, '<>')
    redacted = true
  }

  // 5. Advanced TJ array parsing for kerned/split character sequences
  const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g
  modifiedContent = modifiedContent.replace(tjArrayRegex, (fullMatch, innerArray) => {
    const items = parseTjArrayItems(innerArray)
    const textItems = items.filter((it) => it.type === 'literal' || it.type === 'hex')
    if (textItems.length === 0) return fullMatch

    const concatenated = textItems.map((it) => it.decoded).join('')
    const matchIndex = concatenated.indexOf(targetText)
    if (matchIndex === -1) {
      return fullMatch
    }

    // Found match within concatenated TJ text items
    const matchEnd = matchIndex + targetText.length
    let cursor = 0
    let newInner = ''

    for (const item of items) {
      if (item.type === 'num') {
        newInner += (newInner.length > 0 ? ' ' : '') + item.raw
        continue
      }

      const itemStart = cursor
      const itemEnd = cursor + item.decoded.length
      cursor = itemEnd

      // Check overlap between [itemStart, itemEnd) and [matchIndex, matchEnd)
      if (itemEnd <= matchIndex || itemStart >= matchEnd) {
        // Outside match -> keep item untouched
        newInner += (newInner.length > 0 ? ' ' : '') + item.raw
      } else if (itemStart >= matchIndex && itemEnd <= matchEnd) {
        // Entirely inside match -> replace with empty string
        newInner += (newInner.length > 0 ? ' ' : '') + (item.type === 'hex' ? '<>' : '()')
        redacted = true
      } else {
        // Partial overlap: trim the part overlapping match
        let remaining = ''
        for (let cIdx = itemStart; cIdx < itemEnd; cIdx++) {
          if (cIdx < matchIndex || cIdx >= matchEnd) {
            remaining += item.decoded[cIdx - itemStart]
          }
        }
        if (item.type === 'hex') {
          newInner += (newInner.length > 0 ? ' ' : '') + `<${stringToPdfHex(remaining)}>`
        } else {
          newInner += (newInner.length > 0 ? ' ' : '') + `(${escapePdfString(remaining)})`
        }
        redacted = true
      }
    }

    return `[${newInner}] TJ`
  })

  return { modifiedContent, redacted }
}

export interface ApplyTextEditsResult {
  totalEditsApplied: number
  redactedCount: number
  unredactedCount: number
  unredactedDetails: string[]
}

/**
 * Applies all true existing-text edits directly to a PDFDocument instance:
 * 1. For each page with edits:
 *    - In the underlying content streams, locates and redacts the original text strings so they cannot be extracted.
 *    - Injects vector background cover path at the exact coordinate matching page/cell background to eliminate duplicate/ghost text.
 *    - Inserts the new replacement text using the original font family, size, coordinates, baseline, rotation, and color.
 *    - Automatically fits/scales font size if replacement text is longer than original width.
 */
export async function applyExistingTextEditsToPdfDoc(
  pdfDoc: PDFDocument,
  editsByPage: Record<number, ExistingTextEdit[]>
): Promise<ApplyTextEditsResult> {
  let totalEditsApplied = 0
  let redactedCount = 0
  const unredactedDetails: string[] = []

  const fontCache = new Map<StandardFonts, PDFFont>()
  const getFont = async (fontEnum: StandardFonts): Promise<PDFFont> => {
    if (!fontCache.has(fontEnum)) {
      fontCache.set(fontEnum, await pdfDoc.embedFont(fontEnum))
    }
    return fontCache.get(fontEnum)!
  }

  for (const [pageIdxStr, edits] of Object.entries(editsByPage)) {
    const pageIndex = Number(pageIdxStr)
    if (!edits || edits.length === 0 || pageIndex >= pdfDoc.getPageCount()) {
      continue
    }

    const page = pdfDoc.getPage(pageIndex)
    const contentsRefOrArray = page.node.get(PDFName.of('Contents'))

    // Collect all stream objects for this page
    const streamObjs: PDFRawStream[] = []
    const resolvedContents = contentsRefOrArray ? pdfDoc.context.lookup(contentsRefOrArray) : null

    if (resolvedContents instanceof PDFArray) {
      for (let i = 0; i < resolvedContents.size(); i++) {
        const item = resolvedContents.get(i)
        const obj = pdfDoc.context.lookup(item)
        if (obj instanceof PDFRawStream) {
          streamObjs.push(obj)
        }
      }
    } else if (resolvedContents instanceof PDFRawStream) {
      streamObjs.push(resolvedContents)
    }

    // Step 1: True content-stream redaction (for native PDF text)
    for (const edit of edits) {
      let editRedacted = false

      if (!edit.isScannedFallback) {
        for (const streamObj of streamObjs) {
          const decodedBytes = decodePdfStream(streamObj)
          const contentStr = new TextDecoder('latin1').decode(decodedBytes)
          const { modifiedContent, redacted } = redactTextFromContentStream(contentStr, edit.originalText)

          if (redacted) {
            // Recompress and assign back into stream
            const modifiedBytes = new TextEncoder().encode(modifiedContent)
            const deflated = deflate(modifiedBytes)
            streamObj.dict.set(PDFName.of('Filter'), PDFName.of('FlateDecode'))
            streamObj.dict.set(PDFName.of('Length'), pdfDoc.context.obj(deflated.length))
            const rawStream = streamObj as unknown as { contents: Uint8Array }
            rawStream.contents = deflated
            redactedCount++
            editRedacted = true
          }
        }

        if (!editRedacted) {
          unredactedDetails.push(
            `Page ${pageIndex + 1}: "${edit.originalText.substring(0, 30)}" (custom encoding or complex TJ structure)`
          )
        }
      }

      // Step 2: Visual background clean up
      // Compute accurate bounding box:
      // In PDF coordinates, pdfY is the baseline.
      // Font descent is approx 0.22 * fontSize below baseline.
      // Total height is approx 1.05 * fontSize.
      const currentFontSize = edit.fontSize || 12
      const descent = Math.round(currentFontSize * 0.22)
      const rectHeight = Math.max(edit.height, Math.round(currentFontSize * 1.05))
      const rectY = edit.pdfY - descent
      const rectX = edit.pdfX
      const rectWidth = Math.max(edit.width, 10)

      // Background color: use sampled or specified backgroundColor if available, otherwise pure white rgb(1,1,1)
      const bgRgb = edit.backgroundColor ? parseColorToRgb(edit.backgroundColor) : rgb(1, 1, 1)

      page.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        color: bgRgb,
        borderWidth: 0,
        rotate: degrees(edit.rotation || 0),
      })

      // Step 3: Insert replacement text with original formatting
      const standardFontEnum = resolveStandardFont(edit.fontFamily, edit.isBold, edit.isItalic)
      const font = await getFont(standardFontEnum)

      // Measure text width and scale if longer than original space
      const textToDraw = edit.replacementText
      const originalWidth = edit.width
      let drawFontSize = edit.adjustedFontSize || edit.fontSize || 12
      let measuredWidth = font.widthOfTextAtSize(textToDraw, drawFontSize)

      // If replacement text is wider than original space, adjust font size down
      // unless fitMode is explicitly set to 'expand'
      if (edit.fitMode !== 'expand' && measuredWidth > originalWidth * 1.02 && originalWidth > 10) {
        const scaleFactor = originalWidth / measuredWidth
        drawFontSize = Math.max(7, Math.round(drawFontSize * scaleFactor * 10) / 10)
        measuredWidth = font.widthOfTextAtSize(textToDraw, drawFontSize)
      }

      const fontRgb = parseColorToRgb(edit.color)

      page.drawText(textToDraw, {
        x: edit.pdfX,
        y: edit.pdfY,
        size: drawFontSize,
        font,
        color: fontRgb,
        rotate: degrees(edit.rotation || 0),
      })

      totalEditsApplied++
    }
  }

  return {
    totalEditsApplied,
    redactedCount,
    unredactedCount: unredactedDetails.length,
    unredactedDetails,
  }
}
