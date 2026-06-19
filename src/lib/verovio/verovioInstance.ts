import createVerovioModule from 'verovio/wasm'
import { VerovioToolkit } from 'verovio/esm'

let toolkitInstance: VerovioToolkit | null = null
let initPromise: Promise<VerovioToolkit> | null = null

export function getVerovioToolkit(): Promise<VerovioToolkit> {
  if (toolkitInstance) return Promise.resolve(toolkitInstance)

  if (!initPromise) {
    initPromise = createVerovioModule().then((VerovioModule) => {
      const tk = new VerovioToolkit(VerovioModule)
      tk.setOptions({
        scale: 40,
        pageWidth: 2100,
        pageHeight: 2970,
        adjustPageHeight: true,
        footer: 'none',
        header: 'none',
      })
      toolkitInstance = tk
      return tk
    })
  }
  return initPromise
}
