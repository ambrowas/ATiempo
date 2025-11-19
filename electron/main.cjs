const { app, BrowserWindow, ipcMain, protocol, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { initDB } = require("./localDB.cjs");
const { mergeEmployeeRecord } = require("../utils/mergeEmployeeRecord.cjs");
const http = require("http");
const MBTiles = require("@mapbox/mbtiles");

let db;
let mainWindow;
const datosJSONPath = path.join(__dirname, "../public/datos_empleados.json");
const attendanceJSONPath = path.join(__dirname, "../public/attendance_2025.json");
const flotaJSONPublicPath = path.join(__dirname, "../public/flota.json");
const flotaJSONDistPath = path.join(__dirname, "../dist/flota.json");
const DEFAULT_ATTENDANCE_YEAR = 2025;
const TILE_PORT = 17778;
const MBTILES_PATH = path.join(
  __dirname,
  "../public/maps/malabo.mbtiles/Malabo.mbtiles"
);

let tileServer = null;
let mbtiles = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;
  const startURL = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../dist/index.html")}`;

  await mainWindow.loadURL(startURL);
  if (isDev) mainWindow.webContents.openDevTools();

  // ✅ EXTERNAL LINKS FIX
  const { shell } = require("electron");

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links (http, https, mailto, whatsapp)
    if (/^(https?:|mailto:|whatsapp:)/.test(url)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Prevent full navigation to external pages
    if (/^(https?:|mailto:|whatsapp:)/.test(url) && !url.includes("localhost")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(async () => {
  await startTileServer();
  db = await initDB(app);

  // Ensure structure exists
  if (!db.data) db.data = {};
  if (!db.data.empleados) db.data.empleados = [];
  if (!db.data.asistencia) db.data.asistencia = [];
  if (!db.data.nominas) db.data.nominas = [];
  await db.write();

  // ✅ Custom local:// protocol for employee images
  protocol.handle("local", (request) => {
    const url = new URL(request.url);
    const filePath = path.join(__dirname, "db", url.pathname);
    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, { headers: { "Content-Type": "image/jpeg" } });
  });

  // ───────────────────────────────
  // 🧩 EMPLEADOS CRUD
  // ───────────────────────────────

  ipcMain.handle("get-empleados", async () => db.data.empleados || []);

  ipcMain.handle("add-empleado", async (_, empleado) => {
    const newEmpleado = { id: Date.now(), ...empleado };
    db.data.empleados.push(newEmpleado);
    await db.write();

    broadcast("empleados-updated", newEmpleado);
    return newEmpleado;
  });

  ipcMain.handle("update-empleado", async (_, updatedEmpleado) => {
    const index = db.data.empleados.findIndex(
      (e) => String(e.id) === String(updatedEmpleado.id)
    );
    if (index !== -1) {
      db.data.empleados[index] = { ...db.data.empleados[index], ...updatedEmpleado };
      await db.write();
      await persistEmpleadoEnJson(updatedEmpleado);
      broadcast("empleado-modificado", db.data.empleados[index]);
      return db.data.empleados[index];
    }
    throw new Error("Empleado no encontrado");
  });

  ipcMain.handle("delete-empleado", async (_, empleadoId) => {
    const index = db.data.empleados.findIndex((e) => e.id === empleadoId);
    if (index !== -1) {
      const removed = db.data.empleados.splice(index, 1)[0];
      await db.write();
      broadcast("empleado-eliminado", removed);
      return removed;
    }
    throw new Error("Empleado no encontrado");
  });

  // ───────────────────────────────
  // 🧩 ASISTENCIA
  // ───────────────────────────────
  ipcMain.handle("get-asistencia", async () => db.data.asistencia || []);
  ipcMain.handle("add-asistencia", async (_, registro) => {
    db.data.asistencia.push(registro);
    await db.write();
    return registro;
  });
  ipcMain.handle("update-attendance", async (_, payload) => {
    const employeeName = payload?.employeeName;
    const month = payload?.month;
    const year = payload?.year || DEFAULT_ATTENDANCE_YEAR;
    const records = Array.isArray(payload?.records) ? payload.records : null;
    if (!employeeName || !month || !records) {
      throw new Error("Faltan datos para actualizar asistencia");
    }
    await persistAttendanceJson(employeeName, year, month, records);
    broadcast("attendance-updated", { employeeName, year, month, records });
    return { employeeName, year, month, records };
  });

  // ───────────────────────────────
  // 🧩 NOMINAS
  // ───────────────────────────────
  ipcMain.handle("get-nominas", async () => db.data.nominas || []);
  ipcMain.handle("add-nomina", async (_, nomina) => {
    db.data.nominas.push(nomina);
    await db.write();
    return nomina;
  });

  ipcMain.handle("save-flota", async (_, payload) => {
    await persistFlotaJson(payload);
    return { success: true };
  });

  // ───────────────────────────────
  // 📸 SELECT PHOTO
  // ───────────────────────────────
  ipcMain.handle("select-photo", async () => {
    const result = await dialog.showOpenDialog({
      title: "Seleccionar Foto del Empleado",
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png"] }],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const originalPath = result.filePaths[0];
    const fotosDir = path.join(__dirname, "db", "fotos");
    if (!fs.existsSync(fotosDir)) fs.mkdirSync(fotosDir, { recursive: true });

    const baseName = `empleado_${Date.now()}`;
    const ext = path.extname(originalPath)?.toLowerCase() || ".jpg";
    const safeExt = ext && ext.length <= 6 ? ext : ".jpg";
    const mainFile = `${baseName}${safeExt}`;
    const thumbFile = `${baseName}_thumb${safeExt}`;
    const mainPath = path.join(fotosDir, mainFile);
    const thumbPath = path.join(fotosDir, thumbFile);

    try {
      fs.copyFileSync(originalPath, mainPath);
      fs.copyFileSync(originalPath, thumbPath);
      console.log(`✅ Foto guardada para ${baseName}`);
      return {
        url_foto: `local://fotos/${mainFile}`,
        url_thumb: `local://fotos/${thumbFile}`,
      };
    } catch (err) {
      console.error("❌ Error copiando la foto seleccionada:", err);
      return {
        url_foto: null,
        url_thumb: null,
        error: "No se pudo guardar la imagen seleccionada.",
      };
    }
  });

  console.log("✅ LocalDB connected & IPC channels registered");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

async function startTileServer() {
  if (tileServer) return;
  try {
    mbtiles = await new Promise((resolve, reject) => {
      new MBTiles(`${MBTILES_PATH}?mode=ro`, (err, mb) => {
        if (err || !mb) reject(err || new Error("No se pudo abrir MBTiles"));
        else resolve(mb);
      });
    });
  } catch (err) {
    console.warn("⚠️ No se pudo cargar malabo.mbtiles:", err?.message);
    return;
  }

  tileServer = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${TILE_PORT}`);
      const match = url.pathname.match(/^\/malabo\/(\d+)\/(\d+)\/(\d+)\.png$/);
      if (!match) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      const z = Number(match[1]);
      const x = Number(match[2]);
      const y = Number(match[3]);
      const tmsY = (1 << z) - 1 - y;
      mbtiles.getTile(z, x, tmsY, (err, data, headers) => {
        if (err || !data) {
          res.statusCode = 404;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end("Tile missing");
          return;
        }
        res.writeHead(200, {
          "Content-Type": headers["Content-Type"] || "application/x-protobuf",
          "Cache-Control": "public, max-age=604800",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(data);
      });
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.end("Tile error");
    }
  });

  tileServer.listen(TILE_PORT, () => {
    console.log(`🗺️  Tile server listo en http://127.0.0.1:${TILE_PORT}/malabo/{z}/{x}/{y}.png`);
  });
}

// 🧩 Broadcast helper
function broadcast(channel, data) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(channel, data);
  });
}

async function persistEmpleadoEnJson(patch) {
  if (!patch?.id) return;
  try {
    if (!fs.existsSync(datosJSONPath)) {
      console.warn("⚠️ datos_empleados.json no encontrado, se omite la sincronización");
      return;
    }
    const raw = fs.readFileSync(datosJSONPath, "utf8");
    const list = JSON.parse(raw);
    const index = list.findIndex((emp) => String(emp.id) === String(patch.id));
    if (index === -1) return;
    list[index] = mergeEmployeeRecord(list[index], patch);
    fs.writeFileSync(datosJSONPath, JSON.stringify(list, null, 2), "utf8");
    console.log(`💾 datos_empleados.json actualizado (ID ${patch.id})`);
  } catch (error) {
    console.error("❌ Error sincronizando datos_empleados.json:", error);
  }
}

async function persistAttendanceJson(employeeName, year, month, records) {
  try {
    if (!fs.existsSync(attendanceJSONPath)) {
      console.warn("⚠️ attendance_2025.json no encontrado, se omite la sincronización");
      return;
    }
    const raw = fs.readFileSync(attendanceJSONPath, "utf8");
    const data = raw ? JSON.parse(raw) : {};
    const yearKey = String(year);
    if (!data[employeeName]) data[employeeName] = {};
    if (!data[employeeName][yearKey]) data[employeeName][yearKey] = {};
    data[employeeName][yearKey][month] = records;
    fs.writeFileSync(attendanceJSONPath, JSON.stringify(data, null, 2), "utf8");
    console.log(`💾 attendance_2025.json actualizado (${employeeName} - ${month} ${yearKey})`);
  } catch (error) {
    console.error("❌ Error sincronizando attendance_2025.json:", error);
    throw error;
  }
}

async function persistFlotaJson(patch) {
  if (!patch || typeof patch !== "object") return;
  const targets = [flotaJSONPublicPath, flotaJSONDistPath].filter(Boolean);
  targets.forEach((filePath) => {
    try {
      let current = {};
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        current = raw ? JSON.parse(raw) : {};
      } else {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      if (patch.vehiculos) current.vehiculos = patch.vehiculos;
      if (patch.conductores) current.conductores = patch.conductores;
      if (patch.driver_usage) current.driver_usage = patch.driver_usage;

      fs.writeFileSync(filePath, JSON.stringify(current, null, 2), "utf8");
    } catch (error) {
      console.error("❌ Error guardando flota.json:", error);
    }
  });
}
