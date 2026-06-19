import { WorkerSynthesizer, Sequencer, audioBufferToWav } from 'spessasynth_lib'

let audioContext: AudioContext | null = null
let synth: WorkerSynthesizer | null = null
let sequencer: Sequencer | null = null
let worker: Worker | null = null
let initialized = false

const SOUNDFONT_URL = '/soundfonts/GeneralUser_GS.sf2'

async function fetchSoundFont(): Promise<ArrayBuffer> {
  const response = await fetch(SOUNDFONT_URL)
  if (!response.ok) {
    throw new Error(`No se pudo cargar el SoundFont: ${response.statusText}`)
  }
  return response.arrayBuffer()
}

export async function initAudioEngine(): Promise<{ synth: WorkerSynthesizer; sequencer: Sequencer }> {
  if (initialized && synth && sequencer) {
    return { synth, sequencer }
  }

  audioContext = new AudioContext()

  await WorkerSynthesizer.registerPlaybackWorklet(audioContext)

  const workerUrl = new URL(
    'spessasynth_lib/dist/spessasynth_processor.min.js',
    import.meta.url
  ).href

  worker = new Worker(workerUrl, { type: 'module' })

  synth = new WorkerSynthesizer(audioContext, worker.postMessage.bind(worker))
  worker.onmessage = (e) => synth!.handleWorkerMessage(e.data)

  synth.connect(audioContext.destination)

  const soundFontBuffer = await fetchSoundFont()
  await synth.soundBankManager.addSoundBank(soundFontBuffer, 'default')

  sequencer = new Sequencer(synth, { skipToFirstNoteOn: true })

  initialized = true
  return { synth, sequencer }
}

export function getAudioEngine() {
  return { synth, sequencer, audioContext }
}

export async function loadMidiData(midiBase64: string) {
  const { sequencer: seq } = await initAudioEngine()

  const binaryString = atob(midiBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  seq.loadNewSongList([{ binary: bytes.buffer as ArrayBuffer }])
}

export async function play() {
  const { sequencer: seq } = await initAudioEngine()
  if (audioContext?.state === 'suspended') {
    await audioContext.resume()
  }
  seq.play()
}

export function pause() {
  sequencer?.pause()
}

export function stop() {
  if (sequencer) {
    sequencer.currentTime = 0
    sequencer.pause()
  }
}

export function setPlaybackRate(rate: number) {
  if (sequencer) {
    sequencer.playbackRate = rate
  }
}

export function getCurrentTime(): number {
  return sequencer?.currentHighResolutionTime ?? 0
}

export function getDuration(): number {
  return sequencer?.duration ?? 0
}

export function isPaused(): boolean {
  return sequencer?.paused ?? true
}

export async function renderToWav(
  midiBase64: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const { synth: s } = await initAudioEngine()
  if (!s) throw new Error('Sintetizador no inicializado')

  const binaryString = atob(midiBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  sequencer?.loadNewSongList([{ binary: bytes.buffer as ArrayBuffer }])

  const audioBuffers = await s.renderAudio(44100, {
    separateChannels: false,
    extraTime: 2,
    loopCount: 0,
    progressCallback: onProgress,
  })

  const audioBuffer = audioBuffers[0]
  return audioBufferToWav(audioBuffer)
}

export function destroyAudioEngine() {
  sequencer?.pause()
  worker?.terminate()
  audioContext?.close()
  synth = null
  sequencer = null
  worker = null
  audioContext = null
  initialized = false
}
