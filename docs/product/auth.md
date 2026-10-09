# Authentication and Google account linking

Authority: the user approved the 2026-10-09 security fix after the audit found
that a previously verified third-party Google email could automatically gain
access to a password account with the same address.

## Google sign-in

- A new email may create a Google-only account after the Google ID token is
  verified for this application's client ID and reports a verified email.
- An existing Google-linked account may sign in only when the token's Google
  subject matches the stored `google_id`.
- Google sign-in must not attach a Google subject to an existing password
  account by matching email alone. Return `GOOGLE_LINK_REQUIRED` with no access
  or refresh cookie when that account has no password-confirmed Google link.
- A different subject cannot sign in to an already confirmed Google link.

## Explicit link

The owner signs in with the password account, opens Profile, enters the current
password, and chooses a Google account. `POST /api/v1/auth/link-google` requires
an authenticated access cookie, an allowed browser origin, the current password,
and a valid Google ID token whose verified email matches the account email.
The database update must still match the current password hash, active user and
email, and must not replace a confirmed link to another subject. A failed check
does not create an authentication credential or change `google_id`.

`users.google_link_confirmed_at` distinguishes explicit links from older links.
An older password account with `google_id` but no confirmation cannot use Google
sign-in until the password owner confirms that subject or replaces it. The
The fresh `InitialBaseline` schema starts with no older dual-credential accounts
or refresh tokens. If data from an older database is imported later, it must be
reviewed separately before enabling Google sign-in for those accounts.
