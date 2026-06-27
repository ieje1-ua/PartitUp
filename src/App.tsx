import { useEffect } from 'react'
import { Header } from './components/layout/Header'
import { UploadZone } from './components/upload/UploadZone'
import { ScoreViewer } from './components/score/ScoreViewer'
import { VoicePanel } from './components/voices/VoicePanel'
import { PlaybackControls } from './components/audio/PlaybackControls'
import { useScoreStore } from './stores/scoreStore'
import { useVoiceStore } from './stores/voiceStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { prewarmOmrBackend } from './lib/omr/omrClient'

export default function App() {
  const svgContent = useScoreStore((s) => s.svgContent)
  const musicXml = useScoreStore((s) => s.musicXml)
  const identifyFromMusicXml = useVoiceStore((s) => s.identifyFromMusicXml)
  const resetVoices = useVoiceStore((s) => s.reset)

  useKeyboardShortcuts()

  // Wake the OMR backend (HF Space sleeps when idle) so it's warm by upload time.
  useEffect(() => {
    prewarmOmrBackend()
  }, [])

  useEffect(() => {
    if (musicXml) {
      identifyFromMusicXml(musicXml)
    } else {
      resetVoices()
    }
  }, [musicXml, identifyFromMusicXml, resetVoices])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {svgContent ? (
        <>
          <div className="flex-1 flex overflow-hidden">
            <ScoreViewer />
            <VoicePanel />
          </div>
          <PlaybackControls />
        </>
      ) : (
        <main className="flex-1 flex">
          <UploadZone />
        </main>
      )}
    </div>
  )
}
