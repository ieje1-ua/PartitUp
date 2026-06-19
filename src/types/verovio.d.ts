// La forma soportada de usar Verovio en el navegador es combinar el modulo WASM
// (verovio/wasm) con la clase VerovioToolkit (verovio/esm).

declare module 'verovio/wasm' {
  // createVerovioModule() devuelve una promesa con el modulo Emscripten ya inicializado.
  const createVerovioModule: () => Promise<unknown>
  export default createVerovioModule
}

declare module 'verovio/esm' {
  export interface ToolkitOptions {
    scale?: number
    pageWidth?: number
    pageHeight?: number
    adjustPageHeight?: boolean
    footer?: string
    header?: string
    [key: string]: unknown
  }

  export class VerovioToolkit {
    constructor(module: unknown)
    setOptions(options: ToolkitOptions): void
    loadData(data: string): boolean
    renderToSVG(page?: number): string
    renderToMIDI(): string
    getPageCount(): number
    getElementsAtTime(time: number): { notes: string[]; page: number }
    getTimeForElement(elementId: string): number
    getMEI(): string
  }

  export function enableLog(level: number): void
}
