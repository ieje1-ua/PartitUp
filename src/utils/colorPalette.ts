import { VoiceType } from '../types/voice'

export const VOICE_COLORS: Record<VoiceType, string> = {
  [VoiceType.SOPRANO_1]: '#e74c3c',
  [VoiceType.SOPRANO_2]: '#e67e22',
  [VoiceType.CONTRALTO_1]: '#f1c40f',
  [VoiceType.CONTRALTO_2]: '#2ecc71',
  [VoiceType.TENOR_1]: '#3498db',
  [VoiceType.TENOR_2]: '#9b59b6',
  [VoiceType.BAJO_1]: '#1abc9c',
  [VoiceType.BAJO_2]: '#34495e',
  [VoiceType.UNASSIGNED]: '#95a5a6',
}

export function getVoiceColor(type: VoiceType): string {
  return VOICE_COLORS[type] ?? '#95a5a6'
}
