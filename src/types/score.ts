export interface PartitUpScore {
  raw: string
  pageCount: number
  currentPage: number
}

export interface ScoreMetadata {
  title: string
  composer: string
  partNames: string[]
  detectedVoiceCount: number
}

export type FileInputType = 'musicxml' | 'image' | 'pdf' | 'midi'

export function detectFileType(file: File): FileInputType {
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  if (['xml', 'mxl', 'musicxml'].includes(ext)) return 'musicxml'
  if (['mid', 'midi'].includes(ext)) return 'midi'
  if (ext === 'pdf') return 'pdf'
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'tif'].includes(ext)) return 'image'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type === 'application/pdf') return 'pdf'
  return 'musicxml'
}
