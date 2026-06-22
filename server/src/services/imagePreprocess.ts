import sharp from 'sharp'
import path from 'path'
import os from 'os'

// Audiveris detects staff lines and noteheads by absolute pixel size. It needs
// an interline (gap between staff lines) of roughly 16-22px to work reliably.
// Screenshots and low-DPI scans often come in well below that, which causes
// stacked noteheads (chords, dense inner voices) to be merged or dropped.
//
// To give Audiveris enough resolution we UPSCALE small images instead of
// leaving them as-is. Targeting ~2800px page width puts a typical full-system
// screenshot at a comfortable interline. We cap the upper bound so already
// high-res scans aren't blown up into something unwieldy.
const TARGET_WIDTH = 2800
const MAX_WIDTH = 4200

export async function preprocessImage(inputPath: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `omr-processed-${Date.now()}.png`)

  const meta = await sharp(inputPath).metadata()
  const sourceWidth = meta.width ?? TARGET_WIDTH

  // Upscale anything below the target so noteheads become separable; clamp the
  // top end so huge scans don't explode in size.
  const resizeWidth =
    sourceWidth < TARGET_WIDTH ? TARGET_WIDTH : Math.min(sourceWidth, MAX_WIDTH)

  await sharp(inputPath)
    .grayscale()
    .normalize()
    // lanczos3 keeps note edges crisp when enlarging; resize before sharpening
    // so the sharpen operates on the final resolution.
    .resize({ width: resizeWidth, kernel: 'lanczos3' })
    .sharpen()
    // Tell Audiveris the page is 300 DPI so its scale defaults line up with the
    // upscaled pixel dimensions.
    .withMetadata({ density: 300 })
    .png()
    .toFile(outputPath)

  return outputPath
}
