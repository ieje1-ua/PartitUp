import { useState, useCallback, useRef } from 'react'
import { Upload, FileMusic, Image, FileText, Loader2 } from 'lucide-react'
import { useScoreStore } from '../../stores/scoreStore'

const ACCEPTED_EXTENSIONS = [
  '.xml', '.mxl', '.musicxml',
  '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif',
  '.pdf',
  '.mid', '.midi',
]

export function UploadZone() {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadFile = useScoreStore((s) => s.loadFile)
  const isLoading = useScoreStore((s) => s.isLoading)
  const error = useScoreStore((s) => s.error)

  const handleFile = useCallback(
    (file: File) => {
      loadFile(file)
    },
    [loadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleClick = () => fileInputRef.current?.click()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div
        className={`
          w-full max-w-2xl border-2 border-dashed rounded-2xl p-12
          flex flex-col items-center justify-center gap-6
          cursor-pointer transition-all duration-200
          ${isDragOver
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        {isLoading ? (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            <p className="text-lg text-gray-600">Procesando partitura...</p>
          </>
        ) : (
          <>
            <Upload className="w-16 h-16 text-gray-400" />
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700">
                Arrastra una partitura aquí o haz clic para seleccionar
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Formatos soportados:
              </p>
            </div>

            <div className="flex gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <FileMusic className="w-4 h-4" />
                <span>MusicXML</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Image className="w-4 h-4" />
                <span>PNG, JPG</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>PDF</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm max-w-md text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
