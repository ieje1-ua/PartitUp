import { create } from 'zustand'
import { loadScore, renderPage } from '../lib/verovio/scoreRenderer'
import { detectFileType, type FileInputType } from '../types/score'
import { processImageOMR } from '../lib/omr/omrClient'

interface ScoreState {
  musicXml: string | null
  svgContent: string | null
  midiBase64: string | null
  pageCount: number
  currentPage: number
  isLoading: boolean
  error: string | null
  fileName: string | null

  loadFile: (file: File) => Promise<void>
  loadMusicXml: (xml: string, name?: string) => Promise<void>
  goToPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  reset: () => void
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  musicXml: null,
  svgContent: null,
  midiBase64: null,
  pageCount: 0,
  currentPage: 1,
  isLoading: false,
  error: null,
  fileName: null,

  loadFile: async (file: File) => {
    set({ isLoading: true, error: null, fileName: file.name })
    try {
      const fileType: FileInputType = detectFileType(file)

      let xml: string
      if (fileType === 'musicxml') {
        xml = await readFileAsText(file)
      } else if (fileType === 'image' || fileType === 'pdf') {
        const result = await processImageOMR(file)
        if (result.status === 'error') {
          throw new Error(result.message || 'Error procesando la partitura')
        }
        xml = result.musicXml
      } else {
        throw new Error('Formato MIDI aún no soportado. Sube un archivo MusicXML, imagen o PDF.')
      }

      await get().loadMusicXml(xml, file.name)
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      })
    }
  },

  loadMusicXml: async (xml: string, name?: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await loadScore(xml)
      set({
        musicXml: xml,
        svgContent: result.svg,
        midiBase64: result.midi,
        pageCount: result.pageCount,
        currentPage: 1,
        isLoading: false,
        fileName: name ?? get().fileName,
      })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Error cargando la partitura',
      })
    }
  },

  goToPage: async (page: number) => {
    const { pageCount } = get()
    if (page < 1 || page > pageCount) return
    const svg = await renderPage(page)
    set({ svgContent: svg, currentPage: page })
  },

  nextPage: async () => {
    const { currentPage, pageCount } = get()
    if (currentPage < pageCount) {
      await get().goToPage(currentPage + 1)
    }
  },

  prevPage: async () => {
    const { currentPage } = get()
    if (currentPage > 1) {
      await get().goToPage(currentPage - 1)
    }
  },

  reset: () => {
    set({
      musicXml: null,
      svgContent: null,
      midiBase64: null,
      pageCount: 0,
      currentPage: 1,
      isLoading: false,
      error: null,
      fileName: null,
    })
  },
}))
