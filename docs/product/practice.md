# Practice Sessions And Recovery

Authority: user choices accepted in the Vocabulary / Practice / Review
migration discussion, recorded on 2026-10-04.

For example, one word goes through Dictation, Word to Meaning, Pronunciation,
then Recap before the next word begins. Practice keeps this fixed sequence and
has no shuffle, ordering or settings UI. Ordinary successful answers show
feedback until Continue. Practice pronunciation retries remain unlimited;
Review's two-attempt pronunciation rule is unchanged.

## Authoritative Progress

For example, a correct answer reaches the server but its response is lost.
The client reads the persisted session and automatically proceeds to the next
saved step or word. If the answer is not saved, its draft stays available for
manual retry. If progress cannot be read, answer submission is blocked and
Retry connection performs a read, never an automatic resubmission.

Answer and pronunciation requests may carry a UUID `requestId`. It becomes the
existing PracticeAttempt primary key; no new database column is required.
Replaying the same request returns saved progress without another attempt.
Reusing an answer id for a different item, step, kind or answer is a conflict.
Pronunciation ids identify one recorded submission; replays return its saved
assessment. GET includes attempt counts and the last saved attempt, including
its id and assessment, so a saved wrong answer can also be recognized.

Mutations lock the owned session row in a transaction before rereading and
writing progress. Pronunciation assesses audio before taking that lock and
reloads the target after acquiring it. GET reads session, items and attempts
from one consistent PostgreSQL snapshot. The frontend cancels stale reads
before mutations and checks active sessions every ten seconds in visible tabs.

For example, permanent deletion on another screen abandons a session that is
currently recording. Once GET reports `abandoned`, the client cancels recording
and speech, blocks answers, and returns to `/practice` with an explanation.
Late audio callbacks cannot submit to that session. Completed history remains
subject to the Vocabulary history-preservation contract.

## Recap Enrollment

For example, selecting Remembered (level 3) must either add the Review state
and finish that Recap together, or save neither change. The Practice service
stages enrollment and progress in the shared context and saves once inside
one transaction. Enrollment also locks the owned word, so simultaneous Recaps
in different sessions cannot overwrite a newly active Review schedule.
Expected failures and exceptions roll back; infrastructure
exceptions propagate to the existing API boundary.

An already-active Review word keeps its level and due date and shows exactly
`Already in review`. Repeating enrollment for a completed item does not enroll
or advance it twice. The first saved result remains authoritative.

After a failed enrollment, GET determines whether it was saved. Saved progress
advances automatically. Otherwise the selected level remains highlighted with
an explicit Try again action and the toast
`Fail to add word to review, please try again`. No enrollment is automatically
resubmitted. Lost completion responses are also checked against server status.
