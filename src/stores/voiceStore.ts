import { create } from 'zustand'
import type { VoiceDefinition } from '../types/voice'
import type { VoiceType } from '../types/voice'
import { VOICE_COLORS } from '../utils/colorPalette'
import { identifyVoices, computeStaffVoiceMap, computeVoiceChannelMap } from '../lib/musicxml/voiceIdentifier'
import { applyVoiceSettings } from '../lib/audio/synthesizer'

interface VoiceState {
  voices: VoiceDefinition[]
  isIdentified: boolean
  staffVoiceMap: Record<number, string>
  channelMap: Record<string, number>

  identifyFromMusicXml: (xml: string) => void
  changeVoiceType: (voiceId: string, newType: VoiceType) => void
  toggleMute: (voiceId: string) => void
  toggleSolo: (voiceId: string) => void
  setVolume: (voiceId: string, volume: number) => void
  setVoiceLabel: (voiceId: string, label: string) => void
  syncToAudio: () => void
  reset: () => void
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  voices: [],
  isIdentified: false,
  staffVoiceMap: {},
  channelMap: {},

  identifyFromMusicXml: (xml: string) => {
    const voices = identifyVoices(xml)
    const staffVoiceMap = computeStaffVoiceMap(xml, voices)
    const channelMap = computeVoiceChannelMap(xml, voices)
    set({ voices, isIdentified: true, staffVoiceMap, channelMap })
  },

  changeVoiceType: (voiceId: string, newType: VoiceType) => {
    set({
      voices: get().voices.map((v) =>
        v.id === voiceId
          ? { ...v, type: newType, color: VOICE_COLORS[newType] ?? '#95a5a6' }
          : v
      ),
    })
  },

  toggleMute: (voiceId: string) => {
    const newVoices = get().voices.map((v) =>
      v.id === voiceId ? { ...v, muted: !v.muted, solo: false } : v
    )
    set({ voices: newVoices })
    applyVoiceSettings(newVoices, get().channelMap)
  },

  toggleSolo: (voiceId: string) => {
    const voice = get().voices.find((v) => v.id === voiceId)
    if (!voice) return

    const newSolo = !voice.solo
    const newVoices = get().voices.map((v) =>
      v.id === voiceId
        ? { ...v, solo: newSolo, muted: false }
        : { ...v, solo: false, muted: newSolo }
    )
    set({ voices: newVoices })
    applyVoiceSettings(newVoices, get().channelMap)
  },

  setVolume: (voiceId: string, volume: number) => {
    const newVoices = get().voices.map((v) =>
      v.id === voiceId ? { ...v, volume: Math.max(0, Math.min(1, volume)) } : v
    )
    set({ voices: newVoices })
    applyVoiceSettings(newVoices, get().channelMap)
  },

  setVoiceLabel: (voiceId: string, label: string) => {
    set({
      voices: get().voices.map((v) =>
        v.id === voiceId ? { ...v, label } : v
      ),
    })
  },

  syncToAudio: () => {
    applyVoiceSettings(get().voices, get().channelMap)
  },

  reset: () => {
    set({ voices: [], isIdentified: false, staffVoiceMap: {}, channelMap: {} })
  },
}))
