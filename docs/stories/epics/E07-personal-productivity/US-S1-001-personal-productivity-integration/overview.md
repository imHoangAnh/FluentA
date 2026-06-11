# Overview

## Current Behavior

Todo daily/week planning and Countdown events are implemented, protected, and
reachable from Workspace navigation. Todo completion publishes a user-scoped
SignalR event, but the frontend listens only while the Todo page is mounted.

## Target Behavior

Todo completion synchronization remains active across every authenticated app
route, Todo and Countdown navigation remains coherent, and the complete S1
personal-productivity slice has consolidated integration and regression proof.

## Affected Users

- Authenticated FluentA learners using multiple tabs or moving between routes.

## Affected Product Docs

- `docs/product/personal-productivity.md`

## Non-Goals

- Dashboard UI or aggregation.
- Countdown synchronization.
- New API, schema, or SignalR event contracts.
