import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

const execFileAsync = promisify(execFile)

const AUDIVERIS_CMD = process.env.AUDIVERIS_CMD || 'audiveris'

export async function processWithAudiveris(imagePaths: string[]): Promise<string> {
  const outputDir = path.join(os.tmpdir(), `audiveris-output-${Date.now()}`)
  await fs.mkdir(outputDir, { recursive: true })

  try {
    for (const imagePath of imagePaths) {
      await execFileAsync(AUDIVERIS_CMD, [
        '-batch',
        '-export',
        '-output', outputDir,
        imagePath,
      ], {
        timeout: 120_000,
      })
    }

    const files = await fs.readdir(outputDir, { recursive: true })
    const mxlFile = files.find((f) =>
      typeof f === 'string' && (f.endsWith('.mxl') || f.endsWith('.xml') || f.endsWith('.musicxml'))
    )

    if (!mxlFile) {
      throw new Error('Audiveris no generó archivo MusicXML. La imagen puede no contener notación musical reconocible.')
    }

    const musicXml = await fs.readFile(path.join(outputDir, mxlFile as string), 'utf-8')
    return musicXml
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {})
  }
}
