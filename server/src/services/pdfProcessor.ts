import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import sharp from 'sharp'

const execFileAsync = promisify(execFile)

export async function extractPdfPages(pdfPath: string): Promise<string[]> {
  const outputDir = path.join(os.tmpdir(), `pdf-pages-${Date.now()}`)
  await fs.mkdir(outputDir, { recursive: true })

  try {
    await execFileAsync('pdftoppm', [
      '-png',
      '-r', '300',
      pdfPath,
      path.join(outputDir, 'page'),
    ])
  } catch {
    const singleOutput = path.join(outputDir, 'page-fallback.png')
    await sharp(pdfPath)
      .png()
      .toFile(singleOutput)
    return [singleOutput]
  }

  const files = await fs.readdir(outputDir)
  const pageFiles = files
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(outputDir, f))

  if (pageFiles.length === 0) {
    throw new Error('No se pudieron extraer páginas del PDF')
  }

  return pageFiles
}
