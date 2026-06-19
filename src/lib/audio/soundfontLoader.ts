// Carga el SoundFont con cache persistente en el navegador (Cache API).
// En movil esto significa que el archivo (~8MB) solo se descarga la primera vez;
// en visitas posteriores se sirve desde la cache del dispositivo.

const DEFAULT_SOUNDFONT_URL =
  import.meta.env.VITE_SOUNDFONT_URL || '/soundfonts/GeneralUserGS.sf3'

const CACHE_NAME = 'partitup-soundfonts-v1'

export async function loadSoundFont(
  url: string = DEFAULT_SOUNDFONT_URL,
  onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  // Intentar servir desde la Cache API
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(url)
      if (cached) {
        return await cached.arrayBuffer()
      }

      const response = await fetchWithProgress(url, onProgress)
      await cache.put(url, response.clone())
      return await response.arrayBuffer()
    } catch {
      // Si la Cache API falla, caer al fetch directo
    }
  }

  const response = await fetchWithProgress(url, onProgress)
  return await response.arrayBuffer()
}

async function fetchWithProgress(
  url: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<Response> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo cargar el SoundFont (${response.status})`)
  }

  if (!onProgress || !response.body) {
    return response
  }

  const total = Number(response.headers.get('content-length')) || 0
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress(loaded, total)
  }

  const blob = new Blob(chunks as BlobPart[])
  return new Response(blob, { headers: response.headers })
}
