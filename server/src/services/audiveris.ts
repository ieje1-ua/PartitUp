import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { unzipSync, strFromU8 } from 'fflate'

const execFileAsync = promisify(execFile)

const AUDIVERIS_CMD = process.env.AUDIVERIS_CMD || 'audiveris'
// En contenedores sin display, Audiveris necesita un framebuffer virtual.
const USE_XVFB = process.env.USE_XVFB === '1'

function buildCommand(args: string[]): { cmd: string; args: string[] } {
  if (USE_XVFB) {
    return { cmd: 'xvfb-run', args: ['-a', AUDIVERIS_CMD, ...args] }
  }
  return { cmd: AUDIVERIS_CMD, args }
}

export async function processWithAudiveris(inputPath: string): Promise<string> {
  const outputDir = path.join(os.tmpdir(), `audiveris-output-${Date.now()}`)
  await fs.mkdir(outputDir, { recursive: true })

  try {
    const { cmd, args } = buildCommand([
      '-constant', 'org.audiveris.omr.sheet.BookManager.useCompression=false',
      '-batch',
      '-export',
      '-output', outputDir,
      inputPath,
    ])

    await execFileAsync(cmd, args, {
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
    })

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

    throw new Error(
      'Audiveris no generó MusicXML. El archivo puede no contener notación musical reconocible.'
    )
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {})
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

// Un .mxl es un ZIP que contiene el .xml real (referenciado en META-INF/container.xml).
async function extractMxl(mxlPath: string): Promise<string> {
  const buffer = await fs.readFile(mxlPath)
  const entries = unzipSync(new Uint8Array(buffer))

  // Buscar el primer .xml que no esté en META-INF
  for (const [name, data] of Object.entries(entries)) {
    if (name.endsWith('.xml') && !name.startsWith('META-INF')) {
      return strFromU8(data)
    }
  }

  throw new Error('No se encontró MusicXML dentro del archivo .mxl')
}
