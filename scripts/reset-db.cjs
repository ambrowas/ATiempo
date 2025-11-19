#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");

function resolveUserDataDir() {
  const home = os.homedir();
  switch (process.platform) {
    case "darwin":
      return path.join(home, "Library", "Application Support", "Atiempo");
    case "win32":
      return path.join(process.env.APPDATA || path.join(home, "AppData", "Roaming"), "Atiempo");
    default:
      return path.join(process.env.XDG_CONFIG_HOME || path.join(home, ".config"), "Atiempo");
  }
}

const userDataDir = resolveUserDataDir();
const dbDir = path.join(userDataDir, "db");

if (!fs.existsSync(dbDir)) {
  console.log(`No se encontró la carpeta DB en ${dbDir}`);
  process.exit(0);
}

try {
  fs.rmSync(dbDir, { recursive: true, force: true });
  console.log(`✅ Carpeta eliminada: ${dbDir}`);
  console.log("Se recreará automáticamente al iniciar la aplicación.");
} catch (error) {
  console.error("❌ No se pudo eliminar la carpeta de la base de datos:", error);
  process.exitCode = 1;
}
