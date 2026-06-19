import type { Toolkit } from 'verovio'
import { getVerovioToolkit } from './verovioInstance'

export interface RenderResult {
  svg: string
  pageCount: number
  midi: string
}

let currentToolkit: Toolkit | null = null

export async function loadScore(musicXml: string): Promise<RenderResult> {
  const tk = await getVerovioToolkit()
  currentToolkit = tk
  tk.loadData(musicXml)
  const pageCount = tk.getPageCount()
  const svg = tk.renderToSVG(1)
  const midi = tk.renderToMIDI()
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

export function getToolkit(): Toolkit | null {
  return currentToolkit
}
