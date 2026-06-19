import { useEffect, useRef } from 'react'
import { useVoiceStore } from '../../stores/voiceStore'

interface VoiceHighlighterProps {
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function VoiceHighlighter({ containerRef }: VoiceHighlighterProps) {
  const voices = useVoiceStore((s) => s.voices)
  const prevStylesRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || voices.length === 0) return

    if (prevStylesRef.current) {
      prevStylesRef.current.remove()
    }

    const svg = container.querySelector('svg')
    if (!svg) return

    const styleEl = document.createElement('style')
    let css = ''

    voices.forEach((voice, index) => {
      const staffSelector = `[data-staff="${index + 1}"]`
      css += `
        .score-container svg g.staff:nth-of-type(${index + 1}) .note,
        .score-container svg ${staffSelector} .note {
          fill: ${voice.muted ? '#ccc' : voice.color} !important;
          opacity: ${voice.muted ? 0.3 : 1};
        }
      `
    })

    styleEl.textContent = css
    document.head.appendChild(styleEl)
    prevStylesRef.current = styleEl

    return () => {
      styleEl.remove()
    }
  }, [voices, containerRef])

  return null
}
