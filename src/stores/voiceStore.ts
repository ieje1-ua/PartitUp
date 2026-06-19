import { create } from 'zustand'
import type { VoiceDefinition } from '../types/voice'
import { identifyVoices } from '../lib/musicxml/voiceIdentifier'

interface VoiceState {
  voices: VoiceDefinition[]
  isIdentified: boolean

  identifyFromMusicXml: (xml: string) => void
  toggleMute: (voiceId: string) => void
  toggleSolo: (voiceId: string) => void
  setVolume: (voiceId: string, volume: number) => void
  setVoiceLabel: (voiceId: string, label: string) => void
  reset: () => void
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  voices: [],
  isIdentified: false,

  identifyFromMusicXml: (xml: string) => {
    const voices = identifyVoices(xml)
    set({ voices, isIdentified: true })
  },

  toggleMute: (voiceId: string) => {
    set({
      voices: get().voices.map((v) =>
        v.id === voiceId ? { ...v, muted: !v.muted, solo: false } : v
      ),
    })
  },

  toggleSolo: (voiceId: string) => {
    const voice = get().voices.find((v) => v.id === voiceId)
    if (!voice) return

    const newSolo = !voice.solo
    set({
      voices: get().voices.map((v) =>
        v.id === voiceId
          ? { ...v, solo: newSolo, muted: false }
          : { ...v, solo: false, muted: newSolo }
      ),
    })
  },

  setVolume: (voiceId: string, volume: number) => {
    set({
      voices: get().voices.map((v) =>
        v.id === voiceId ? { ...v, volume: Math.max(0, Math.min(1, volume)) } : v
      ),
    })
  },

  setVoiceLabel: (voiceId: string, label: string) => {
    set({
      voices: get().voices.map((v) =>
        v.id === voiceId ? { ...v, label } : v
      ),
    })
  },

  reset: () => {
    set({ voices: [], isIdentified: false })
  },
}))
