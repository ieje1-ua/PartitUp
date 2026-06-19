# PartitUp

Aplicacion web para coralistas que permite subir partituras (imagenes, PDF, MusicXML), identificar voces automaticamente, corregirlas graficamente, y generar audio descargable.

## Desarrollo

```bash
# Frontend
npm install
npm run dev

# Backend OMR (requiere Java 21+)
cd server
npm install
npm run dev
```

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Renderizado**: Verovio (WASM)
- **Audio**: SpessaSynth
- **Backend OMR**: Express + Audiveris
