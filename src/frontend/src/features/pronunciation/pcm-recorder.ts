const TARGET_SAMPLE_RATE = 16_000
const MAX_RECORDING_MILLISECONDS = 5_000

export type ActivePcmRecording = {
  stop(): Promise<void>
  cancel(): Promise<void>
}

export function supportsPcmRecording() {
  return typeof navigator !== 'undefined'
    && navigator.mediaDevices !== undefined
    && typeof window.AudioContext !== 'undefined'
}

export async function startPcmRecording(
  onComplete: (audio: Blob) => void | Promise<void>,
  maxDurationMilliseconds = MAX_RECORDING_MILLISECONDS,
): Promise<ActivePcmRecording> {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext
  if (!navigator.mediaDevices?.getUserMedia || !AudioContextConstructor) {
    throw new Error('Microphone recording is not supported in this browser.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
  const context = new AudioContextConstructor()
  const source = context.createMediaStreamSource(stream)
  const processor = context.createScriptProcessor(4096, 1, 1)
  const silentOutput = context.createGain()
  const chunks: Float32Array[] = []
  let stopped = false
  let timer = 0

  silentOutput.gain.value = 0
  processor.onaudioprocess = (event) => {
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
  }
  source.connect(processor)
  processor.connect(silentOutput)
  silentOutput.connect(context.destination)

  async function cleanup() {
    window.clearTimeout(timer)
    processor.disconnect()
    source.disconnect()
    silentOutput.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    await context.close()
  }

  async function stop() {
    if (stopped) return
    stopped = true
    await cleanup()
    const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0)
    const samples = new Float32Array(totalLength)
    let offset = 0
    chunks.forEach((chunk) => {
      samples.set(chunk, offset)
      offset += chunk.length
    })
    await onComplete(encodePcmWav(samples, context.sampleRate))
  }

  async function cancel() {
    if (stopped) return
    stopped = true
    await cleanup()
  }

  timer = window.setTimeout(() => void stop(), maxDurationMilliseconds)
  return { stop, cancel }
}

export function encodePcmWav(samples: Float32Array, sourceSampleRate: number) {
  const ratio = sourceSampleRate / TARGET_SAMPLE_RATE
  const outputLength = Math.max(1, Math.floor(samples.length / ratio))
  const pcm = new Int16Array(outputLength)
  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = Math.min(samples.length - 1, Math.round(index * ratio))
    const sample = Math.max(-1, Math.min(1, samples[sourceIndex] ?? 0))
    pcm[index] = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff)
  }

  const buffer = new ArrayBuffer(44 + pcm.byteLength)
  const view = new DataView(buffer)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, buffer.byteLength - 8, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, TARGET_SAMPLE_RATE, true)
  view.setUint32(28, TARGET_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcm.byteLength, true)
  for (let index = 0; index < pcm.length; index += 1) {
    view.setInt16(44 + index * 2, pcm[index] ?? 0, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
