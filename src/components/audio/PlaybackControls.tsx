import { useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, Download, Loader2, Minus, Plus } from 'lucide-react'
import { usePlaybackStore } from '../../stores/playbackStore'
import { useScoreStore } from '../../stores/scoreStore'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PlaybackControls() {
  const midiBase64 = useScoreStore((s) => s.midiBase64)
  const {
    isPlaying, isReady, isLoading, currentTime, duration, tempo, error,
    isExporting, exportProgress,
    initAndLoad, play, pause, stop, setTempo, updateTime, exportWav,
  } = usePlaybackStore()
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!midiBase64) return
    initAndLoad(midiBase64)
  }, [midiBase64, initAndLoad])

  const tick = useCallback(() => {
    updateTime()
    animRef.current = requestAnimationFrame(tick)
  }, [updateTime])

  useEffect(() => {
    if (isPlaying) {
      animRef.current = requestAnimationFrame(tick)
    } else {
      cancelAnimationFrame(animRef.current)
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, tick])

  const handleExport = async () => {
    if (!midiBase64) return
    const blob = await exportWav(midiBase64)
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'partitup-audio.wav'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!midiBase64) return null

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-4 shrink-0">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Cargando audio...</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : (
        <>
          <div className="flex items-center gap-1">
            <button
              onClick={stop}
              disabled={!isReady}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Detener"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={isPlaying ? pause : play}
              disabled={!isReady}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-30 transition-colors"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 min-w-[120px]">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-600">
            <button
              onClick={() => setTempo(Math.max(0.25, tempo - 0.25))}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="min-w-[40px] text-center">{tempo}x</span>
            <button
              onClick={() => setTempo(Math.min(2, tempo + 0.25))}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="ml-auto">
            <button
              onClick={handleExport}
              disabled={!isReady || isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-30 transition-colors"
              title="Descargar audio WAV"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{Math.round(exportProgress * 100)}%</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar WAV</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
