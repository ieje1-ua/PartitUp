import { VoiceType, type VoiceDefinition } from '../../types/voice'
import { VOICE_COLORS } from '../../utils/colorPalette'

interface PartInfo {
  partId: string
  partName: string
  avgPitch: number
  noteCount: number
}

interface VoiceCluster {
  parts: PartInfo[]
  avgPitch: number
  totalNotes: number
  bestName: string
}

const PITCH_MAP: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

function pitchToMidi(step: string, octave: number, alter = 0): number {
  return (octave + 1) * 12 + (PITCH_MAP[step] ?? 0) + alter
}

const NON_VOCAL_PATTERNS = /piano|organ|keyboard|guitar|strings|orchestra|acomp|accomp|klavier|cello|violin|viola|flute|oboe|clarinet|trumpet|trombone|horn|timpani|harp|bass(?:oon)/i

function isVocalPart(name: string): boolean {
  return !NON_VOCAL_PATTERNS.test(name)
}

function parseParts(xmlString: string): PartInfo[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const partNames = new Map<string, string>()
  doc.querySelectorAll('score-part').forEach((sp) => {
    const id = sp.getAttribute('id') ?? ''
    const name = sp.querySelector('part-name')?.textContent?.trim() ?? id
    partNames.set(id, name)
  })

  const parts: PartInfo[] = []

  doc.querySelectorAll('part').forEach((part) => {
    const partId = part.getAttribute('id') ?? ''
    const partName = partNames.get(partId) ?? partId

    let pitchSum = 0
    let noteCount = 0

    part.querySelectorAll('note').forEach((note) => {
      if (note.querySelector('rest')) return
      const pitch = note.querySelector('pitch')
      if (!pitch) return

      const step = pitch.querySelector('step')?.textContent ?? 'C'
      const octave = parseInt(pitch.querySelector('octave')?.textContent ?? '4', 10)
      const alter = parseInt(pitch.querySelector('alter')?.textContent ?? '0', 10)
      pitchSum += pitchToMidi(step, octave, alter)
      noteCount++
    })

    if (noteCount > 0) {
      parts.push({ partId, partName, avgPitch: pitchSum / noteCount, noteCount })
    }
  })

  return parts
}

// Cluster parts with similar pitch into consolidated voices.
// Audiveris can generate one <part> per staff per system, so a multi-page
// SATB score may yield many parts. We only cluster when there are clearly
// more parts than real voices (>8); with <=8 parts we trust Audiveris's
// separation and keep each part as its own voice (so Alto and Tenor, which
// are only ~5 semitones apart, are NOT wrongly merged).
function clusterParts(parts: PartInfo[]): VoiceCluster[] {
  if (parts.length === 0) return []

  // Sort by pitch high to low
  const sorted = [...parts].sort((a, b) => b.avgPitch - a.avgPitch)

  // Few parts: keep each as a distinct voice (no merging)
  if (sorted.length <= 8) {
    return sorted.map((p) => ({
      parts: [p],
      avgPitch: p.avgPitch,
      totalNotes: p.noteCount,
      bestName: p.partName,
    }))
  }

  // Many parts: merge near-duplicates (within 3 semitones) into voices
  const clusters: VoiceCluster[] = []
  let current: VoiceCluster = {
    parts: [sorted[0]],
    avgPitch: sorted[0].avgPitch,
    totalNotes: sorted[0].noteCount,
    bestName: sorted[0].partName,
  }

  for (let i = 1; i < sorted.length; i++) {
    const part = sorted[i]
    // Merge if within 3 semitones of the cluster average
    if (Math.abs(part.avgPitch - current.avgPitch) <= 3) {
      current.parts.push(part)
      const totalNotes = current.totalNotes + part.noteCount
      current.avgPitch = (current.avgPitch * current.totalNotes + part.avgPitch * part.noteCount) / totalNotes
      current.totalNotes = totalNotes
      if (part.noteCount > (current.parts.find(p => p.partName === current.bestName)?.noteCount ?? 0)) {
        current.bestName = part.partName
      }
    } else {
      clusters.push(current)
      current = {
        parts: [part],
        avgPitch: part.avgPitch,
        totalNotes: part.noteCount,
        bestName: part.partName,
      }
    }
  }
  clusters.push(current)

  return clusters
}

const VOICE_RANGES: Record<string, number> = {
  soprano: 72,
  alto: 65,
  tenor: 60,
  bass: 52,
}

function classifyByRange(avgPitch: number): 'soprano' | 'alto' | 'tenor' | 'bass' {
  let best = 'soprano' as 'soprano' | 'alto' | 'tenor' | 'bass'
  let bestDist = Infinity
  for (const [name, center] of Object.entries(VOICE_RANGES)) {
    const d = Math.abs(avgPitch - center)
    if (d < bestDist) {
      bestDist = d
      best = name as typeof best
    }
  }
  return best
}

const NAME_TO_VOICE: Record<string, VoiceType> = {
  'soprano 1': VoiceType.SOPRANO_1, 'soprano 2': VoiceType.SOPRANO_2,
  'soprano i': VoiceType.SOPRANO_1, 'soprano ii': VoiceType.SOPRANO_2,
  soprano: VoiceType.SOPRANO_1,
  'contralto 1': VoiceType.CONTRALTO_1, 'contralto 2': VoiceType.CONTRALTO_2,
  'alto 1': VoiceType.CONTRALTO_1, 'alto 2': VoiceType.CONTRALTO_2,
  contralto: VoiceType.CONTRALTO_1, alto: VoiceType.CONTRALTO_1,
  'tenor 1': VoiceType.TENOR_1, 'tenor 2': VoiceType.TENOR_2,
  'tenor i': VoiceType.TENOR_1, 'tenor ii': VoiceType.TENOR_2,
  tenor: VoiceType.TENOR_1,
  'bajo 1': VoiceType.BAJO_1, 'bajo 2': VoiceType.BAJO_2,
  'bass 1': VoiceType.BAJO_1, 'bass 2': VoiceType.BAJO_2,
  bajo: VoiceType.BAJO_1, bass: VoiceType.BAJO_1, basso: VoiceType.BAJO_1,
  baritone: VoiceType.BAJO_1,
}

function classifyByName(name: string): VoiceType | null {
  const lower = name.toLowerCase().trim()
  for (const [pattern, type] of Object.entries(NAME_TO_VOICE)) {
    if (lower === pattern || lower.includes(pattern)) return type
  }
  if (/^s\d?$/i.test(lower)) return VoiceType.SOPRANO_1
  if (/^a\d?$/i.test(lower)) return VoiceType.CONTRALTO_1
  if (/^t\d?$/i.test(lower)) return VoiceType.TENOR_1
  if (/^b\d?$/i.test(lower)) return VoiceType.BAJO_1
  return null
}

function rangeToVoiceType(range: 'soprano' | 'alto' | 'tenor' | 'bass'): VoiceType {
  switch (range) {
    case 'soprano': return VoiceType.SOPRANO_1
    case 'alto': return VoiceType.CONTRALTO_1
    case 'tenor': return VoiceType.TENOR_1
    case 'bass': return VoiceType.BAJO_1
  }
}

// For exactly 4 clusters, assign SATB top-to-bottom
function assignSATB(): VoiceType[] {
  return [VoiceType.SOPRANO_1, VoiceType.CONTRALTO_1, VoiceType.TENOR_1, VoiceType.BAJO_1]
}

const MIDI_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]

export function identifyVoices(musicXml: string): VoiceDefinition[] {
  const allParts = parseParts(musicXml)

  if (allParts.length === 0) {
    return [{
      id: 'voice-0',
      type: VoiceType.UNASSIGNED,
      label: 'Sin voces detectadas',
      color: VOICE_COLORS[VoiceType.UNASSIGNED],
      midiChannel: 0,
      midiProgram: 52,
      visible: true,
      muted: false,
      solo: false,
      volume: 0.8,
    }]
  }

  const vocalParts = allParts.filter((p) => isVocalPart(p.partName))
  const parts = vocalParts.length > 0 ? vocalParts : allParts

  const clusters = clusterParts(parts)

  // Classify each cluster
  let voiceTypes: VoiceType[]

  if (clusters.length === 4) {
    voiceTypes = assignSATB()
  } else {
    voiceTypes = clusters.map((cluster) => {
      // Try name-based classification from any part in the cluster
      for (const part of cluster.parts) {
        const byName = classifyByName(part.partName)
        if (byName) return byName
      }
      return rangeToVoiceType(classifyByRange(cluster.avgPitch))
    })

    // Deduplicate voice types
    const seen = new Map<VoiceType, number>()
    voiceTypes = voiceTypes.map((type) => {
      const count = (seen.get(type) ?? 0) + 1
      seen.set(type, count)
      if (count === 1) return type
      switch (type) {
        case VoiceType.SOPRANO_1: return VoiceType.SOPRANO_2
        case VoiceType.CONTRALTO_1: return VoiceType.CONTRALTO_2
        case VoiceType.TENOR_1: return VoiceType.TENOR_2
        case VoiceType.BAJO_1: return VoiceType.BAJO_2
        default: return type
      }
    })
  }

  return clusters.map((cluster, i) => {
    const type = voiceTypes[i] ?? VoiceType.UNASSIGNED
    const label = cluster.bestName || `Voz ${i + 1}`
    return {
      id: `voice-${i}`,
      type,
      label,
      color: VOICE_COLORS[type] ?? '#95a5a6',
      midiChannel: MIDI_CHANNELS[i % MIDI_CHANNELS.length],
      midiProgram: 52,
      visible: true,
      muted: false,
      solo: false,
      volume: 0.8,
    }
  })
}

export { parseParts, clusterParts, type PartInfo, type VoiceCluster }
