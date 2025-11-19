// src/components/Flota.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
  FormEvent,
  CSSProperties,
} from "react";
import { jsPDF } from "jspdf";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useSpring, animated } from "@react-spring/web";
import elebiLogo from "../assets/elebilogo.png";
import { assetUrl, normalizeAssetPath } from "../utils/assetPaths";

type VehicleFormState = {
  id: string;
  descripcion: string;
  marca: string;
  modelo: string;
  año: string;
  uso: string;
  matricula: string;
  color: string;
  tipo: string;
  fecha_adquisicion: string;
  precio_compra: string;
  factura_compra?: string;
  titulo_propiedad?: string;
  asegurado: boolean;
  foto?: string;
  propietario?: string;
  kilometraje?: string;
  departamento?: string;
  asignacion?: string;
  conductor?: string;
};

const VEHICLE_PLACEHOLDER = "./fotos_vehiculos/placeholder_vehicle.jpg";
const VEHICLE_PLACEHOLDER_URL =
  assetUrl(VEHICLE_PLACEHOLDER) || "https://placehold.co/320x160?text=Veh%C3%ADculo";

const normalizeVehiclePhotoPath = (vehiculo: any) => {
  const normalizedSource = vehiculo?.foto
    ? normalizeAssetPath(vehiculo.foto)
    : undefined;
  const direct = assetUrl(normalizedSource);
  if (direct) return direct;

  if (vehiculo?.modelo || vehiculo?.marca) {
    const guess = `./fotos_vehiculos/${vehiculo.año || ""}_${vehiculo.marca || ""}_${vehiculo.modelo || ""}.jpg`
      .replace(/\s+/g, "_");
    const guessUrl = assetUrl(guess);
    if (guessUrl) return guessUrl;
  }

  return VEHICLE_PLACEHOLDER_URL;
};


/* ================= Icons (inline, no deps) ================= */
const ChevronDown: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const ChevronRight: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const MapPin: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
const FileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const MinusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14" />
  </svg>
);

/* ================= Map vehicle marker helpers (SVG cars) ================= */

type VehicleIconEntry = { bg: string; glyph: string };

const VEHICLE_ICON_PALETTE: VehicleIconEntry[] = [
  {
    bg: "#0ea5e9",
    glyph: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" width="26" height="52">
      <rect x="18" y="8" width="28" height="112" rx="6" fill="__VEHICLE_COLOR__" stroke="#111" stroke-width="2"/>
      <rect x="20" y="20" width="24" height="20" fill="#444" rx="2"/>
      <rect x="20" y="88" width="24" height="20" fill="#444" rx="2"/>
      <circle cx="16" cy="28" r="4" fill="#222"/>
      <circle cx="48" cy="28" r="4" fill="#222"/>
      <circle cx="16" cy="100" r="4" fill="#222"/>
      <circle cx="48" cy="100" r="4" fill="#222"/>
    </svg>`,
  },
  {
    bg: "#a78bfa",
    glyph: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" width="26" height="52">
      <rect x="16" y="6" width="32" height="116" rx="8" fill="__VEHICLE_COLOR__" stroke="#111" stroke-width="2"/>
      <rect x="18" y="18" width="28" height="24" fill="#333" rx="2"/>
      <rect x="18" y="86" width="28" height="24" fill="#333" rx="2"/>
      <circle cx="14" cy="28" r="4" fill="#111"/>
      <circle cx="50" cy="28" r="4" fill="#111"/>
      <circle cx="14" cy="100" r="4" fill="#111"/>
      <circle cx="50" cy="100" r="4" fill="#111"/>
    </svg>`,
  },
  {
    bg: "#f59e0b",
    glyph: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" width="26" height="52">
      <rect x="18" y="8" width="28" height="112" rx="6" fill="__VEHICLE_COLOR__" stroke="#111" stroke-width="2"/>
      <rect x="20" y="20" width="24" height="18" fill="#222"/>
      <rect x="22" y="56" width="20" height="8" fill="#000"/>
      <rect x="20" y="90" width="24" height="18" fill="#222"/>
      <text x="32" y="64" text-anchor="middle" font-size="9" fill="#fff" font-family="sans-serif">TAXI</text>
    </svg>`,
  },
  {
    bg: "#22c55e",
    glyph: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" width="26" height="52">
      <rect x="14" y="4" width="36" height="120" rx="10" fill="__VEHICLE_COLOR__" stroke="#111" stroke-width="2"/>
      <rect x="18" y="20" width="28" height="22" fill="#333" rx="2"/>
      <rect x="18" y="86" width="28" height="22" fill="#333" rx="2"/>
      <rect x="20" y="58" width="24" height="12" fill="#fff" opacity="0.5"/>
    </svg>`,
  },
  {
    bg: "#ef4444",
    glyph: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" width="26" height="52">
      <rect x="18" y="8" width="28" height="112" rx="6" fill="__VEHICLE_COLOR__" stroke="#111" stroke-width="2"/>
      <rect x="24" y="10" width="16" height="6" fill="#0044ff"/>
      <rect x="20" y="30" width="24" height="16" fill="#222"/>
      <rect x="20" y="86" width="24" height="16" fill="#222"/>
      <text x="32" y="66" text-anchor="middle" font-size="10" fill="#fff" font-family="sans-serif">POL</text>
    </svg>`,
  },
  {
    bg: "#14b8a6",
    glyph: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 128" width="26" height="52">
      <rect x="16" y="6" width="32" height="116" rx="6" fill="__VEHICLE_COLOR__" stroke="#111" stroke-width="2"/>
      <rect x="20" y="20" width="24" height="22" fill="#333"/>
      <rect x="20" y="86" width="24" height="22" fill="#333"/>
      <circle cx="32" cy="64" r="2" fill="#000" opacity="0.5"/>
    </svg>`,
  },
];

type LngLatTuple = [number, number];

const VEHICLE_COLORS: Record<string, string> = {
  BN0024XG: "#2563eb",
  BS2456FM: "#16a34a",
  BN1334KS: "#f97316",
  AN1345XX: "#dc2626",
  WN2020: "#9333ea",
};

const VEHICLE_ROUTES: Record<string, { path: LngLatTuple[]; color: string }> = {
  BN0024XG: {
    color: VEHICLE_COLORS.BN0024XG,
    path: [
      [8.7705, 3.745],
      [8.7705, 3.752],
      [8.777, 3.752],
      [8.777, 3.758],
      [8.784, 3.758],
    ],
  },
  BS2456FM: {
    color: VEHICLE_COLORS.BS2456FM,
    path: [
      [8.748, 3.739],
      [8.748, 3.746],
      [8.756, 3.746],
      [8.756, 3.752],
      [8.764, 3.752],
    ],
  },
  BN1334KS: {
    color: VEHICLE_COLORS.BN1334KS,
    path: [
      [8.79, 3.742],
      [8.798, 3.742],
      [8.806, 3.742],
      [8.814, 3.742],
      [8.822, 3.742],
    ],
  },
  AN1345XX: {
    color: VEHICLE_COLORS.AN1345XX,
    path: [
      [8.73, 3.755],
      [8.73, 3.762],
      [8.738, 3.762],
      [8.738, 3.768],
      [8.746, 3.768],
    ],
  },
  WN2020: {
    color: VEHICLE_COLORS.WN2020,
    path: [
      [8.81, 3.758],
      [8.802, 3.758],
      [8.794, 3.758],
      [8.786, 3.758],
      [8.778, 3.758],
    ],
  },
};

const OFFLINE_LANDMARKS = [
  { name: "Av. de la Independencia", lat: 3.751, lng: 8.782, radius: 0.01 },
  { name: "Aeropuerto de Malabo", lat: 3.754, lng: 8.707, radius: 0.02 },
  { name: "Zona Ministerial", lat: 3.737, lng: 8.789, radius: 0.008 },
  { name: "Puerto de Malabo", lat: 3.751, lng: 8.778, radius: 0.012 },
  { name: "Embajada UE", lat: 3.754, lng: 8.802, radius: 0.007 },
];

const HARDCODED_LOCALIZATIONS = [
  "Malabo Urbano (Centro Histórico)",
  "Buena Esperanza I",
  "Caydasa",
  "Caracolas",
  "Los Angeles Bifamiliar",
  "Los Angeles Duplex",
  "La Ronda",
  "Los Angeles Duplex Espinas",
  "Mercado Central",
  "Mercado Publico",
  "San Juan",
  "Malabo II",
  "Semu",
  "Sampaca",
  "Alcayde",
  "Banapá",
  "Cruce Esono Edjo",
  "Baney",
  "Fishtown",
  "Sipopo",
  "Carretera de Luba",
  "Cooperacioni Alemana",
  "Paraiso",
  "Pilar Buepoyo",
  "Camaremi",
  "Chechenia",
  "Punta Europa",
  "Barrio Chino",
  "Nium Bili",
  "Campo Yaounde",
  "Ela Nguema",
  "Cocoteros",
  "Serra",
  "Serra Mongola",
  "Impexa",
  "Presidencia",
  "Santa María",
  "Atepa",
  "K5",
];

function getFallbackLocationName(vehicleId?: string, lat?: number, lng?: number) {
  if (!HARDCODED_LOCALIZATIONS.length) return "Sector Malabo";
  const key = `${vehicleId || "vehiculo"}:${lat?.toFixed(5) || ""}:${lng?.toFixed(5) || ""}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 997;
  }
  return HARDCODED_LOCALIZATIONS[hash % HARDCODED_LOCALIZATIONS.length];
}

function colorizeVehicleGlyph(glyph: string, color: string) {
  return glyph.replace(/__VEHICLE_COLOR__/g, color);
}

type LatLng = { lat: number; lng: number };

function calculateHeading(from: LatLng, to: LatLng) {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function getVehicleIconEntry(vehicleId: string) {
  const colorOverride = VEHICLE_COLORS[vehicleId];
  let hash = 0;
  const key = vehicleId || "vehiculo";
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i)) % 997;
  }
  const baseEntry = VEHICLE_ICON_PALETTE[hash % VEHICLE_ICON_PALETTE.length];
  const color = colorOverride || baseEntry.bg;
  return {
    ...baseEntry,
    bg: color,
    glyph: colorizeVehicleGlyph(baseEntry.glyph, color),
  };
}

function getVehicleMarkerColor(vehicleId: string) {
  return getVehicleIconEntry(vehicleId).bg;
}

function guessStreetName(lat: number, lng: number, vehicleId?: string) {
  const landmark = OFFLINE_LANDMARKS.find(
    (spot) => Math.hypot(lat - spot.lat, lng - spot.lng) <= spot.radius
  );
  if (landmark) return landmark.name;
  return getFallbackLocationName(vehicleId, lat, lng);
}

function getRouteDisplayCoordinate(vehicleId: string) {
  const preset = VEHICLE_ROUTES[vehicleId];
  if (!preset || !preset.path.length) return null;
  const midpoint = preset.path[Math.floor(preset.path.length / 2)];
  return midpoint ? { lng: midpoint[0], lat: midpoint[1] } : null;
}

function buildVehicleMarkerElement(vehiculo: Vehicle): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "4px";
  wrapper.style.transform = "translate(-50%, -70%)";

  const iconContainer = document.createElement("div");
  iconContainer.style.width = "24px";
  iconContainer.style.height = "24px";
  iconContainer.style.display = "flex";
  iconContainer.style.alignItems = "center";
  iconContainer.style.justifyContent = "center";
  iconContainer.dataset.markerRole = "vehicle-icon";
  iconContainer.dataset.baseTransform = "scale(0.7)";
  iconContainer.style.transform = iconContainer.dataset.baseTransform;
  iconContainer.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.25))";
  const colorKey = vehiculo.id || vehiculo.matricula || vehiculo.descripcion || "vehiculo";
  const iconEntry = getVehicleIconEntry(colorKey);
  iconContainer.innerHTML = iconEntry.glyph.replace(/width="26"/g, 'width="18"').replace(/height="52"/g, 'height="36"');

  const label = document.createElement("div");
  label.textContent = vehiculo.matricula || vehiculo.descripcion || vehiculo.id;
  label.style.fontSize = "10px";
  label.style.fontWeight = "600";
  label.style.padding = "2px 6px";
  label.style.borderRadius = "999px";
  label.style.border = "1px solid rgba(15,23,42,0.15)";
  label.style.background = "rgba(255,255,255,0.95)";
  label.style.whiteSpace = "nowrap";
  label.style.color = "#0f172a";
  label.style.boxShadow = "0 1px 4px rgba(0,0,0,0.15)";

  wrapper.appendChild(iconContainer);
  wrapper.appendChild(label);
  return wrapper;
}

/* ================= Types ================= */
type Seguro = {
  compania?: string;
  poliza?: string; // filename.pdf or URL
  vencimiento?: string;
};

type Permiso = {
  emision?: string;
  vencimiento?: string;
  costo?: string | number;
};

type Tasa = {
  emision?: string;
  vencimiento?: string;
  costo?: string | number;
};

type MaintenanceEntry = {
  date?: string; // legacy
  fecha?: string;
  mes?: string;
  description?: string;
  descripcion?: string;
  cost?: string | number;
  costo?: string | number;
  taller?: string;
  kilometraje?: number;
  factura?: string;
};

type UsageEntry = {
  date: string; // "Semana 12, 2025" or YYYY-MM-DD
  driver: string;
  start_km?: number;
  end_km?: number;
  purpose?: string;
};

type ConsumptionEntry = {
  mes: string;
  litros: number;
  km: number;
  costo: number;
};

type HistoryRow = {
  id: string;
  vehicle: string;
  key: string;
  label: string;
  litros: number;
  km: number;
  costo: number;
};

type HistorySortableColumn = "label" | "vehicle" | "litros" | "km" | "costo";

type Vehicle = {
  id: string;
  descripcion?: string;
  matricula?: string;
  marca?: string;
  modelo?: string;
  año?: number;
  color?: string;
  vin?: string;
  tipo?: string;
  foto?: string; // filename in /fotos_vehiculos
  uso?: string;
  usoHistorial?: UsageEntry[];
  asegurado?: boolean;
  propietario?: string;
  kilometraje?: string;
  departamento?: string;
  asignacion?: string;
  conductor?: string;
  precio_compra?: number;
  factura_compra?: string;
  titulo_propiedad?: string;
  seguro?: Seguro;
  permiso?: Permiso;
  tasa?: Tasa;
  fecha_adquisicion?: string;
  fecha_de_adquisicion?: string;
  lat?: number;
  lng?: number;
  mantenimiento?: MaintenanceEntry[];
  maintenance?: MaintenanceEntry[];
  consumo?: ConsumptionEntry[];
};

type Driver = {
  id: string;
  nombre: string;
  telefono?: string;
  licencia?: string;
  estado?: "Disponible" | "En servicio" | "Descanso";
  asignados?: string[]; // vehicle ids
  foto?: string;
};

type DriverUsageEntry = {
  driver_id: string;
  driver_nombre: string;
  registros: {
    mes: string;
    km: number;
    vehiculo_id: string;
  }[];
};

type EmployeeRecord = {
  id?: number | string;
  nombres?: string;
  apellidos?: string;
  nombrecompleto?: string;
  departamento?: string;
  puesto?: string;
};

type VehicleDocumentMeta = {
  id: string;
  type: "seguro" | "permiso" | "tasa" | "ficha" | "factura" | "titulo";
  label: string;
  filename: string;
  description: string;
  highlights: { label: string; value?: string | number | null }[];
};

const DOCUMENT_GRADIENTS: Record<VehicleDocumentMeta["type"], string> = {
  seguro: "from-[#dbeafe] via-[#a5b4fc] to-[#6366f1]",
  permiso: "from-[#e0f2f1] via-[#86efac] to-[#4d7c2a]",
  tasa: "from-[#dbeafe] via-[#60a5fa] to-[#1e40af]",
  ficha: "from-[#e0f7ff] via-[#67e8f9] to-[#0ea5e9]",
  factura: "from-[#f0fdfa] via-[#86efac] to-[#15803d]",
  titulo: "from-[#e0f2fe] via-[#7dd3fc] to-[#0c4a6e]",
};
const DOCUMENT_CARD_ACCENTS: Record<VehicleDocumentMeta["type"], string> = {
  seguro: "from-[#0f172a] via-[#1d4ed8] to-[#60a5fa]",
  permiso: "from-[#102a43] via-[#0f766e] to-[#4d7c2a]",
  tasa: "from-[#0c1c54] via-[#1d4ed8] to-[#22c55e]",
  ficha: "from-[#0c254a] via-[#0ea5e9] to-[#134e4a]",
  factura: "from-[#064e3b] via-[#15803d] to-[#4d7c2a]",
  titulo: "from-[#1e3a8a] via-[#2563eb] to-[#0f172a]",
};

const clamp = (val: number, min = 1, max = 5) => Math.max(min, Math.min(max, val));
const MONTH_SERIES = [
  { key: "enero", short: "Ene" },
  { key: "febrero", short: "Feb" },
  { key: "marzo", short: "Mar" },
  { key: "abril", short: "Abr" },
  { key: "mayo", short: "May" },
  { key: "junio", short: "Jun" },
  { key: "julio", short: "Jul" },
  { key: "agosto", short: "Ago" },
  { key: "septiembre", short: "Sep" },
  { key: "octubre", short: "Oct" },
  { key: "noviembre", short: "Nov" },
  { key: "diciembre", short: "Dic" },
];

const MONTH_INDEX = MONTH_SERIES.reduce<Record<string, number>>((acc, cur, idx) => {
  acc[cur.key] = idx;
  return acc;
}, {});
const formatCurrency = (value: number) => `${value.toLocaleString("es-GQ")} XAF`;
const mergeSeedDrivers = (current: Driver[], seeds: Driver[]) => {
  if (!seeds?.length) return current;
  const map = new Map<string, Driver>();
  seeds.forEach((seed) => {
    const key = seed.id || seed.nombre;
    if (key) map.set(key, { ...seed });
  });
  current.forEach((driver) => {
    const key = driver.id || driver.nombre;
    if (!key) return;
    map.set(key, { ...(map.get(key) || {}), ...driver });
  });
  return Array.from(map.values());
};

const card = "bg-white border-2 border-black rounded-xl shadow-lg";
const card2 = "bg-white border-2 border-black rounded-xl shadow";
const btn =
  "bg-[#004080] text-white border-2 border-black px-3 py-2 rounded-lg font-semibold hover:bg-[#003366] transition active:scale-[.99]";
const btnGhost =
  "bg-[#eef2ff] text-[#0b2b57] border border-[#dee6ff] px-3 py-2 rounded-lg font-semibold hover:bg-[#e0e7ff]";
const inputCls =
  "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]";

const STORAGE_KEY = "flota_data_v2";
const DRIVERS_KEY = "flota_drivers_v1";
const requiresVehicleDataUpgrade = (list: Vehicle[]) =>
  Array.isArray(list) &&
  list.length > 0 &&
  list.some(
    (v) =>
      v &&
      (v.departamento === undefined ||
        v.asignacion === undefined ||
        v.conductor === undefined ||
        v.seguro === undefined ||
        v.permiso === undefined ||
        v.tasa === undefined ||
        !Array.isArray(v.mantenimiento) ||
        !Array.isArray(v.consumo))
  );

const ELECTRON_TILE_URL = "http://127.0.0.1:17778/malabo/{z}/{x}/{y}.png";
const DEV_TILE_URL = "/tiles/malabo/{z}/{x}/{y}.png";
const TILE_URL_TEMPLATE =
  import.meta.env.VITE_OFFLINE_TILE_URL ||
  (import.meta.env.DEV ? DEV_TILE_URL : ELECTRON_TILE_URL);
const VEHICLE_3D_MAP: Record<string, string> = {
  BN0024XG: "1.Prado.png",
  BS2456FM: "2.Patrol.png",
  BN1334KS: "3.Tucson.png",
  AN1345XX: "4.Hilux.png",
  WN2020: "5.Range Rover.png",
};
const VEHICLE_PREVIEW_SCALE: Record<string, number> = {};
const VEHICLE_BASE_ZOOM: Record<string, number> = {
  BN0024XG: 3.7, // Prado 370%
  BN1334KS: 4.2, // Tucson 420%
  BS2456FM: 4.5, // Patrol 450%
  AN1345XX: 1.7, // Hilux 170%
  WN2020: 1.4, // Range Rover 140%
};

/* ================= Helpers ================= */
const fmt = (v: any) => (v === undefined || v === null || v === "" ? "—" : String(v));
const title = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const isPdf = (name?: string) => !!name && name.toLowerCase().endsWith(".pdf");
const parseKilometers = (value?: string | number | null) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
};

const VEHICLE_3D_BASE = "./fotos_vehiculos/3D/";

const COST_SEGMENT_COLORS = ["#9acb4f", "#fbbf24", "#ef4444", "#581c87"];

const buildCostGradient = (index: number) => {
  const rotation = index % COST_SEGMENT_COLORS.length;
  const palette = COST_SEGMENT_COLORS.slice(rotation).concat(
    COST_SEGMENT_COLORS.slice(0, rotation)
  );
  const slice = 100 / palette.length;
  const stops = palette.map((color, idx) => {
    const start = idx * slice;
    const end = start + slice;
    return `${color} ${start}% ${end > 100 ? 100 : end}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
};


type AnimatedValueProps = {
  value: number;
  formatter?: (val: number) => string;
  suffix?: string;
};

const AnimatedConsumptionValue: React.FC<AnimatedValueProps> = ({ value, formatter, suffix = "" }) => {
  const spring = useSpring({
    from: { number: 0 },
    number: value,
    config: { tension: 120, friction: 20 },
    reset: true,
  });

  return (
    <animated.p className="text-xl font-bold text-[#0b2b57]">
      {spring.number.to((n) => {
        const rounded = Math.round(n);
        const formatted = formatter ? formatter(rounded) : rounded.toLocaleString("es-GQ");
        return `${formatted}${suffix}`;
      })}
    </animated.p>
  );
};

function vehicle3DPreviewSrc(vehiculo: Vehicle | null) {
  if (!vehiculo) {
    return VEHICLE_PLACEHOLDER_URL;
  }
  const key = vehiculo.id || vehiculo.matricula;
  if (key && VEHICLE_3D_MAP[key]) {
    const modelPath = assetUrl(`${VEHICLE_3D_BASE}${VEHICLE_3D_MAP[key]}`);
    if (modelPath) return modelPath;
  }
  return photoUrl(vehiculo.foto);
}

function buildMapStyle(online: boolean) {
  if (online) {
    return {
      version: 8 as const,
      sources: {
        osm: {
          type: "raster" as const,
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
        },
      },
      layers: [
        {
          id: "osm-tiles",
          type: "raster" as const,
          source: "osm",
        },
      ],
    };
  }

  // Offline: render local Malabo.mbtiles vector tiles
  return {
    version: 8 as const,
    sources: {
      malabo: {
        type: "raster" as const,
        tiles: [TILE_URL_TEMPLATE],
        tileSize: 256,
        minzoom: 8,
        maxzoom: 16,
      },
    },
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": "#eef2ff" },
      },
      {
        id: "malabo-raster",
        type: "raster" as const,
        source: "malabo",
        paint: {
          "raster-opacity": 0.95,
        },
      },
    ],
  };
}

/** Build photo URL from /fotos_vehiculos/<file> or fallback */
function photoUrl(file?: string) {
  const normalized = file ? normalizeAssetPath(file) : undefined;
  return assetUrl(normalized) || VEHICLE_PLACEHOLDER_URL;
}

/** Build document URL from local docs folder if it's a filename */
function docUrl(file?: string) {
  if (!file) return "";
  if (file.includes("/") || file.startsWith("http")) return file;
  return `/documentos/${file}`;
}

const formatMoney = (value?: number | string | null) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") {
    return `${value.toLocaleString("es-GQ")} XAF`;
  }
  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  if (Number.isFinite(numeric)) {
    return `${numeric.toLocaleString("es-GQ")} XAF`;
  }
  return String(value);
};

function uuid() {
  return Math.random().toString(36).slice(2, 10);
}

function handleViewMap(vehiculo: any) {
  if (vehiculo.lat && vehiculo.lng) {
    const url = `https://www.google.com/maps?q=${vehiculo.lat},${vehiculo.lng}`;
    window.open(url, "_blank");
  } else {
    alert("No hay coordenadas registradas para este vehículo.");
  }
}

function buildEmptyVehicleForm(): VehicleFormState {
  return {
    id: "",
    descripcion: "",
    marca: "",
    modelo: "",
    año: String(new Date().getFullYear()),
  uso: "",
  matricula: "",
  color: "",
  tipo: "",
  fecha_adquisicion: "",
  precio_compra: "",
  factura_compra: "",
  titulo_propiedad: "",
  asegurado: false,
  foto: "",
    propietario: "",
    kilometraje: "",
    departamento: "",
    asignacion: "",
    conductor: "",
  };
}


/* ================= Component ================= */
const Flota: React.FC = () => {
  type TabKey =
    | "detalles"
    | "tracking"
    | "documentacion"
    | "mantenimiento"
    | "conductores"
    | "consumo";

  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [newVehiculo, setNewVehiculo] = useState<VehicleFormState>(() => buildEmptyVehicleForm());
  const [deleteMode, setDeleteMode] = useState(false);
  const [vehicleIdPendingDelete, setVehicleIdPendingDelete] = useState("");

  const [activeTab, setActiveTab] = useState<TabKey>("detalles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [docPreview, setDocPreview] = useState<{ url: string; title: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Edit mode (Detalles)
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<Vehicle | null>(null);

  // Tracking (offline simulated)
  const [trackingVehicleId, setTrackingVehicleId] = useState<string | "all">("all");
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; speed: number } | null>(null);
  const trackingTimer = useRef<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const markerAnimationRef = useRef<Map<string, number>>(new Map());
  const markerHeadingRef = useRef<Map<string, number>>(new Map());
  const movementProgressRef = useRef<
    Map<string, { progress: number; direction: 1 | -1 }>
  >(new Map());
  const locationNameRef = useRef<Map<string, { street: string; counter: number }>>(
    new Map()
  );
  const lastTrackedCoordsRef = useRef<Map<string, LatLng>>(new Map());
  const trackedCoordsRef = useRef<LatLng>({ lat: 3.75, lng: 8.78 });
  const [locationTicker, setLocationTicker] = useState(0);
  const fleetAnimationTimer = useRef<number | null>(null);
  const rotateMarkerIcon = useCallback(
    (marker: maplibregl.Marker, vehicleId: string, heading: number) => {
      const element = marker.getElement();
      if (!element) return;
      const iconEl = element.querySelector<HTMLElement>("[data-marker-role='vehicle-icon']");
      if (!iconEl) return;
      const lastHeading = markerHeadingRef.current.get(vehicleId) ?? heading;
      const diff =
        Math.abs(
          ((((heading - lastHeading) % 360) + 540) % 360) - 180 /** normalized difference */
        );
      if (diff < 5) return;
      const baseTransform = iconEl.dataset.baseTransform ?? "";
      iconEl.style.transform = `${baseTransform} rotate(${heading}deg)`;
      markerHeadingRef.current.set(vehicleId, heading);
    },
    []
  );
  const animateMarkerTo = useCallback(
    (marker: maplibregl.Marker, vehicleId: string, target: LatLng, duration = 900) => {
      const cancelId = markerAnimationRef.current.get(vehicleId);
      if (cancelId) window.cancelAnimationFrame(cancelId);
      const current = marker.getLngLat();
      const start = { lat: current.lat, lng: current.lng };
      const deltaLat = target.lat - start.lat;
      const deltaLng = target.lng - start.lng;
      if (Math.abs(deltaLat) < 1e-7 && Math.abs(deltaLng) < 1e-7) {
        const heading = calculateHeading(start, target);
        rotateMarkerIcon(marker, vehicleId, heading);
        return;
      }
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased =
          progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        const currentLat = start.lat + deltaLat * eased;
        const currentLng = start.lng + deltaLng * eased;
        marker.setLngLat([currentLng, currentLat]);
        const heading = calculateHeading(start, { lat: currentLat, lng: currentLng });
        rotateMarkerIcon(marker, vehicleId, heading);
        if (progress < 1) {
          const frameId = window.requestAnimationFrame(step);
          markerAnimationRef.current.set(vehicleId, frameId);
        } else {
          marker.setLngLat([target.lng, target.lat]);
          rotateMarkerIcon(marker, vehicleId, calculateHeading(start, target));
          markerAnimationRef.current.delete(vehicleId);
        }
      };

      const frameId = window.requestAnimationFrame(step);
      markerAnimationRef.current.set(vehicleId, frameId);
    },
    [rotateMarkerIcon]
  );
  const [mapReady, setMapReady] = useState(false);
  const [onlineMode, setOnlineMode] = useState(true);

  // Conductores (local list)
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [newDriver, setNewDriver] = useState<{ nombre: string; telefono?: string; licencia?: string }>({
    nombre: "",
  });
  const [driverUsageData, setDriverUsageData] = useState<DriverUsageEntry[]>([]);
  const [driverIdToDelete, setDriverIdToDelete] = useState("");
  const [comparisonOpen, setComparisonOpen] = useState({
    efficiency: true,
    uso: false,
    costos: false,
  });
  const [consumptionMetric, setConsumptionMetric] = useState<"liters" | "cost">("liters");
  const [consumptionMonth, setConsumptionMonth] = useState<string>("all");
  const [comparisonVehicles, setComparisonVehicles] = useState<string[]>([]);
  const [comparisonMetric, setComparisonMetric] = useState<"liters" | "cost">("liters");
  const [comparisonMonthFilter, setComparisonMonthFilter] = useState<string>("all");
  const [historyVehicleSelection, setHistoryVehicleSelection] = useState<string[]>([]);
  const [historySort, setHistorySort] = useState<{
    column: HistorySortableColumn;
    direction: "asc" | "desc";
  }>({
    column: "label",
    direction: "asc",
  });
  const [driverKmMode, setDriverKmMode] = useState<"driver" | "vehicle">("driver");
  const [driverKmSelection, setDriverKmSelection] = useState<string[]>([]);
  const [driverIncidents, setDriverIncidents] = useState<
    {
      id: string;
      date: string;
      description: string;
      vehicle: string;
      driver: string;
      type?: string;
      action?: string;
    }[]
  >([]);
  const [collapsibleSections, setCollapsibleSections] = useState<Record<string, boolean>>({});
  const driverFileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [reassignForm, setReassignForm] = useState({
    departamento: "",
    asignacion: "",
    conductor: "",
    propietario: "Iniciativas Elebi",
  });

  const persistFlotaData = useCallback(
    (payload: { vehiculos?: Vehicle[]; conductores?: Driver[]; driver_usage?: DriverUsageEntry[] }) => {
      if (typeof window === "undefined") return;
      const api = window.electronAPI;
      if (api?.saveFlotaData) {
        api.saveFlotaData(payload).catch((error: any) => {
          console.error("❌ Error guardando flota.json:", error);
        });
      }
    },
    []
  );

  const previewRef = useRef<HTMLDivElement | null>(null);
  const [previewRotation, setPreviewRotation] = useState({ x: 0, y: 0 });
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);

  useEffect(() => {
    if (selected) {
      setReassignForm({
        departamento: selected.departamento || "",
        asignacion: selected.asignacion || "",
        conductor: selected.conductor || "",
        propietario: selected.propietario || "Iniciativas Elebi",
      });
    }
  }, [selected]);

  const CollapsibleSection: React.FC<{
    id: string;
    title: string;
    subtitle?: React.ReactNode;
    defaultOpen?: boolean;
    className?: string;
    children: React.ReactNode;
  }> = ({ id, title, subtitle, defaultOpen = true, className = "bg-white", children }) => {
    const isOpen = (collapsibleSections[id] ?? defaultOpen);
    const toggle = () =>
      setCollapsibleSections((prev) => {
        const current = prev[id];
        const resolved = current == null ? defaultOpen : current;
        return { ...prev, [id]: !resolved };
      });
    return (
      <div className={`p-4 rounded-2xl border shadow-sm ${className}`}>
        <button
          type="button"
          className="w-full flex items-center justify-between text-left gap-3"
          onClick={toggle}
          aria-expanded={isOpen}
        >
          <div>
            <p className="text-base font-semibold text-[#0b2b57]">{title}</p>
            {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && <div className="mt-4">{children}</div>}
      </div>
    );
  };

  const resetNewVehicleForm = useCallback(() => {
    setNewVehiculo(buildEmptyVehicleForm());
  }, []);

  const handleNewVehicleFieldChange = useCallback(
    (field: keyof VehicleFormState, value: string | boolean) => {
      setNewVehiculo((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const showToast = useCallback((msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 2200);
  }, []);

  /* ================= Load & persist ================= */
  const loadFromLocalStorage = useCallback((): Vehicle[] | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, []);

  const saveToLocalStorage = useCallback(
    (next: Vehicle[]) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      persistFlotaData({ vehiculos: next });
    },
    [persistFlotaData]
  );

  const loadDriversFromLS = useCallback((): Driver[] => {
    try {
      const raw = localStorage.getItem(DRIVERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }, []);

  const saveDriversToLS = useCallback(
    (list: Driver[]) => {
      localStorage.setItem(DRIVERS_KEY, JSON.stringify(list));
      persistFlotaData({ conductores: list });
    },
    [persistFlotaData]
  );

  const [flotaLookup, setFlotaLookup] = useState<Record<string, Vehicle>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("./flota.json", { cache: "no-store" });
        if (!r.ok) throw new Error("No se pudo cargar /flota.json");
        const fetchedData = await r.json();
        const vehiculos: Vehicle[] = fetchedData.vehiculos || [];
        const seeded = vehiculos.map((v) => ({
          lat: v.lat ?? 3.75,
          lng: v.lng ?? 8.78,
          mantenimiento: v.mantenimiento || [],
          usoHistorial: v.usoHistorial || [],
          consumo: v.consumo || [],
          ...v,
          fecha_de_adquisicion: v.fecha_de_adquisicion || v.fecha_adquisicion,
          seguro: v.seguro || {
            compania: "NSIA Seguros GE",
            poliza: "POLIZA-GENERICA.pdf",
            vencimiento: "2025-12-31",
          },
          permiso: v.permiso || {
            emision: "2025-01-01",
            vencimiento: "2026-01-01",
            costo: 250000,
          },
          tasa: v.tasa || {
            emision: "2025-01-15",
            vencimiento: "2025-12-31",
            costo: 85000,
          },
        }));
        const lookup = Object.fromEntries(seeded.map((veh) => [veh.id, veh]));
        setFlotaLookup(lookup);

        const ls = loadFromLocalStorage();
        let finalVehicles: Vehicle[] = seeded;
        if (ls && !requiresVehicleDataUpgrade(ls)) {
          finalVehicles = ls.map((stored) => ({
            ...lookup[stored.id],
            ...stored,
            lat: stored.lat ?? lookup[stored.id]?.lat,
            lng: stored.lng ?? lookup[stored.id]?.lng,
          }));
        }
        setVehicles(finalVehicles);
        saveToLocalStorage(finalVehicles);

        const seedDrivers = Array.isArray(fetchedData.conductores) ? fetchedData.conductores : [];
        const lsDrivers = loadDriversFromLS();
        if (lsDrivers.length) {
          const merged = mergeSeedDrivers(lsDrivers, seedDrivers);
          setDrivers(merged);
          if (merged.length !== lsDrivers.length) saveDriversToLS(merged);
        } else {
          setDrivers(seedDrivers);
          if (seedDrivers.length) saveDriversToLS(seedDrivers);
        }

        const usageSeed = Array.isArray(fetchedData.driver_usage) ? fetchedData.driver_usage : [];
        setDriverUsageData(usageSeed);

        const incidentsSeed: typeof driverIncidents =
          Array.isArray(fetchedData.driver_incidents) && fetchedData.driver_incidents.length
            ? fetchedData.driver_incidents.flatMap((entry: any) => {
                const driverName = entry?.driver_nombre || "";
                const driverId = entry?.driver_id || "";
                if (!Array.isArray(entry?.incidencias)) return [];
                return entry.incidencias.map((inc: any) => ({
                  id: String(inc.id || `${driverId}-${inc.fecha || ""}`),
                  date: String(inc.fecha || ""),
                  description: String(inc.descripcion || ""),
                  vehicle: String(inc.vehiculo_id || "N/D"),
                  driver: driverName || driverId || "N/D",
                  type: inc.tipo ? String(inc.tipo) : undefined,
                  action: inc.accion ? String(inc.accion) : undefined,
                }));
              })
            : [];
        setDriverIncidents(incidentsSeed);
      } catch (err) {
        console.error("❌ Error cargando flota:", err);
        showToast("No se pudo cargar flota.json.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadDriversFromLS, loadFromLocalStorage, saveDriversToLS, saveToLocalStorage, showToast]);

  useEffect(() => {
    let cancelled = false;
    fetch("./datos_empleados.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        const list: EmployeeRecord[] = Array.isArray(data)
          ? data
          : data?.empleados || [];
        setEmployees(list);
      })
      .catch(() => setEmployees([]));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(elebiLogo)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      )
      .then((dataUrl) => {
        if (!cancelled) setLogoDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setLogoDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "liquid-wave-style";
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.innerHTML = `
      @keyframes liquidWave {
        0% { transform: translateY(2%); }
        50% { transform: translateY(-6%); }
        100% { transform: translateY(2%); }
      }
      @keyframes liquidGlow {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      @keyframes surfaceDrift {
        from { background-position: 0 0; }
        to { background-position: 80px 0; }
      }
      @keyframes bubbleFloat {
        0% { transform: translateY(4px) scale(0.75); opacity: 0.65; }
        50% { transform: translateY(-4px) scale(1); opacity: 1; }
        100% { transform: translateY(4px) scale(0.75); opacity: 0.65; }
      }
      .liquid-wave-surface {
        position: absolute;
        inset: 0;
        background-image: repeating-linear-gradient(
          90deg,
          rgba(255,255,255,0.45) 0,
          rgba(255,255,255,0.45) 4px,
          rgba(255,255,255,0) 4px,
          rgba(255,255,255,0) 10px
        );
        opacity: 0.35;
        animation: surfaceDrift 5s linear infinite;
        pointer-events: none;
      }
      .liquid-bubble {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.4) 70%);
        animation: bubbleFloat 4.2s ease-in-out infinite;
        filter: drop-shadow(0 0 3px rgba(255,255,255,0.4));
      }
      @keyframes consumoCostGrow {
        from {
          width: 0%;
        }
        to {
          width: var(--bar-target, 0%);
        }
      }
      .consumo-cost-bar-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #2563eb, #38bdf8, #7dd3fc);
        animation: consumoCostGrow 1.2s ease-out forwards;
      }
      @keyframes qrScanBar {
        0% { transform: translateY(-140%); opacity: 0; }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { transform: translateY(140%); opacity: 0; }
      }
      .qr-scan-bar {
        animation: qrScanBar 2.8s ease-in-out infinite;
      }
      @keyframes driverBarGrow {
        to { width: var(--target-width, 0%); }
      }
      .driver-bar-fill {
        width: 0;
        animation: driverBarGrow 1.4s ease forwards;
      }
    `;
    document.head.appendChild(styleEl);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const s = [
        v.marca,
        v.modelo,
        v.matricula,
        v.tipo,
        v.color,
        String(v.año ?? ""),
        v.vin,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return s.includes(q);
    });
  }, [vehicles, search]);

  const acquisitionDisplay = selected
    ? selected.fecha_de_adquisicion || selected.fecha_adquisicion || "No registrada"
    : "No registrada";
  const purchaseDisplay =
    selected && selected.precio_compra != null ? formatMoney(selected.precio_compra) : "N/D";

  const paperworkAlerts = useMemo(() => {
    if (!selected) return [];
    const entries = [
      { label: "Seguro", date: selected.seguro?.vencimiento },
      { label: "Permiso", date: selected.permiso?.vencimiento },
      { label: "Tasa", date: selected.tasa?.vencimiento },
    ]
      .filter((item): item is { label: string; date: string } => Boolean(item.date))
      .map((item) => ({
        ...item,
        dateObj: new Date(item.date),
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return entries;
  }, [selected]);

  const vehicleDocuments = useMemo<VehicleDocumentMeta[]>(() => {
    if (!selected) return [];
    const docs: VehicleDocumentMeta[] = [];
    const acquisitionDate = selected.fecha_de_adquisicion || selected.fecha_adquisicion;
    if (selected.seguro) {
      docs.push({
        id: `seguro-${selected.id}`,
        type: "seguro",
        label: "Póliza de Seguro",
        filename: selected.seguro.poliza || `POLIZA_${selected.id}.pdf`,
        description: selected.seguro.compania
          ? `Cobertura emitida por ${selected.seguro.compania}.`
          : "Cobertura general vigente para este vehículo.",
        highlights: [
          { label: "Compañía", value: selected.seguro.compania },
          { label: "Número de póliza", value: selected.seguro.poliza },
          { label: "Vigencia", value: selected.seguro.vencimiento },
        ],
      });
    }
    if (selected.permiso) {
      docs.push({
        id: `permiso-${selected.id}`,
        type: "permiso",
        label: "Permiso de Circulación",
        filename: `PERMISO_${selected.id}.pdf`,
        description: "Permiso oficial para transitar en territorio nacional.",
        highlights: [
          { label: "Fecha de emisión", value: selected.permiso.emision },
          { label: "Vencimiento", value: selected.permiso.vencimiento },
          { label: "Tasa pagada", value: formatMoney(selected.permiso.costo) },
        ],
      });
    }
    if (selected.tasa) {
      docs.push({
        id: `tasa-${selected.id}`,
        type: "tasa",
        label: "Tasa de Tráfico Rodado",
        filename: `TASA_${selected.id}.pdf`,
        description: "Constancia del pago anual de tasa rodado / circulación.",
        highlights: [
          { label: "Fecha de emisión", value: selected.tasa.emision },
          { label: "Vencimiento", value: selected.tasa.vencimiento },
          { label: "Importe", value: formatMoney(selected.tasa.costo) },
        ],
      });
    }
    if (selected.factura_compra || selected.precio_compra || acquisitionDate) {
      docs.push({
        id: `factura-${selected.id}`,
        type: "factura",
        label: "Factura de compra",
        filename: selected.factura_compra || `FACTURA_${selected.id}.pdf`,
        description: "Comprobante original de adquisición del vehículo.",
        highlights: [
          { label: "Fecha", value: acquisitionDate },
          { label: "Proveedor", value: selected.propietario || "Iniciativas Elebi" },
          { label: "Monto", value: formatMoney(selected.precio_compra) },
        ],
      });
    }
    const titleFilename =
      selected.titulo_propiedad || flotaLookup[selected.id]?.titulo_propiedad;
    if (titleFilename) {
      docs.push({
        id: `titulo-${selected.id}`,
        type: "titulo",
        label: "Título de propiedad",
        filename: titleFilename,
        description: "Documento que acredita la titularidad actual del vehículo.",
        highlights: [
          { label: "Propietario", value: selected.propietario || "Iniciativas Elebi" },
          { label: "Fecha de registro", value: acquisitionDate },
          { label: "Referencia", value: titleFilename },
        ],
      });
    }
    const marcaModelo =
      `${selected.marca || ""} ${selected.modelo || ""}`.trim() ||
      selected.descripcion ||
      selected.id;
    docs.push({
      id: `ficha-${selected.id}`,
      type: "ficha",
      label: "Ficha Técnica del Vehículo",
      filename: `FICHA_${selected.id}.pdf`,
      description: "Resumen operativo y administrativos del vehículo.",
      highlights: [
        { label: "Marca / Modelo", value: marcaModelo },
        { label: "Tipo", value: selected.tipo },
        { label: "Año", value: selected.año },
        { label: "Color", value: selected.color },
        { label: "Departamento", value: selected.departamento },
        { label: "Asignación", value: selected.asignacion },
        { label: "Conductor", value: selected.conductor },
        { label: "Propietario", value: selected.propietario || "Iniciativas Elebi" },
      ],
    });
    return docs;
  }, [selected]);

  const usageEntries = useMemo<UsageEntry[]>(() => {
    if (draft && Array.isArray(draft.usoHistorial)) return draft.usoHistorial;
    if (selected && Array.isArray(selected?.usoHistorial)) return selected?.usoHistorial || [];
    return [];
  }, [draft, selected]);

  const maintenanceRows = useMemo(() => {
    const entries = (draft?.mantenimiento ||
      selected?.mantenimiento ||
      (draft?.maintenance as MaintenanceEntry[]) ||
      []) as MaintenanceEntry[];
    return entries.map((entry, idx) => {
      const rawDate = entry.fecha || entry.date || "";
      const parsed = rawDate ? new Date(rawDate) : null;
      const costo =
        entry.costo !== undefined
          ? entry.costo
          : entry.cost !== undefined
          ? entry.cost
          : 0;
      return {
        id: `${selected?.id || "veh"}-${idx}`,
        sourceIndex: idx,
        mes: entry.mes || (parsed ? parsed.toLocaleString("es-ES", { month: "long" }) : "N/D"),
        fecha: rawDate || "N/D",
        descripcion: entry.descripcion || entry.description || "Servicio programado",
        taller: entry.taller || "Centro autorizado",
        kilometraje: entry.kilometraje,
        costo,
        factura: entry.factura,
      };
    });
  }, [draft?.mantenimiento, draft?.maintenance, selected?.id, selected?.mantenimiento]);

  const maintenanceTotal = useMemo(() => {
    return maintenanceRows.reduce((sum, row) => {
      const numeric = Number(
        typeof row.costo === "string" ? row.costo.replace(/[^\d.-]/g, "") : row.costo || 0
      );
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
  }, [maintenanceRows]);

  const maintenanceRowsSorted = useMemo(
    () =>
      [...maintenanceRows].sort((a, b) => {
        const da = new Date(a.fecha).getTime() || 0;
        const db = new Date(b.fecha).getTime() || 0;
        return db - da;
      }),
    [maintenanceRows]
  );

  const consumptionData = useMemo(() => {
    const entries = selected && Array.isArray(selected.consumo) ? selected.consumo : [];
    const normalized = MONTH_SERIES.map(({ key, short }) => {
      const match = entries.find((row) => row?.mes && row.mes.toLowerCase() === key);
      return {
        key,
        label: short,
        litros: match?.litros ?? 0,
        km: match?.km ?? 0,
        costo: match?.costo ?? 0,
      };
    });
    const totals = normalized.reduce(
      (acc, row) => {
        acc.litros += row.litros;
        acc.km += row.km;
        acc.costo += row.costo;
        return acc;
      },
      { litros: 0, km: 0, costo: 0 }
    );
    const insights: string[] = [];
    const insightMap: Record<string, string> = {};
    normalized.forEach((row, idx) => {
      const prev = normalized[idx - 1];
      let message: string;
      if (!prev) {
        message = `${row.label}: ${row.km.toLocaleString("es-GQ")} km con ${row.litros} L (${formatCurrency(
          row.costo
        )}).`;
      } else {
        const deltaKm = row.km - prev.km;
        const deltaLitros = row.litros - prev.litros;
        const trendKm =
          deltaKm === 0
            ? "se mantuvo estable"
            : deltaKm > 0
            ? `aumentó +${deltaKm.toLocaleString("es-GQ")} km`
            : `disminuyó ${Math.abs(deltaKm).toLocaleString("es-GQ")} km`;
        const trendLitros =
          deltaLitros === 0
            ? "mantuvo el mismo consumo"
            : deltaLitros > 0
            ? `consumió ${deltaLitros} L adicionales`
            : `ahorró ${Math.abs(deltaLitros)} L`;
        message = `${row.label}: ${trendKm} y ${trendLitros}.`;
      }
      insights.push(message);
      insightMap[row.key] = message;
    });
    const maxLitros = normalized.reduce((max, row) => Math.max(max, row.litros), 0);

    const lastTrips =
      selected && Array.isArray(selected.usoHistorial) && selected.usoHistorial.length
        ? selected.usoHistorial
        : normalized
            .filter((row) => row.km > 0 || row.litros > 0)
            .slice(-6)
            .map((row, index, arr) => {
              const base = {
                label: `${row.label}`,
                date: `${row.label} 2025`,
                distance: `${row.km.toLocaleString("es-GQ")} km`,
                route: "Malabo centro \u2192 Barrios periféricos",
                status: index === arr.length - 1 ? "En curso" : "Completado",
                summary: `Desplazamiento operativo con consumo de ${row.litros} L (${formatCurrency(
                  row.costo
                )}).`,
                current: undefined as
                  | { destination: string; progress: string }
                  | undefined,
              };
              if (index === arr.length - 1) {
                base.current = {
                  destination: "Zona administrativa de Malabo",
                  progress: "aprox. 70%",
                };
              }
              return base;
            });

    return {
      normalized,
      totals,
      maxLitros: maxLitros || 1,
      insights,
      insightMap,
      lastTrips,
    };
  }, [selected]);

  const fleetConsumption = useMemo(() => {
    const stats = vehicles
      .map((veh) => {
        const rows = Array.isArray(veh.consumo) ? veh.consumo : [];
        if (!rows.length) return null;
        const totals = rows.reduce(
          (acc, row) => {
            acc.litros += row.litros || 0;
            acc.km += row.km || 0;
            acc.costo += row.costo || 0;
            return acc;
          },
          { litros: 0, km: 0, costo: 0 }
        );
        const efficiency = totals.litros > 0 ? totals.km / totals.litros : 0;
        const costPerKm = totals.km > 0 ? totals.costo / totals.km : 0;
        return { vehiculo: veh, ...totals, efficiency, costPerKm };
      })
      .filter(Boolean) as Array<{
        vehiculo: Vehicle;
        litros: number;
        km: number;
        costo: number;
        efficiency: number;
        costPerKm: number;
      }>;

    if (!stats.length) {
      return null;
    }

    const totals = stats.reduce(
      (acc, row) => {
        acc.litros += row.litros;
        acc.km += row.km;
        acc.costo += row.costo;
        return acc;
      },
      { litros: 0, km: 0, costo: 0 }
    );
    const fleetAverage = {
      efficiency: totals.litros > 0 ? totals.km / totals.litros : 0,
      costPerKm: totals.km > 0 ? totals.costo / totals.km : 0,
    };

    const best = stats.reduce((bestRow, row) =>
      row.efficiency > (bestRow?.efficiency || 0) ? row : bestRow
    );
    const least = stats.reduce((worstRow, row) =>
      row.efficiency < (worstRow?.efficiency ?? Infinity) ? row : worstRow
    );

    const selectedTotals = consumptionData.totals;
    const selectedEfficiency =
      selectedTotals.litros > 0 ? selectedTotals.km / selectedTotals.litros : 0;
    const selectedCostPerKm =
      selectedTotals.km > 0 ? selectedTotals.costo / selectedTotals.km : 0;

    return {
      fleetAverage,
      best,
      least,
      selectedEfficiency,
      selectedCostPerKm,
    };
  }, [vehicles, consumptionData.totals]);

  const filteredConsumptionRows = useMemo(() => {
    if (consumptionMonth === "all") return consumptionData.normalized;
    const match = consumptionData.normalized.find((row) => row.key === consumptionMonth);
    return match ? [match] : consumptionData.normalized;
  }, [consumptionData.normalized, consumptionMonth]);

  const filteredConsumptionTotals = useMemo(() => {
    return filteredConsumptionRows.reduce(
      (acc, row) => {
        acc.litros += row.litros;
        acc.km += row.km;
        acc.costo += row.costo;
        return acc;
      },
      { litros: 0, km: 0, costo: 0 }
    );
  }, [filteredConsumptionRows]);

  const chartRows = useMemo(() => filteredConsumptionRows, [filteredConsumptionRows]);

  const chartMaxMetric = useMemo(() => {
    const max = chartRows.reduce((maxVal, row) => {
      const metricValue = consumptionMetric === "liters" ? row.litros : row.costo;
      return Math.max(maxVal, metricValue);
    }, 0);
    return max || 1;
  }, [chartRows, consumptionMetric]);

  const insightMessages = useMemo(() => {
    if (consumptionMonth === "all") return consumptionData.insights;
    const message = consumptionData.insightMap?.[consumptionMonth];
    return message ? [message] : [];
  }, [consumptionData, consumptionMonth]);

  const trackingVehicle = useMemo(() => {
    if (trackingVehicleId && trackingVehicleId !== "all") {
      return vehicles.find((veh) => veh.id === trackingVehicleId) || selected;
    }
    return selected;
  }, [trackingVehicleId, vehicles, selected]);

  const isAllVehiclesMode = trackingVehicleId === "all";

  const trackedCoords = useMemo(() => {
    const baseLat = trackingVehicle?.lat ?? selected?.lat ?? 3.75;
    const baseLng = trackingVehicle?.lng ?? selected?.lng ?? 8.78;
    const src =
      !isAllVehiclesMode && liveLocation
        ? liveLocation
        : { lat: baseLat, lng: baseLng };
    return {
      lat: typeof src.lat === "number" ? src.lat : baseLat,
      lng: typeof src.lng === "number" ? src.lng : baseLng,
    };
  }, [liveLocation, selected?.lat, selected?.lng, trackingVehicle, trackingVehicleId]);

  const selectedRoutes = useMemo(() => {
    if (trackingVehicleId === "all") return VEHICLE_ROUTES;
    if (trackingVehicleId && VEHICLE_ROUTES[trackingVehicleId]) {
      return { [trackingVehicleId]: VEHICLE_ROUTES[trackingVehicleId] };
    }
    return {};
  }, [trackingVehicleId]);

  const highlightedTrip = useMemo(() => {
    if (!trackingVehicle) return null;
    const route = VEHICLE_ROUTES[trackingVehicle.id]?.path || [];
    const lastTrip =
      Array.isArray(trackingVehicle.usoHistorial) && trackingVehicle.usoHistorial.length
        ? trackingVehicle.usoHistorial[trackingVehicle.usoHistorial.length - 1]
        : consumptionData.lastTrips?.[0];
    const locationVehicleId = trackingVehicle.id;
    const fromStreet =
      (route.length && guessStreetName(route[0][1], route[0][0], locationVehicleId)) ||
      guessStreetName(trackedCoords.lat, trackedCoords.lng, locationVehicleId);
    const toStreet =
      (route.length &&
        guessStreetName(
          route[route.length - 1][1],
          route[route.length - 1][0],
          locationVehicleId
        )) ||
      "Destino dinámico";
    return {
      label:
        lastTrip?.driver ||
        trackingVehicle.descripcion ||
        trackingVehicle.matricula ||
        "Operación",
      summary:
        lastTrip?.purpose ||
        lastTrip?.summary ||
        `Desplazamiento actual sobre ${guessStreetName(
          trackedCoords.lat,
          trackedCoords.lng,
          locationVehicleId
        )}.`,
      route: `Desde ${fromStreet} → ${toStreet}`,
      date: lastTrip?.date || new Date().toLocaleDateString("es-ES"),
    };
  }, [consumptionData.lastTrips, trackingVehicle, trackedCoords.lat, trackedCoords.lng, locationTicker]);

  const highlightedRouteParts = highlightedTrip?.route
    ? highlightedTrip.route.split("→").map((part) => part.trim())
    : [];

  const activeTaskCard = !isAllVehiclesMode && trackingVehicle && highlightedTrip
    ? {
        driver: trackingVehicle.conductor || "Sin conductor asignado",
        title: highlightedTrip.label || "Seguimiento operativo",
        summary: highlightedTrip.summary,
        from: highlightedRouteParts[0] || "Malabo",
        to: highlightedRouteParts[1] || "Destino en curso",
    street:
      locationNameRef.current.get(trackingVehicle.id)?.street ||
      guessStreetName(trackedCoords.lat, trackedCoords.lng, trackingVehicle?.id),
        coords: `${trackedCoords.lat.toFixed(4)}, ${trackedCoords.lng.toFixed(4)}`,
        date: highlightedTrip.date,
      }
    : null;

  const comparisonVehicleTotals = useMemo(() => {
    const selectedVehicles = vehicles.filter((veh) => comparisonVehicles.includes(veh.id));
    const monthKey = comparisonMonthFilter === "all" ? null : comparisonMonthFilter;
    return selectedVehicles.map((veh) => {
      const entries = (veh.consumo || []).filter((entry) => {
        if (!entry?.mes) return false;
        if (!monthKey) return true;
        return entry.mes.toLowerCase() === monthKey;
      });
      const total = entries.reduce((acc, entry) => {
        const value = comparisonMetric === "liters" ? entry.litros || 0 : entry.costo || 0;
        return acc + (typeof value === "number" ? value : Number(value) || 0);
      }, 0);
      const label = veh.descripcion || veh.matricula || `${veh.marca || ""} ${veh.modelo || ""}`.trim() || veh.id;
      return { id: veh.id, label, total };
    });
  }, [vehicles, comparisonVehicles, comparisonMetric, comparisonMonthFilter]);

  const comparisonPieData = useMemo(() => {
    const total = comparisonVehicleTotals.reduce((sum, segment) => sum + segment.total, 0) || 1;
    let cursor = 0;
    const colors = ["#2563eb", "#ef4444", "#10b981", "#8b5cf6", "#f97316"];
    return comparisonVehicleTotals.map((segment, index) => {
      const start = (cursor / total) * 100;
      cursor += segment.total;
      const end = (cursor / total) * 100;
      return {
        ...segment,
        ratio: segment.total / total,
        background: `${colors[index % colors.length]} ${start}% ${end}%`,
      };
    });
  }, [comparisonVehicleTotals]);

  const comparisonMonthData = useMemo(() => {
    const selectedVehicles = vehicles.filter((veh) => comparisonVehicles.includes(veh.id));
    return MONTH_SERIES.map((month) => {
      const value = selectedVehicles.reduce((acc, veh) => {
        const entry = (veh.consumo || []).find((row) => row?.mes && row.mes.toLowerCase() === month.key);
        if (!entry) return acc;
        const amount = comparisonMetric === "liters" ? entry.litros || 0 : entry.costo || 0;
        return acc + (typeof amount === "number" ? amount : Number(amount) || 0);
      }, 0);
      return { label: month.short, value };
    });
  }, [vehicles, comparisonVehicles, comparisonMetric]);

  const comparisonMonthMax = Math.max(
    1,
    ...comparisonMonthData.map((row) => row.value)
  );

  const historyTableRows = useMemo(() => {
    const monthFilter = consumptionMonth === "all" ? null : consumptionMonth;
    const selection = historyVehicleSelection.length
      ? historyVehicleSelection
      : selected?.id
      ? [selected.id]
      : [];
    const rows: Array<{
      id: string;
      vehicle: string;
      key: string;
      label: string;
      litros: number;
      km: number;
      costo: number;
    }> = [];
    selection.forEach((vehId) => {
      const veh = vehicles.find((v) => v.id === vehId);
      if (!veh) return;
      const label = veh.descripcion || veh.matricula || veh.id;
      (veh.consumo || []).forEach((entry) => {
        if (!entry?.mes) return;
        const key = entry.mes.toLowerCase();
        if (monthFilter && key !== monthFilter) return;
        const monthMeta = MONTH_SERIES.find((m) => m.key === key);
        rows.push({
          id: `${veh.id}-${key}`,
          vehicle: label,
          key,
          label: monthMeta?.short || title(key),
          litros: entry.litros || 0,
          km: entry.km || 0,
          costo: entry.costo || 0,
        });
      });
    });
    rows.sort((a, b) => {
      const diff = (MONTH_INDEX[a.key] || 0) - (MONTH_INDEX[b.key] || 0);
      if (diff !== 0) return diff;
      return a.vehicle.localeCompare(b.vehicle);
    });
    return rows;
  }, [historyVehicleSelection, vehicles, consumptionMonth, selected?.id]);

  const historySortValue = (row: HistoryRow, column: HistorySortableColumn) => {
    const value = row[column];
    if (typeof value === "string") return value.toLowerCase();
    return value;
  };

  const sortedHistoryRows = useMemo(() => {
    const rows = [...historyTableRows];
    rows.sort((a, b) => {
      const valA = historySortValue(a, historySort.column);
      const valB = historySortValue(b, historySort.column);
      if (typeof valA === "string" && typeof valB === "string") {
        return historySort.direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return historySort.direction === "asc" ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
    return rows;
  }, [historyTableRows, historySort]);

  const handleHistorySort = (column: HistorySortableColumn) => {
    setHistorySort((prev) => ({
      column,
      direction: prev.column === column ? (prev.direction === "asc" ? "desc" : "asc") : "asc",
    }));
  };

  const driverKmSeries = useMemo(() => {
    const driverSeries =
      driverUsageData?.map((entry) => {
        const monthly = MONTH_SERIES.map((month) => {
          const record = entry.registros?.find((reg) => reg.mes === month.key);
          return {
            month: month.key,
            label: month.short,
            value: record?.km ?? 0,
            vehiculo: record?.vehiculo_id,
          };
        });
        return {
          key: entry.driver_id || entry.driver_nombre,
          label: entry.driver_nombre || entry.driver_id,
          monthly,
          total: monthly.reduce((sum, item) => sum + item.value, 0),
        };
      }) || [];

    const vehicleMap = new Map<
      string,
      {
        label: string;
        monthly: number[];
      }
    >();
    driverUsageData?.forEach((entry) => {
      entry.registros?.forEach((reg) => {
        if (!reg.vehiculo_id) return;
        const idx = MONTH_INDEX[reg.mes];
        if (idx == null) return;
        if (!vehicleMap.has(reg.vehiculo_id)) {
          const veh = vehicles.find((v) => v.id === reg.vehiculo_id);
          vehicleMap.set(reg.vehiculo_id, {
            label: veh?.descripcion || veh?.matricula || reg.vehiculo_id,
            monthly: Array(MONTH_SERIES.length).fill(0),
          });
        }
        const target = vehicleMap.get(reg.vehiculo_id);
        if (target) {
          target.monthly[idx] += reg.km;
        }
      });
    });

    const vehicleSeries = Array.from(vehicleMap.entries()).map(([vehId, data]) => {
      const monthly = data.monthly.map((value, idx) => ({
        month: MONTH_SERIES[idx].key,
        label: MONTH_SERIES[idx].short,
        value,
      }));
      return {
        key: vehId,
        label: data.label,
        monthly,
        total: data.monthly.reduce((sum, value) => sum + value, 0),
      };
    });

    const maxMonthly = Math.max(
      0,
      ...driverSeries.flatMap((entity) => entity.monthly.map((m) => m.value)),
      ...vehicleSeries.flatMap((entity) => entity.monthly.map((m) => m.value))
    );

    return { driver: driverSeries, vehicle: vehicleSeries, maxMonthly: maxMonthly || 0 };
  }, [driverUsageData, vehicles]);

  useEffect(() => {
    const available = driverKmSeries[driverKmMode]?.map((entity) => entity.key) || [];
    if (!available.length) {
      setDriverKmSelection([]);
      return;
    }
    setDriverKmSelection((prev) => {
      const filtered = prev.filter((key) => available.includes(key));
      if (filtered.length) return filtered;
      return available.slice(0, Math.min(available.length, 3));
    });
  }, [driverKmMode, driverKmSeries]);

  const driverKmEntities = driverKmSeries[driverKmMode] || [];

  const driverKmSelectedEntities = useMemo(() => {
    if (!driverKmSelection.length) return [];
    return driverKmEntities.filter((entity) => driverKmSelection.includes(entity.key));
  }, [driverKmEntities, driverKmSelection]);

  const toggleDriverKmSelection = useCallback(
    (key: string) => {
      setDriverKmSelection((prev) => {
        if (prev.includes(key)) {
          return prev.filter((item) => item !== key);
        }
        return [...prev, key];
      });
    },
    []
  );

  const driverKmMonthlyTable = useMemo(() => {
    return MONTH_SERIES.map((month) => {
      const values = driverKmSelectedEntities.map((entity) => {
        const record = entity.monthly.find((m) => m.month === month.key);
        return {
          key: entity.key,
          label: entity.label,
          value: record?.value ?? 0,
        };
      });
      const total = values.reduce((sum, item) => sum + item.value, 0);
      return { month: month.key, label: month.short, values, total };
    });
  }, [driverKmSelectedEntities]);

  const driverKmTotals = useMemo(
    () =>
      driverKmSelectedEntities.map((entity) => ({
        key: entity.key,
        label: entity.label,
        total: entity.total,
      })),
    [driverKmSelectedEntities]
  );

  const driverKmTotalsMax = useMemo(() => {
    if (!driverKmTotals.length) return 1;
    return Math.max(1, ...driverKmTotals.map((item) => item.total));
  }, [driverKmTotals]);

  const driverKmInsights = useMemo(() => {
    if (!driverKmSelectedEntities.length) return null;
    const bestEntity = [...driverKmSelectedEntities].sort((a, b) => b.total - a.total)[0];
    const bestMonth = driverKmMonthlyTable.reduce(
      (acc, row) => {
        if (row.total > acc.total) return row;
        return acc;
      },
      { month: "", label: "", values: [], total: 0 }
    );
    return {
      headline: `${bestEntity.label} registra ${bestEntity.total.toLocaleString("es-GQ")} km al año.`,
      monthHighlight: bestMonth.total
        ? `${title(bestMonth.label)} concentra ${bestMonth.total.toLocaleString("es-GQ")} km combinados.`
        : "Aún no hay datos consolidados para el mes seleccionado.",
    };
  }, [driverKmMonthlyTable, driverKmSelectedEntities]);

  const riskIndicators = useMemo(() => {
    if (!selected) return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const ageYears = selected.año ? currentYear - selected.año : null;
    const ageScore = ageYears == null ? 3 : ageYears <= 2 ? 1 : ageYears <= 4 ? 2 : ageYears <= 7 ? 3 : ageYears <= 10 ? 4 : 5;

    const km = parseKilometers(selected.kilometraje);
    const usageScore =
      km == null
        ? 3
        : km < 30000
        ? 1
        : km < 60000
        ? 2
        : km < 90000
        ? 3
        : km < 130000
        ? 4
        : 5;

    const lastMaintenance = maintenanceRowsSorted[0]?.fecha ? new Date(maintenanceRowsSorted[0].fecha) : null;
    const monthsSinceService =
      lastMaintenance && !Number.isNaN(lastMaintenance.getTime())
        ? (now.getTime() - lastMaintenance.getTime()) / (1000 * 60 * 60 * 24 * 30)
        : null;
    const statusScore =
      monthsSinceService == null ? 3 : monthsSinceService <= 2 ? 1 : monthsSinceService <= 4 ? 2 : monthsSinceService <= 6 ? 3 : monthsSinceService <= 9 ? 4 : 5;

    const scores = [ageScore, usageScore, statusScore];
    const overall = clamp(scores.reduce((sum, s) => sum + s, 0) / scores.length);

    const label =
      overall < 2
        ? "Excelente"
        : overall < 3
        ? "Estable"
        : overall < 4
        ? "Atención"
        : overall < 5
        ? "Crítico"
        : "Urgente";

    return {
      overall: {
        score: overall,
        label,
        description:
          overall >= 4 ? "Programar intervención prioritaria" : overall >= 3 ? "Monitorear en próximos meses" : "Operación normal",
      },
      breakdowns: [
        {
          key: "age",
          label: "Edad",
          score: ageScore,
          detail: ageYears != null ? `${ageYears} años` : "Sin dato",
        },
        {
          key: "usage",
          label: "Uso / Km",
          score: usageScore,
          detail: km != null ? `${km.toLocaleString("es-GQ")} km` : "Sin dato",
        },
        {
          key: "status",
          label: "Último servicio",
          score: statusScore,
          detail:
            monthsSinceService != null
              ? `${Math.round(monthsSinceService)} meses`
              : lastMaintenance
              ? lastMaintenance.toLocaleDateString("es-ES")
              : "Sin dato",
        },
      ],
    };
  }, [maintenanceRowsSorted, selected]);

  const renderStars = (score: number, size = "text-xl") => {
    const active = Math.round(score);
    return (
      <div className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, idx) => (
          <span
            key={`flame-${idx}`}
            className={`${idx < active ? "text-yellow-500" : "text-gray-300"} ${size}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const renderLiquidSquare = (
    value: number,
    max: number,
    palette?: [string, string, string],
    waveDelay = 0
  ) => {
    const percent = max ? Math.max(4, (value / max) * 100) : 0;
    const defaultPalette = ["#c2410c", "#f97316", "#7c2d12"];
    const colors = palette || defaultPalette;
    const topColor = colors[0];
    const midColor = colors[1] ?? colors[0];
    const bottomColor = colors[2] ?? colors[1] ?? colors[0];
    return (
      <div className="relative w-24 h-48 bg-white border-2 border-black rounded-3xl overflow-hidden shadow-inner">
        <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: `${percent}%` }}>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${topColor}, ${midColor}, ${bottomColor})`,
            }}
          />
          <div className="absolute inset-x-0 top-0 h-12 overflow-hidden opacity-90 pointer-events-none">
          <div
            className="liquid-wave-surface"
            style={{
              animationDuration: `${5 + waveDelay % 3}s`,
              animationDelay: `${waveDelay}s`,
            }}
          />
          {palette == null && (
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 30 }).map((_, idx) => {
                const left = ((idx * 11 + waveDelay * 13) % 85) + 5;
                const top = ((idx * 5 + (waveDelay * 9) % 60) % 80) + 5;
                return (
                  <span
                    key={`bubble-${idx}-${waveDelay}`}
                    className="liquid-bubble"
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      animationDelay: `${waveDelay + idx * 0.15}s`,
                      animationDuration: `${3.5 + (idx % 4) * 0.3}s`,
                      width: `${4 + (idx % 4) * 2}px`,
                      height: `${4 + (idx % 4) * 2}px`,
                    }}
                  />
                );
              })}
            </div>
          )}
          </div>
        </div>
        <div
          className="absolute inset-x-2 bottom-2 h-2 bg-white/70 rounded-full border border-white/60 shadow"
          style={{ animation: "liquidGlow 3s ease-in-out infinite" }}
        />
      </div>
    );
  };

  const computeDriverRating = (driver: Driver) => {
    const assignments = driver.asignados?.length || 0;
    const availability =
      driver.estado === "Disponible" ? 5 : driver.estado === "En servicio" ? 4 : 3;
    const workload = assignments === 0 ? 4 : assignments === 1 ? 5 : assignments === 2 ? 4 : 3;
    const compliance = driver.licencia ? 5 : 3;
    const score = clamp((availability + workload + compliance) / 3);
    const label =
      score >= 4.5 ? "Excelente" : score >= 3.5 ? "Confiable" : score >= 2.5 ? "Regular" : "Revisar";
    return { score, label };
  };

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.departamento && emp.departamento.trim()) {
        set.add(emp.departamento.trim());
      }
    });
    if (selected?.departamento) set.add(selected.departamento);
    return Array.from(set).sort();
  }, [employees, selected]);

  const currentDeptSelection =
    reassignForm.departamento || selected?.departamento || "";

  const assignationOptions = useMemo(() => {
    if (!currentDeptSelection) return [];
    return employees
      .filter(
        (emp) =>
          (emp.departamento || "").toLowerCase() ===
          currentDeptSelection.toLowerCase()
      )
      .map((emp) => ({
        id: emp.id ?? emp.nombrecompleto,
        name:
          emp.nombrecompleto ||
          `${emp.nombres || ""} ${emp.apellidos || ""}`.trim() ||
          "Colaborador sin nombre",
      }));
  }, [employees, currentDeptSelection]);

  const availableDrivers = useMemo(
    () => drivers.filter((d) => (d.estado || "Disponible") !== "En servicio"),
    [drivers]
  );

  const tabNavigation: [TabKey, string][] = [
    ["detalles", "Detalles"],
    ["tracking", "Posicionamiento"],
    ["documentacion", "Documentos"],
    ["mantenimiento", "Mantenimiento"],
    ["consumo", "Consumo"],
    ["conductores", "Conductores"],
  ];

  const previewScale = useMemo(() => {
    if (!selected) return 1.05;
    return VEHICLE_PREVIEW_SCALE[selected.id] ?? 1.05;
  }, [selected]);

  const vehicleQrUrl = useMemo(() => {
    if (!selected) return "";
    const payload = {
      id: selected.id,
      matricula: selected.matricula || "",
      marca: selected.marca || "",
      modelo: selected.modelo || "",
      departamento: selected.departamento || "",
      conductor: selected.conductor || "",
    };
    const encoded = encodeURIComponent(JSON.stringify(payload));
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}`;
  }, [selected]);

  const vehicleInfoBlocks = useMemo(() => {
    if (!selected) return [];
    return [
      { label: "Matrícula", value: fmt(selected.matricula) },
      { label: "Marca", value: fmt(selected.marca) },
      { label: "Modelo", value: fmt(selected.modelo) },
      { label: "Año", value: selected.año ?? "—" },
      { label: "Color", value: fmt(selected.color) },
      { label: "VIN", value: fmt(selected.vin) },
      { label: "Tipo", value: fmt(selected.tipo) },
      {
        label: "Adquisición",
        value: fmt(selected.fecha_de_adquisicion || selected.fecha_adquisicion),
      },
      {
        label: "Precio de compra",
        value:
          selected.precio_compra != null ? formatMoney(selected.precio_compra) : "N/D",
      },
      { label: "Kilometraje", value: fmt(selected.kilometraje) },
    ];
  }, [selected]);

  const seguroInfo = useMemo(() => {
    if (!selected?.seguro) return [];
    return [
      { label: "Compañía", value: fmt(selected.seguro.compania) },
      { label: "Póliza", value: fmt(selected.seguro.poliza) },
      { label: "Vencimiento", value: fmt(selected.seguro.vencimiento) },
    ];
  }, [selected?.seguro]);

  const permisoInfo = useMemo(() => {
    if (!selected?.permiso) return [];
    return [
      { label: "Emisión", value: fmt(selected.permiso.emision) },
      { label: "Vencimiento", value: fmt(selected.permiso.vencimiento) },
      {
        label: "Costo",
        value:
          selected.permiso.costo != null ? formatMoney(selected.permiso.costo) : "N/D",
      },
    ];
  }, [selected?.permiso]);

  const tasaInfo = useMemo(() => {
    if (!selected?.tasa) return [];
    return [
      { label: "Emisión", value: fmt(selected.tasa.emision) },
      { label: "Vencimiento", value: fmt(selected.tasa.vencimiento) },
      {
        label: "Costo",
        value:
          selected.tasa.costo != null ? formatMoney(selected.tasa.costo) : "N/D",
      },
    ];
  }, [selected?.tasa]);

  useEffect(() => {
    if (!selected?.id) {
      setPreviewZoom(1);
    } else {
      setPreviewZoom(VEHICLE_BASE_ZOOM[selected.id] ?? 1);
    }
  }, [selected?.id]);

  useEffect(() => {
    if (!selected && vehicles.length > 0) {
      const first = vehicles[0];
      setSelected(first);
      setDraft(first ? JSON.parse(JSON.stringify(first)) : null);
    }
  }, [selected, vehicles]);

  useEffect(() => {
    return () => {
      if (docPreview) {
        URL.revokeObjectURL(docPreview.url);
      }
    };
  }, [docPreview]);

  /* ================= Mutations ================= */
  const selectVehicle = useCallback(
    (id: string) => {
      const v = vehicles.find((x) => x.id === id) || null;
      setSelected(v);
      setDraft(v ? JSON.parse(JSON.stringify(v)) : null);
      setEditMode(false);
    },
    [vehicles]
  );

  const updateVehicle = useCallback(
    (partial: Partial<Vehicle>) => {
      if (!draft) return;
      const next = { ...draft, ...partial };
      setDraft(next);
    },
    [draft]
  );

  const updateVehicleNested = useCallback(
    (path: string, value: any) => {
      if (!draft) return;
      const next: any = JSON.parse(JSON.stringify(draft));
      // path like "seguro.compania"
      const parts = path.split(".");
      let t = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!t[key] || typeof t[key] !== "object") t[key] = {};
        t = t[key];
      }
      t[parts[parts.length - 1]] = value;
      setDraft(next);
    },
    [draft]
  );

  const persistDraft = useCallback(() => {
    if (!draft) return;
    // replace by id in vehicles
    setVehicles((prev) => {
      const idx = prev.findIndex((x) => x.id === draft.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = draft;
      saveToLocalStorage(next);
      return next;
    });
    setSelected(draft);
    setEditMode(false);
    showToast("Vehículo actualizado.");
  }, [draft, saveToLocalStorage, showToast]);

  const deleteVehicle = useCallback(
    (id: string) => {
      setVehicles((prev) => {
        const next = prev.filter((x) => x.id !== id);
        saveToLocalStorage(next);
        if (selected?.id === id) {
          const fallback = next[0] ?? null;
          setSelected(fallback);
          setDraft(fallback ? JSON.parse(JSON.stringify(fallback)) : null);
          setEditMode(false);
        }
        return next;
      });
      showToast("Vehículo eliminado.");
    },
    [saveToLocalStorage, selected, showToast]
  );

  const addMaintenance = useCallback(
    (entry: MaintenanceEntry) => {
      if (!draft) return;
      const next: Vehicle = {
        ...draft,
        mantenimiento: [...(draft.mantenimiento || []), entry],
      };
      setDraft(next);
      setVehicles((prev) => {
        const idx = prev.findIndex((x) => x.id === draft.id);
        if (idx === -1) return prev;
        const arr = [...prev];
        arr[idx] = next;
        saveToLocalStorage(arr);
        return arr;
      });
      showToast("Mantenimiento agregado.");
    },
    [draft, saveToLocalStorage, showToast]
  );

  const removeMaintenance = useCallback(
    (i: number) => {
      if (!draft) return;
      const next: Vehicle = {
        ...draft,
        mantenimiento: (draft.mantenimiento || []).filter((_, idx) => idx !== i),
      };
      setDraft(next);
      setVehicles((prev) => {
        const idx = prev.findIndex((x) => x.id === draft.id);
        if (idx === -1) return prev;
        const arr = [...prev];
        arr[idx] = next;
        saveToLocalStorage(arr);
        return arr;
      });
      showToast("Mantenimiento eliminado.");
    },
    [draft, saveToLocalStorage, showToast]
  );

  const addUsage = useCallback(
    (entry: UsageEntry) => {
      if (!draft) return;
      const history = Array.isArray(draft.usoHistorial) ? draft.usoHistorial : [];
      const next: Vehicle = {
        ...draft,
        usoHistorial: [...history, entry],
      };
      setDraft(next);
      setVehicles((prev) => {
        const idx = prev.findIndex((x) => x.id === draft.id);
        if (idx === -1) return prev;
        const arr = [...prev];
        arr[idx] = next;
        saveToLocalStorage(arr);
        return arr;
      });
      showToast("Uso agregado.");
    },
    [draft, saveToLocalStorage, showToast]
  );

  /* ================= Tracking (offline simulation) ================= */
  useEffect(() => {
    if (selected?.id && historyVehicleSelection.length === 0) {
      setHistoryVehicleSelection([selected.id]);
    }
    if (selected?.id && comparisonVehicles.length === 0) {
      setComparisonVehicles([selected.id]);
    }
  }, [selected?.id, historyVehicleSelection.length, comparisonVehicles.length]);

  useEffect(() => {
    trackedCoordsRef.current = trackedCoords;
  }, [trackedCoords]);

  useEffect(() => {
    if (!trackingVehicle) return;
    const key = trackingVehicle.id;
    const coords: LatLng = { lat: trackedCoords.lat, lng: trackedCoords.lng };
    const last = lastTrackedCoordsRef.current.get(key);
    if (last && Math.hypot(last.lat - coords.lat, last.lng - coords.lng) < 1e-8) {
      return;
    }
    lastTrackedCoordsRef.current.set(key, coords);
    const entry = locationNameRef.current.get(key);
    if (!entry) {
      locationNameRef.current.set(key, {
        street: guessStreetName(coords.lat, coords.lng, key),
        counter: 0,
      });
      return;
    }
    const nextCounter = entry.counter + 1;
    if (nextCounter >= 5) {
      locationNameRef.current.set(key, {
        street: guessStreetName(coords.lat, coords.lng, key),
        counter: 0,
      });
    } else {
      locationNameRef.current.set(key, { ...entry, counter: nextCounter });
    }
  }, [trackedCoords.lat, trackedCoords.lng, trackingVehicle]);

  useEffect(() => {
    if (!trackingVehicle?.id) return;
    const key = trackingVehicle.id;
    const interval = window.setInterval(() => {
      const coords = trackedCoordsRef.current || { lat: 3.75, lng: 8.78 };
      const street = guessStreetName(coords.lat, coords.lng, key);
      locationNameRef.current.set(key, { street, counter: 0 });
      setLocationTicker((prev) => prev + 1);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [trackingVehicle?.id]);

  const randomDrift = (x: number) => (Math.random() - 0.5) * x;

  const computeNextVehiclePosition = useCallback(
    (vehicleId: string, fallback: { lat: number; lng: number }) => {
      const path = VEHICLE_ROUTES[vehicleId]?.path;
      if (path && path.length > 1) {
        const maxSegment = path.length - 1;
        const maxProgress = maxSegment - 1e-5;
        const prevState = movementProgressRef.current.get(vehicleId) ?? {
          progress: 0,
          direction: 1 as const,
        };
        let { progress, direction } = prevState;
        const baseStep = 0.01 + Math.random() * 0.012;
        let nextProgress = progress + direction * baseStep;
        if (Math.random() < 0.02) {
          direction = -direction;
          nextProgress = progress + direction * baseStep;
        }
        if (direction > 0 && nextProgress >= maxProgress) {
          nextProgress = maxProgress;
          direction = -1;
        } else if (direction < 0 && nextProgress <= 0) {
          nextProgress = 0;
          direction = 1;
        }
        nextProgress = Math.min(Math.max(nextProgress, 0), maxProgress);
        movementProgressRef.current.set(vehicleId, { progress: nextProgress, direction });

        const segmentIndex = Math.min(Math.floor(nextProgress), maxSegment - 1);
        const segmentProgress = nextProgress - segmentIndex;
        const start = path[segmentIndex];
        const end = path[segmentIndex + 1];
        const latDiff = end[1] - start[1];
        const lngDiff = end[0] - start[0];
        const totalDistance = Math.abs(latDiff) + Math.abs(lngDiff) || 1;
        const verticalRatio = Math.abs(latDiff) / totalDistance;
        let lat = start[1];
        let lng = start[0];
        if (Math.abs(latDiff) < 1e-6) {
          lng = start[0] + segmentProgress * lngDiff;
        } else if (Math.abs(lngDiff) < 1e-6) {
          lat = start[1] + segmentProgress * latDiff;
        } else if (segmentProgress <= verticalRatio) {
          const localProgress = segmentProgress / verticalRatio;
          lat = start[1] + localProgress * latDiff;
        } else {
          lat = end[1];
          const localProgress = (segmentProgress - verticalRatio) / (1 - verticalRatio);
          lng = start[0] + localProgress * lngDiff;
        }
        lng += randomDrift(0.00005);
        lat += randomDrift(0.0001);
        return { lat, lng };
      }
      return {
        lat: fallback.lat + Math.sin(Date.now() / 1800) * 0.0004 + randomDrift(0.0003),
        lng: fallback.lng + randomDrift(0.00012),
      };
    },
    []
  );

  const stopFleetSimulation = useCallback(() => {
    if (fleetAnimationTimer.current) {
      window.clearInterval(fleetAnimationTimer.current);
      fleetAnimationTimer.current = null;
    }
  }, []);

  const startFleetSimulation = useCallback(() => {
    stopFleetSimulation();
    fleetAnimationTimer.current = window.setInterval(() => {
      setVehicles((prev) =>
        prev.map((veh) => {
          const fallback = {
            lat: veh.lat ?? 3.75,
            lng: veh.lng ?? 8.78,
          };
          const next = computeNextVehiclePosition(veh.id, fallback);
          return { ...veh, lat: next.lat, lng: next.lng };
        })
      );
    }, 1000);
  }, [computeNextVehiclePosition, stopFleetSimulation]);

  const stopTracking = useCallback(() => {
    if (trackingTimer.current) {
      window.clearInterval(trackingTimer.current);
      trackingTimer.current = null;
    }
    setLiveLocation(null);
    stopFleetSimulation();
  }, [stopFleetSimulation]);

  const startTracking = useCallback(
    (vehicleIdOrAll: string | "all") => {
      stopTracking();
      setTrackingVehicleId(vehicleIdOrAll);
      setActiveTab("tracking");

      if (vehicleIdOrAll === "all") {
        setLiveLocation(null);
        return;
      }
      movementProgressRef.current.set(vehicleIdOrAll, { progress: 0, direction: 1 });
      const v = vehicles.find((x) => x.id === vehicleIdOrAll);
      if (!v) {
        showToast("Vehículo no encontrado.");
        return;
      }
      const baseLat = v.lat ?? 3.75;
      const baseLng = v.lng ?? 8.78;

      // seed
      setLiveLocation({
        lat: baseLat,
        lng: baseLng,
        speed: 0,
      });

      trackingTimer.current = window.setInterval(() => {
        setLiveLocation((prev) => {
          const p = prev || { lat: baseLat, lng: baseLng, speed: 0 };
          const base = computeNextVehiclePosition(vehicleIdOrAll, p);
          const next = {
            ...base,
            speed: Math.max(0, Math.round((Math.random() * 45 + p.speed * 0.5))),
          };
          return next;
        });

        // persist last known position to vehicle
        setVehicles((prev) => {
          const idx = prev.findIndex((x) => x.id === vehicleIdOrAll);
          if (idx === -1) return prev;
          const arr = [...prev];
          const current = arr[idx];
          const loc = liveLocation || { lat: baseLat, lng: baseLng, speed: 0 };
          arr[idx] = { ...current, lat: loc.lat, lng: loc.lng };
          saveToLocalStorage(arr);
          return arr;
        });
      }, 850);
    },
    [saveToLocalStorage, showToast, stopTracking, vehicles, liveLocation]
  );

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  useEffect(() => {
    if (activeTab !== "tracking" || mapContainerRef.current === null) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: buildMapStyle(onlineMode),
      center: [8.78, 3.75],
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

    map.on("load", () => {
      if (!map.getSource("fleet-routes")) {
        map.addSource("fleet-routes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "fleet-routes",
          type: "line",
          source: "fleet-routes",
          paint: {
            "line-width": 3,
            "line-color": ["coalesce", ["get", "color"], "#0ea5e9"],
            "line-opacity": 0.8,
            "line-dasharray": [2, 1],
          },
          layout: {
            visibility: "none",
          },
        });
      }
      setMapReady(true);
    });

    mapRef.current = map;
    return () => {
      setMapReady(false);
      mapMarkersRef.current.forEach((marker) => marker.remove());
      mapMarkersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [activeTab, onlineMode]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const vehiclesToRender =
      trackingVehicleId === "all"
        ? vehicles
        : vehicles.filter((v) => v.id === trackingVehicleId);

    const markers = mapMarkersRef.current;
    const activeIds = new Set<string>();

    vehiclesToRender.forEach((veh) => {
      const id = String(veh.id);
      activeIds.add(id);
      const presetCoord = trackingVehicleId === "all" ? getRouteDisplayCoordinate(id) : null;
      const baseLat = presetCoord?.lat ?? veh.lat ?? 3.75;
      const baseLng = presetCoord?.lng ?? veh.lng ?? 8.78;
      const coords: [number, number] = [baseLng, baseLat];

      if (trackingVehicleId !== "all" && liveLocation && veh.id === trackingVehicleId) {
        coords[0] = liveLocation.lng;
        coords[1] = liveLocation.lat;
      }

      let marker = markers.get(id);
      const target: LatLng = { lng: coords[0], lat: coords[1] };
      if (!marker) {
        const el = buildVehicleMarkerElement(veh);
        marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markers.set(id, marker);
        markerHeadingRef.current.set(id, 0);
      } else {
        animateMarkerTo(marker, id, target, 1100);
      }
    });

    markers.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    });

    if (trackingVehicleId !== "all" && vehiclesToRender.length) {
      const veh = vehiclesToRender[0];
      const centerLat = liveLocation?.lat ?? veh.lat ?? 3.75;
      const centerLng = liveLocation?.lng ?? veh.lng ?? 8.78;
      map.easeTo({ center: [centerLng, centerLat], zoom: 14.5, duration: 800 });
    } else if (trackingVehicleId === "all" && vehiclesToRender.length) {
      const bounds = vehiclesToRender.reduce((acc, veh) => {
        const presetCoord = getRouteDisplayCoordinate(veh.id);
        const lat = presetCoord?.lat ?? veh.lat ?? 3.75;
        const lng = presetCoord?.lng ?? veh.lng ?? 8.78;
        return acc.extend([lng, lat]);
      }, new maplibregl.LngLatBounds([8.7, 3.7], [8.8, 3.8]));
      map.fitBounds(bounds, { padding: 60, duration: 900, maxZoom: 13 });
    }
  }, [mapReady, vehicles, liveLocation, trackingVehicleId]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    const source = map.getSource("fleet-routes") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const features = Object.entries(VEHICLE_ROUTES)
      .filter(([id]) => trackingVehicleId === "all" || trackingVehicleId === id)
      .map(([id, config]) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: config.path },
        properties: { color: config.color },
      }));
    source.setData({
      type: "FeatureCollection",
      features,
    });
    if (map.getLayer("fleet-routes")) {
      map.setLayoutProperty("fleet-routes", "visibility", features.length ? "visible" : "none");
    }
  }, [mapReady, trackingVehicleId]);

  /* ================= Drivers ================= */
  const addDriver = useCallback(() => {
    const name = newDriver.nombre.trim();
    if (!name) {
      showToast("Nombre del conductor requerido.");
      return;
    }
    const d: Driver = {
      id: uuid(),
      nombre: name,
      telefono: newDriver.telefono?.trim() || "",
      licencia: newDriver.licencia?.trim() || "",
      estado: "Disponible",
      asignados: [],
    };
    setDrivers((prev) => {
      const next = [...prev, d];
      saveDriversToLS(next);
      return next;
    });
    setNewDriver({ nombre: "" });
    showToast("Conductor agregado.");
  }, [newDriver, saveDriversToLS, showToast]);

  const removeDriver = useCallback(
    (id: string) => {
      setDrivers((prev) => {
        const next = prev.filter((d) => d.id !== id);
        saveDriversToLS(next);
        return next;
      });
      showToast("Conductor eliminado.");
    },
    [saveDriversToLS, showToast]
  );

  const assignDriverToVehicle = useCallback(
    (driverId: string, vehicleId: string) => {
      setDrivers((prev) => {
        const idx = prev.findIndex((d) => d.id === driverId);
        if (idx === -1) return prev;
        const arr = [...prev];
        const d = arr[idx];
        const setAssign = new Set(d.asignados || []);
        if (setAssign.has(vehicleId)) {
          setAssign.delete(vehicleId);
        } else {
          setAssign.add(vehicleId);
        }
        d.asignados = [...setAssign];
        saveDriversToLS(arr);
        return arr;
      });
    },
    [saveDriversToLS]
  );

  const updateDriverPhoto = useCallback(
    (driverId: string, foto: string) => {
      setDrivers((prev) => {
        const next = prev.map((d) => (d.id === driverId ? { ...d, foto } : d));
        saveDriversToLS(next);
        return next;
      });
    },
    [saveDriversToLS]
  );

  const handleDriverLocalFile = useCallback(
    (driverId: string, file?: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          updateDriverPhoto(driverId, reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [updateDriverPhoto]
  );

  const handleDriverPhotoChange = useCallback(
    async (driverId: string) => {
      const electronAPI = (window as any)?.electronAPI;
      if (electronAPI?.selectPhoto) {
        const result = await electronAPI.selectPhoto();
        if (result?.url_foto) {
          updateDriverPhoto(driverId, result.url_foto);
          return;
        }
      }
      const input = driverFileInputs.current[driverId];
      if (input) {
        input.value = "";
        input.click();
      } else {
        showToast("No se pudo abrir el selector de fotos.");
      }
    },
    [showToast, updateDriverPhoto]
  );

  const toggleComparisonSection = useCallback((key: keyof typeof comparisonOpen) => {
    setComparisonOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const toggleHistoryVehicleSelection = useCallback(
    (vehicleId: string) => {
      setHistoryVehicleSelection((prev) => {
        if (prev.includes(vehicleId)) {
          const next = prev.filter((id) => id !== vehicleId);
          return next;
        }
        return [...prev, vehicleId];
      });
    },
    []
  );

  const handlePreviewPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = previewRef.current?.getBoundingClientRect();
      if (!rect) return;
      const percentX = (event.clientX - rect.left) / rect.width - 0.5;
      const percentY = (event.clientY - rect.top) / rect.height - 0.5;
      setPreviewRotation({
        x: Math.max(Math.min(-percentY * 12, 15), -15),
        y: Math.max(Math.min(percentX * 40, 35), -35),
      });
    },
    []
  );

  const handlePreviewPointerLeave = useCallback(() => {
    setPreviewRotation({ x: 0, y: 0 });
  }, []);

  const adjustPreviewZoom = useCallback((delta: number) => {
    setPreviewZoom((prev) => {
      const next = prev + delta;
      return Math.max(0.6, Math.min(1.8, next));
    });
  }, []);

  const handlePreviewWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.08 : 0.08;
      adjustPreviewZoom(delta);
    },
    [adjustPreviewZoom]
  );

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return () => {};
    const handler = (event: WheelEvent) => handlePreviewWheel(event);
    element.addEventListener("wheel", handler, { passive: false });
    return () => {
      element.removeEventListener("wheel", handler);
    };
  }, [handlePreviewWheel]);

  const handleCloseDocPreview = useCallback(() => {
    setDocPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const handleGenerateVehicleDocument = useCallback(
    (docMeta: VehicleDocumentMeta) => {
      if (!selected) return;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginX = 16;
      const headerImageWidth = 28;
      const headerImageHeight = 28;
      const headerTop = 12;

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", marginX, headerTop, headerImageWidth, headerImageHeight);
      }

      const textStartX = logoDataUrl ? marginX + headerImageWidth + 6 : marginX;
      let cursorY = headerTop + 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Iniciativas Elebi — Gestión de Flota", textStartX, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      cursorY += 6;
      doc.text(`Documento: ${docMeta.label}`, textStartX, cursorY);
      cursorY += 6;
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-ES")}`, textStartX, cursorY);

      const dividerY = Math.max(headerTop + headerImageHeight + 8, cursorY + 6);
      doc.line(marginX, dividerY, 210 - marginX, dividerY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Resumen del vehículo", marginX, dividerY + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const generalInfo: [string, string][] = [
        [
          "Vehículo",
          selected.descripcion ||
            `${selected.marca || ""} ${selected.modelo || ""}`.trim() ||
            selected.id,
        ],
        ["Matrícula", selected.matricula || "No registrada"],
        ["Departamento", selected.departamento || "No asignado"],
        ["Asignación", selected.asignacion || "No especificada"],
        ["Conductor", selected.conductor || "Sin conductor"],
      ];
      let infoY = dividerY + 14;
      generalInfo.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, marginX, infoY);
        infoY += 6;
      });

      doc.setFont("helvetica", "bold");
      doc.text(docMeta.label, marginX, infoY + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      let detailY = infoY + 10;

      docMeta.highlights.forEach(({ label, value }) => {
        if (detailY > 270) {
          doc.addPage();
          detailY = 20;
        }
        const printable = value === undefined || value === null || value === "" ? "N/D" : String(value);
        doc.text(`${label}: ${printable}`, marginX, detailY);
        detailY += 6;
      });

      detailY += 6;
      const descLines = doc.splitTextToSize(docMeta.description, 210 - marginX * 2);
      doc.setFont("helvetica", "italic");
      doc.text(descLines, marginX, detailY);
      detailY += descLines.length * 5 + 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Documento generado automáticamente para uso interno.", marginX, detailY);

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setDocPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url,
          title: `${docMeta.label} · ${selected.matricula || selected.id}`,
        };
      });
    },
    [logoDataUrl, selected]
  );

  const handleGenerateMaintenanceInvoice = useCallback(
    (entry: {
      mes: string;
      fecha: string;
      descripcion: string;
      taller: string;
      costo: number | string;
      factura?: string;
    }) => {
      if (!selected) return;
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margin = 16;
      const top = 14;
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", margin, top, 28, 28);
      }
      const startX = logoDataUrl ? margin + 34 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Iniciativas Elebi — Orden de Servicio", startX, top + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Vehículo: ${selected.descripcion || selected.matricula || selected.id}`, startX, top + 16);
      doc.text(`Matrícula: ${selected.matricula || "No registrada"}`, startX, top + 22);
      doc.text(`Fecha emisión: ${new Date().toLocaleDateString("es-ES")}`, startX, top + 28);

      const divider = top + 36;
      doc.line(margin, divider, 210 - margin, divider);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Detalle del servicio", margin, divider + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Mes imputado: ${entry.mes}`, margin, divider + 14);
      doc.text(`Fecha ejecutada: ${entry.fecha}`, margin, divider + 20);
      doc.text(`Taller / Proveedor: ${entry.taller}`, margin, divider + 26);
      const amount =
        typeof entry.costo === "number"
          ? entry.costo
          : Number(String(entry.costo).replace(/[^\d.-]/g, ""));
      doc.text(`Costo total: ${formatMoney(amount) || "N/D"}`, margin, divider + 32);

      const descLines = doc.splitTextToSize(entry.descripcion, 180);
      doc.text("Descripción:", margin, divider + 40);
      doc.text(descLines, margin, divider + 46);

      const footerY = divider + 46 + descLines.length * 5 + 10;
      doc.line(margin, footerY, 210 - margin, footerY);
      doc.setFontSize(9);
      doc.text(
        "Documento generado automáticamente para control interno de mantenimiento.",
        margin,
        footerY + 6
      );

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setDocPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url,
          title: `Factura mantenimiento · ${selected.matricula || selected.id}`,
        };
      });
    },
    [logoDataUrl, selected]
  );

  const handleGenerateDriverLicensePdf = useCallback(
    (driver: Driver) => {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margin = 18;
      const headerHeight = 26;
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", margin, margin, headerHeight, headerHeight);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Iniciativas Elebi — Identificación de Conductor", margin + headerHeight + 6, margin + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Emitido: ${new Date().toLocaleDateString("es-ES")}`, margin + headerHeight + 6, margin + 16);

      const dividerY = margin + headerHeight + 6;
      doc.line(margin, dividerY, 210 - margin, dividerY);

      const assignedVehicles = vehicles.filter((v) => driver.asignados?.includes(v.id));
      let cursorY = dividerY + 10;
      doc.setFont("helvetica", "bold");
      doc.text("Datos del conductor", margin, cursorY);
      doc.setFont("helvetica", "normal");
      cursorY += 7;
      doc.text(`Nombre: ${driver.nombre}`, margin, cursorY);
      cursorY += 6;
      doc.text(`Teléfono: ${driver.telefono || "No registrado"}`, margin, cursorY);
      cursorY += 6;
      doc.text(`Licencia: ${driver.licencia || "Sin licencia cargada"}`, margin, cursorY);
      cursorY += 6;
      doc.text(`Estado actual: ${driver.estado || "Disponible"}`, margin, cursorY);
      cursorY += 10;

      doc.setFont("helvetica", "bold");
      doc.text("Vehículos asignados", margin, cursorY);
      doc.setFont("helvetica", "normal");
      cursorY += 7;
      if (assignedVehicles.length) {
        assignedVehicles.forEach((veh) => {
          doc.text(
            `• ${veh.descripcion || `${veh.marca || ""} ${veh.modelo || ""}`.trim()} (${veh.matricula || "Sin matrícula"})`,
            margin,
            cursorY
          );
          cursorY += 6;
        });
      } else {
        doc.text("• No tiene asignaciones activas", margin, cursorY);
        cursorY += 6;
      }

      cursorY += 4;
      doc.setFont("helvetica", "italic");
      doc.text(
        "Documento interno para verificar credenciales de conducción y asignaciones. No sustituye la licencia oficial.",
        margin,
        cursorY,
        { maxWidth: 180 }
      );

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setDocPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url,
          title: `Licencia · ${driver.nombre}`,
        };
      });
    },
    [logoDataUrl, vehicles]
  );

  const handleReassignChange = useCallback((field: keyof typeof reassignForm, value: string) => {
    setReassignForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleReassignSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selected) return;
      const ownerValue =
        (reassignForm.propietario || "Iniciativas Elebi").trim() ||
        "Iniciativas Elebi";
      setVehicles((prev) => {
        const idx = prev.findIndex((v) => v.id === selected.id);
        if (idx === -1) return prev;
        const next = [...prev];
        const updated = {
          ...next[idx],
          departamento: reassignForm.departamento.trim() || undefined,
          asignacion: reassignForm.asignacion.trim() || undefined,
          conductor: reassignForm.conductor.trim() || undefined,
          propietario: ownerValue,
        };
        next[idx] = updated;
        saveToLocalStorage(next);
        return next;
      });
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              departamento: reassignForm.departamento.trim() || undefined,
              asignacion: reassignForm.asignacion.trim() || undefined,
              conductor: reassignForm.conductor.trim() || undefined,
              propietario: ownerValue,
            }
          : prev
      );
      setDraft((prev) =>
        prev && selected && prev.id === selected.id
          ? {
              ...prev,
              departamento: reassignForm.departamento.trim() || undefined,
              asignacion: reassignForm.asignacion.trim() || undefined,
              conductor: reassignForm.conductor.trim() || undefined,
              propietario: ownerValue,
            }
          : prev
      );
      showToast("Asignación actualizada.");
    },
    [reassignForm, saveToLocalStorage, selected, showToast]
  );

  const handleMaintenanceRequest = useCallback(() => {
    if (!selected) return;
    showToast(`Mantenimiento programado para ${selected.matricula || selected.descripcion || selected.id}.`);
  }, [selected, showToast]);

  const handleIncidentReport = useCallback(() => {
    if (!selected) return;
    showToast(`Incidencia registrada para ${selected.matricula || selected.descripcion || selected.id}.`);
  }, [selected, showToast]);

  const handleRenewalAlert = useCallback(() => {
    if (!selected) return;
    showToast(`Alerta creada para renovación documental de ${selected.matricula || selected.descripcion || selected.id}.`);
  }, [selected, showToast]);

  const handleOpenAddPrompt = useCallback(() => {
    resetNewVehicleForm();
    setShowAddPrompt(true);
    setDeleteMode(false);
  }, [resetNewVehicleForm]);

  const handleCloseAddPrompt = useCallback(() => {
    setShowAddPrompt(false);
  }, []);

  const handleAddVehicleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const requiredFields: (keyof VehicleFormState)[] = ["marca", "modelo", "matricula", "tipo"];
      const missing = requiredFields.filter((field) => !String(newVehiculo[field] ?? "").trim());
      if (missing.length) {
        alert(`Completa los campos: ${missing.map((field) => field.replace("_", " ")).join(", ")}`);
        return;
      }

      const priceValue = newVehiculo.precio_compra
        ? Number(String(newVehiculo.precio_compra).replace(/[^\d.-]/g, ""))
        : undefined;

      const normalized: Vehicle = {
        id: (newVehiculo.id || uuid()).trim().toUpperCase(),
        descripcion:
          newVehiculo.descripcion.trim() || `${newVehiculo.marca || ""} ${newVehiculo.modelo || ""}`.trim(),
        marca: newVehiculo.marca?.trim() || undefined,
        modelo: newVehiculo.modelo?.trim() || undefined,
        matricula: newVehiculo.matricula?.trim() || undefined,
        año: newVehiculo.año ? Number(newVehiculo.año) : undefined,
        color: newVehiculo.color?.trim() || undefined,
        tipo: newVehiculo.tipo?.trim() || undefined,
        uso: newVehiculo.uso?.trim() || undefined,
        fecha_adquisicion: newVehiculo.fecha_adquisicion?.trim() || undefined,
        fecha_de_adquisicion: newVehiculo.fecha_adquisicion?.trim() || undefined,
        precio_compra: priceValue,
        factura_compra: newVehiculo.factura_compra?.trim() || undefined,
        titulo_propiedad: newVehiculo.titulo_propiedad?.trim() || undefined,
        propietario: newVehiculo.propietario?.trim() || undefined,
        kilometraje: newVehiculo.kilometraje?.trim() || undefined,
        departamento: newVehiculo.departamento?.trim() || undefined,
        asignacion: newVehiculo.asignacion?.trim() || undefined,
        conductor: newVehiculo.conductor?.trim() || undefined,
        asegurado: newVehiculo.asegurado,
        foto: newVehiculo.foto?.trim()
          ? newVehiculo.foto.trim().replace(/^public\//, "")
          : undefined,
        seguro: {
          compania: "NSIA Seguros GE",
          poliza: "POLIZA-GENERICA.pdf",
          vencimiento: "2025-12-31",
        },
        permiso: {
          emision: "2025-01-01",
          vencimiento: "2026-01-01",
          costo: 250000,
        },
        tasa: {
          emision: "2025-01-15",
          vencimiento: "2025-12-31",
          costo: 85000,
        },
        mantenimiento: [],
        consumo: [],
        usoHistorial: [],
        lat: 3.75,
        lng: 8.78,
      };

      setVehicles((prev) => {
        const next = [normalized, ...prev];
        saveToLocalStorage(next);
        return next;
      });
      setSelected(normalized);
      setDraft(JSON.parse(JSON.stringify(normalized)));
      setEditMode(false);
      setActiveTab("detalles");

      showToast("Vehículo agregado.");
      setShowAddPrompt(false);
      resetNewVehicleForm();
    },
    [newVehiculo, resetNewVehicleForm, saveToLocalStorage, showToast]
  );

  const handleDeleteSelectedVehicle = useCallback(() => {
    if (!vehicleIdPendingDelete) {
      showToast("Selecciona un vehículo para eliminar.");
      return;
    }

    const vehiculo = vehicles.find((v) => v.id === vehicleIdPendingDelete);
    if (!vehiculo) {
      showToast("Vehículo no encontrado.");
      return;
    }
    const summary =
      vehiculo.descripcion ||
      `${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim() ||
      vehiculo.matricula ||
      vehiculo.id;

    if (window.confirm(`¿Eliminar ${summary}? Esta acción no se puede deshacer.`)) {
      deleteVehicle(vehicleIdPendingDelete);
      setVehicleIdPendingDelete("");
      setDeleteMode(false);
    }
  }, [vehicleIdPendingDelete, vehicles, deleteVehicle, showToast]);

  /* ================= UI atoms ================= */
  const Labeled: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-[#0b2b57]">{value ?? "—"}</span>
    </div>
  );

  const InfoBadge: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-[#0b2b57]">{value ?? "—"}</p>
    </div>
  );

  const Input: React.FC<
    {
      label: string;
      name?: keyof Vehicle | string;
      value?: any;
      onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    } & React.InputHTMLAttributes<HTMLInputElement>
  > = ({ label, name, value, onChange, ...rest }) => (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input className={inputCls} name={String(name || "")} value={value ?? ""} onChange={onChange} {...rest} />
    </label>
  );

  /* ================= Render ================= */
  return (
    <div className="p-6 md:p-8 lg:p-10">
      {/* Status Toast */}
      {statusMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-white border border-[#e6ecff] border-l-8 border-l-[#2d7dff] shadow-xl px-4 py-2 rounded-lg">
          <span className="text-sm font-semibold text-[#0b2b57]">{statusMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className={`${card} mb-6 px-5 py-4 border-2 border-black`}>
        <h2 className="text-2xl font-bold text-[#004080]">Gestión de Flota</h2>
        <p className="text-sm text-gray-600">Monitoreo, documentación y mantenimiento de vehículos.</p>

        <div className="mt-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <input
            type="text"
            placeholder="Buscar por marca, modelo, matrícula..."
            className="w-full flex-1 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button className={btnGhost} onClick={handleOpenAddPrompt}>
              <PlusIcon className="w-4 h-4 inline -mt-1 mr-1" />
              Añadir
            </button>
            <button
              className="bg-[#7a0000] text-white border-2 border-black px-3 py-2 rounded-lg font-semibold hover:bg-[#5c0000] transition active:scale-[.99]"
              onClick={() => {
                setDeleteMode((prev) => {
                  const next = !prev;
                  if (!next) setVehicleIdPendingDelete("");
                  return next;
                });
                setShowAddPrompt(false);
              }}
            >
              <MinusIcon className="w-4 h-4 inline -mt-1 mr-1" />
              Eliminar
            </button>
          </div>
        </div>

        {deleteMode && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col md:flex-row gap-3 md:items-center">
            <select
              className="flex-1 border border-red-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-400"
              value={vehicleIdPendingDelete}
              onChange={(e) => setVehicleIdPendingDelete(e.target.value)}
            >
              <option value="">Selecciona un vehículo</option>
              {vehicles.map((v) => {
                const label =
                  v.descripcion ||
                  `${v.marca || ""} ${v.modelo || ""}`.trim() ||
                  v.matricula ||
                  v.id;
                return (
                  <option key={v.id} value={v.id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                className="bg-[#7a0000] text-white border-2 border-black px-3 py-2 rounded-lg font-semibold hover:bg-[#5c0000] transition active:scale-[.99]"
                onClick={handleDeleteSelectedVehicle}
              >
                Confirmar
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setDeleteMode(false);
                  setVehicleIdPendingDelete("");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Always-on selector + summary */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(260px,320px),1fr]">
        <div className="bg-white border-2 border-black rounded-2xl shadow-inner p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-[#004080]">Vehículos ({filtered.length})</h3>
            {loading && <span className="text-xs text-gray-500">Sincronizando…</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Selecciona un vehículo para actualizar la información de las pestañas inferiores.
          </p>
          <div className="mt-3 space-y-2 overflow-y-auto pr-1 flex-1 max-h-[26rem]">
            {filtered.length ? (
              filtered.map((vehiculo) => {
                const isActive = selected?.id === vehiculo.id;
                const titleText =
                  vehiculo.descripcion ||
                  `${vehiculo.marca || ""} ${vehiculo.modelo || ""}`.trim() ||
                  vehiculo.matricula ||
                  vehiculo.id;
                return (
                  <button
                    type="button"
                    key={vehiculo.id}
                    onClick={() => selectVehicle(vehiculo.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border-2 border-black px-3 py-2 text-left transition ${
                      isActive ? "bg-[#e0edff] shadow-[0_0_0_2px_#2d7dff]" : "bg-white hover:bg-[#f3f6ff]"
                    }`}
                  >
                    <img
                      src={normalizeVehiclePhotoPath(vehiculo)}
                      alt={titleText}
                      className="w-16 h-12 object-cover rounded-lg border border-black"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = VEHICLE_PLACEHOLDER_URL;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0b2b57] truncate">{titleText}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {vehiculo.departamento || "No asignado"} · {vehiculo.asignacion || "Sin asignación"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {vehiculo.marca} {vehiculo.modelo} · {vehiculo.matricula || "Sin matrícula"}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">
                {search.trim()
                  ? "No se encontraron vehículos que coincidan con la búsqueda."
                  : "Registra vehículos para empezar a gestionarlos desde aquí."}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border-2 border-black rounded-2xl shadow-lg p-6 relative overflow-hidden">
          {!selected ? (
            <div className="text-center text-gray-500 py-10 text-sm">
              Selecciona un vehículo para visualizar su ficha resumida.
            </div>
          ) : (
            <div className="relative">
              {vehicleQrUrl && (
                <div className="absolute top-4 right-4 z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-white/80 bg-white/90 shadow-2xl p-1 flex items-center justify-center">
                  <div className="w-full h-full rounded-xl border border-black overflow-hidden bg-white p-1 relative">
                    <img
                      src={vehicleQrUrl}
                      alt={`QR ${selected.descripcion || selected.id}`}
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute inset-x-3 top-3 h-1 rounded-full bg-gradient-to-r from-transparent via-[#28d8ff] to-transparent opacity-80 qr-scan-bar" />
                  </div>
                </div>
              )}
              <div className="grid gap-6 lg:grid-cols-[minmax(320px,1.1fr)_minmax(340px,1fr)] items-center">
                <div className="flex items-center justify-center">
                  <div className="w-full max-w-[420px] relative border-2 border-black rounded-[32px] overflow-hidden bg-gradient-to-b from-[#f5f9ff] to-[#e5edff] shadow-xl">
                    <div className="w-full h-[360px] flex items-center justify-center bg-white/90">
                      <img
                        src={normalizeVehiclePhotoPath(selected)}
                        alt={selected.descripcion || selected.matricula || selected.id}
                        className="w-full h-full object-contain p-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = VEHICLE_PLACEHOLDER_URL;
                        }}
                      />
                    </div>
                    <div className="absolute bottom-3 left-4 bg-white/90 px-3 py-1 rounded-full border border-black text-xs font-semibold text-[#0b2b57]">
                      {selected.matricula || "Sin matrícula"}
                    </div>
                  </div>
                </div>
                <div className="space-y-4 pr-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400 leading-tight">
                      Vehículo activo
                    </p>
                    <h3 className="text-3xl font-bold text-[#0b2b57] leading-tight mt-2">
                      {selected.descripcion ||
                        `${selected.marca || ""} ${selected.modelo || ""}`.trim() ||
                        selected.matricula ||
                        selected.id}
                    </h3>
                    <p className="text-base text-gray-600 mt-1">
                      {selected.tipo || "Tipo no especificado"} · {selected.color || "Color N/D"} ·{" "}
                      {selected.año || "Año N/D"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoBadge label="Departamento" value={selected.departamento || "No asignado"} />
                    <InfoBadge label="Asignación" value={selected.asignacion || "Sin asignación"} />
                    <InfoBadge label="Conductor" value={selected.conductor || "Sin conductor"} />
                    <InfoBadge
                      label="Propietario"
                      value={selected.propietario || "Iniciativas Elebi"}
                    />
                    <InfoBadge label="Uso" value={selected.uso || "No definido"} />
                    <InfoBadge label="Kilometraje" value={selected.kilometraje || "N/D"} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-gray-200 mb-4 flex flex-wrap gap-2">
        {tabNavigation.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`relative px-4 py-2 font-bold ${
              activeTab === key ? "text-[#004080]" : "text-[#5a6a85]"
            }`}
          >
            {label}
            {activeTab === key && (
              <span className="absolute left-0 right-0 -bottom-[2px] h-[3px] rounded bg-gradient-to-r from-[#2d7dff] to-[#004080]" />
            )}
          </button>
        ))}
      </div>


      {/* Posicionamiento */}
      {activeTab === "tracking" && (
        <div className={`${card2} p-4`} id="trackingTab">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-700">Seleccionar vehículo:</span>
            <select
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              value={trackingVehicleId}
              onChange={(e) => startTracking(e.target.value as any)}
            >
              <option value="all">Ver Todos los Vehículos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.marca} {v.modelo} {v.matricula ? `(${v.matricula})` : ""}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm text-gray-700 ml-auto">
              <span>Modo online</span>
              <button
                type="button"
                onClick={() => setOnlineMode((prev) => !prev)}
                className={`relative inline-flex items-center h-6 w-11 rounded-full border-2 border-black transition-colors ${
                  onlineMode ? "bg-[#16a34a]" : "bg-gray-300"
                }`}
                aria-pressed={onlineMode}
                aria-label="Alternar modo online"
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                    onlineMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <button className={btnGhost} onClick={() => stopTracking()}>
              Detener
            </button>
          </div>

          <div className="mt-5">
            <div className="border-2 border-black rounded-lg p-4">
              <h4 className="font-bold text-[#004080] mb-2">
                {onlineMode ? "Mapa (Online - OpenStreetMap)" : "Mapa (Offline - Malabo MBTiles)"}
              </h4>
              <div
                ref={mapContainerRef}
                className="w-full h-96 md:h-[32rem] border-2 border-black rounded-lg overflow-hidden"
              />
              <p className="text-xs text-gray-500 mt-2">
                {onlineMode
                  ? "Vista en línea usando mapas libres (OpenStreetMap) centrada en Malabo."
                  : "Fuente offline: Malabo (MBTiles) servida localmente. Los marcadores se actualizan con el seguimiento simulado."}
              </p>
            </div>
          </div>
          {activeTaskCard ? (
            <div className="mt-4 p-4 border-2 border-black rounded-3xl bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400">
                    Posicionamiento GPS
                  </p>
                  <h4 className="text-xl font-bold text-[#0b2b57] leading-tight">
                    {activeTaskCard.title}
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-[#0b2b57] bg-[#e0edff] px-2 py-1 rounded-full border border-[#bcd3ff]">
                  {activeTaskCard.date}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{activeTaskCard.summary}</p>
              <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm">
                <div className="p-3 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400">Conductor</p>
                  <p className="font-semibold text-[#0b2b57]">{activeTaskCard.driver}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#fff1f2] border border-[#fecdd3]">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400">Coordenadas</p>
                  <p className="font-semibold text-[#9f1239]">{activeTaskCard.coords}</p>
                </div>
                <div className="p-3 rounded-2xl bg-[#ecfccb] border border-[#d9f99d]">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-gray-400">Ultima localización</p>
                  <p className="font-semibold text-[#166534]">{activeTaskCard.street}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-[#dbeafe] text-[#1e3a8a] font-semibold border border-[#93c5fd]">
                  Origen: {activeTaskCard.from}
                </span>
                <span className="text-gray-500 font-semibold">→</span>
                <span className="px-3 py-1 rounded-full bg-[#fee2e2] text-[#991b1b] font-semibold border border-[#fecaca]">
                  Destino: {activeTaskCard.to}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-4 p-4 border border-dashed rounded-2xl bg-[#fffaf0]">
            <h4 className="font-semibold text-[#0b2b57] mb-2">RECORRIDOS Y TAREAS</h4>
            <p className="text-xs text-gray-600 mb-3">
              Resumen narrativo de los últimos desplazamientos del vehículo activo, sus tareas asociadas y su
              ubicación actual en el mapa.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-700 max-h-44 overflow-y-auto pr-1">
              {consumptionData.lastTrips.map((trip, idx) => (
                <div
                  key={`trip-${idx}`}
                  className="bg-white rounded-lg border px-3 py-2 shadow-sm flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0b2b57]">{trip.label}</span>
                    <span className="text-[10px] text-gray-500">{trip.date}</span>
                  </div>
                  <p className="text-[11px] text-gray-600">{trip.summary}</p>
                  <p className="text-[11px] text-gray-500">
                    Ruta: <span className="font-semibold">{trip.route}</span>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Estado: <span className="font-semibold">{trip.status}</span> ·{" "}
                    <span className="font-normal">{trip.distance}</span>
                  </p>
                  {trip.current && (
                    <p className="text-[11px] text-[#166534]">
                      Ahora mismo se dirige hacia <span className="font-semibold">{trip.current.destination}</span>{" "}
                      ({trip.current.progress} completado).
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Documentación */}
      {activeTab === "documentacion" && (
        <div id="documentacionContainer" className={`${card} p-4`}>
          <h3 className="text-lg font-bold text-[#004080] mb-3">Documentación y certificaciones</h3>
          {!selected ? (
            <p className="text-sm text-gray-600">
              Seleccione un vehículo desde la parte superior para visualizar sus documentos oficiales.
            </p>
          ) : vehicleDocuments.length ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Haz clic sobre cada tarjeta para generar y previsualizar el PDF con la información más
                reciente de ese documento. Todos los archivos integran el membrete oficial de
                Iniciativas Elebi.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {vehicleDocuments.map((docMeta) => {
                  const accent = DOCUMENT_GRADIENTS[docMeta.type];
                  const cardAccent = DOCUMENT_CARD_ACCENTS[docMeta.type];
                  return (
                    <button
                      key={docMeta.id}
                      type="button"
                      onClick={() => handleGenerateVehicleDocument(docMeta)}
                      className={`flex items-start gap-3 border-2 border-white/30 rounded-2xl bg-gradient-to-br ${cardAccent} hover:-translate-y-0.5 hover:shadow-[0_15px_30px_rgba(0,0,0,0.25)] transition p-4 text-left text-white`}
                    >
                      <div
                        className={`relative w-16 h-20 rounded-xl border-2 border-white/60 bg-gradient-to-b ${accent} flex items-center justify-center`}
                      >
                        <span className="text-xs font-bold tracking-wide text-white">PDF</span>
                        <span className="absolute bottom-1 right-1 text-[10px] text-white/70">
                          {docMeta.filename.split(".").pop()?.toUpperCase() || "PDF"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">{docMeta.label}</p>
                        <p className="text-xs text-white/80 overflow-hidden text-ellipsis">
                          {docMeta.description}
                        </p>
                        <div className="mt-2 text-[11px] text-white/90 space-y-1">
                          {docMeta.highlights.slice(0, 2).map((item) => (
                            <div key={`${docMeta.id}-${item.label}`} className="flex gap-1">
                              <span className="font-semibold text-white/90">{item.label}:</span>
                              <span className="truncate">
                                {item.value === undefined || item.value === null || item.value === ""
                                  ? "N/D"
                                  : String(item.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-white/70 mt-2 font-semibold">
                          Click para generar y ver
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                {isPdf(selected.seguro?.poliza) && (
                  <a
                    href={docUrl(selected.seguro?.poliza)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-[#004080] underline"
                  >
                    
                  </a>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">Este vehículo aún no tiene documentación cargada.</p>
          )}
        </div>
      )}

      {/* Mantenimiento */}
      {activeTab === "mantenimiento" && (
        <div id="maintenanceTab" className={`${card} p-4`}>
          <h3 className="text-lg font-bold text-[#004080] mb-3">Mantenimiento</h3>
          {!selected ? (
            <p className="text-sm text-gray-600">
              Abra un vehículo (pestaña superior) para ver y documentar los servicios realizados.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-4 border-2 border-black rounded-2xl bg-[#f8fafc]">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Invertido 2025</p>
                  <p className="text-2xl font-bold text-[#0b2b57] mt-1">
                    {formatMoney(maintenanceTotal) || "—"}
                  </p>
                </div>
                <div className="p-4 border-2 border-black rounded-2xl bg-[#f8fafc]">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Servicios registrados</p>
                  <p className="text-2xl font-bold text-[#0b2b57] mt-1">{maintenanceRows.length}</p>
                </div>
                <div className="p-4 border-2 border-black rounded-2xl bg-[#f8fafc]">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Último servicio</p>
                  <p className="text-base font-semibold text-[#0b2b57] mt-1">
                    {maintenanceRowsSorted[0]?.fecha || "—"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {maintenanceRowsSorted[0]?.descripcion || "Sin historial"}
                  </p>
                </div>
              </div>

              <CollapsibleSection
                id="maintenance-history"
                title="Historial de servicios"
                className="bg-white border-2 border-black shadow"
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#004080] text-white">
                      <tr>
                        <th className="px-3 py-2 text-center">Mes</th>
                        <th className="px-3 py-2 text-center">Fecha</th>
                        <th className="px-3 py-2 text-center">Servicio</th>
                        <th className="px-3 py-2 text-center">Taller</th>
                        <th className="px-3 py-2 text-center">Costo</th>
                        <th className="px-3 py-2 text-center">Factura / PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {maintenanceRowsSorted.length ? (
                        maintenanceRowsSorted.map((row, idx) => (
                          <tr key={row.id} className={idx % 2 ? "bg-gray-50" : "bg-white"}>
                            <td className="px-3 py-2 capitalize">{row.mes}</td>
                            <td className="px-3 py-2">{row.fecha}</td>
                            <td className="px-3 py-2">{row.descripcion}</td>
                            <td className="px-3 py-2">{row.taller}</td>
                            <td className="px-3 py-2 font-semibold">{formatMoney(row.costo) || "—"}</td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {row.factura ? (
                                  <span className="text-xs text-gray-600">{row.factura}</span>
                                ) : (
                                  <span className="text-xs text-gray-400">Auto-generado</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleGenerateMaintenanceInvoice({
                                      mes: row.mes,
                                      fecha: row.fecha,
                                      descripcion: row.descripcion,
                                      taller: row.taller,
                                      costo: row.costo,
                                      factura: row.factura,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-[#004080] font-semibold hover:underline"
                                >
                                  <FileIcon className="w-4 h-4" />
                                  PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                            Aún no hay registros de mantenimiento para este vehículo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>

              <div className="grid md:grid-cols-2 gap-4">
                <CollapsibleSection id="maintenance-feed" title="Registro rápido" className="bg-white h-full">
                  <div className="text-sm text-gray-700 space-y-2 max-h-64 overflow-y-auto pr-1">
                    {maintenanceRowsSorted.length ? (
                      maintenanceRowsSorted.map((row) => (
                        <div key={`${row.id}-mini`} className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{row.fecha}</div>
                            <div className="text-gray-600">{row.descripcion}</div>
                            <div className="text-gray-500 text-xs">
                              {row.taller} · {formatMoney(row.costo) || "—"}
                            </div>
                          </div>
                          <button className={btnGhost} onClick={() => removeMaintenance(row.sourceIndex)}>
                            <TrashIcon className="w-4 h-4 inline -mt-1 mr-1" />
                            Quitar
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">Sin datos.</p>
                    )}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection id="maintenance-add" title="Añadir mantenimiento" className="bg-white h-full">
                  <AddMaintenanceForm onAdd={(entry) => addMaintenance(entry)} />
                </CollapsibleSection>
              </div>

              <CollapsibleSection id="maintenance-usage" title="Uso semanal" className="bg-white">
                <div className="text-sm text-gray-700 space-y-2">
                  {usageEntries.length ? (
                    usageEntries.map((u, i) => (
                      <div key={i} className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{u.date}</div>
                          <div className="text-gray-600">
                            {u.driver} {u.purpose ? `— ${u.purpose}` : ""}
                          </div>
                          {(u.start_km != null || u.end_km != null) && (
                            <div className="text-gray-700">
                              km:{" "}
                              <span className="font-semibold">
                                {u.start_km ?? "?"} → {u.end_km ?? "?"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Sin datos.</p>
                  )}
                </div>

                <AddUsageForm onAdd={(entry) => addUsage(entry)} />
              </CollapsibleSection>
            </div>
          )}
        </div>
      )}

      {/* Conductores */}
      {activeTab === "conductores" && (
        <div id="driversTab" className={`${card} p-4`}>
          <h3 className="text-lg font-bold text-[#004080] mb-3">Conductores</h3>

          <div className="grid md:grid-cols-[2fr,1fr] gap-4">
            <CollapsibleSection
              id="drivers-list"
              title="Listado de conductores"
              className="bg-white h-full"
            >
              {drivers.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {drivers.map((d) => (
                    <div key={d.id} className="p-3 border rounded-xl flex flex-col gap-3">
                      <button
                        type="button"
                        className="group flex items-center gap-3 text-left"
                        title="Cambiar foto"
                        onClick={() => handleDriverPhotoChange(d.id)}
                      >
                        <div className="relative w-16 h-16 rounded-full border-2 border-black overflow-hidden bg-[#f8fafc]">
                          <img
                            src={d.foto || "https://placehold.co/128x128?text=Driver"}
                            alt={d.nombre}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute inset-0 bg-black/40 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            Editar
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-[#0b2b57] font-bold">{d.nombre}</div>
                          <div className="text-sm text-gray-600">Tel: {d.telefono || "—"}</div>
                          <div className="text-sm text-gray-600">Licencia: {d.licencia || "—"}</div>
                        </div>
                      </button>
                      <input
                        ref={(el) => {
                          driverFileInputs.current[d.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleDriverLocalFile(d.id, e.target.files?.[0] || null)}
                      />

                      {(() => {
                        const rating = computeDriverRating(d);
                        return (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {renderStars(rating.score, "text-lg")}
                            <span>{rating.label}</span>
                          </div>
                        );
                      })()}

                      <div className="text-xs flex items-center justify-between">
                        <span>
                          Estado: <span className="font-semibold">{d.estado || "Disponible"}</span>
                        </span>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[#004080] font-semibold text-xs"
                          onClick={() => handleGenerateDriverLicensePdf(d)}
                          title="Generar credencial"
                        >
                          <FileIcon className="w-3.5 h-3.5" />
                          Carnet de Conducir
                        </button>
                      </div>

                      <div>
                        <div className="text-xs font-semibold mb-1">Asignar a vehículos:</div>
                        <div className="flex flex-wrap gap-1">
                          {vehicles.map((v) => {
                            const assigned = !!d.asignados?.includes(v.id);
                            return (
                              <button
                                key={v.id}
                                className={`text-xs px-2 py-1 rounded-full border ${
                                  assigned
                                    ? "bg-[#004080] text-white"
                                    : "bg-[#eef2ff] text-[#0b2b57]"
                                }`}
                                onClick={() => assignDriverToVehicle(d.id, v.id)}
                                title={`${v.marca} ${v.modelo}`}
                              >
                                {v.marca?.slice(0, 7)}-{v.modelo?.slice(0, 7)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aún no hay conductores.</p>
              )}
            </CollapsibleSection>

            <CollapsibleSection id="drivers-add" title="Añadir conductor" className="bg-white h-full">
              <label className="block">
                <span className="text-sm text-gray-600">Nombre</span>
                <input
                  className={inputCls}
                  value={newDriver.nombre}
                  onChange={(e) => setNewDriver((p) => ({ ...p, nombre: e.target.value }))}
                />
              </label>
              <label className="block mt-2">
                <span className="text-sm text-gray-600">Teléfono</span>
                <input
                  className={inputCls}
                  value={newDriver.telefono || ""}
                  onChange={(e) => setNewDriver((p) => ({ ...p, telefono: e.target.value }))}
                />
              </label>
              <label className="block mt-2">
                <span className="text-sm text-gray-600">Licencia</span>
                <input
                  className={inputCls}
                  value={newDriver.licencia || ""}
                  onChange={(e) => setNewDriver((p) => ({ ...p, licencia: e.target.value }))}
                />
              </label>
              <button className={`${btn} mt-3`} onClick={addDriver}>
                Guardar
              </button>

              <div className="mt-6 border-t pt-4">
                <h4 className="text-sm font-semibold text-[#7a0000] mb-2">Eliminar conductor</h4>
                <div className="flex flex-col gap-2">
                  <select
                    className={inputCls}
                    value={driverIdToDelete}
                    onChange={(e) => setDriverIdToDelete(e.target.value)}
                  >
                    <option value="">Selecciona conductor</option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!driverIdToDelete}
                    className={`px-3 py-2 rounded-lg font-semibold border-2 ${
                      driverIdToDelete
                        ? "bg-[#7a0000] text-white border-black hover:bg-[#5c0000]"
                        : "bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!driverIdToDelete) return;
                      const driverName =
                        drivers.find((drv) => drv.id === driverIdToDelete)?.nombre ||
                        "este conductor";
                      if (
                        !window.confirm(
                          `¿Eliminar definitivamente a ${driverName}? Esta acción no se puede deshacer.`
                        )
                      ) {
                        return;
                      }
                      removeDriver(driverIdToDelete);
                      setDriverIdToDelete("");
                    }}
                  >
                    Eliminar seleccionado
                  </button>
                </div>
              </div>
            </CollapsibleSection>

          <div className="grid gap-4 md:col-span-2 lg:grid-cols-[3fr_1fr]">
            <div className="lg:flex lg:flex-col h-full">
              <CollapsibleSection
                id="drivers-usage"
                title="Comparativa de kilometraje"
                subtitle={`Modo actual: ${driverKmMode === "driver" ? "Conductores" : "Vehículos"}`}
                className="bg-white h-full"
              >
            {driverKmEntities.length ? (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="inline-flex rounded-full border-2 border-black overflow-hidden">
                    {(["driver", "vehicle"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`px-3 py-1 font-semibold ${
                          driverKmMode === mode ? "bg-[#004080] text-white" : "bg-white text-[#0b2b57]"
                        }`}
                        onClick={() => setDriverKmMode(mode)}
                      >
                        {mode === "driver" ? "Conductores" : "Vehículos"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Marca o desmarca para comparar {driverKmMode === "driver" ? "conductores" : "vehículos"}.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs mt-3">
                  {driverKmEntities.map((entity) => {
                    const checked = driverKmSelection.includes(entity.key);
                    return (
                      <button
                        key={`km-entity-${entity.key}`}
                        type="button"
                        aria-pressed={checked}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition ${
                          checked
                            ? "bg-[#004080] text-white border-black"
                            : "bg-white text-[#0b2b57] border-gray-300 hover:border-gray-500"
                        }`}
                        onClick={() => toggleDriverKmSelection(entity.key)}
                      >
                        <span className="whitespace-nowrap">{entity.label}</span>
                      </button>
                    );
                  })}
                </div>

                {driverKmSelectedEntities.length ? (
                  <>
                    <div className="flex flex-wrap gap-6 mt-4">
                      {driverKmTotals.map((entity, index) => {
                        const percent = Math.min(
                          100,
                          Math.max(6, (entity.total / driverKmTotalsMax) * 100)
                        );
                        const gradient =
                          driverKmMode === "driver"
                            ? "linear-gradient(90deg,#0284c7,#38bdf8)"
                            : "linear-gradient(90deg,#16a34a,#4ade80)";
                        return (
                          <div key={`km-total-${entity.key}`} className="w-full max-w-[280px] space-y-2">
                            <div className="flex items-baseline justify-between text-xs text-gray-500">
                              <span className="font-semibold text-[#0b2b57]">{entity.label}</span>
                              <span className="font-semibold text-[#0b2b57]">
                                {entity.total.toLocaleString("es-GQ")} km
                              </span>
                            </div>
                            <div className="h-4 w-full rounded-full bg-[#e5e7eb] overflow-hidden">
                              <div
                                className="h-full rounded-full driver-bar-fill"
                                style={{
                                  "--target-width": `${percent}%`,
                                  animationDelay: `${index * 180}ms`,
                                  background: gradient,
                                } as CSSProperties}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="overflow-x-auto mt-5">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#0f172a] text-white">
                            <th className="px-3 py-2 text-left">Mes</th>
                            {driverKmSelectedEntities.map((entity) => (
                              <th key={`km-head-${entity.key}`} className="px-3 py-2 text-right">
                                {entity.label}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {driverKmMonthlyTable.map((row) => (
                            <tr key={`km-row-${row.month}`} className="border-b last:border-0">
                              <td className="px-3 py-2 font-semibold text-[#0b2b57]">{row.label}</td>
                              {row.values.map((value) => (
                                <td key={`${row.month}-${value.key}`} className="px-3 py-2 text-right">
                                  {value.value.toLocaleString("es-GQ")}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right font-semibold">
                                {row.total.toLocaleString("es-GQ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {driverKmInsights && (
                      <div className="mt-4 bg-[#fef3c7] border border-dashed rounded-2xl px-4 py-3 text-sm text-[#92400e] space-y-1">
                        <p>{driverKmInsights.headline}</p>
                        <p className="text-xs">{driverKmInsights.monthHighlight}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 mt-4">Selecciona al menos un elemento para comparar.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Aún no hay datos de kilometraje para comparar.</p>
            )}
              </CollapsibleSection>
            </div>

            <div className="lg:flex lg:flex-col h-full">
              <CollapsibleSection
                id="drivers-incidencias"
                title="Incidencias Reportadas"
                subtitle="Accidentes, controles y otros eventos"
                className="bg-white h-full"
              >
                <div className="flex flex-col max-h-[36rem]">
                  <p className="text-xs text-gray-600 mb-2">
                    Registro de incidentes relevantes: accidentes leves o graves, controles de la policía de tráfico,
                    roturas de cristales por intento de robo, etc.
                  </p>
                  <div className="space-y-2 flex-1 overflow-y-auto pr-1 text-xs">
                    {driverIncidents.length ? (
                      driverIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          className="border border-gray-200 rounded-xl px-3 py-2 bg-[#fff7ed] flex flex-col gap-0.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#7a0000]">
                              {incident.type ? `${incident.type}` : "Incidencia"}
                            </span>
                            <span className="text-[10px] text-gray-500">{incident.date}</span>
                          </div>
                          <p className="text-[11px] text-gray-700">{incident.description}</p>
                          <p className="text-[11px] text-gray-600">
                            Vehículo: <span className="font-semibold">{incident.vehicle}</span> · Conductor:{" "}
                            <span className="font-semibold">{incident.driver}</span>
                          </p>
                          {incident.action && (
                            <p className="text-[11px] text-[#92400e]">Acción recomendada: {incident.action}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">No hay incidencias registradas por el momento.</p>
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Consumo */}
      {activeTab === "consumo" && (
        <CollapsibleSection
          id="consumo-panel"
          title="Consumo de Combustible"
          className={`${card} p-4 space-y-5`}
        >
          <div className="bg-white space-y-4 rounded-2xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#004080]">Resumen del vehículo</h3>
                <p className="text-sm text-gray-500">
                  Vista analítica para {selected?.descripcion || selected?.matricula || "el vehículo activo"}.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {([
                  {
                    label: consumptionMonth === "all" ? "Litros anuales" : "Litros filtrados",
                    value: filteredConsumptionTotals.litros,
                    suffix: " L",
                  },
                  {
                    label: consumptionMonth === "all" ? "Kilómetros anuales" : "Kilómetros filtrados",
                    value: filteredConsumptionTotals.km,
                    suffix: " km",
                  },
                  {
                    label: consumptionMonth === "all" ? "Costo anual" : "Costo filtrado",
                    value: filteredConsumptionTotals.costo,
                    formatter: formatCurrency,
                    suffix: "",
                  },
                ] as const).map((card) => (
                  <div key={card.label}>
                    <p className="text-xs uppercase tracking-wide text-gray-400">{card.label}</p>
                    <AnimatedConsumptionValue
                      value={card.value}
                      formatter={card.formatter}
                      suffix={card.suffix}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-2xl bg-[#f8fafc] p-4 flex flex-wrap gap-4 items-center text-sm">
              <label className="flex items-center gap-2 font-semibold text-[#0b2b57]">
                Mostrar:
                <select
                  className={inputCls}
                  value={consumptionMetric}
                  onChange={(e) => setConsumptionMetric(e.target.value as "liters" | "cost")}
                >
                  <option value="liters">Litros</option>
                  <option value="cost">Costo (XAF)</option>
                </select>
              </label>
              <label className="flex items-center gap-2 font-semibold text-[#0b2b57]">
                Mes:
                <select
                  className={inputCls}
                  value={consumptionMonth}
                  onChange={(e) => setConsumptionMonth(e.target.value)}
                >
                  <option value="all">Todos</option>
                  {MONTH_SERIES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {title(m.key)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="grid xl:grid-cols-[2fr,1fr] gap-4">
            <CollapsibleSection
              id="consumo-serie"
              title={`Serie mensual (${consumptionMetric === "liters" ? "Litros" : "Costo"})`}
              subtitle={`Escala máx: ${chartMaxMetric.toLocaleString("es-GQ")} ${
                consumptionMetric === "liters" ? "L" : "XAF"
              }`}
              className="bg-white"
            >
          
              <div className="flex flex-wrap items-end gap-3 overflow-x-auto pb-4 w-full">
                {consumptionMetric === "liters" ? (
                  chartRows.map((row, idx) => (
                    <div
                      key={row.key}
                      className="flex flex-col items-center gap-2 min-w-[3.8rem]"
                    >
                      {renderLiquidSquare(
                        row.litros,
                        chartMaxMetric,
                        undefined,
                        idx * 0.42
                      )}
                      <span className="text-[11px] text-gray-500">{`${row.litros} L`}</span>
                    </div>
                  ))
                ) : (
                  <div className="w-full flex flex-col gap-4">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-[#6b7280]">
                      <span>SERVICIO</span>
                      <span>COSTO (XAF)</span>
                    </div>
                    <div className="space-y-3">
                      {chartRows.map((row, idx) => {
                        const barPercent = Math.min(
                          100,
                          chartMaxMetric ? (row.costo / chartMaxMetric) * 100 : 0
                        );
                        return (
                          <div key={`bar-${row.key}`} className="space-y-1">
                            <div className="flex items-center justify-between text-sm font-semibold text-[#0b2b57]">
                              <span>{row.label}</span>
                              <span className="text-xs text-gray-500">{formatCurrency(row.costo)}</span>
                            </div>
                            <div className="relative h-3.5 w-full rounded-full border border-[#cbd5f5] bg-white overflow-hidden shadow-sm">
                            <div
                              className="consumo-cost-bar-fill"
                              style={
                                {
                                  width: `${barPercent}%`,
                                  animationDelay: `${idx * 0.12}s`,
                                  "--bar-target": `${barPercent}%`,
                                  background: buildCostGradient(idx),
                                } as CSSProperties
                              }
                            />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                      {[0, 25, 50, 75, 100].map((value) => (
                        <span key={`axis-${value}`}>{value}</span>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                      {[
                        { label: "Kilometraje", color: "#9acb4f" },
                        { label: "Consumo", color: "#fbbf24" },
                        { label: "Operaciones", color: "#ef4444" },
                        { label: "Activos", color: "#581c87" },
                      ].map((legend) => (
                        <div
                          key={`legend-${legend.label}`}
                          className="flex items-center gap-2 border border-[#e5e7eb] rounded-full px-3 py-1 bg-white/90"
                        >
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ background: legend.color }}
                          />
                          <span className="font-semibold">{legend.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-600 mt-2">
                <div className="p-3 bg-[#f0f9ff] rounded-xl border">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Rendimiento (km/L)</p>
                  <p className="text-lg font-bold text-[#0369a1]">
                    {filteredConsumptionTotals.litros
                      ? (filteredConsumptionTotals.km / filteredConsumptionTotals.litros).toFixed(2)
                      : "—"}
                  </p>
                </div>
                <div className="p-3 bg-[#fef3c7] rounded-xl border">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Costo promedio</p>
                  <p className="text-lg font-bold text-[#92400e]">
                    {filteredConsumptionTotals.km
                      ? `${(filteredConsumptionTotals.costo / filteredConsumptionTotals.km).toFixed(0)} XAF/km`
                      : "—"}
                  </p>
                </div>
                <div className="p-3 bg-[#ecfccb] rounded-xl border">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Uso (km)</p>
                  <p className="text-lg font-bold text-[#166534]">
                    {filteredConsumptionTotals.km.toLocaleString("es-GQ")}
                  </p>
                </div>
              </div>
            </CollapsibleSection>

            <div className="space-y-4">
              <CollapsibleSection
                id="tabla-comparativa"
                title="Tabla Comparativa"
                subtitle="Comparación libre"
                className="bg-[#f8fafc]"
              >
                {fleetConsumption ? (
                  <div className="space-y-2 text-sm text-gray-600">
                  {[
                    {
                      id: "efficiency",
                      title: "Eficiencia y costo",
                      content: (
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Vehículo activo</p>
                          <p className="font-semibold text-[#0b2b57]">
                            {selected?.descripcion || selected?.matricula || "Sin selección"}
                          </p>
                          <p className="text-xs">
                            {fleetConsumption.selectedEfficiency
                              ? `${fleetConsumption.selectedEfficiency.toFixed(2)} km/L`
                              : "Sin datos"} • {fleetConsumption.selectedCostPerKm
                              ? `${fleetConsumption.selectedCostPerKm.toFixed(0)} XAF/km`
                              : "—"}
                          </p>
                          <p className="text-xs">
                            Promedio flota: {fleetConsumption.fleetAverage.efficiency.toFixed(2)} km/L •
                            {fleetConsumption.fleetAverage.costPerKm.toFixed(0)} XAF/km
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "uso",
                      title: "Vehículos destacados",
                      content: (
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>
                            <span className="font-semibold text-green-700">+ Eficiente:</span>
                            {fleetConsumption.best?.vehiculo.descripcion || "N/D"} (
                            {fleetConsumption.best?.efficiency != null
                              ? `${fleetConsumption.best.efficiency.toFixed(2)} km/L`
                              : "Sin datos"}
                            )
                          </p>
                          <p>
                            <span className="font-semibold text-red-700">Mayor consumo:</span>
                            {fleetConsumption.least?.vehiculo.descripcion || "N/D"} (
                            {fleetConsumption.least?.efficiency != null
                              ? `${fleetConsumption.least.efficiency.toFixed(2)} km/L`
                              : "Sin datos"}
                            )
                          </p>
                        </div>
                      ),
                    },
                    {
                      id: "costos",
                      title: "Costos agregados",
                      content: (
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>
                            La flota completa promedia
                            <span className="font-semibold">
                              {fleetConsumption.fleetAverage.costPerKm.toFixed(0)} XAF/km
                            </span>
                            . El vehículo actual se ubica
                            {fleetConsumption.selectedCostPerKm > fleetConsumption.fleetAverage.costPerKm
                              ? " por encima "
                              : " por debajo "}
                            del promedio.
                          </p>
                        </div>
                      ),
                    },
                  ].map((panel) => (
                    <div key={panel.id} className="border rounded-xl">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#0b2b57]"
                        onClick={() => toggleComparisonSection(panel.id as keyof typeof comparisonOpen)}
                      >
                        {panel.title}
                        <span>{comparisonOpen[panel.id as keyof typeof comparisonOpen] ? "−" : "+"}</span>
                      </button>
                      {comparisonOpen[panel.id as keyof typeof comparisonOpen] && (
                        <div className="px-3 pb-3">{panel.content}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aún no hay datos consolidados.</p>
              )}
            </CollapsibleSection>

              <CollapsibleSection
                id="consumo-mensual"
                title="Historial mensual"
                className="bg-white"
              >
                <div className="space-y-2 text-xs text-gray-600 max-h-48 overflow-y-auto pr-1">
                  {filteredConsumptionRows.map((row) => (
                    <div key={`${row.key}-summary`} className="flex justify-between items-center">
                      <span className="font-semibold text-[#0b2b57]">{row.label}</span>
                      <span>
                        {row.km.toLocaleString("es-GQ")} km • {row.litros} L • {formatCurrency(row.costo)}
                      </span>
                    </div>
                    ))}
                </div>
              </CollapsibleSection>
            </div>
          </div>
          <div className="border rounded-2xl bg-white p-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                {vehicles.map((veh) => {
                  const checked = comparisonVehicles.includes(veh.id);
                  const label =
                    veh.descripcion ||
                    veh.matricula ||
                    `${veh.marca || ""} ${veh.modelo || ""}`.trim() ||
                    veh.id;
                  return (
                    <label
                      key={`comp-card-${veh.id}`}
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${
                        checked ? "bg-[#004080] text-white border-black" : "bg-white text-[#0b2b57] border-gray-200"
                      } text-[11px]`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setComparisonVehicles((prev) =>
                            prev.includes(veh.id) ? prev.filter((id) => id !== veh.id) : [...prev, veh.id]
                          )
                        }
                        className="accent-[#004080]"
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 text-sm items-center">
                <label className="flex items-center gap-2 font-semibold text-[#0b2b57] text-xs">
                  Unidad
                  <select
                    className={inputCls}
                    value={comparisonMetric}
                    onChange={(e) => setComparisonMetric(e.target.value as "liters" | "cost")}
                  >
                    <option value="liters">Litros</option>
                    <option value="cost">Costo (XAF)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 font-semibold text-[#0b2b57] text-xs">
                  Mes
                  <select
                    className={inputCls}
                    value={comparisonMonthFilter}
                    onChange={(e) => setComparisonMonthFilter(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    {MONTH_SERIES.map((m) => (
                      <option key={`cmp-month-${m.key}`} value={m.key}>
                        {title(m.key)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid md:grid-cols-[auto,1fr] gap-4 items-center">
                <div
                  className="relative h-32 w-32 rounded-full border border-gray-200"
                  style={{
                    background: comparisonPieData.length
                      ? `conic-gradient(${comparisonPieData.map((segment) => segment.background).join(", ")})`
                      : "rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <span className="absolute inset-1 rounded-full bg-white/80 flex items-center justify-center text-[9px] font-semibold text-[#0b2b57]">
                    {comparisonPieData.length ? "Distribución" : "Sin selección"}
                  </span>
                </div>
                <div className="grid gap-2 text-[11px]">
                  {comparisonPieData.length ? (
                    comparisonPieData.map((segment) => (
                      <div key={`pie-entry-${segment.id}`} className="flex items-center gap-2">
                        <span
                          className="block h-3 w-3 rounded-full"
                          style={{ background: segment.background.split(" ")[0] }}
                        />
                        <span className="flex-1 truncate">
                          {segment.label} · {segment.total.toLocaleString("es-GQ")}{" "}
                          {comparisonMetric === "liters" ? "L" : "XAF"}
                        </span>
                        <span>{(segment.ratio * 100).toFixed(1)}%</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Añade vehículos para generar la comparación.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 text-[11px] text-gray-500">
                {comparisonMonthData.map((row) => (
                  <div key={`cmp-month-row-${row.label}`} className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-gray-400">{row.label}</div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-[#0b2b57]"
                        style={{ width: `${(row.value / comparisonMonthMax) * 100}%` }}
                      />
                    </div>
                    <div className="text-right text-[10px] text-[#0b2b57] font-semibold">
                      {comparisonMetric === "liters"
                        ? `${row.value.toLocaleString("es-GQ")} L`
                        : formatCurrency(row.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          <CollapsibleSection
            id="consumo-detallado"
            title="Historial detallado"
            subtitle="Selecciona vehículos"
            className="bg-white"
          >
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              {vehicles.map((veh) => {
                const checked = historyVehicleSelection.includes(veh.id);
                return (
                  <label
                    key={`history-select-${veh.id}`}
                    className={`flex items-center gap-2 px-2 py-1 rounded-full border ${
                      checked ? "bg-[#004080] text-white border-black" : "bg-white text-[#0b2b57] border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[#004080]"
                      checked={checked}
                      onChange={() => toggleHistoryVehicleSelection(veh.id)}
                    />
                    <span>{veh.descripcion || veh.matricula || veh.id}</span>
                  </label>
                );
              })}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0f172a] text-white">
                    <th
                      className="px-3 py-2 text-left cursor-pointer select-none"
                      onClick={() => handleHistorySort("label")}
                    >
                      Mes{" "}
                      {historySort.column === "label" && (
                        <span className="text-[10px]">{historySort.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </th>
                    <th
                      className="px-3 py-2 text-left cursor-pointer select-none"
                      onClick={() => handleHistorySort("vehicle")}
                    >
                      Vehículo{" "}
                      {historySort.column === "vehicle" && (
                        <span className="text-[10px]">{historySort.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </th>
                    <th
                      className="px-3 py-2 text-right cursor-pointer select-none"
                      onClick={() => handleHistorySort("litros")}
                    >
                      Litros{" "}
                      {historySort.column === "litros" && (
                        <span className="text-[10px]">{historySort.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </th>
                    <th
                      className="px-3 py-2 text-right cursor-pointer select-none"
                      onClick={() => handleHistorySort("costo")}
                    >
                      Costo (XAF){" "}
                      {historySort.column === "costo" && (
                        <span className="text-[10px]">{historySort.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </th>
                    <th
                      className="px-3 py-2 text-right cursor-pointer select-none"
                      onClick={() => handleHistorySort("km")}
                    >
                      Kilómetros{" "}
                      {historySort.column === "km" && (
                        <span className="text-[10px]">{historySort.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </th>
                    <th className="px-3 py-2 text-right">Rendimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHistoryRows.length ? (
                    sortedHistoryRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-semibold text-[#0b2b57]">{row.label}</td>
                        <td className="px-3 py-2">{row.vehicle}</td>
                        <td className="px-3 py-2 text-right">{row.litros.toLocaleString("es-GQ")}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.costo)}</td>
                        <td className="px-3 py-2 text-right">{row.km.toLocaleString("es-GQ")}</td>
                        <td className="px-3 py-2 text-right">
                          {row.litros ? (row.km / row.litros).toFixed(2) : "—"} km/L
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                        Selecciona al menos un vehículo para ver la tabla.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="consumo-insights"
            title="Análisis mes a mes"
            className="bg-[#fffaf0] border-2 border-dashed"
          >
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-700 max-h-40 overflow-y-auto pr-1">
              {insightMessages.map((insight, idx) => (
                <div key={`insight-${idx}`} className="bg-white rounded-lg border px-3 py-2 shadow-sm">
                  {insight}
                </div>
              ))}
              </div>
          </CollapsibleSection>
        </CollapsibleSection>
      )}
      {/* Detalles */}
{activeTab === "detalles" && selected && (
  <div id="detailsTab" className={`${card} p-6 space-y-6`}>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="relative rounded-3xl border-2 border-black bg-gradient-to-br from-[#00132b] via-[#003a73] to-[#0086c7] p-6 text-white shadow-xl overflow-hidden flex flex-col gap-4 min-h-[22rem]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,#ffffff45,transparent_55%)] pointer-events-none" />
          <div
            ref={previewRef}
            onPointerMove={handlePreviewPointerMove}
            onPointerLeave={handlePreviewPointerLeave}
            className="flex-1 min-h-[18rem] flex items-center justify-center cursor-grab active:cursor-grabbing relative"
            style={{ perspective: "1200px" }}
          >
          <div className="w-[90%] h-full flex items-center justify-center overflow-hidden">
            <img
              src={vehicle3DPreviewSrc(draft || selected)}
              alt={selected?.descripcion || `${selected?.marca || ""} ${selected?.modelo || ""}`}
              className="w-full h-auto max-h-[18rem] object-contain rounded-3xl border border-white/20 shadow-2xl"
              style={{
                transform: `perspective(1200px) rotateX(${previewRotation.x}deg) rotateY(${previewRotation.y}deg) scale(${previewScale * previewZoom})`,
                transition: "transform 0.12s ease-out",
              }}
            />
          </div>
          <div className="absolute top-4 right-4 bg-white/20 text-white backdrop-blur px-2 py-1 rounded-full flex items-center gap-2 border border-white/40">
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center rounded-full border border-white/60 hover:bg-white/30"
              onClick={() => adjustPreviewZoom(-0.1)}
            >
              −
            </button>
            <span className="text-xs font-semibold">{Math.round(previewZoom * 100)}%</span>
            <button
              type="button"
              className="w-6 h-6 flex items-center justify-center rounded-full border border-white/60 hover:bg-white/30"
              onClick={() => adjustPreviewZoom(0.1)}
            >
              +
            </button>
          </div>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">
              ID {fmt(selected.id)}
            </p>
            <h3 className="text-2xl font-black leading-snug">
              {fmt((draft || selected).marca)} {fmt((draft || selected).modelo)}
            </h3>
            <p className="text-sm text-white/80">
              {fmt((draft || selected).matricula)} • {(draft || selected).año ?? "—"}
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.3em] bg-white/20 px-4 py-1 rounded-full border border-white/30">
            Arrastre para girar 360°
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="p-5 border-2 border-black rounded-2xl bg-white shadow flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Estado operativo
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
              Activo
            </span>
          </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Departamento</p>
              <p className="font-semibold text-[#0b2b57]">
                {reassignForm.departamento || selected.departamento || "No asignado"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Asignación</p>
              <p className="font-semibold text-[#0b2b57]">
                {reassignForm.asignacion || selected.asignacion || "No especificada"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Conductor</p>
              <p className="font-semibold text-[#0b2b57]">
                {reassignForm.conductor || selected.conductor || "Sin conductor"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Propietario</p>
              <p className="font-semibold text-[#0b2b57]">
                {reassignForm.propietario || selected.propietario || "Iniciativas Elebi"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="uppercase tracking-[0.2em] text-[10px]">Adquisición</p>
              <p className="text-sm font-semibold text-[#0b2b57]">{acquisitionDisplay}</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
              <p className="uppercase tracking-[0.2em] text-[10px]">Precio estimado</p>
              <p className="text-sm font-semibold text-[#0b2b57]">{purchaseDisplay}</p>
            </div>
            <div className="rounded-xl border border-[#dbeafe] bg-[#f0f7ff] p-3">
              <p className="uppercase tracking-[0.2em] text-[10px]">Kilometraje</p>
              <p className="text-sm font-semibold text-[#1d4ed8]">
                {selected.kilometraje || "N/D"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!editMode ? (
              <>
                <button className={btn} onClick={() => setEditMode(true)}>
                  <EditIcon className="w-4 h-4 inline-block mr-1" />
                  Editar ficha
                </button>
                <button className={btn} onClick={() => startTracking(selected.id)}>
                  Posicionar
                </button>
              </>
            ) : (
              <>
                <button className={btn} onClick={persistDraft}>
                  Guardar
                </button>
                <button
                  className={btnGhost}
                  onClick={() => {
                    setDraft(selected);
                    setEditMode(false);
                  }}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {paperworkAlerts.length > 0 && (
          <div className="rounded-2xl border-2 border-dashed border-[#1e3930] bg-gradient-to-r from-[#f0fdf4] via-[#c1e7d5] to-[#74b49b] p-4 text-sm text-[#0f4b30] space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Próximas renovaciones</p>
              <span className="text-xs uppercase tracking-[0.3em]">Alertas</span>
            </div>
            <ul className="space-y-1">
              {paperworkAlerts.slice(0, 3).map((alert) => (
                <li key={`${alert.label}-${alert.date}`} className="flex justify-between text-xs">
                  <span>{alert.label}</span>
                  <span className="font-semibold">
                    {new Date(alert.date).toLocaleDateString("es-GQ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {riskIndicators && (
          <div className="p-4 border-2 border-[#0f172a]/40 rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] shadow">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Status</p>
                  <p className="text-xl font-bold text-white">{riskIndicators.overall.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStars(riskIndicators.overall.score, "text-lg")}
                  <span className="text-xs text-gray-600">{riskIndicators.overall.score.toFixed(1)} / 5</span>
                </div>
              </div>
              <p className="text-sm text-white/90">{riskIndicators.overall.description}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {riskIndicators.breakdowns.map((item) => (
                  <div key={item.key} className="bg-white/80 border rounded-xl p-2 text-[#0f172a]">
                    <p className="font-semibold text-[11px]">{item.label}</p>
                    <p className="text-gray-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {!editMode && (
      <>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="p-5 border-2 border-black rounded-2xl">
            <h4 className="text-lg font-semibold text-[#0b2b57]">Descripción y control</h4>
            <p className="text-sm text-gray-600 mt-1">
              {selected.descripcion ||
                `Sin descripción detallada para ${selected.marca} ${selected.modelo}.`}
            </p>
              <form className="grid gap-4 mt-4" onSubmit={handleReassignSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-xs uppercase tracking-wide text-gray-500 space-y-1">
                  Departamento
                  <select
                    className={inputCls}
                    value={reassignForm.departamento}
                    onChange={(e) => handleReassignChange("departamento", e.target.value)}
                  >
                    <option value="">Seleccione</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs uppercase tracking-wide text-gray-500 space-y-1">
                  Asignación
                  <select
                    className={inputCls}
                    value={reassignForm.asignacion}
                    onChange={(e) => handleReassignChange("asignacion", e.target.value)}
                  >
                    <option value="">Seleccione asignación</option>
                    {assignationOptions.map((opt) => (
                      <option key={opt.id} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs uppercase tracking-wide text-gray-500 space-y-1">
                  Conductor
                  <select
                    className={inputCls}
                    value={reassignForm.conductor}
                    onChange={(e) => handleReassignChange("conductor", e.target.value)}
                  >
                    <option value="">Sin conductor asignado</option>
                    {availableDrivers.map((driver) => (
                      <option key={driver.id} value={driver.nombre}>
                        {driver.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs uppercase tracking-wide text-gray-500 space-y-1">
                  Propietario
                  <select
                    className={inputCls}
                    value={reassignForm.propietario || "Iniciativas Elebi"}
                    onChange={(e) => handleReassignChange("propietario", e.target.value)}
                  >
                    <option value="Iniciativas Elebi">Iniciativas Elebi</option>
                    <option value="Arrendamiento / Leasing">Arrendamiento / Leasing</option>
                    <option value="Terceros">Terceros</option>
                  </select>
                </label>
              </div>
              <div className="flex justify-end">
                <button type="submit" className={btn}>
                  Guardar reasignación
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="p-5 border-2 border-black rounded-3xl bg-gradient-to-br from-white via-[#f4f7ff] to-[#e0e7ff] shadow">
              <h4 className="font-semibold text-[#0b2b57] mb-3">Acciones rápidas</h4>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={handleMaintenanceRequest}
                  className="w-full px-4 py-2 rounded-xl border-2 border-[#004080] text-[#004080] font-semibold bg-white hover:bg-[#004080]/10 transition"
                >
                  Enviar a mantenimiento
                </button>
                <button
                  type="button"
                  onClick={handleIncidentReport}
                  className="w-full px-4 py-2 rounded-xl border-2 border-[#b45309] text-[#92400e] font-semibold bg-white hover:bg-[#fef3c7] transition"
                >
                  Reportar incidencia
                </button>
                <button
                  type="button"
                  onClick={handleRenewalAlert}
                  className="w-full px-4 py-2 rounded-xl border-2 border-[#9f1239] text-[#9f1239] font-semibold bg-white hover:bg-[#fee2e2] transition"
                >
                  Crear alerta de renovación
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="p-5 border-2 border-black rounded-2xl bg-gradient-to-br from-white to-[#f4f7ff] shadow-sm">
            <h4 className="font-semibold mb-3 text-[#0b2b57]">Datos del Vehículo</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {vehicleInfoBlocks.map((field) => (
                <div
                  key={`veh-info-${field.label}`}
                  className="p-3 bg-white/90 border border-[#dfe5fb] rounded-xl shadow-inner"
                >
                  <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
                    {field.label}
                  </p>
                  <p className="text-sm font-semibold text-[#0b2b57] mt-1">{field.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border-2 border-[#0f172a]/30 rounded-2xl bg-gradient-to-br from-[#ecfeff] via-[#bae6fd] to-[#93c5fd] shadow-sm">
            <h4 className="font-semibold mb-3 text-[#0f172a]">Seguro</h4>
            <div className="grid gap-3">
              {seguroInfo.length ? (
                seguroInfo.map((field) => (
                  <div
                    key={`seg-${field.label}`}
                    className="p-3 bg-white/90 border border-[#bfdbfe] rounded-xl"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#1e3a8a]">
                      {field.label}
                    </p>
                    <p className="text-sm font-semibold text-[#0f172a] mt-1">
                      {field.value || "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#7a0b0b]">Sin seguro cargado.</p>
              )}
            </div>
          </div>

          <div className="p-5 border-2 border-black rounded-2xl bg-gradient-to-br from-[#eef7ff] to-[#d9ecff] shadow-sm">
            <h4 className="font-semibold mb-3 text-[#0b3a7a]">Permiso de Circulación</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {permisoInfo.length ? (
                permisoInfo.map((field) => (
                  <div
                    key={`perm-${field.label}`}
                    className="p-3 bg-white border border-[#cfe0ff] rounded-xl"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#2563eb]">
                      {field.label}
                    </p>
                    <p className="text-sm font-semibold text-[#0b2b57] mt-1">
                      {field.value || "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#0b2b57]">Sin datos de permiso.</p>
              )}
            </div>
          </div>

          <div className="p-5 border-2 border-[#134e4a]/50 rounded-2xl bg-gradient-to-br from-[#f0fdf4] via-[#b7eed8] to-[#52b788] shadow-sm">
            <h4 className="font-semibold mb-3 text-[#14532d]">Tasa de Tráfico Rodado</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {tasaInfo.length ? (
                tasaInfo.map((field) => (
                  <div
                    key={`tasa-${field.label}`}
                    className="p-3 bg-white border border-[#c7eed8] rounded-xl"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#0f4b3c]">
                      {field.label}
                    </p>
                    <p className="text-sm font-semibold text-[#7a2d12] mt-1">
                      {field.value || "—"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#7a2d12]">Sin datos de tasa.</p>
              )}
            </div>
          </div>

          {selected && vehicleQrUrl && (
            <div className="p-5 border-2 border-black rounded-2xl bg-gradient-to-br from-[#020c1f] via-[#0c274f] to-[#133a73] text-white shadow-xl lg:col-span-2 overflow-hidden relative">
              <div className="text-[11px] tracking-[0.6em] text-emerald-300 mb-1">OFIVEGE</div>
              <p className="text-sm text-white/80 mb-4">
                Identificación digital del vehículo para operaciones internas.
              </p>
              <div className="flex flex-col md:flex-row items-center gap-5">
                <div className="relative w-40 h-40 rounded-2xl bg-white p-2 border border-white/60 shadow-2xl">
                  <img
                    src={vehicleQrUrl}
                    alt={`QR ${selected.descripcion || selected.id}`}
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute left-3 right-3 h-1 bg-gradient-to-r from-transparent via-[#28d8ff] to-transparent rounded-full qr-scan-bar top-3 opacity-80" />
                </div>
                <div className="text-sm space-y-2">
                  <p className="font-semibold text-white text-lg">
                    {selected.descripcion || selected.matricula || selected.id}
                  </p>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/70">
                    {selected.matricula || selected.id}
                  </p>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-xs uppercase tracking-[0.25em]">
                        Departamento
                      </span>
                      <span className="font-semibold">
                        {selected.departamento || "No asignado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-xs uppercase tracking-[0.25em]">
                        Conductor
                      </span>
                      <span className="font-semibold">
                        {selected.conductor || "No asignado"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-white/60">
                    Escanea para obtener los datos esenciales del vehículo en despliegues móviles.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    )}

    {editMode && (
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="p-4 border-2 border-black rounded-xl">
          <h4 className="font-semibold mb-2">Datos del Vehículo</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Matrícula"
              value={draft?.matricula}
              onChange={(e) => updateVehicle({ matricula: e.target.value })}
            />
            <Input label="Marca" value={draft?.marca} onChange={(e) => updateVehicle({ marca: e.target.value })} />
            <Input
              label="Modelo"
              value={draft?.modelo}
              onChange={(e) => updateVehicle({ modelo: e.target.value })}
            />
            <Input
              label="Año"
              type="number"
              value={draft?.año ?? ""}
              onChange={(e) => updateVehicle({ año: Number(e.target.value || 0) || undefined })}
            />
            <Input
              label="Color"
              value={draft?.color}
              onChange={(e) => updateVehicle({ color: e.target.value })}
            />
            <Input label="VIN" value={draft?.vin} onChange={(e) => updateVehicle({ vin: e.target.value })} />
            <Input label="Tipo" value={draft?.tipo} onChange={(e) => updateVehicle({ tipo: e.target.value })} />
            <Input
              label="Fecha de Adquisición"
              value={draft?.fecha_de_adquisicion || draft?.fecha_adquisicion || ""}
              onChange={(e) =>
                updateVehicle({
                  fecha_de_adquisicion: e.target.value,
                  fecha_adquisicion: e.target.value,
                })
              }
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Foto (archivo)"
              value={draft?.foto || ""}
              onChange={(e) => updateVehicle({ foto: e.target.value })}
              placeholder="toyota_hilux.jpg"
            />
            <Input
              label="Uso"
              value={draft?.uso || ""}
              onChange={(e) => updateVehicle({ uso: e.target.value })}
              placeholder="Transporte oficial..."
            />
            <Input
              label="Departamento"
              value={draft?.departamento || ""}
              onChange={(e) => updateVehicle({ departamento: e.target.value })}
            />
            <Input
              label="Asignación"
              value={draft?.asignacion || ""}
              onChange={(e) => updateVehicle({ asignacion: e.target.value })}
            />
            <Input
              label="Conductor"
              value={draft?.conductor || ""}
              onChange={(e) => updateVehicle({ conductor: e.target.value })}
            />
            <Input
              label="Propietario"
              value={draft?.propietario || ""}
              onChange={(e) => updateVehicle({ propietario: e.target.value })}
            />
            <Input
              label="Kilometraje"
              value={draft?.kilometraje || ""}
              onChange={(e) => updateVehicle({ kilometraje: e.target.value })}
            />
            <Input
              label="Precio de compra (XAF)"
              type="number"
              value={draft?.precio_compra ?? ""}
              onChange={(e) =>
                updateVehicle({
                  precio_compra: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <Input
              label="Factura de compra (PDF)"
              value={draft?.factura_compra || ""}
              onChange={(e) => updateVehicle({ factura_compra: e.target.value })}
              placeholder="FACTURA_ID.pdf"
            />
            <Input
              label="Título de propiedad (PDF)"
              value={draft?.titulo_propiedad || ""}
              onChange={(e) => updateVehicle({ titulo_propiedad: e.target.value })}
              placeholder="TITULO_ID.pdf"
            />
          </div>
        </div>

        <div className="p-4 border rounded-xl">
          <h4 className="font-semibold mb-2">Seguro</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Compañía"
              value={draft?.seguro?.compania || ""}
              onChange={(e) => updateVehicleNested("seguro.compania", e.target.value)}
            />
            <Input
              label="Póliza (PDF)"
              value={draft?.seguro?.poliza || ""}
              onChange={(e) => updateVehicleNested("seguro.poliza", e.target.value)}
              placeholder="poliza_123.pdf"
            />
            <Input
              label="Vencimiento"
              value={draft?.seguro?.vencimiento || ""}
              onChange={(e) => updateVehicleNested("seguro.vencimiento", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>

        <div className="p-4 border rounded-xl">
          <h4 className="font-semibold mb-2">Permiso de Circulación</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Emisión"
              value={draft?.permiso?.emision || ""}
              onChange={(e) => updateVehicleNested("permiso.emision", e.target.value)}
            />
            <Input
              label="Vencimiento"
              value={draft?.permiso?.vencimiento || ""}
              onChange={(e) => updateVehicleNested("permiso.vencimiento", e.target.value)}
            />
            <Input
              label="Costo"
              value={draft?.permiso?.costo ?? ""}
              onChange={(e) => updateVehicleNested("permiso.costo", e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border rounded-xl">
          <h4 className="font-semibold mb-2">Tasa de Tráfico Rodado</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Emisión"
              value={draft?.tasa?.emision || ""}
              onChange={(e) => updateVehicleNested("tasa.emision", e.target.value)}
            />
            <Input
              label="Vencimiento"
              value={draft?.tasa?.vencimiento || ""}
              onChange={(e) => updateVehicleNested("tasa.vencimiento", e.target.value)}
            />
            <Input
              label="Costo"
              value={draft?.tasa?.costo ?? ""}
              onChange={(e) => updateVehicleNested("tasa.costo", e.target.value)}
            />
          </div>
        </div>
      </div>
    )}
  </div>
      )}

      {docPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col border-2 border-black shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 bg-[#004080] text-white rounded-t-2xl border-b-2 border-black">
              <span className="font-semibold text-sm sm:text-base">{docPreview.title}</span>
              <div className="flex gap-2">
                <a
                  href={docPreview.url}
                  download
                  className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-3 py-1 rounded-lg border border-white/40"
                >
                  Descargar
                </a>
                <button
                  onClick={handleCloseDocPreview}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-1 rounded-lg border border-white/40"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <iframe src={docPreview.url} title="Documento del vehículo" className="flex-1 w-full border-none" />
          </div>
        </div>
      )}

      {showAddPrompt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
          <div className="bg-white w-full max-w-3xl border-2 border-black rounded-2xl shadow-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#004080]">Registrar nuevo vehículo</h3>
                <p className="text-sm text-gray-500">
                  Ingresa los campos principales descritos en <code>flota.json</code>.
                </p>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-800"
                onClick={handleCloseAddPrompt}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  ID
                  <input
                    className={inputCls}
                    value={newVehiculo.id}
                    onChange={(e) => handleNewVehicleFieldChange("id", e.target.value.toUpperCase())}
                    placeholder="BN0024XG"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Descripción
                  <input
                    className={inputCls}
                    value={newVehiculo.descripcion}
                    onChange={(e) => handleNewVehicleFieldChange("descripcion", e.target.value)}
                    placeholder="Toyota Prado TXL 2021"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Marca
                  <input
                    className={inputCls}
                    value={newVehiculo.marca}
                    onChange={(e) => handleNewVehicleFieldChange("marca", e.target.value)}
                    placeholder="Toyota"
                    required
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Modelo
                  <input
                    className={inputCls}
                    value={newVehiculo.modelo}
                    onChange={(e) => handleNewVehicleFieldChange("modelo", e.target.value)}
                    placeholder="Prado TXL"
                    required
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Matrícula
                  <input
                    className={inputCls}
                    value={newVehiculo.matricula}
                    onChange={(e) => handleNewVehicleFieldChange("matricula", e.target.value.toUpperCase())}
                    placeholder="BN0024XG"
                    required
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Tipo
                  <input
                    className={inputCls}
                    value={newVehiculo.tipo}
                    onChange={(e) => handleNewVehicleFieldChange("tipo", e.target.value)}
                    placeholder="SUV, Pickup..."
                    required
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Año
                  <input
                    className={inputCls}
                    type="number"
                    min="1970"
                    max={new Date().getFullYear() + 1}
                    value={newVehiculo.año}
                    onChange={(e) => handleNewVehicleFieldChange("año", e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Color
                  <input
                    className={inputCls}
                    value={newVehiculo.color}
                    onChange={(e) => handleNewVehicleFieldChange("color", e.target.value)}
                    placeholder="Blanco"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Uso
                  <input
                    className={inputCls}
                    value={newVehiculo.uso}
                    onChange={(e) => handleNewVehicleFieldChange("uso", e.target.value)}
                    placeholder="Transporte de personal..."
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Fecha de adquisición
                  <input
                    className={inputCls}
                    type="date"
                    value={newVehiculo.fecha_adquisicion}
                    onChange={(e) => handleNewVehicleFieldChange("fecha_adquisicion", e.target.value)}
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Precio de compra (XAF)
                  <input
                    className={inputCls}
                    type="number"
                    value={newVehiculo.precio_compra}
                    onChange={(e) => handleNewVehicleFieldChange("precio_compra", e.target.value)}
                    placeholder="50000000"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Propietario
                  <input
                    className={inputCls}
                    value={newVehiculo.propietario}
                    onChange={(e) => handleNewVehicleFieldChange("propietario", e.target.value)}
                    placeholder="Iniciativas Elebi"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Departamento
                  <input
                    className={inputCls}
                    value={newVehiculo.departamento}
                    onChange={(e) => handleNewVehicleFieldChange("departamento", e.target.value)}
                    placeholder="Dirección General"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Asignación
                  <input
                    className={inputCls}
                    value={newVehiculo.asignacion}
                    onChange={(e) => handleNewVehicleFieldChange("asignacion", e.target.value)}
                    placeholder="Escorta embajada, logística..."
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Conductor asignado
                  <input
                  className={inputCls}
                  value={newVehiculo.conductor}
                  onChange={(e) => handleNewVehicleFieldChange("conductor", e.target.value)}
                  placeholder="Nombre del conductor"
                />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Kilometraje
                  <input
                    className={inputCls}
                    value={newVehiculo.kilometraje}
                    onChange={(e) => handleNewVehicleFieldChange("kilometraje", e.target.value)}
                    placeholder="42,000 km"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Factura de compra (PDF)
                  <input
                    className={inputCls}
                    value={newVehiculo.factura_compra}
                    onChange={(e) => handleNewVehicleFieldChange("factura_compra", e.target.value)}
                    placeholder="FACTURA_ID.pdf"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Título de propiedad (PDF)
                  <input
                    className={inputCls}
                    value={newVehiculo.titulo_propiedad}
                    onChange={(e) => handleNewVehicleFieldChange("titulo_propiedad", e.target.value)}
                    placeholder="TITULO_ID.pdf"
                  />
                </label>
                <label className="text-sm text-gray-600 flex flex-col gap-1">
                  Foto (ruta relativa)
                  <input
                    className={inputCls}
                    value={newVehiculo.foto}
                    onChange={(e) => handleNewVehicleFieldChange("foto", e.target.value)}
                    placeholder="/fotos_vehiculos/2021_toyota_prado.jpg"
                  />
                </label>
                <label className="text-sm text-gray-600 flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={newVehiculo.asegurado}
                    onChange={(e) => handleNewVehicleFieldChange("asegurado", e.target.checked)}
                  />
                  Asegurado
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" className={btnGhost} onClick={handleCloseAddPrompt}>
                  Cancelar
                </button>
                <button type="submit" className={btn}>
                  Guardar vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= Inline forms (local-only) ================= */

const AddMaintenanceForm: React.FC<{ onAdd: (e: MaintenanceEntry) => void }> = ({ onAdd }) => {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState<string>("");
  const [shop, setShop] = useState("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <label className="block">
        <span className="text-sm text-gray-600">Fecha</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm text-gray-600">Descripción</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cambio de aceite, frenos, neumáticos..."
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">Costo</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="20000"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">Taller / Proveedor</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="Centro de servicio"
        />
      </label>
      <div className="md:col-span-3 flex items-end">
        <button
          className="bg-[#004080] text-white border-2 border-black px-3 py-2 rounded-lg font-semibold hover:bg-[#003366] transition"
          onClick={() => {
            if (!date && !description) return;
            onAdd({ date, description, cost: cost || undefined, taller: shop || undefined });
            setDate("");
            setDescription("");
            setCost("");
            setShop("");
          }}
        >
          Añadir
        </button>
      </div>
    </div>
  );
};

const AddUsageForm: React.FC<{ onAdd: (e: UsageEntry) => void }> = ({ onAdd }) => {
  const [date, setDate] = useState("");
  const [driver, setDriver] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startKm, setStartKm] = useState<string>("");
  const [endKm, setEndKm] = useState<string>("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
      <label className="block">
        <span className="text-sm text-gray-600">Fecha</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">Conductor</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          value={driver}
          onChange={(e) => setDriver(e.target.value)}
          placeholder="Nombre"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">Propósito</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Transporte oficial, etc."
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">km inicio</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          value={startKm}
          onChange={(e) => setStartKm(e.target.value)}
          type="number"
          placeholder="0"
        />
      </label>
      <label className="block">
        <span className="text-sm text-gray-600">km fin</span>
        <input
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#004080]"
          value={endKm}
          onChange={(e) => setEndKm(e.target.value)}
          type="number"
          placeholder="0"
        />
      </label>

      <div className="md:col-span-5">
        <button
          className="mt-1 bg-[#004080] text-white border-2 border-black px-3 py-2 rounded-lg font-semibold hover:bg-[#003366] transition"
          onClick={() => {
            if (!driver && !date) return;
            onAdd({
              date: date || new Date().toISOString().slice(0, 10),
              driver: driver || "—",
              purpose: purpose || undefined,
              start_km: startKm === "" ? undefined : Number(startKm),
              end_km: endKm === "" ? undefined : Number(endKm),
            });
            setDate("");
            setDriver("");
            setPurpose("");
            setStartKm("");
            setEndKm("");
          }}
        >
          Añadir uso
        </button>
      </div>
    </div>
  );
};

export default Flota;
