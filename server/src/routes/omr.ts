import { Router } from 'express'
import multer from 'multer'
import { processWithOmr } from '../services/audiveris.js'
import { preprocessImage } from '../services/imagePreprocess.js'
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
  let processedPath: string | null = null

  try {
    let inputPath: string
    const isPdf = ext === '.pdf'

    if (isPdf) {
      processedPath = filePath + '.pdf'
      await fs.rename(filePath, processedPath)
      inputPath = processedPath
    } else {
      processedPath = await preprocessImage(filePath)
      inputPath = processedPath
    }

    const musicXml = await processWithOmr(inputPath, isPdf)

    res.json({ status: 'success', musicXml })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error procesando el archivo'
    res.status(500).json({ status: 'error', message })
  } finally {
    await fs.unlink(filePath).catch(() => {})
    if (processedPath) await fs.unlink(processedPath).catch(() => {})
  }
})
