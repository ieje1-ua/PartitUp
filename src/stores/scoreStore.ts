import { create } from 'zustand'
import { loadScore, renderPage, getMei, renderFromMei } from '../lib/verovio/scoreRenderer'
import { detectFileType, type FileInputType } from '../types/score'
import { processImageOMR } from '../lib/omr/omrClient'
import { transposeNotesDiatonic, deleteNotesToRests, restsToNotes } from '../lib/musicxml/meiNoteEditor'
import { useCorrectionStore } from './correctionStore'
import { usePlaybackStore } from './playbackStore'

interface ScoreState {
  musicXml: string | null
  svgContent: string | null
  midiBase64: string | null
  pageCount: number
  currentPage: number
  isLoading: boolean
  error: string | null
  fileName: string | null

  // Manual note correction (Fase D): editable MEI model + undo history.
  editedMei: string | null
  editUndo: string[]

  loadFile: (file: File) => Promise<void>
  loadMusicXml: (xml: string, name?: string) => Promise<void>
  goToPage: (page: number) => Promise<void>
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  nudgeSelectedNotes: (deltaSteps: number) => Promise<void>
  deleteSelectedNotes: () => Promise<void>
  addNotesFromSelectedRests: () => Promise<void>
  undoEdit: () => Promise<void>
  reset: () => void
}

function extractFifths(musicXml: string | null): number {
  const m = musicXml?.match(/<fifths>\s*(-?\d+)\s*<\/fifths>/)
  return m ? parseInt(m[1], 10) : 0
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
  editedMei: null,
  editUndo: [],

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

  nudgeSelectedNotes: async (deltaSteps: number) => {
    await applyEdit(get, set, (mei, ids) =>
      transposeNotesDiatonic(mei, ids, deltaSteps, extractFifths(get().musicXml))
    )
  },

  deleteSelectedNotes: async () => {
    await applyEdit(get, set, (mei, ids) => deleteNotesToRests(mei, ids))
  },

  addNotesFromSelectedRests: async () => {
    await applyEdit(get, set, (mei, ids) =>
      restsToNotes(mei, ids, extractFifths(get().musicXml))
    )
  },

  undoEdit: async () => {
    const { editUndo, currentPage } = get()
    if (editUndo.length === 0) return
    const prev = editUndo[editUndo.length - 1]
    const { svg, midi, pageCount } = renderFromMei(prev, currentPage)
    set({
      editedMei: prev,
      editUndo: editUndo.slice(0, -1),
      svgContent: svg,
      midiBase64: midi,
      pageCount,
    })
    await usePlaybackStore.getState().reloadMidi(midi)
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
      editedMei: null,
      editUndo: [],
    })
  },
}))

// Apply an MEI edit to the currently selected notes, re-render score + audio,
// and record the previous MEI for undo. No-op when nothing is selected.
async function applyEdit(
  get: () => ScoreState,
  set: (partial: Partial<ScoreState>) => void,
  edit: (mei: string, ids: string[]) => string
): Promise<void> {
  const ids = Array.from(useCorrectionStore.getState().selectedNoteIds)
  if (ids.length === 0) return

  try {
    const baseMei = get().editedMei ?? getMei()
    const newMei = edit(baseMei, ids)
    if (newMei === baseMei) return

    const { svg, midi, pageCount } = renderFromMei(newMei, get().currentPage)
    set({
      editedMei: newMei,
      editUndo: [...get().editUndo, baseMei],
      svgContent: svg,
      midiBase64: midi,
      pageCount,
    })
    await usePlaybackStore.getState().reloadMidi(midi)
  } catch (err) {
    set({ error: err instanceof Error ? err.message : 'Error editando la nota' })
  }
}
