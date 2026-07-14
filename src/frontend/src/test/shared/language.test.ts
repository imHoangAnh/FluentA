import { describe, expect, it } from 'vitest'
import { getLanguageProfile, selectSpeechVoice } from '@/shared/lib/language'

function voice(lang: string) {
  return { lang } as SpeechSynthesisVoice
}

describe('language profiles', () => {
  it('labels Chinese secondary meaning as Pinyin and maps speech language', () => {
    const profile = getLanguageProfile('zh')

    expect(profile.secondaryMeaningLabel).toBe('Pinyin')
    expect(profile.secondaryMeaningNewLabel).toBe('Pinyin')
    expect(profile.speechLanguage).toBe('zh-CN')
  })

  it('keeps unknown language codes as speech fallback', () => {
    const profile = getLanguageProfile('de')

    expect(profile.secondaryMeaningLabel).toBe('English meaning')
    expect(profile.speechLanguage).toBe('de')
  })

  it('selects exact speech voices before base-language fallbacks', () => {
    expect(selectSpeechVoice([voice('zh-TW'), voice('zh-CN')], 'zh')?.lang).toBe('zh-CN')
    expect(selectSpeechVoice([voice('zh-HK')], 'zh')?.lang).toBe('zh-HK')
    expect(selectSpeechVoice([voice('fr-FR')], 'zh')).toBeNull()
  })
})
