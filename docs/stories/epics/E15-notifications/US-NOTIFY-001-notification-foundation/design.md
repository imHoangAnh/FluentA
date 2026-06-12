# Design

Notifications carry type, title, message, read timestamp, and a unique
user/deduplication key. Jobs persist them with their idempotency markers.
