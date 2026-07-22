import { ArrowDown, ArrowUp, AudioLines, Languages, Mic, Save } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { SettingsErrorPanel, SettingsLoadingPanel, SettingsPanel } from '../components/SettingsPanel'
import { SettingsSaveStatus, type SettingsSaveState } from '../components/SettingsSaveStatus'
import * as practiceApi from '@/features/practice'
import { Button } from '@/shared/components/ui/button'

const practiceModes: practiceApi.PracticeMode[] = ['dictation', 'meaningToWord', 'pronunciation']
const modeMetadata = {
  dictation: { label: 'Dictation', description: 'Listen and type the word.', icon: AudioLines },
  meaningToWord: { label: 'Meaning → Word', description: 'Recall the word from its meaning.', icon: Languages },
  pronunciation: { label: 'Pronunciation', description: 'Say the word and check your speech.', icon: Mic },
} satisfies Record<practiceApi.PracticeMode, { label: string; description: string; icon: typeof AudioLines }>

function sameSequence(left: practiceApi.PracticeSettings, right: practiceApi.PracticeSettings) {
  return left.modeSequence.join('|') === right.modeSequence.join('|')
}

export function SettingsPracticePage() {
  const queryClient = useQueryClient()
  const [practiceDraft, setPracticeDraft] = useState<practiceApi.PracticeSettings | null>(null)
  const [practiceState, setPracticeState] = useState<SettingsSaveState>('idle')

  const practiceSettingsQuery = useQuery({
    queryKey: ['practice', 'settings'],
    queryFn: practiceApi.getPracticeSettings,
  })
  const updatePracticeSettings = useMutation({
    mutationFn: practiceApi.updatePracticeSettings,
    onMutate: () => setPracticeState('saving'),
    onSuccess: (settings) => {
      queryClient.setQueryData(['practice', 'settings'], settings)
      queryClient.setQueryData(['settings'], (current: { practiceSettings?: practiceApi.PracticeSettings } | undefined) =>
        current ? { ...current, practiceSettings: settings } : current)
      setPracticeDraft(null)
      setPracticeState('saved')
    },
    onError: () => setPracticeState('error'),
  })

  const savedPractice = practiceSettingsQuery.data ?? null
  const practice = practiceDraft ?? savedPractice
  const hasUnsavedChanges = practiceDraft !== null && savedPractice !== null && !sameSequence(practiceDraft, savedPractice)

  function moveMode(mode: practiceApi.PracticeMode, direction: -1 | 1) {
    if (!practice) return
    const index = practice.modeSequence.indexOf(mode)
    const target = index + direction
    if (index < 0 || target < 0 || target >= practice.modeSequence.length) return

    const next = [...practice.modeSequence]
    ;[next[index], next[target]] = [next[target], next[index]]
    setPracticeDraft({ modeSequence: next })
    setPracticeState('idle')
  }

  function toggleMode(mode: practiceApi.PracticeMode) {
    if (!practice) return
    const active = practice.modeSequence.includes(mode)
    if (active && practice.modeSequence.length === 1) return

    const updated = active
      ? { modeSequence: practice.modeSequence.filter((item) => item !== mode) }
      : { modeSequence: [...practice.modeSequence, mode] }
    if (sameSequence(updated, practice)) return

    setPracticeDraft(updated)
    setPracticeState('idle')
  }

  if (practiceSettingsQuery.isLoading && !practice) return <SettingsLoadingPanel label="Loading practice settings" />
  if (practiceSettingsQuery.isError || !practice) return <SettingsErrorPanel message="Unable to load practice settings." />

  return (
    <SettingsPanel
      eyebrow="Learning"
      title="Practice"
      description="Choose which practice modes are used and arrange their order."
      status={(
        <SettingsSaveStatus
          errorLabel="Unable to save practice settings. Your draft is still here."
          hasUnsavedChanges={hasUnsavedChanges}
          state={practiceState}
          successLabel="Practice settings saved."
        />
      )}
      footer={(
        <>
          <span className="text-xs text-muted-foreground">At least one practice mode must remain active.</span>
          <Button
            type="button"
            disabled={!hasUnsavedChanges || updatePracticeSettings.isPending}
            onClick={() => updatePracticeSettings.mutate(practice)}
          >
            <Save aria-hidden="true" />
            {updatePracticeSettings.isPending ? 'Saving practice settings...' : 'Save practice settings'}
          </Button>
        </>
      )}
    >
      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Practice modes">
        {practiceModes.map((mode) => {
          const active = practice.modeSequence.includes(mode)
          const { description, icon: Icon, label } = modeMetadata[mode]
          return (
            <Button
              key={mode}
              variant={active ? 'secondary' : 'outline'}
              className="h-auto min-h-20 flex-col items-start justify-start gap-1.5 whitespace-normal p-3 text-left"
              type="button"
              aria-pressed={active}
              onClick={() => toggleMode(mode)}
            >
              <span className="flex items-center gap-2"><Icon aria-hidden="true" />{label}</span>
              <span className="text-xs font-normal text-muted-foreground">{active ? 'Included. ' : 'Not included. '}{description}</span>
            </Button>
          )
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Practice sequence</h3>
        <ol className="mt-2 divide-y divide-border border-y border-border">
          {practice.modeSequence.map((mode, index) => {
            const label = modeMetadata[mode].label
            return (
              <li key={mode} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">{index + 1}</span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-foreground">{label}</strong>
                    <span className="text-xs text-muted-foreground">Included in every Practice session.</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveMode(mode, -1)}
                  >
                    <ArrowUp aria-hidden="true" />Up
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    disabled={index === practice.modeSequence.length - 1}
                    onClick={() => moveMode(mode, 1)}
                  >
                    <ArrowDown aria-hidden="true" />Down
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </SettingsPanel>
  )
}
