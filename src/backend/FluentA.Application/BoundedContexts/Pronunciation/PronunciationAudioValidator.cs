using System.Buffers.Binary;

namespace FluentA.Application.BoundedContexts.Pronunciation;

public static class PronunciationAudioValidator
{
    public const int MaxAudioBytes = 400 * 1024;
    private const int RequiredSampleRate = 16_000;
    private const int RequiredChannels = 1;
    private const int RequiredBitsPerSample = 16;
    private const int MaxDurationSeconds = 10;

    public static bool IsValidPcmWav(ReadOnlySpan<byte> audio)
    {
        if (audio.Length is < 44 or > MaxAudioBytes
            || !audio[..4].SequenceEqual("RIFF"u8)
            || !audio.Slice(8, 4).SequenceEqual("WAVE"u8)
            || BinaryPrimitives.ReadUInt32LittleEndian(audio.Slice(4, 4)) != audio.Length - 8)
        {
            return false;
        }

        var offset = 12;
        var hasValidFormat = false;
        var dataLength = 0;

        while (offset + 8 <= audio.Length)
        {
            var chunkId = audio.Slice(offset, 4);
            var chunkLengthValue = BinaryPrimitives.ReadUInt32LittleEndian(audio.Slice(offset + 4, 4));
            if (chunkLengthValue > int.MaxValue)
            {
                return false;
            }

            var chunkLength = (int)chunkLengthValue;
            var chunkStart = offset + 8;
            if (chunkLength > audio.Length - chunkStart)
            {
                return false;
            }

            if (chunkId.SequenceEqual("fmt "u8))
            {
                if (chunkLength < 16)
                {
                    return false;
                }

                var format = audio.Slice(chunkStart, chunkLength);
                var audioFormat = BinaryPrimitives.ReadUInt16LittleEndian(format[..2]);
                var channels = BinaryPrimitives.ReadUInt16LittleEndian(format.Slice(2, 2));
                var sampleRate = BinaryPrimitives.ReadUInt32LittleEndian(format.Slice(4, 4));
                var bitsPerSample = BinaryPrimitives.ReadUInt16LittleEndian(format.Slice(14, 2));
                hasValidFormat = audioFormat == 1
                    && channels == RequiredChannels
                    && sampleRate == RequiredSampleRate
                    && bitsPerSample == RequiredBitsPerSample;
            }
            else if (chunkId.SequenceEqual("data"u8))
            {
                dataLength = chunkLength;
            }

            var paddedLength = chunkLength + (chunkLength & 1);
            if (paddedLength > audio.Length - chunkStart)
            {
                break;
            }

            offset = chunkStart + paddedLength;
        }

        var bytesPerSecond = RequiredSampleRate * RequiredChannels * (RequiredBitsPerSample / 8);
        return hasValidFormat
            && dataLength > 0
            && dataLength % (RequiredBitsPerSample / 8) == 0
            && dataLength <= bytesPerSecond * MaxDurationSeconds;
    }
}
