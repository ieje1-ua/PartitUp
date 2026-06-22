import sharp from 'sharp'
import path from 'path'
import os from 'os'

// Audiveris ships its own adaptive (Sauvola) binarization tuned for music
// scores, so the job here is NOT to binarize — doing so destroys information
// (e.g. the thin rings of hollow half/whole noteheads) that its filter relies
// on. We only hand it a clean grayscale image at a sensible size.
//
// Width is capped for memory safety on small hosts (Railway free tier
// OOM-kills Audiveris on very large pages) and floored so tiny screenshots get
// enough resolution for the staff interline Audiveris needs.
const MAX_WIDTH = 2800
const MIN_WIDTH = 2200

export async function preprocessImage(inputPath: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `omr-processed-${Date.now()}.png`)

  const meta = await sharp(inputPath).metadata()
  const sourceWidth = meta.width ?? MAX_WIDTH

  let pipeline = sharp(inputPath).grayscale().normalize()

  if (sourceWidth > MAX_WIDTH) {
    // Downscale large/high-DPI renders; supersamples for cleaner edges.
    pipeline = pipeline.resize({ width: MAX_WIDTH })
  } else if (sourceWidth < MIN_WIDTH) {
    // Upscale small screenshots so the staff interline is large enough.
    pipeline = pipeline.resize({ width: MIN_WIDTH, kernel: 'lanczos3' })
  }

  await pipeline.withMetadata({ density: 300 }).png().toFile(outputPath)

  return outputPath
}
