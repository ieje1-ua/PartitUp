declare module 'verovio' {
  interface ToolkitOptions {
    scale?: number
    pageWidth?: number
    pageHeight?: number
    adjustPageHeight?: boolean
    footer?: string
    header?: string
    [key: string]: unknown
  }

  interface Toolkit {
    setOptions(options: ToolkitOptions): void
    loadData(data: string): boolean
    renderToSVG(page?: number): string
    renderToMIDI(): string
    getPageCount(): number
    getElementsAtTime(time: number): { notes: string[]; page: number }
    getTimeForElement(elementId: string): number
    getMEI(): string
    getOptions(): ToolkitOptions
  }

  interface VerovioModule {
    toolkit: new () => Toolkit
  }

  const module: Promise<VerovioModule>
  export default { module }
  export type { Toolkit, VerovioModule, ToolkitOptions }
}
