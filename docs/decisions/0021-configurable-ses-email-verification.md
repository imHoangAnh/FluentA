# 0021 Configurable SES Email Verification

## Status

Accepted

## Context

`SPEC.md` requires email registration to send a verification email via AWS SES.
The local development and Playwright environment does not have AWS credentials
or a verified SES sender identity, but tests still need deterministic
verification.

## Decision

Registration now sends verification mail through an application boundary:
`IEmailVerificationSender`.

- `Authentication:Email:Provider=ses` uses AWS SES through
  `AWSSDK.SimpleEmailV2`.
- `Authentication:Email:Provider=local` logs a delivery-accepted message
  without logging the token.
- Local registration responses continue to include the signed verification
  token/link so E2E tests can verify accounts without cloud credentials.
- SES mode uses the AWS SDK default credential chain and requires
  `Authentication:Email:FromAddress`.

## Consequences

- The SPEC email-delivery feature is represented in production-capable code.
- Local tests remain deterministic and do not depend on AWS.
- A live SES smoke still requires environment credentials, a verified sender
  identity, and a reachable recipient in the target AWS account.

## Verification

- `dotnet test src/backend/FluentA.slnx --no-restore`
- `dotnet build src/backend/FluentA.API/FluentA.API.csproj --no-restore`
