import sharp from 'sharp'
import path from 'path'
import os from 'os'

// Width fed to Audiveris. High enough that staff interlines land in the
// ~16-22px sweet spot, but capped so the image stays within the memory limits
// of small hosts — Railway's free tier OOM-kills Audiveris on very large pages.
//
// PDF pages are rendered at high DPI and then DOWNSCALED to this width, which
// supersamples the result for cleaner, rounder noteheads before binarization.
const TARGET_WIDTH = 2600

export async function preprocessImage(inputPath: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `omr-processed-${Date.now()}.png`)

  await sharp(inputPath)
    .grayscale()
    // Normalize every input to a fixed width: upscale small screenshots,
    // downscale high-DPI renders. Keeps Audiveris memory bounded and
    // supersamples big inputs for cleaner edges.
    .resize({ width: TARGET_WIDTH })
    .normalize()
    // Median filter removes speckle without blurring edges — keeps staff lines
    // thin and noteheads round through binarization.
    .median(3)
    .sharpen({ sigma: 1.5 })
    // Binarize to pure B&W so noteheads don't merge into staff lines in the
    // grey zone. Audiveris re-binarizes internally but a clean threshold image
    // removes ambiguity.
    .threshold(160)
    .withMetadata({ density: 300 })
    .png()
    .toFile(outputPath)

  return outputPath
}
