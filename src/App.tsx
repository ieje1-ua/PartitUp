import { Header } from './components/layout/Header'
import { UploadZone } from './components/upload/UploadZone'
import { ScoreViewer } from './components/score/ScoreViewer'
import { useScoreStore } from './stores/scoreStore'

export default function App() {
  const svgContent = useScoreStore((s) => s.svgContent)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex">
        {svgContent ? <ScoreViewer /> : <UploadZone />}
      </main>
    </div>
  )
}
