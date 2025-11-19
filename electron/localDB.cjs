// electron/localDB.cjs
const path = require("path");
const fs = require("fs");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const seedFile = path.join(__dirname, "../public/datos_empleados.json");
const seedFotos = path.join(__dirname, "../public/fotos_empleados");

async function initDB(electronApp) {
  const userDataDir = electronApp.getPath("userData");
  const dbDir = path.join(userDataDir, "db");
  const dbPath = path.join(dbDir, "data.json");
  const fotosDir = path.join(dbDir, "fotos");

  fs.mkdirSync(dbDir, { recursive: true });
  fs.mkdirSync(fotosDir, { recursive: true });

  const adapter = new JSONFile(dbPath);
  const db = new Low(adapter, { empleados: [], asistencia: [], nominas: [] });

  await db.read();

  if (!db.data.empleados || db.data.empleados.length === 0) {
    try {
      console.log("🌱 Seeding database from:", seedFile);

      const raw = fs.readFileSync(seedFile, "utf-8");
      const seedData = JSON.parse(raw);

      const empleadosArray = seedData.map((emp, index) => {
        // Handle photo copy if exists
        if (emp.url_foto) {
          const filename = path.basename(emp.url_foto);
          const srcFoto = path.join(seedFotos, filename);
          const destFoto = path.join(fotosDir, filename);

          if (fs.existsSync(srcFoto)) {
            fs.copyFileSync(srcFoto, destFoto);
            emp.url_foto = destFoto;
          } else {
            console.warn("⚠️ Foto not found for:", emp.nombre);
            emp.url_foto = null;
          }
        }

        return {
          id: emp.id || index + 1, // ✅ Preserve the 6-digit ID
          ...emp,
        };
      });

      db.data = { empleados: empleadosArray, asistencia: [], nominas: [] };
      await db.write();
      console.log("✅ Database seeded with", empleadosArray.length, "employees");
    } catch (err) {
      console.error("❌ Error seeding database:", err);
    }
  } else {
    console.log("📁 Existing database loaded with", db.data.empleados.length, "employees");
  }

  console.log("✅ LocalDB initialized at:", dbPath);
  return db;
}

module.exports = { initDB };
