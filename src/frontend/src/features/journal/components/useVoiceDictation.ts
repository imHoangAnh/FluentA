import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionResultItem = {
  transcript?: string
}

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem>>
}

type SpeechRecognitionInstance = {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
}

export function useVoiceDictation(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const callbackRef = useRef(onTranscript)

  useEffect(() => {
    callbackRef.current = onTranscript
  }, [onTranscript])

  const supported = getSpeechRecognitionConstructor() !== null

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  useEffect(() => stop, [stop])

  const toggle = useCallback(() => {
    setNotice(null)
    if (isListening) {
      stop()
      return
    }

    const Ctor = getSpeechRecognitionConstructor()
    if (!Ctor) {
      setNotice('Voice dictation is not supported in this browser.')
      return
    }

    try {
      const instance = new Ctor()
      instance.lang = 'en-US'
      instance.interimResults = false
      instance.continuous = false
      instance.onresult = (event) => {
        const lastIndex = event.results.length - 1
        const transcript = event.results[lastIndex]?.[0]?.transcript?.trim()
        if (transcript) {
          callbackRef.current(`${transcript} `)
        }
      }
      instance.onerror = (event) => {
        setNotice(event.error === 'not-allowed' ? 'Microphone access was denied.' : 'Voice dictation stopped.')
        setIsListening(false)
      }
      instance.onend = () => {
        recognitionRef.current = null
        setIsListening(false)
      }
      recognitionRef.current = instance
      setIsListening(true)
      instance.start()
    } catch {
      recognitionRef.current = null
      setIsListening(false)
      setNotice('Could not start voice dictation.')
    }
  }, [isListening, stop])

  return { supported, isListening, notice, toggle, stop, clearNotice: () => setNotice(null) }
}
