import { Volume2, VolumeX, Headphones } from 'lucide-react'
import type { VoiceDefinition } from '../../types/voice'
import { VOICE_LABELS, VoiceType } from '../../types/voice'
import { useVoiceStore } from '../../stores/voiceStore'

interface VoiceCardProps {
  voice: VoiceDefinition
}

export function VoiceCard({ voice }: VoiceCardProps) {
  const toggleMute = useVoiceStore((s) => s.toggleMute)
  const toggleSolo = useVoiceStore((s) => s.toggleSolo)
  const setVolume = useVoiceStore((s) => s.setVolume)

  const label = voice.type !== VoiceType.UNASSIGNED
    ? VOICE_LABELS[voice.type]
    : voice.label

  return (
    <div
      className={`rounded-lg p-3 transition-all ${
        voice.muted ? 'opacity-50 bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: voice.color }}
        />
        <span className="text-sm font-medium text-gray-800 flex-1 truncate">
          {label}
        </span>

        <button
          onClick={() => toggleSolo(voice.id)}
          className={`p-1 rounded transition-colors ${
            voice.solo
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={voice.solo ? 'Desactivar solo' : 'Solo esta voz'}
        >
          <Headphones className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => toggleMute(voice.id)}
          className={`p-1 rounded transition-colors ${
            voice.muted
              ? 'bg-red-100 text-red-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={voice.muted ? 'Activar voz' : 'Silenciar voz'}
        >
          {voice.muted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(voice.volume * 100)}
        onChange={(e) => setVolume(voice.id, parseInt(e.target.value, 10) / 100)}
        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        style={{ accentColor: voice.color }}
      />
    </div>
  )
}
