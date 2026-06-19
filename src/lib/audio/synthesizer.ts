import { WorkerSynthesizer, Sequencer, audioBufferToWav } from 'spessasynth_lib'
import { loadSoundFont } from './soundfontLoader'

let audioContext: AudioContext | null = null
let synth: WorkerSynthesizer | null = null
let sequencer: Sequencer | null = null
let worker: Worker | null = null
let initialized = false

export async function initAudioEngine(): Promise<{ synth: WorkerSynthesizer; sequencer: Sequencer }> {
  if (initialized && synth && sequencer) {
    return { synth, sequencer }
  }

  audioContext = new AudioContext()

  // Register the inline playback worklet (sends audio from the worker to output).
  await WorkerSynthesizer.registerPlaybackWorklet(audioContext)

  // The worker runs the actual synthesis (WorkerSynthesizerCore). Inlining the
  // `new URL(...)` inside `new Worker(...)` lets Vite bundle the worker for
  // production correctly.
  worker = new Worker(new URL('./synth.worker.ts', import.meta.url), { type: 'module' })

  synth = new WorkerSynthesizer(audioContext, worker.postMessage.bind(worker))
  worker.onmessage = (e) => synth!.handleWorkerMessage(e.data)

  synth.connect(audioContext.destination)

  // Wait until the worker synthesizer has signalled it is ready before
  // loading the SoundFont — otherwise addSoundBank() may never resolve.
  await synth.isReady

  const soundFontBuffer = await loadSoundFont()
  await synth.soundBankManager.addSoundBank(soundFontBuffer, 'main')

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
