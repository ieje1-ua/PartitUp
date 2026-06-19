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

export async function processWithAudiveris(imagePaths: string[]): Promise<string> {
  const outputDir = path.join(os.tmpdir(), `audiveris-output-${Date.now()}`)
  await fs.mkdir(outputDir, { recursive: true })

  try {
    for (const imagePath of imagePaths) {
      const { cmd, args } = buildCommand([
        // Exportar MusicXML sin comprimir (.xml en vez de .mxl)
        '-constant', 'org.audiveris.omr.sheet.BookManager.useCompression=false',
        '-batch',
        '-export',
        '-output', outputDir,
        imagePath,
      ])

      await execFileAsync(cmd, args, {
        timeout: 180_000,
        maxBuffer: 10 * 1024 * 1024,
      })
    }

    const files = await fs.readdir(outputDir, { recursive: true })

    // Preferir el .xml sin comprimir; si no, caer al .mxl comprimido.
    const xmlFile = files.find(
      (f) => typeof f === 'string' && (f.endsWith('.xml') || f.endsWith('.musicxml'))
    )
    if (xmlFile) {
      return await fs.readFile(path.join(outputDir, xmlFile as string), 'utf-8')
    }

    const mxlFile = files.find((f) => typeof f === 'string' && f.endsWith('.mxl'))
    if (mxlFile) {
      return await extractMxl(path.join(outputDir, mxlFile as string))
    }

    throw new Error(
      'Audiveris no generó MusicXML. La imagen puede no contener notación musical reconocible.'
    )
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {})
  }
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
