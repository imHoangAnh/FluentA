FROM node:22.22.1-alpine3.23@sha256:8094c002d08262dba12645a3b4a15cd6cd627d30bc782f53229a2ec13ee22a00 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VCS_REF
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID

RUN google_client_prefix="${VITE_GOOGLE_CLIENT_ID%.apps.googleusercontent.com}" \
    && test "${#VCS_REF}" -eq 40 \
    && case "$VCS_REF" in *[!0-9a-f]*) exit 1 ;; esac \
    && test "$VITE_API_URL" = "https://api.sophion.io.vn/api/v1" \
    && test -n "$google_client_prefix" \
    && test "$google_client_prefix" != "$VITE_GOOGLE_CLIENT_ID" \
    && case "$VITE_GOOGLE_CLIENT_ID" in *[!0-9A-Za-z._-]*) exit 1 ;; esac \
    && npm run build

FROM caddy:2.11.4-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648 AS final

ARG VCS_REF
LABEL org.opencontainers.image.revision=$VCS_REF

COPY --from=build /app/dist /srv
