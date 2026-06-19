import { WorkerSynthesizer, Sequencer, audioBufferToWav } from 'spessasynth_lib'
// Vite-managed URL for the worker bundle. Using a `?url` import (instead of
// `new URL(...).href`) ensures Vite emits the asset and resolves it correctly
// in the production build — otherwise the worker 404s and audio never loads.
import processorWorkerUrl from 'spessasynth_lib/dist/spessasynth_processor.min.js?url'
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

  await WorkerSynthesizer.registerPlaybackWorklet(audioContext)

  worker = new Worker(processorWorkerUrl, { type: 'module' })

  synth = new WorkerSynthesizer(audioContext, worker.postMessage.bind(worker))
  worker.onmessage = (e) => synth!.handleWorkerMessage(e.data)

  synth.connect(audioContext.destination)

  const soundFontBuffer = await loadSoundFont()
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
