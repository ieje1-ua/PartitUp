import { useEffect, useCallback, useRef } from 'react'
import { useCorrectionStore } from '../../stores/correctionStore'

interface NoteInteractionProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function NoteInteraction({ containerRef }: NoteInteractionProps) {
  const selectNote = useCorrectionStore((s) => s.selectNote)
  const selectNotes = useCorrectionStore((s) => s.selectNotes)
  const selectedNoteIds = useCorrectionStore((s) => s.selectedNoteIds)
  const lassoRef = useRef<{ startX: number; startY: number; el: HTMLDivElement } | null>(null)

  const handleNoteClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as SVGElement
      const noteEl = target.closest('[id^="note-"], [id*="note"]') as SVGElement | null
      if (!noteEl?.id) return

      e.preventDefault()
      e.stopPropagation()
      selectNote(noteEl.id, e.ctrlKey || e.metaKey || e.shiftKey)
    },
    [selectNote]
  )

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Element
      if (target.closest('[id^="note-"], [id*="note"]')) return

      const container = containerRef.current
      if (!container) return

      const lasso = document.createElement('div')
      lasso.style.cssText = `
        position: fixed;
        border: 2px dashed #3498db;
        background: rgba(52, 152, 219, 0.1);
        pointer-events: none;
        z-index: 1000;
      `
      document.body.appendChild(lasso)
      lassoRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        el: lasso,
      }
    },
    [containerRef]
  )

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const lasso = lassoRef.current
    if (!lasso) return

    const x = Math.min(lasso.startX, e.clientX)
    const y = Math.min(lasso.startY, e.clientY)
    const w = Math.abs(e.clientX - lasso.startX)
    const h = Math.abs(e.clientY - lasso.startY)

    lasso.el.style.left = `${x}px`
    lasso.el.style.top = `${y}px`
    lasso.el.style.width = `${w}px`
    lasso.el.style.height = `${h}px`
  }, [])

  const handleMouseUp = useCallback(() => {
    const lasso = lassoRef.current
    if (!lasso) return

    const container = containerRef.current
    if (container) {
      const lassoRect = lasso.el.getBoundingClientRect()
      const notes = container.querySelectorAll('[id^="note-"], [id*="note"]')
      const selectedIds: string[] = []

      notes.forEach((note) => {
        const noteRect = note.getBoundingClientRect()
        const cx = noteRect.left + noteRect.width / 2
        const cy = noteRect.top + noteRect.height / 2
        if (
          cx >= lassoRect.left &&
          cx <= lassoRect.right &&
          cy >= lassoRect.top &&
          cy <= lassoRect.bottom
        ) {
          selectedIds.push(note.id)
        }
      })

      if (selectedIds.length > 0) {
        selectNotes(selectedIds)
      }
    }

    lasso.el.remove()
    lassoRef.current = null
  }, [containerRef, selectNotes])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const svg = container.querySelector('svg')
    if (!svg) return

    const notes = svg.querySelectorAll('[id^="note-"], [id*="note"]')
    notes.forEach((note) => {
      ;(note as SVGElement).style.cursor = 'pointer'
    })

    selectedNoteIds.forEach((id) => {
      const el = svg.getElementById(id)
      if (el) {
        el.setAttribute('stroke', '#007bff')
        el.setAttribute('stroke-width', '3')
      }
    })

    notes.forEach((note) => {
      if (!selectedNoteIds.has(note.id)) {
        ;(note as SVGElement).removeAttribute('stroke')
        ;(note as SVGElement).removeAttribute('stroke-width')
      }
    })
  }, [containerRef, selectedNoteIds])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('click', handleNoteClick)
    container.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('click', handleNoteClick)
      container.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleNoteClick, handleMouseDown, handleMouseMove, handleMouseUp])

  return null
}
