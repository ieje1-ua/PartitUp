import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { unzipSync, strFromU8 } from 'fflate'
import { mergeMusicXmlPages } from './musicxmlMerger.js'

const execFileAsync = promisify(execFile)

const AUDIVERIS_CMD = process.env.AUDIVERIS_CMD || 'audiveris'
const USE_XVFB = process.env.USE_XVFB === '1'

function buildCommand(args: string[]): { cmd: string; args: string[] } {
  if (USE_XVFB) {
    return { cmd: 'xvfb-run', args: ['-a', AUDIVERIS_CMD, ...args] }
  }
  return { cmd: AUDIVERIS_CMD, args }
}

// Process a single image through Audiveris and return the MusicXML string.
// Each call is a separate JVM invocation so memory is freed between pages.
async function processOneFile(inputPath: string): Promise<string | null> {
  const outputDir = path.join(os.tmpdir(), `audiveris-output-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  await fs.mkdir(outputDir, { recursive: true })

  try {
    const { cmd, args } = buildCommand([
      '-constant', 'org.audiveris.omr.sheet.BookManager.useCompression=false',
      '-batch',
      '-export',
      '-output', outputDir,
      inputPath,
    ])

    try {
      await execFileAsync(cmd, args, {
        timeout: 180_000,
        maxBuffer: 50 * 1024 * 1024,
      })
    } catch (execErr: unknown) {
      const killed = (execErr as { killed?: boolean }).killed
      const stderr = (execErr as { stderr?: string }).stderr ?? ''
      const stdout = (execErr as { stdout?: string }).stdout ?? ''
      console.error('[audiveris] page failed for', inputPath, 'killed=', killed)
      console.error('[audiveris] stderr tail:', stderr.slice(-2000))
      console.error('[audiveris] stdout tail:', stdout.slice(-2000))

      if (killed) return null

      // Check if partial output was produced
      const files = await fs.readdir(outputDir, { recursive: true })
      const hasOutput = files.some(
        (f) => typeof f === 'string' && (f.endsWith('.xml') || f.endsWith('.mxl') || f.endsWith('.musicxml'))
      )
      if (!hasOutput) return null
    }

    const files = (await fs.readdir(outputDir, { recursive: true }))
      .filter((f): f is string => typeof f === 'string')

    const xmlFiles = files.filter((f) => f.endsWith('.xml') || f.endsWith('.musicxml'))
    if (xmlFiles.length > 0) {
      const largest = await pickLargestFile(outputDir, xmlFiles)
      return await fs.readFile(path.join(outputDir, largest), 'utf-8')
    }

    const mxlFiles = files.filter((f) => f.endsWith('.mxl'))
    if (mxlFiles.length > 0) {
      const largest = await pickLargestFile(outputDir, mxlFiles)
      return await extractMxl(path.join(outputDir, largest))
    }

    return null
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {})
  }
}

// Extract PDF pages to individual PNG images using pdftoppm (poppler-utils).
async function extractPdfPages(pdfPath: string): Promise<string[]> {
  const outputDir = path.join(os.tmpdir(), `pdf-pages-${Date.now()}`)
  await fs.mkdir(outputDir, { recursive: true })

  await execFileAsync('pdftoppm', [
    '-png', '-r', '300',
    pdfPath,
    path.join(outputDir, 'page'),
  ], { timeout: 60_000 })

  const files = await fs.readdir(outputDir)
  return files
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(outputDir, f))
}

// Main entry point: accepts a single image or PDF.
// For PDFs, extracts pages and processes each one separately to avoid OOM.
export async function processWithAudiveris(inputPath: string, isPdf: boolean): Promise<string> {
  if (!isPdf) {
    const result = await processOneFile(inputPath)
    if (result) return result
    throw new Error('Audiveris no pudo procesar la imagen. Verifica que sea una partitura musical legible.')
  }

  // PDF: extract pages, process each one separately to stay within memory limits
  let pageFiles: string[] = []
  try {
    pageFiles = await extractPdfPages(inputPath)
  } catch {
    throw new Error('No se pudieron extraer páginas del PDF.')
  }

  if (pageFiles.length === 0) {
    throw new Error('El PDF no contiene páginas válidas.')
  }

  console.log('[audiveris] PDF has %d pages, processing each separately', pageFiles.length)

  const results: string[] = []
  for (let i = 0; i < pageFiles.length; i++) {
    console.log('[audiveris] processing page %d/%d', i + 1, pageFiles.length)
    const result = await processOneFile(pageFiles[i])
    if (result) {
      results.push(result)
    }
    // Clean up page image immediately to free disk space
    await fs.unlink(pageFiles[i]).catch(() => {})
  }

  // Clean up the pages directory
  if (pageFiles.length > 0) {
    const pagesDir = path.dirname(pageFiles[0])
    await fs.rm(pagesDir, { recursive: true, force: true }).catch(() => {})
  }

  if (results.length === 0) {
    throw new Error('Audiveris no pudo procesar ninguna página del PDF. Puede ser un problema de memoria — intenta con un PDF de menos páginas.')
  }

  if (results.length === 1) return results[0]

  try {
    return mergeMusicXmlPages(results)
  } catch (mergeErr) {
    console.error('[audiveris] merge failed, returning longest page:', mergeErr)
    return results.reduce((best, r) => r.length > best.length ? r : best)
  }
}

async function pickLargestFile(baseDir: string, relativePaths: string[]): Promise<string> {
  if (relativePaths.length === 1) return relativePaths[0]
  let largest = relativePaths[0]
  let maxSize = 0
  for (const rel of relativePaths) {
    const stat = await fs.stat(path.join(baseDir, rel))
    if (stat.size > maxSize) {
      maxSize = stat.size
      largest = rel
    }
  }
  return largest
}

async function extractMxl(mxlPath: string): Promise<string> {
  const buffer = await fs.readFile(mxlPath)
  const entries = unzipSync(new Uint8Array(buffer))

  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith('.xml') && !name.startsWith('META-INF')) {
      return strFromU8(data)
    }
  }

  throw new Error('No se encontró MusicXML dentro del archivo .mxl')
}
