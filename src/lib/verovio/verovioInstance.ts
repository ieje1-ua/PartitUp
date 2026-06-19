import type { Toolkit, VerovioModule } from 'verovio'

let toolkitInstance: Toolkit | null = null
let initPromise: Promise<Toolkit> | null = null

export function getVerovioToolkit(): Promise<Toolkit> {
  if (toolkitInstance) return Promise.resolve(toolkitInstance)

  if (!initPromise) {
    initPromise = import('verovio').then((verovio) =>
      verovio.default.module.then((mod: VerovioModule) => {
        const tk = new mod.toolkit()
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
    )
  }
  return initPromise
}
