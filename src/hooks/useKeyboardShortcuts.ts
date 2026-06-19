import { useEffect } from 'react'
import { useCorrectionStore } from '../stores/correctionStore'

export function useKeyboardShortcuts() {
  const undo = useCorrectionStore((s) => s.undo)
  const redo = useCorrectionStore((s) => s.redo)
  const clearSelection = useCorrectionStore((s) => s.clearSelection)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        redo()
      }
      if (e.key === 'Escape') {
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, clearSelection])
}
