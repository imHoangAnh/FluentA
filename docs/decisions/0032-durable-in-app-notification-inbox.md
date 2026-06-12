# 0032 Durable In-App Notification Inbox

Date: 2026-06-12

## Status

Accepted

## Decision

Store user-owned in-app notifications with a unique per-user deduplication key.
Jobs create records with their delivery markers. External delivery is separate.
