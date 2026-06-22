import sharp from 'sharp'
import path from 'path'
import os from 'os'

// Audiveris needs an interline (gap between staff lines) of ~16-22px and clean
// contrast between noteheads and staff lines. Screenshots and low-DPI scans
// rarely meet that bar, so we aggressively upscale and binarize.
const TARGET_WIDTH = 3600
const MAX_WIDTH = 5000

export async function preprocessImage(inputPath: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `omr-processed-${Date.now()}.png`)

  const meta = await sharp(inputPath).metadata()
  const sourceWidth = meta.width ?? TARGET_WIDTH

  const resizeWidth =
    sourceWidth < TARGET_WIDTH ? TARGET_WIDTH : Math.min(sourceWidth, MAX_WIDTH)

  await sharp(inputPath)
    .grayscale()
    .resize({ width: resizeWidth, kernel: 'lanczos3' })
    .normalize()
    // Median filter removes speckle noise without blurring edges — important
    // for keeping staff lines thin and noteheads round after binarization.
    .median(3)
    .sharpen({ sigma: 1.5 })
    // Binarize to pure B&W. Audiveris does its own binarization internally but
    // starting from a clean threshold image avoids grey-zone ambiguity where
    // noteheads merge into staff lines or background texture is picked up as
    // notation.
    .threshold(160)
    .withMetadata({ density: 300 })
    .png()
    .toFile(outputPath)

  return outputPath
}
