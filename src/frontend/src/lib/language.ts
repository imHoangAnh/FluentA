export type LanguageProfile = {
  code: string
  name: string
  speechLanguage: string
  secondaryMeaningLabel: string
  secondaryMeaningNewLabel: string
}

const profiles: Record<string, Omit<LanguageProfile, 'code'>> = {
  en: {
    name: 'English',
    speechLanguage: 'en-US',
    secondaryMeaningLabel: 'English meaning',
    secondaryMeaningNewLabel: 'English meaning',
  },
  zh: {
    name: 'Chinese',
    speechLanguage: 'zh-CN',
    secondaryMeaningLabel: 'Pinyin',
    secondaryMeaningNewLabel: 'Pinyin',
  },
  ja: {
    name: 'Japanese',
    speechLanguage: 'ja-JP',
    secondaryMeaningLabel: 'English meaning',
    secondaryMeaningNewLabel: 'English meaning',
  },
  ko: {
    name: 'Korean',
    speechLanguage: 'ko-KR',
    secondaryMeaningLabel: 'English meaning',
    secondaryMeaningNewLabel: 'English meaning',
  },
  fr: {
    name: 'French',
    speechLanguage: 'fr-FR',
    secondaryMeaningLabel: 'English meaning',
    secondaryMeaningNewLabel: 'English meaning',
  },
}

export function languageBase(language?: string | null) {
  return (language ?? 'en').trim().toLowerCase().split(/[-_]/)[0] || 'en'
}

export function getLanguageProfile(language?: string | null): LanguageProfile {
  const base = languageBase(language)
  const profile = profiles[base]
  if (profile) return { code: base, ...profile }

  const fallbackCode = (language ?? 'en').trim() || 'en'
  return {
    code: fallbackCode,
    name: fallbackCode.toUpperCase(),
    speechLanguage: fallbackCode,
    secondaryMeaningLabel: 'English meaning',
    secondaryMeaningNewLabel: 'English meaning',
  }
}

export function selectSpeechVoice(voices: SpeechSynthesisVoice[], language?: string | null) {
  const speechLanguage = getLanguageProfile(language).speechLanguage.toLowerCase()
  const base = speechLanguage.split('-')[0]

  return voices.find((voice) => voice.lang.toLowerCase() === speechLanguage)
    ?? voices.find((voice) => {
      const voiceLanguage = voice.lang.toLowerCase()
      return voiceLanguage === base || voiceLanguage.startsWith(`${base}-`)
    })
    ?? null
}
