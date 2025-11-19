import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { mergeEmployeeRecord } = require("./utils/mergeEmployeeRecord.cjs");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMPLOYEE_DATA_PATH = path.resolve(__dirname, "public/datos_empleados.json");
const ATTENDANCE_DATA_PATH = path.resolve(__dirname, "public/attendance_2025.json");
const DEFAULT_ATTENDANCE_YEAR = "2025";
const MBTILES_PATH = path.resolve(
  __dirname,
  "public/maps/malabo.mbtiles/Malabo.mbtiles"
);

const readRequestBody = async (req: any) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
};

const apiPlugin = () => {
  const MBTiles = require("@mapbox/mbtiles");
  let mbtilesPromise: Promise<any> | null = null;

  const getMBTiles = () => {
    if (!mbtilesPromise) {
      mbtilesPromise = new Promise((resolve, reject) => {
        if (!fs.existsSync(MBTILES_PATH)) {
          return reject(new Error("Archivo MBTiles no encontrado"));
        }
        new MBTiles(`${MBTILES_PATH}?mode=ro`, (err: Error | null, mbtiles: any) => {
          if (err || !mbtiles) {
            reject(err || new Error("No se pudo abrir el MBTiles"));
          } else {
            resolve(mbtiles);
          }
        });
      });
    }
    return mbtilesPromise;
  };

  return {
    name: "employee-attendance-api-plugin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? "", "http://local.dev");

      if (req.method === "GET") {
        const tileMatch = url.pathname.match(/^\/tiles\/malabo\/(\d+)\/(\d+)\/(\d+)\.png$/);
        if (tileMatch) {
          const [, zStr, xStr, yStr] = tileMatch;
          const z = Number(zStr);
          const x = Number(xStr);
          const y = Number(yStr);
          if (Number.isNaN(z) || Number.isNaN(x) || Number.isNaN(y)) {
            res.statusCode = 400;
            res.end("Coordenadas inválidas");
            return;
          }
          try {
            const mbtiles = await getMBTiles();
            const tmsY = (1 << z) - 1 - y;
            mbtiles.getTile(z, x, tmsY, (err, data, headers) => {
              if (err || !data) {
                res.statusCode = 404;
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.end("Tile no encontrada");
                return;
              }
              res.statusCode = 200;
              res.setHeader(
                "Content-Type",
                headers["Content-Type"] || "application/x-protobuf"
              );
              res.setHeader("Cache-Control", "public, max-age=604800");
              res.setHeader("Access-Control-Allow-Origin", "*");
              res.end(data);
            });
          } catch (error) {
            console.error("Error sirviendo tile:", error);
            res.statusCode = 500;
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end("No se pudo leer el MBTiles");
          }
          return;
        }
      }

      if (req.method !== "POST") return next();

      if (url.pathname.startsWith("/api/employees/")) {
        const employeeId = url.pathname.replace("/api/employees/", "");
        if (!employeeId) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, message: "ID de empleado inválido" }));
          return;
        }

        try {
          const body = await readRequestBody(req);
          const updates = body.updates ?? body;

          if (!fs.existsSync(EMPLOYEE_DATA_PATH)) {
            throw new Error("datos_empleados.json no existe");
          }

          const list = JSON.parse(fs.readFileSync(EMPLOYEE_DATA_PATH, "utf8"));
          const index = list.findIndex((emp: any) => String(emp.id) === String(employeeId));
          if (index === -1) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, message: "Empleado no encontrado" }));
            return;
          }

          const updatedRecord = mergeEmployeeRecord(list[index], updates);
          list[index] = updatedRecord;

          fs.writeFileSync(EMPLOYEE_DATA_PATH, JSON.stringify(list, null, 2), "utf8");

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, empleado: updatedRecord }));
        } catch (error: any) {
          console.error("Error actualizando datos_empleados.json:", error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              message: "No se pudo guardar la información",
              error: error?.message,
            })
          );
        }
        return;
      }

      if (url.pathname === "/api/attendance") {
        try {
          const body = await readRequestBody(req);
          const employeeName = body.employeeName;
          const year = String(body.year || DEFAULT_ATTENDANCE_YEAR);
          const month = body.month;
          const records = Array.isArray(body.records) ? body.records : null;

          if (!employeeName || !month || !records) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: false,
                message: "Faltan datos para actualizar asistencia",
              })
            );
            return;
          }

          if (!fs.existsSync(ATTENDANCE_DATA_PATH)) {
            throw new Error("attendance_2025.json no existe");
          }

          const data = JSON.parse(fs.readFileSync(ATTENDANCE_DATA_PATH, "utf8")) || {};
          if (!data[employeeName]) data[employeeName] = {};
          if (!data[employeeName][year]) data[employeeName][year] = {};
          data[employeeName][year][month] = records;

          fs.writeFileSync(ATTENDANCE_DATA_PATH, JSON.stringify(data, null, 2), "utf8");

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, records }));
        } catch (error: any) {
          console.error("Error actualizando attendance_2025.json:", error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              message: "No se pudo guardar la asistencia",
              error: error?.message,
            })
          );
        }
        return;
      }

        return next();
      });
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  base: "./",
  plugins: [react(), ...(command === "serve" ? [apiPlugin()] : [])],
}));
