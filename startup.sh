#!/bin/sh
set -eu
cd /workspace
# :8081 is QA-only — a revive must never inherit a stale built-output preview.
node scripts/preview.mjs stop || true

# A restored server can still answer HTTP while its process is invisible to the
# preview (unreadable /proc maps). Treat that as down and start a fresh one.
visible_vite() {
  for p in /proc/[0-9]*; do
    cmd=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null || true)
    case "$cmd" in
      *vite\ dev*)
        if head -c 1 "$p/maps" >/dev/null 2>&1; then
          return 0
        fi
        ;;
    esac
  done
  return 1
}

stop_vite() {
  for p in /proc/[0-9]*; do
    cmd=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null || true)
    case "$cmd" in
      *vite\ dev*|*with-app-env.mjs\ vite*|*npm\ run\ dev*)
        kill "${p##*/}" 2>/dev/null || true
        ;;
    esac
  done
  i=0
  while [ "$i" -lt 20 ]; do
    curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/ || return 0
    i=$((i + 1))
    sleep 0.3
  done
  for p in /proc/[0-9]*; do
    cmd=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null || true)
    case "$cmd" in
      *vite\ dev*) kill -9 "${p##*/}" 2>/dev/null || true ;;
    esac
  done
}

wait_http() {
  i=0
  while [ "$i" -lt 40 ]; do
    curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8080/ && return 0
    i=$((i + 1))
    sleep 0.25
  done
  return 0
}

# Tell the live preview which server to show. Harmless if the control
# endpoint is not up yet; retry briefly so a cold wake still attaches.
pin_preview() {
  i=0
  while [ "$i" -lt 20 ]; do
    if curl -sf -o /dev/null --max-time 1 -X POST http://127.0.0.1:6015/__control/target \
      -H 'content-type: application/json' \
      -d '{"port":8080}'; then
      return 0
    fi
    i=$((i + 1))
    sleep 0.25
  done
  return 0
}

if ! curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/ || ! visible_vite; then
  stop_vite
  npm run dev >>/tmp/app-startup.log 2>&1 &
  wait_http
fi

pin_preview
exit 0
