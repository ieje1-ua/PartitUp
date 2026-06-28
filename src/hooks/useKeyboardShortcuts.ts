import { useEffect } from 'react'
import { useCorrectionStore } from '../stores/correctionStore'
import { useScoreStore } from '../stores/scoreStore'

export function useKeyboardShortcuts() {
  const undo = useCorrectionStore((s) => s.undo)
  const redo = useCorrectionStore((s) => s.redo)
  const clearSelection = useCorrectionStore((s) => s.clearSelection)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const score = useScoreStore.getState()
      const hasSelection = useCorrectionStore.getState().selectedNoteIds.size > 0

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        // Undo a note edit if any, otherwise undo a voice reassignment.
        if (score.editUndo.length > 0) score.undoEdit()
        else undo()
        return
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        redo()
        return
      }
      if (e.key === 'Escape') {
        clearSelection()
        return
      }

      // Note correction (Fase D) — only when notes are selected.
      if (!hasSelection) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        score.nudgeSelectedNotes(e.shiftKey ? 7 : 1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        score.nudgeSelectedNotes(e.shiftKey ? -7 : -1)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        score.deleteSelectedNotes()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        score.addNotesFromSelectedRests()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, clearSelection])
}
