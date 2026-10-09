# Pronunciation Feedback

Authority: user-approved syllable/phoneme demo and grading clarification in the
2026-10-09 pronunciation update discussion.

Practice and Review retain their existing exercise layout, correctness rules,
Continue behavior, and retry limits. Red feedback does not itself fail an answer.

An assessment shows one row of syllables, grouped by word with spacing and without
repeating word labels. Each syllable uses its own accuracy score: > 80 green,
60–80 inclusive yellow, < 60 red. The UI shows no numeric scores, color legend,
or assessment sentence, including for a correct answer.

Hover, keyboard focus, or tap on a syllable opens a tooltip containing only its
phonemes. Each phoneme uses its own score and the same three color boundaries.
Escape, focus leaving the trigger, or tapping outside dismisses the tooltip.
Tooltip interaction must not trigger exercise Continue, Skip, or audio shortcuts.

Azure can return phonemes alongside syllables. Their Offset and Duration identify
the phonemes belonging to each syllable. Nested phonemes remain supported.
Missing syllable details must not be replaced with fabricated boundaries: use
the combined word pronunciation and its available phonemes, or the existing word
fallback. Older saved assessments remain readable.

Technical and microphone errors remain visible. They are not pronunciation
assessment prose, and provider failures still consume no attempt.
