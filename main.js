/**
 * main.js — ATiempo (Production + Dev hybrid + Persistent Logging)
 */

const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");


const http = require("http");

// Wait for backend to respond before loading
async function waitForBackend(url, maxTries = 20, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode < 500) return resolve(true);
        attempts++;
        if (attempts < maxTries) setTimeout(check, interval);
        else reject(new Error("Backend not reachable"));
      }).on("error", () => {
        attempts++;
        if (attempts < maxTries) setTimeout(check, interval);
        else reject(new Error("Backend not reachable"));
      });
    };
    check();
  });
}


// ============================================================
// 🔹 Log file setup (absolute + persistent)
// ============================================================
let logDir;

try {
  // Preferred: ~/Library/Logs/ATiempo
  logDir = path.join(app.getPath("logs"), "ATiempo");
} catch {
  // Fallback: ~/Library/Application Support/ATiempo/logs
  logDir = path.join(app.getPath("userData"), "logs");
}

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, "atiempo_runtime.log");

function log(message) {
  const timestamp = new Date().toISOString();
  const fullMsg = `[${timestamp}] ${message}\n`;
  console.log(fullMsg.trim());
  try {
    fs.appendFileSync(logFile, fullMsg);
  } catch (err) {
    console.warn("⚠️ Failed to write to log file:", err.message);
  }
}

log("🟢 Application starting...");
app.setAppUserModelId("com.iniciativas.atiempo");

// Prevent duplicate instances
if (!app.requestSingleInstanceLock()) {
  log("🚫 Second instance detected — quitting.");
  app.quit();
  process.exit(0);
}

let mainWindow;
let backendProcess;

// ============================================================
// 🧩 Helpers
// ============================================================
function isPackaged() {
  return app.isPackaged || process.env.NODE_ENV === "production";
}

// ------------------------------------------------------------
// Read backend_config.json (robust retry logic)
// ------------------------------------------------------------
async function readBackendConfig(maxRetries = 24, interval = 500) {
  // ✅ Prefer live backend_config.json for dev mode
  const devLivePath = path.join(process.cwd(), "backend_config.json");
  const resourcePath = path.join(process.resourcesPath, "dist", "backend_config.json");
  const tempBase = app.getPath("temp");
  const tempPattern = /^_MEI/;

  log("🔍 Looking for backend_config.json ...");
  log(`📂 Dev live path: ${devLivePath}`);
  log(`📂 Resource path: ${resourcePath}`);
  log(`📂 Temp base: ${tempBase}`);

  return new Promise((resolve) => {
    let attempts = 0;

    const tryRead = () => {
      attempts++;

      let meiFolder;
      try {
        meiFolder = fs.readdirSync(tempBase).find((f) => tempPattern.test(f));
      } catch {
        meiFolder = null;
      }

      const tempConfig = meiFolder
        ? path.join(tempBase, meiFolder, "backend_config.json")
        : null;

      // ✅ Removed dist path to prevent stale config
      const candidatePaths = [devLivePath, resourcePath, tempConfig].filter(Boolean);

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          try {
            const data = JSON.parse(fs.readFileSync(p, "utf8"));
            if (data && data.port) {
              log(`✅ Loaded backend_config.json from ${p}: ${JSON.stringify(data)}`);
              return resolve({ host: data.host || "127.0.0.1", port: data.port });
            }
          } catch (err) {
            log(`⚠️ Attempt ${attempts}: failed to parse config at ${p} (${err.message})`);
          }
        } else {
          log(`⏳ Attempt ${attempts}: not found at ${p}`);
        }
      }

      if (attempts < maxRetries) setTimeout(tryRead, interval);
      else {
        log("❌ backend_config.json not found after retries — using fallback 127.0.0.1:5000");
        resolve({ host: "127.0.0.1", port: 5000 });
      }
    };

    tryRead();
  });
}

// ============================================================
// 🪟 Window creation
// ============================================================
async function createWindow(backendUrl) {
  log(`🪟 Launching BrowserWindow → ${backendUrl}`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      partition: "persist:atiempo",
      experimentalFeatures: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  try {
    log("⏳ Waiting for backend to respond...");
    await waitForBackend(backendUrl);
    log("✅ Backend reachable, loading URL now...");
    mainWindow.loadURL(backendUrl);
  } catch (err) {
    log(`❌ Backend unreachable: ${err.message}`);
    mainWindow.loadURL(
      "data:text/html,<h2 style='font-family:sans-serif;color:red;'>Backend not reachable.</h2>"
    );
  }

  mainWindow.on("closed", () => {
    log("❎ Main window closed.");
    mainWindow = null;
  });
}



// ------------------------------------------------------------
// ✅ Start backend — Dev & Production safe version
// ------------------------------------------------------------
function startBackend() {
  let backendPath;

  // 🧠 Skip backend spawn in dev — backend is already started by npm concurrently
  if (!isPackaged()) {
    const devConfigPath = path.join(__dirname, "backend_config.json");
    log("🧩 Dev mode detected — skipping backend spawn, using running Flask server...");
    readBackendConfig().then((config) => {
      const url = `http://${config.host || "127.0.0.1"}:${config.port || 5000}`;
      log(`✅ Using dev backend → ${url}`);
      createWindow(url);
    });
    return;
  }

  // ✅ Production (packaged) mode — start binary
  backendPath = path.join(process.resourcesPath, "dist", "atiempo_backend", "atiempo_backend");
  log(`🚀 Starting packaged backend from: ${backendPath}`);

  if (!fs.existsSync(backendPath)) {
    log(`❌ Backend binary not found at ${backendPath}`);
    return;
  }

  const cwdPath = path.dirname(backendPath);
  backendProcess = spawn(backendPath, [], { cwd: cwdPath });

  // 🕒 Safety fallback timer (12s)
  const fallbackTimer = setTimeout(() => {
    if (!mainWindow) {
      const fallbackUrl = "http://127.0.0.1:43433";
      log(`⚠️ No startup message detected — opening fallback ${fallbackUrl}`);
      createWindow(fallbackUrl);
    }
  }, 12000);

  backendProcess.stdout.on("data", async (data) => {
    const output = data.toString().trim();
    log(`Backend: ${output}`);

    if (!mainWindow && output.includes("backend_config.json saved at")) {
      const config = await readBackendConfig();
      const url = `http://${config.host}:${config.port}`;
      clearTimeout(fallbackTimer);
      log(`✅ Config confirmed — launching window at ${url}`);
      createWindow(url);
      return;
    }

    if (output.includes("Running on http://")) {
      const match = output.match(/http:\/\/[0-9.]+:\d+/);
      let url = match ? match[0] : null;
      if (url) {
        url = url.replace("0.0.0.0", "127.0.0.1");
        if (!mainWindow) {
          clearTimeout(fallbackTimer);
          log(`✅ Backend online → opening window at ${url}`);
          createWindow(url);
        }
      }
    }
  });

  backendProcess.stderr.on("data", (data) => {
    log(`Backend Error: ${data.toString().trim()}`);
  });

  backendProcess.on("exit", (code) => {
    log(`⚠️ Backend exited with code ${code}`);
  });
}


// ============================================================
// 🔄 Electron lifecycle
// ============================================================
app.whenReady().then(() => {
  log("⚙️ Electron app ready — starting backend");
  startBackend();
});

app.on("before-quit", async () => {
  log("💾 Flushing session data before quit...");
  if (mainWindow?.webContents?.session) {
    await mainWindow.webContents.session.flushStorageData();
  }
});

app.on("window-all-closed", () => {
  log("❎ All windows closed, killing backend.");
  if (backendProcess) backendProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const config = await readBackendConfig();
    const url = `http://${config.host}:${config.port}`;
    log(`🔁 Reopening window at ${url}`);
    createWindow(url);
  }
});

process.on("SIGINT", () => {
  log("🧹 Caught SIGINT — exiting cleanly.");
  if (backendProcess) backendProcess.kill();
  app.quit();
});
