/**
 * preload.js — Safely expose backend_config to renderer
 * Runs before any web page executes.
 */

const { contextBridge } = require("electron");
const fs = require("fs");
const path = require("path");

console.log("🔧 Preload initializing...");

contextBridge.exposeInMainWorld("backendConfig", {
  load: () => {
    try {
      const configPath = path.join(__dirname, "backend_config.json");
      console.log("📄 Reading backend_config.json from:", configPath);
      const raw = fs.readFileSync(configPath, "utf8");
      const parsed = JSON.parse(raw);
      console.log("✅ backend_config.json loaded:", parsed);
      return parsed;
    } catch (err) {
      console.error("❌ Could not load backend_config.json:", err);
      return { host: "127.0.0.1", port: 5000 };
    }
  },
});

console.log("✅ Preload script loaded successfully!");
