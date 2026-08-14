import { describe, expect, it } from 'vitest'
import { encodePcmWav } from './pcm-recorder'

describe('PCM pronunciation recorder', () => {
  it('encodes browser samples as 16-kHz 16-bit mono PCM WAV', async () => {
    const source = new Float32Array(48_000)
    source.fill(0.25)

    const blob = encodePcmWav(source, 48_000)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const header = new DataView(bytes.buffer)

    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe('RIFF')
    expect(new TextDecoder().decode(bytes.slice(8, 12))).toBe('WAVE')
    expect(header.getUint16(20, true)).toBe(1)
    expect(header.getUint16(22, true)).toBe(1)
    expect(header.getUint32(24, true)).toBe(16_000)
    expect(header.getUint16(34, true)).toBe(16)
    expect(header.getUint32(40, true)).toBe(32_000)
    expect(blob.type).toBe('audio/wav')
  })
})
