#!/bin/bash
# =============================================
# 🧠 ATiempo launcher — runs Flask, then Electron
# =============================================

set -e  # stop on first error

# ✅ Force project root to the top-level directory (remove /public)
PROJECT_ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
echo "📂 Project root: $PROJECT_ROOT"

# Backend executable
BACKEND_PATH="$PROJECT_ROOT/dist/atiempo_backend"

# Electron binary
ELECTRON_APP="$PROJECT_ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"


# Fallback: use global electron if installed
if [ ! -x "$ELECTRON_APP" ]; then
  ELECTRON_APP="$(which electron)"
fi

if [ -z "$ELECTRON_APP" ]; then
  echo "❌ Electron binary not found!"
  exit 1
fi

# Launch backend
echo "🚀 Launching backend: $BACKEND_PATH"
"$BACKEND_PATH" &
BACKEND_PID=$!

# Wait for backend_config.json
CONFIG_PATH="$PROJECT_ROOT/dist/backend_config.json"
echo "⏳ Waiting for backend_config.json ..."
for i in {1..30}; do
  if [ -f "$CONFIG_PATH" ]; then
    echo "✅ Backend ready!"
    break
  fi
  sleep 0.5
done

# Start Electron app
echo "⚙️ Starting Electron app..."
"$ELECTRON_APP" "$PROJECT_ROOT"

# Cleanup
echo "🧹 Cleaning up backend (PID $BACKEND_PID)..."
kill "$BACKEND_PID" >/dev/null 2>&1 || true
