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
