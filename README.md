# PartitUp

Aplicacion web para coralistas que permite subir partituras (imagenes, PDF, MusicXML), identificar voces automaticamente, corregirlas graficamente, y generar audio descargable.

## Como funciona (escritorio y movil)

PartitUp es una aplicacion **100% web**, accesible desde cualquier navegador (movil incluido):

- **Frontend** (Vercel): el renderizado de la partitura, la reproduccion de audio y la
  correccion de voces ocurren en el navegador. Funciona en el movil para checkeos rapidos.
- **Backend OMR** (Railway): es un servicio en la nube, **no se ejecuta en tu portatil**.
  Cuando subes una foto/PDF de una partitura, el movil la envia al servidor en la nube,
  que la convierte a MusicXML y la devuelve. No necesitas tener el portatil encendido.

El portatil solo hace falta durante el **desarrollo** (correr el proyecto en local).
Una vez desplegado, abres la URL de Vercel en el movil y todo funciona.

## SoundFont

El audio usa el SoundFont **GeneralUser GS** en formato comprimido `.sf3` (~8MB),
incluido en `public/soundfonts/GeneralUserGS.sf3`. Se descarga una sola vez por
dispositivo (cacheado via Cache API), por lo que en movil no consume datos en cada uso.

No necesitas subir el `.sf2` completo de 30MB: la version `.sf3` comprimida suena igual
y es mucho mas ligera para movil.

## Desarrollo

```bash
# Frontend
npm install
npm run dev

# Backend OMR (requiere Java 21+ y Audiveris)
cd server
npm install
npm run dev
```

## Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Renderizado**: Verovio (WASM)
- **Audio**: SpessaSynth + GeneralUser GS (.sf3)
- **Backend OMR**: Express + Audiveris
- **Hosting**: Vercel (frontend) + Railway (backend OMR)
