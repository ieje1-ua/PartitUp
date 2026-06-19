export const VoiceType = {
  SOPRANO_1: 'S1',
  SOPRANO_2: 'S2',
  CONTRALTO_1: 'A1',
  CONTRALTO_2: 'A2',
  TENOR_1: 'T1',
  TENOR_2: 'T2',
  BAJO_1: 'B1',
  BAJO_2: 'B2',
  UNASSIGNED: 'UNASSIGNED',
} as const

export type VoiceType = (typeof VoiceType)[keyof typeof VoiceType]

export interface VoiceDefinition {
  id: string
  type: VoiceType
  label: string
  color: string
  midiChannel: number
  midiProgram: number
  visible: boolean
  muted: boolean
  solo: boolean
  volume: number
  partIds: string[]
}

export interface VoiceAssignment {
  noteId: string
  voiceId: string
  originalVoiceId: string
  isUserCorrected: boolean
}

export const VOICE_LABELS: Record<VoiceType, string> = {
  [VoiceType.SOPRANO_1]: 'Soprano 1',
  [VoiceType.SOPRANO_2]: 'Soprano 2',
  [VoiceType.CONTRALTO_1]: 'Contralto 1',
  [VoiceType.CONTRALTO_2]: 'Contralto 2',
  [VoiceType.TENOR_1]: 'Tenor 1',
  [VoiceType.TENOR_2]: 'Tenor 2',
  [VoiceType.BAJO_1]: 'Bajo 1',
  [VoiceType.BAJO_2]: 'Bajo 2',
  [VoiceType.UNASSIGNED]: 'Sin asignar',
}
