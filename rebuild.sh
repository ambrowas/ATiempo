#!/bin/bash
set -e

# ===========================================
# 🧩 ATiempo Full Build Script (Backend + Electron)
# ===========================================

timestamp=$(date +"%Y-%m-%d %H:%M:%S")
echo "🕒 Starting full rebuild: $timestamp"
echo "====================================="

# ---- Clean old builds and caches ----
echo "🧹 Cleaning previous build and cache..."
rm -rf build dist release backend_dist node_modules/.cache __pycache__
echo "✅ Clean complete."

# ---- Build backend with PyInstaller ----
echo "📦 Building backend with PyInstaller..."
source .venv/bin/activate
pyinstaller build_backend.spec --clean
echo "✅ Backend built successfully."

# ---- Copy Firebase credentials ----
echo "🔧 Copying Firebase credentials into backend bundle..."
if [ -f "atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json" ]; then
  cp "atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json" "dist/atiempo_backend/"
  echo "✅ Firebase JSON copied successfully."
else
  echo "⚠️ Firebase JSON not found in project root."
fi

# ---- Build Electron app (mac + win) ----
echo "⚡ Rebuilding Electron app (mac + win)..."
npm install
npm run dist
echo "✅ Electron build complete."

# ---- Log timestamp ----
echo "🗓️ Build finished at: $(date +"%Y-%m-%d %H:%M:%S")"
echo "====================================="

# ---- Open release folder automatically (mac only) ----
if [ "$(uname)" = "Darwin" ]; then
  echo "📂 Opening release folder..."
  open release
fi

echo "🎉 ATiempo rebuild complete. New installers available in /release"
