import { VoiceType, type VoiceDefinition } from '../../types/voice'
import { VOICE_COLORS } from '../../utils/colorPalette'

interface NoteInfo {
  partId: string
  staff: number
  voice: number
  pitch: number
  step: string
  octave: number
}

export interface VoiceStream {
  partId: string
  partName: string
  staff: number
  voice: number
  notes: NoteInfo[]
  minPitch: number
  maxPitch: number
  avgPitch: number
}

const PITCH_MAP: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

function pitchToMidi(step: string, octave: number, alter = 0): number {
  return (octave + 1) * 12 + (PITCH_MAP[step] ?? 0) + alter
}

const NON_VOCAL_PATTERNS = /piano|organ|keyboard|guitar|strings|orchestra|acomp|accomp|klavier|cello|violin|viola|flute|oboe|clarinet|trumpet|trombone|horn|timpani|harp|bass(?:oon)|continuo|basso\s*cont/i

function isVocalPart(name: string): boolean {
  return !NON_VOCAL_PATTERNS.test(name)
}

function parseMusicXmlVoices(xmlString: string): VoiceStream[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  const partNames = new Map<string, string>()
  doc.querySelectorAll('score-part').forEach((sp) => {
    const id = sp.getAttribute('id') ?? ''
    const name = sp.querySelector('part-name')?.textContent ?? id
    partNames.set(id, name)
  })

  const streamsMap = new Map<string, VoiceStream>()

  doc.querySelectorAll('part').forEach((part) => {
    const partId = part.getAttribute('id') ?? ''
    const partName = partNames.get(partId) ?? partId

    part.querySelectorAll('note').forEach((note) => {
      if (note.querySelector('rest')) return

      const pitch = note.querySelector('pitch')
      if (!pitch) return

      const step = pitch.querySelector('step')?.textContent ?? 'C'
      const octave = parseInt(pitch.querySelector('octave')?.textContent ?? '4', 10)
      const alter = parseInt(pitch.querySelector('alter')?.textContent ?? '0', 10)
      const staffEl = note.querySelector('staff')
      const voiceEl = note.querySelector('voice')

      const staff = staffEl ? parseInt(staffEl.textContent ?? '1', 10) : 1
      const voice = voiceEl ? parseInt(voiceEl.textContent ?? '1', 10) : 1
      const midiPitch = pitchToMidi(step, octave, alter)

      const key = `${partId}-${staff}-${voice}`
      if (!streamsMap.has(key)) {
        streamsMap.set(key, {
          partId,
          partName,
          staff,
          voice,
          notes: [],
          minPitch: midiPitch,
          maxPitch: midiPitch,
          avgPitch: 0,
        })
      }

      const stream = streamsMap.get(key)!
      stream.notes.push({ partId, staff, voice, pitch: midiPitch, step, octave })
      stream.minPitch = Math.min(stream.minPitch, midiPitch)
      stream.maxPitch = Math.max(stream.maxPitch, midiPitch)
    })
  })

  for (const stream of streamsMap.values()) {
    if (stream.notes.length > 0) {
      stream.avgPitch = stream.notes.reduce((s, n) => s + n.pitch, 0) / stream.notes.length
    }
  }

  return Array.from(streamsMap.values())
    .filter((s) => s.notes.length > 0)
    .sort((a, b) => b.avgPitch - a.avgPitch)
}

const VOICE_TYPE_ORDER: VoiceType[] = [
  VoiceType.SOPRANO_1,
  VoiceType.SOPRANO_2,
  VoiceType.CONTRALTO_1,
  VoiceType.CONTRALTO_2,
  VoiceType.TENOR_1,
  VoiceType.TENOR_2,
  VoiceType.BAJO_1,
  VoiceType.BAJO_2,
]

const VOICE_RANGES: Record<string, { min: number; max: number; center: number }> = {
  soprano: { min: 60, max: 84, center: 72 },
  alto:    { min: 53, max: 77, center: 65 },
  tenor:   { min: 48, max: 72, center: 60 },
  bass:    { min: 40, max: 64, center: 52 },
}

function classifyByRange(avgPitch: number): 'soprano' | 'alto' | 'tenor' | 'bass' {
  let bestMatch = 'soprano' as 'soprano' | 'alto' | 'tenor' | 'bass'
  let bestDistance = Infinity

  for (const [name, range] of Object.entries(VOICE_RANGES)) {
    const distance = Math.abs(avgPitch - range.center)
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = name as 'soprano' | 'alto' | 'tenor' | 'bass'
    }
  }
  return bestMatch
}

function assignVoiceTypes(streams: VoiceStream[]): VoiceType[] {
  const count = streams.length

  if (count === 0) return []

  if (count === 8) {
    return [...VOICE_TYPE_ORDER]
  }

  if (count === 4) {
    return [VoiceType.SOPRANO_1, VoiceType.CONTRALTO_1, VoiceType.TENOR_1, VoiceType.BAJO_1]
  }

  if (count === 2) {
    const high = classifyByRange(streams[0].avgPitch)
    const low = classifyByRange(streams[1].avgPitch)

    if (high === 'soprano' || high === 'alto') {
      return [VoiceType.SOPRANO_1, VoiceType.CONTRALTO_1]
    }
    if (low === 'bass' || low === 'tenor') {
      return [VoiceType.TENOR_1, VoiceType.BAJO_1]
    }
    return [VoiceType.SOPRANO_1, VoiceType.BAJO_1]
  }

  if (count === 3) {
    const allMale = streams.every((s) => s.avgPitch < 65)
    if (allMale) {
      return [VoiceType.TENOR_1, VoiceType.TENOR_2, VoiceType.BAJO_2]
    }
    return [VoiceType.SOPRANO_1, VoiceType.CONTRALTO_1, VoiceType.BAJO_1]
  }

  if (count === 6) {
    return [
      VoiceType.SOPRANO_1, VoiceType.SOPRANO_2,
      VoiceType.CONTRALTO_1, VoiceType.CONTRALTO_2,
      VoiceType.TENOR_1, VoiceType.BAJO_1,
    ]
  }

  return streams.map((stream) => {
    const rangeClass = classifyByRange(stream.avgPitch)
    switch (rangeClass) {
      case 'soprano': return VoiceType.SOPRANO_1
      case 'alto': return VoiceType.CONTRALTO_1
      case 'tenor': return VoiceType.TENOR_1
      case 'bass': return VoiceType.BAJO_1
    }
  })
}

const MIDI_CHANNELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15]

export function identifyVoices(musicXml: string): VoiceDefinition[] {
  const allStreams = parseMusicXmlVoices(musicXml)

  const vocalStreams = allStreams.filter((s) => isVocalPart(s.partName))
  const streams = vocalStreams.length > 0 ? vocalStreams : allStreams

  if (streams.length === 0) {
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
      partIds: [],
      noteCount: 0,
    }]
  }

  const voiceTypes = assignVoiceTypes(streams)

  return streams.map((stream, i) => {
    const type = voiceTypes[i] ?? VoiceType.UNASSIGNED
    const partLabel = stream.partName !== stream.partId ? stream.partName : ''

    return {
      id: `voice-${i}`,
      type,
      label: partLabel || (VOICE_COLORS[type] ? type : `Voz ${i + 1}`),
      color: VOICE_COLORS[type] ?? '#95a5a6',
      midiChannel: MIDI_CHANNELS[i % MIDI_CHANNELS.length],
      midiProgram: 52,
      visible: true,
      muted: false,
      solo: false,
      volume: 0.8,
      partIds: [stream.partId],
      noteCount: stream.notes.length,
    }
  })
}

export function computeVoiceChannelMap(
  musicXml: string,
  voices: VoiceDefinition[]
): Record<string, number> {
  const strippedXml = stripNonVocalParts(musicXml)
  const parser = new DOMParser()
  const doc = parser.parseFromString(strippedXml, 'text/xml')

  const partOrder: string[] = []
  doc.querySelectorAll('part').forEach((part) => {
    partOrder.push(part.getAttribute('id') ?? '')
  })

  const channelMap: Record<string, number> = {}

  for (const voice of voices) {
    for (const partId of voice.partIds) {
      const partIndex = partOrder.indexOf(partId)
      if (partIndex >= 0) {
        channelMap[voice.id] = MIDI_CHANNELS[partIndex % MIDI_CHANNELS.length]
        break
      }
    }
  }

  return channelMap
}

export function stripNonVocalParts(musicXml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(musicXml, 'text/xml')

  const nonVocalIds: string[] = []
  let totalParts = 0

  doc.querySelectorAll('score-part').forEach((sp) => {
    totalParts++
    const id = sp.getAttribute('id') ?? ''
    const name = sp.querySelector('part-name')?.textContent?.trim() ?? ''
    if (NON_VOCAL_PATTERNS.test(name)) {
      nonVocalIds.push(id)
    }
  })

  if (nonVocalIds.length === 0 || nonVocalIds.length === totalParts) {
    return musicXml
  }

  for (const id of nonVocalIds) {
    doc.querySelector(`score-part[id="${id}"]`)?.remove()
    doc.querySelector(`part[id="${id}"]`)?.remove()
  }

  return new XMLSerializer().serializeToString(doc)
}

export function computeStaffVoiceMap(
  musicXml: string,
  voices: VoiceDefinition[]
): Record<number, string> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(musicXml, 'text/xml')

  const partStaffs = new Map<string, number[]>()
  let currentStaff = 1

  doc.querySelectorAll('part').forEach((part) => {
    const id = part.getAttribute('id') ?? ''
    const stavesEl = part.querySelector('attributes staves')
    const numStaves = stavesEl ? parseInt(stavesEl.textContent ?? '1', 10) : 1

    const staffNumbers: number[] = []
    for (let s = 0; s < numStaves; s++) {
      staffNumbers.push(currentStaff++)
    }
    partStaffs.set(id, staffNumbers)
  })

  const staffVoiceMap: Record<number, string> = {}
  for (const voice of voices) {
    for (const partId of voice.partIds) {
      const staffNums = partStaffs.get(partId)
      if (staffNums) {
        for (const sn of staffNums) {
          staffVoiceMap[sn] = voice.id
        }
      }
    }
  }

  return staffVoiceMap
}

export { parseMusicXmlVoices }
