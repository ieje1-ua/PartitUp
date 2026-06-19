import { useVoiceStore } from '../../stores/voiceStore'
import { VoiceCard } from './VoiceCard'

export function VoicePanel() {
  const voices = useVoiceStore((s) => s.voices)
  const isIdentified = useVoiceStore((s) => s.isIdentified)

  if (!isIdentified || voices.length === 0) return null

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800 text-sm">
          Voces detectadas ({voices.length})
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Usa el selector para corregir el tipo de voz
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {voices.map((voice) => (
          <VoiceCard key={voice.id} voice={voice} />
        ))}
      </div>
    </div>
  )
}
