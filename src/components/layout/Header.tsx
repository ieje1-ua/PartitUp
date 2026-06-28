import { Music, Download } from 'lucide-react'
import { useScoreStore } from '../../stores/scoreStore'

export function Header() {
  const fileName = useScoreStore((s) => s.fileName)
  const musicXml = useScoreStore((s) => s.musicXml)
  const reset = useScoreStore((s) => s.reset)

  const downloadMusicXml = () => {
    if (!musicXml) return
    const blob = new Blob([musicXml], { type: 'application/vnd.recordare.musicxml+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const base = (fileName ?? 'partitura').replace(/\.[^.]+$/, '')
    a.href = url
    a.download = `${base}.musicxml`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Music className="w-7 h-7 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">PartitUp</h1>
        {fileName && (
          <span className="text-sm text-gray-500 ml-2">— {fileName}</span>
        )}
      </div>
      {fileName && (
        <div className="flex items-center gap-2">
          {musicXml && (
            <button
              onClick={downloadMusicXml}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
              title="Descargar el MusicXML detectado"
            >
              <Download className="w-4 h-4" />
              MusicXML
            </button>
          )}
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Nueva partitura
          </button>
        </div>
      )}
    </header>
  )
}
