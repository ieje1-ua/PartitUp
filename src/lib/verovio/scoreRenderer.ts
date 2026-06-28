import type { VerovioToolkit } from 'verovio/esm'
import { getVerovioToolkit } from './verovioInstance'
import { stripNonVocalParts } from '../musicxml/voiceIdentifier'

export interface RenderResult {
  svg: string
  pageCount: number
  midi: string
}

let currentToolkit: VerovioToolkit | null = null

export async function loadScore(musicXml: string): Promise<RenderResult> {
  const tk = await getVerovioToolkit()
  currentToolkit = tk

  tk.loadData(musicXml)
  const pageCount = tk.getPageCount()
  const svg = tk.renderToSVG(1)

  const vocalOnlyXml = stripNonVocalParts(musicXml)
  const isStripped = vocalOnlyXml !== musicXml
  if (isStripped) {
    tk.loadData(vocalOnlyXml)
  }
  const midi = tk.renderToMIDI()

  if (isStripped) {
    tk.loadData(musicXml)
  }

  return { svg, pageCount, midi }
}

export async function renderPage(page: number): Promise<string> {
  if (!currentToolkit) throw new Error('No score loaded')
  return currentToolkit.renderToSVG(page)
}

export async function getMidi(): Promise<string> {
  if (!currentToolkit) throw new Error('No score loaded')
  return currentToolkit.renderToMIDI()
}

export async function getPageCount(): Promise<number> {
  if (!currentToolkit) throw new Error('No score loaded')
  return currentToolkit.getPageCount()
}

export function getToolkit(): VerovioToolkit | null {
  return currentToolkit
}

// Return the MEI the toolkit currently holds. Verovio assigns each note an
// xml:id that equals the SVG element id, so this MEI is the editable model
// behind the rendered score.
export function getMei(): string {
  if (!currentToolkit) throw new Error('No score loaded')
  return (currentToolkit as unknown as { getMEI: (o: object) => string }).getMEI({})
}

// Load an (edited) MEI string back into the toolkit and re-render the SVG and
// the MIDI so both the score and the audio reflect the edit.
export function renderFromMei(
  mei: string,
  page = 1
): { svg: string; midi: string; pageCount: number } {
  if (!currentToolkit) throw new Error('No score loaded')
  currentToolkit.loadData(mei)
  const pageCount = currentToolkit.getPageCount()
  const safePage = Math.min(Math.max(page, 1), pageCount || 1)
  const svg = currentToolkit.renderToSVG(safePage)
  const midi = currentToolkit.renderToMIDI()
  return { svg, midi, pageCount }
}
