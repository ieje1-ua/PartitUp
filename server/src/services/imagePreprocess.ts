import sharp from 'sharp'
import path from 'path'
import os from 'os'

export async function preprocessImage(inputPath: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `omr-processed-${Date.now()}.png`)

  await sharp(inputPath)
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: 2480, withoutEnlargement: true })
    .png()
    .toFile(outputPath)

  return outputPath
}
