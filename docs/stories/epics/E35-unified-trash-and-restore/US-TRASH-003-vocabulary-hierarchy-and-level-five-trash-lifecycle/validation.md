# Validation: US-TRASH-003

- Vocabulary board/page/word Delete operations create `Vocabulary` Trash
  entries and restore their stored hierarchy.
- Level 5 creates its own `LevelFive` entry, preserves the source word,
  restores level 0 on the next local day, and permanently deletes only Review
  state/history.
- `TrashServiceTests.LevelFiveTrash_RestoreStartsAtLevelZeroTomorrow_AndPermanentDeleteKeepsSourceWord`
  proves the Level 5 boundary. Workspace/VocabTable/Level Five UI tests passed
  in the 50-test frontend run, with immediate Trash move and Undo.
