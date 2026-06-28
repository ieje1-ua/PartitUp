import { Undo2, Redo2, MousePointer2, X, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import { useCorrectionStore } from '../../stores/correctionStore'
import { useVoiceStore } from '../../stores/voiceStore'
import { useScoreStore } from '../../stores/scoreStore'
import { VOICE_LABELS, VoiceType } from '../../types/voice'

export function CorrectionToolbar() {
  const selectedNoteIds = useCorrectionStore((s) => s.selectedNoteIds)
  const clearSelection = useCorrectionStore((s) => s.clearSelection)
  const undoStack = useCorrectionStore((s) => s.undoStack)
  const redoStack = useCorrectionStore((s) => s.redoStack)
  const undo = useCorrectionStore((s) => s.undo)
  const redo = useCorrectionStore((s) => s.redo)
  const reassignSelectedTo = useCorrectionStore((s) => s.reassignSelectedTo)
  const voices = useVoiceStore((s) => s.voices)
  const nudgeSelectedNotes = useScoreStore((s) => s.nudgeSelectedNotes)
  const deleteSelectedNotes = useScoreStore((s) => s.deleteSelectedNotes)
  const addNotesFromSelectedRests = useScoreStore((s) => s.addNotesFromSelectedRests)
  const undoEdit = useScoreStore((s) => s.undoEdit)
  const editUndo = useScoreStore((s) => s.editUndo)

  const hasSelection = selectedNoteIds.size > 0

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shrink-0">
      <div className="flex items-center gap-1 text-sm text-gray-600">
        <MousePointer2 className="w-4 h-4" />
        <span>Selecciona notas para corregir o reasignar voz</span>
      </div>

      <div className="h-5 w-px bg-gray-300" />

      <button
        onClick={() => undo()}
        disabled={undoStack.length === 0}
        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
        title="Deshacer reasignación de voz (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => redo()}
        disabled={redoStack.length === 0}
        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors"
        title="Rehacer (Ctrl+Shift+Z)"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {hasSelection && (
        <>
          <div className="h-5 w-px bg-gray-300" />
          <span className="text-sm text-blue-600 font-medium">
            {selectedNoteIds.size} nota{selectedNoteIds.size > 1 ? 's' : ''} seleccionada{selectedNoteIds.size > 1 ? 's' : ''}
          </span>

          {/* Edición de notas (Fase D) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => nudgeSelectedNotes(1)}
              className="p-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Subir un tono (flecha arriba)"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => nudgeSelectedNotes(-1)}
              className="p-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
              title="Bajar un tono (flecha abajo)"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => deleteSelectedNotes()}
              className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Borrar nota (Supr)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => addNotesFromSelectedRests()}
              className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors"
              title="Añadir nota: convierte un silencio seleccionado en nota (tecla N)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => undoEdit()}
              disabled={editUndo.length === 0}
              className="p-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              title="Deshacer última corrección de nota"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-5 w-px bg-gray-300" />

          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Asignar a:</span>
            {voices.map((voice) => {
              const label = voice.type !== VoiceType.UNASSIGNED
                ? VOICE_LABELS[voice.type]
                : voice.label
              return (
                <button
                  key={voice.id}
                  onClick={() => reassignSelectedTo(voice.id)}
                  className="px-2 py-1 text-xs rounded border transition-colors hover:opacity-80"
                  style={{
                    borderColor: voice.color,
                    color: voice.color,
                    backgroundColor: `${voice.color}10`,
                  }}
                  title={`Asignar a ${label}`}
                >
                  {voice.type !== VoiceType.UNASSIGNED ? voice.type : voice.label}
                </button>
              )
            })}
          </div>

          <button
            onClick={clearSelection}
            className="ml-auto p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
            title="Limpiar selección"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}
