import { create } from 'zustand'

interface CorrectionOp {
  noteIds: string[]
  fromVoiceIndex: number
  toVoiceIndex: number
}

interface CorrectionState {
  selectedNoteIds: Set<string>
  undoStack: CorrectionOp[]
  redoStack: CorrectionOp[]
  isSelecting: boolean

  selectNote: (noteId: string, addToSelection: boolean) => void
  selectNotes: (noteIds: string[]) => void
  clearSelection: () => void
  setSelecting: (selecting: boolean) => void
  pushCorrection: (op: CorrectionOp) => void
  undo: () => CorrectionOp | null
  redo: () => CorrectionOp | null
  reset: () => void
}

export const useCorrectionStore = create<CorrectionState>((set, get) => ({
  selectedNoteIds: new Set<string>(),
  undoStack: [],
  redoStack: [],
  isSelecting: false,

  selectNote: (noteId: string, addToSelection: boolean) => {
    const current = get().selectedNoteIds
    const next = new Set(addToSelection ? current : [])
    if (next.has(noteId)) {
      next.delete(noteId)
    } else {
      next.add(noteId)
    }
    set({ selectedNoteIds: next })
  },

  selectNotes: (noteIds: string[]) => {
    set({ selectedNoteIds: new Set(noteIds) })
  },

  clearSelection: () => {
    set({ selectedNoteIds: new Set() })
  },

  setSelecting: (selecting: boolean) => {
    set({ isSelecting: selecting })
  },

  pushCorrection: (op: CorrectionOp) => {
    set((state) => ({
      undoStack: [...state.undoStack, op],
      redoStack: [],
    }))
  },

  undo: () => {
    const { undoStack } = get()
    if (undoStack.length === 0) return null
    const op = undoStack[undoStack.length - 1]
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, op],
    }))
    return op
  },

  redo: () => {
    const { redoStack } = get()
    if (redoStack.length === 0) return null
    const op = redoStack[redoStack.length - 1]
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, op],
    }))
    return op
  },

  reset: () => {
    set({
      selectedNoteIds: new Set(),
      undoStack: [],
      redoStack: [],
      isSelecting: false,
    })
  },
}))
