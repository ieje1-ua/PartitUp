import { useEffect, useRef } from 'react'
import { useVoiceStore } from '../../stores/voiceStore'
import { useCorrectionStore } from '../../stores/correctionStore'

interface VoiceHighlighterProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

// Escape a Verovio note id for use in a CSS attribute selector.
function cssEscapeId(id: string): string {
  return id.replace(/["\\]/g, '\\$&')
}

export function VoiceHighlighter({ containerRef }: VoiceHighlighterProps) {
  const voices = useVoiceStore((s) => s.voices)
  const staffVoiceMap = useVoiceStore((s) => s.staffVoiceMap)
  const noteVoiceOverrides = useCorrectionStore((s) => s.noteVoiceOverrides)
  const prevStylesRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || voices.length === 0) return

    if (prevStylesRef.current) {
      prevStylesRef.current.remove()
    }

    const svg = container.querySelector('svg')
    if (!svg) return

    const voiceById = new Map(voices.map((v) => [v.id, v]))
    const hasSolo = voices.some((v) => v.solo)

    const styleEl = document.createElement('style')
    let css = ''

    for (const [staffN, voiceId] of Object.entries(staffVoiceMap)) {
      const voice = voiceById.get(voiceId)
      if (!voice) continue

      const dimmed = hasSolo && !voice.solo
      const color = dimmed || voice.muted ? '#ccc' : voice.color
      const opacity = dimmed ? 0.15 : voice.muted ? 0.3 : 1

      css += `.score-container svg .staff[data-n="${staffN}"] .note,
.score-container svg .staff[data-n="${staffN}"] .beam,
.score-container svg .staff[data-n="${staffN}"] .stem {
  fill: ${color} !important;
  stroke: ${color} !important;
  opacity: ${opacity};
}
`
    }

    // Dim staves not mapped to any voice (e.g., piano)
    const allStaffs = svg.querySelectorAll('.staff[data-n]')
    allStaffs.forEach((staff) => {
      const n = staff.getAttribute('data-n')
      if (n && !(n in staffVoiceMap)) {
        css += `.score-container svg .staff[data-n="${n}"] .note,
.score-container svg .staff[data-n="${n}"] .beam,
.score-container svg .staff[data-n="${n}"] .stem {
  fill: #d0d0d0 !important;
  stroke: #d0d0d0 !important;
  opacity: 0.4;
}
`
      }
    })

    // Per-note manual overrides win over staff coloring. Emitted last and keyed
    // by the note id so the rule is more specific than the staff-level rules.
    for (const [noteId, voiceId] of Object.entries(noteVoiceOverrides)) {
      const voice = voiceById.get(voiceId)
      if (!voice) continue

      const dimmed = hasSolo && !voice.solo
      const color = dimmed || voice.muted ? '#ccc' : voice.color
      const opacity = dimmed ? 0.15 : voice.muted ? 0.3 : 1
      const sel = `.score-container svg [id="${cssEscapeId(noteId)}"]`

      css += `${sel}, ${sel} .note, ${sel} .notehead, ${sel} .stem, ${sel} .beam {
  fill: ${color} !important;
  stroke: ${color} !important;
  opacity: ${opacity};
}
`
    }

    styleEl.textContent = css
    document.head.appendChild(styleEl)
    prevStylesRef.current = styleEl

    return () => {
      styleEl.remove()
    }
  }, [voices, staffVoiceMap, noteVoiceOverrides, containerRef])

  return null
}
