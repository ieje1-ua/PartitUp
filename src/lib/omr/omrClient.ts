const OMR_API_URL = import.meta.env.VITE_OMR_API_URL || '/api'

// The OMR backend (Hugging Face Space) sleeps after inactivity; the first
// request wakes it (model load) and neural recognition on CPU is slow, so
// allow a long timeout — a cold first run can take several minutes.
const OMR_TIMEOUT_MS = 600_000

export interface OmrResult {
  musicXml: string
  status: 'success' | 'error'
  message?: string
}

export async function processImageOMR(file: File): Promise<OmrResult> {
  const formData = new FormData()
  formData.append('file', file)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OMR_TIMEOUT_MS)

  try {
    const response = await fetch(`${OMR_API_URL}/omr`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
    const data = await response.json() as OmrResult
    return data
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return {
        status: 'error',
        musicXml: '',
        message: 'El servidor de reconocimiento tardó demasiado en responder. Puede estar despertándose tras un periodo inactivo — espera unos segundos e inténtalo de nuevo.',
      }
    }
    return {
      status: 'error',
      musicXml: '',
      message: 'No se pudo contactar con el servidor de reconocimiento. Comprueba tu conexión e inténtalo de nuevo.',
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function processPdfOMR(file: File): Promise<OmrResult> {
  return processImageOMR(file)
}

// Fire-and-forget ping to wake the (possibly sleeping) backend Space so it's
// warm by the time the user uploads a file. Safe to call on app mount.
export function prewarmOmrBackend(): void {
  const base = OMR_API_URL.replace(/\/api\/?$/, '')
  fetch(`${base}/health`, { method: 'GET' }).catch(() => {})
}
