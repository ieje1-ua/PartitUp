import { Router } from 'express'
import multer from 'multer'
import { processWithAudiveris } from '../services/audiveris.js'
import { preprocessImage } from '../services/imagePreprocess.js'
import { extractPdfPages } from '../services/pdfProcessor.js'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif', '.pdf']
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`Formato no soportado: ${ext}`))
    }
  },
})

export const omrRouter = Router()

omrRouter.post('/omr', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ status: 'error', message: 'No se proporcionó archivo' })
    return
  }

  const filePath = req.file.path
  const ext = path.extname(req.file.originalname).toLowerCase()

  try {
    let imagePaths: string[]

    if (ext === '.pdf') {
      imagePaths = await extractPdfPages(filePath)
    } else {
      const processed = await preprocessImage(filePath)
      imagePaths = [processed]
    }

    const musicXml = await processWithAudiveris(imagePaths)

    for (const p of imagePaths) {
      await fs.unlink(p).catch(() => {})
    }
    await fs.unlink(filePath).catch(() => {})

    res.json({ status: 'success', musicXml })
  } catch (err) {
    await fs.unlink(filePath).catch(() => {})
    const message = err instanceof Error ? err.message : 'Error procesando la imagen'
    res.status(500).json({ status: 'error', message })
  }
})
