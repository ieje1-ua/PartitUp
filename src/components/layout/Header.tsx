import { Music } from 'lucide-react'
import { useScoreStore } from '../../stores/scoreStore'

export function Header() {
  const fileName = useScoreStore((s) => s.fileName)
  const reset = useScoreStore((s) => s.reset)

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
        <button
          onClick={reset}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          Nueva partitura
        </button>
      )}
    </header>
  )
}
