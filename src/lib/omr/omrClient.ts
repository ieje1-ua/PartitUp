const OMR_API_URL = import.meta.env.VITE_OMR_API_URL || '/api'

export interface OmrResult {
  musicXml: string
  status: 'success' | 'error'
  message?: string
}

export async function processImageOMR(file: File): Promise<OmrResult> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${OMR_API_URL}/omr`, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json() as OmrResult
  return data
}

export async function processPdfOMR(file: File): Promise<OmrResult> {
  return processImageOMR(file)
}
