/// <reference lib="webworker" />
// Web Worker entry point for SpessaSynth's WorkerSynthesizer.
// The WorkerSynthesizer (main thread) posts its first message containing
// { sampleRate, initialTime } and transfers a MessagePort (the worklet port).
// On that first message we create the WorkerSynthesizerCore; subsequent
// messages are forwarded to it via handleMessage().
import { WorkerSynthesizerCore } from 'spessasynth_lib'

let core: WorkerSynthesizerCore | undefined

self.onmessage = (e: MessageEvent) => {
  if (!core) {
    core = new WorkerSynthesizerCore(
      e.data,
      e.ports[0],
      self.postMessage.bind(self)
    )
  } else {
    core.handleMessage(e.data)
  }
}
