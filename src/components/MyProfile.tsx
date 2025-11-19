// src/components/MyProfile.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";
import { assetUrl, normalizeAssetPath } from "../utils/assetPaths";
import { buildNominaPdf } from "../utils/nominaPdf";

/* ================= Icons (inline, no deps) ================= */
const HourglassIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 2h14" /><path d="M5 22h14" />
    <path d="M18 22V8.3L6 2V22Z" /><path d="M6 2v13.7L18 22" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);
const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="2" />
  </svg>
);

/* ================= Types ================= */
type AttendanceRecord = {
  day: number;
  hora_entrada: string | null;
  hora_salida: string | null;
  observaciones?: string;
  explicacion?: string;
};

type Empleado = {
  id: number | string;
  nombre: string;
  apellidos?: string;
  puesto: string;
  departamento?: string;
  numero_empleado?: string;

  // Contacto “oficial”
  correo?: string;
  telefono?: string;
  direccion?: string;

  // Datos personales extendidos (para las tarjetas nuevas)
  lugar_nacimiento?: string;
  fecha_nacimiento?: string;
  genero?: string;              // "Masculino", "Femenino", etc.
  sexo?: string;                // "M", "F", etc.
  estado_civil?: string;
  telefono_personal?: string;
  email_personal?: string;
  direccion_personal?: string;
  nacionalidad?: string;
  numero_identificacion?: string;
  grupo_sanguineo?: string;

  // Familia
  next_of_kin?: string;         // persona de referencia
  contacto_emergencia?: string;
  contacto_emergencia_telefono?: string;
  numero_dependientes?: number;
  seguro_medico?: string;
  numero_poliza?: string;

  // Bancaria
  banco?: string;
  numerocuenta?: string;
  codigo_swift?: string;
  tipo_cuenta?: string;

  // Carrera
  fecha_ingreso?: string;
  fecha_incorporacion?: string; // fuente alternativa
  tipo_contrato?: string;
  salario_base?: number;
  descripcion_puesto?: string;
  modalidad_trabajo?: string;
  supervisor_directo?: string;
  habilidades_tecnicas?: string[] | string;
  habilidades_blandas?: string[] | string;
  proyectos_destacados?: string[] | string;
  ultima_evaluacion?: string;

  // Archivos y media
  url_foto?: string;
  url_thumb?: string;
  contrato_actual_pdf?: string;
  dip_pdf?: string;
  curriculum_pdf?: string;
  evaluacion_anual_pdf?: string;
  id_empleado_elebi_pdf?: string;

  // Otros
  responsabilidades?: string[];
  jerarquia?: string;

  // Documentación arbitraria (cualquier *_pdf o *.pdf será detectado)
  [k: string]: any;
};

type PersonalForm = {
  nombre: string;
  apellidos: string;
  sexo: string;
  fecha_nacimiento: string;
  nacionalidad: string;
  lugar_nacimiento: string;
  estado_civil: string;
  telefono_personal: string;
  email_personal: string;
  correo: string;
  telefono: string;
  direccion_personal: string;
  numero_identificacion: string;
};

type FamiliarForm = {
  contacto_emergencia: string;
  contacto_emergencia_telefono: string;
  numero_dependientes: string;
  grupo_sanguineo: string;
  seguro_medico: string;
  numero_poliza: string;
};

type BancariaForm = {
  banco: string;
  tipo_cuenta: string;
  codigo_swift: string;
  salario_base: string;
};

type CarreraForm = {
  puesto: string;
  departamento: string;
  supervisor_directo: string;
  fecha_ingreso: string;
  tipo_contrato: string;
  modalidad_trabajo: string;
  habilidades_tecnicas: string;
  habilidades_blandas: string;
  proyectos_destacados: string;
  ultima_evaluacion: string;
  descripcion_puesto: string;
};

type DocumentosForm = {
  contrato_actual_pdf: string;
  dip_pdf: string;
  curriculum_pdf: string;
  evaluacion_anual_pdf: string;
  id_empleado_elebi_pdf: string;
};

/* ================= Attendance helpers (shared with Asistencia) ================= */
const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const WORK_YEAR = 2025;
const WEEKDAY_HOURS = 8;
const FRIDAY_HOURS = 5;

const padTime = (value: number) => value.toString().padStart(2, "0");

const extractTimeParts = (value?: string | null): { hours: number; minutes: number } | null => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  if (raw.includes("T")) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) {
      return { hours: date.getHours(), minutes: date.getMinutes() };
    }
  }

  const hhmm = raw.match(/^(\d{1,2}):(\d{1,2})/);
  if (hhmm) {
    const hours = parseInt(hhmm[1], 10);
    const minutes = parseInt(hhmm[2], 10);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return { hours: Math.max(0, Math.min(23, hours)), minutes: Math.max(0, Math.min(59, minutes)) };
    }
  }

  const hoursOnly = raw.match(/^(\d{1,2})$/);
  if (hoursOnly) {
    const hours = parseInt(hoursOnly[1], 10);
    if (!Number.isNaN(hours)) {
      return { hours: Math.max(0, Math.min(23, hours)), minutes: 0 };
    }
  }

  return null;
};

const parseTimeToMinutes = (value?: string | null): number | null => {
  const parts = extractTimeParts(value);
  if (!parts) return null;
  return parts.hours * 60 + parts.minutes;
};

const formatTimeDisplay = (value?: string | null) => {
  const parts = extractTimeParts(value);
  if (!parts) return null;
  return `${padTime(parts.hours)}:${padTime(parts.minutes)}`;
};

const diffHours = (entrada: string | null, salida: string | null): number => {
  const start = parseTimeToMinutes(entrada);
  const end = parseTimeToMinutes(salida);
  if (start === null || end === null || end <= start) return 0;
  const diff = (end - start) / 60;
  return Number(diff.toFixed(2));
};

const calculateRecordHours = (record: AttendanceRecord) => diffHours(record.hora_entrada, record.hora_salida);

const monthLabel = (month: string, year = WORK_YEAR) => {
  if (!month) return "";
  const idx = MONTHS.indexOf(month);
  const pretty = idx >= 0 ? month.charAt(0).toUpperCase() + month.slice(1) : month;
  return `${pretty} ${year}`;
};

const computeExpectedWorkload = (year: number, monthIndex: number) => {
  let expectedHours = 0;
  let expectedDays = 0;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const dow = d.getDay();
    if (dow >= 1 && dow <= 4) {
      expectedHours += WEEKDAY_HOURS;
      expectedDays++;
    } else if (dow === 5) {
      expectedHours += FRIDAY_HOURS;
      expectedDays++;
    }
  }
  return { expectedDays, expectedHours };
};

const getExpectedHoursForDay = (day: number, monthIndex: number) => {
  if (monthIndex < 0) return WEEKDAY_HOURS;
  const date = new Date(WORK_YEAR, monthIndex, day);
  const weekday = date.getDay();
  if (weekday >= 1 && weekday <= 4) return WEEKDAY_HOURS;
  if (weekday === 5) return FRIDAY_HOURS;
  return 0;
};

const getWeekdayNameEs = (weekday: number) => {
  const names = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return names[weekday] ?? "";
};

const getWeekdayLabel = (day: number, monthIndex: number) => {
  if (monthIndex < 0) return `Día ${String(day).padStart(2, "0")}`;
  const date = new Date(WORK_YEAR, monthIndex, day);
  const weekday = date.getDay();
  return `${getWeekdayNameEs(weekday)}, ${String(day).padStart(2, "0")}`;
};

const getStatusForRecord = (record: AttendanceRecord, expectedHours: number) => {
  if (!record.hora_entrada || record.hora_entrada.trim() === "") return "Ausente";
  if (!record.hora_salida || record.hora_salida.trim() === "") return "Sin registro de salida";
  const actualHours = calculateRecordHours(record);
  const target = expectedHours > 0 ? expectedHours : WEEKDAY_HOURS;
  if (actualHours >= target - 0.05) return "Jornada completa";
  return "Jornada incompleta";
};

const computeMedianHoursForMonth = (
  attendanceData: Record<string, any> | null,
  month: string
) => {
  if (!attendanceData || !month) return null;
  const values: number[] = [];
  Object.keys(attendanceData).forEach((employeeKey) => {
    const records: AttendanceRecord[] =
      attendanceData[employeeKey]?.[WORK_YEAR]?.[month] || [];
    if (Array.isArray(records) && records.length) {
      const total = records.reduce((sum, record) => sum + calculateRecordHours(record), 0);
      values.push(Number(total.toFixed(2)));
    }
  });
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const computeTeamAvgEfficiencyForMonth = (
  attendanceData: Record<string, any> | null,
  month: string
) => {
  if (!attendanceData || !month) return null;
  const monthIndex = MONTHS.indexOf(month);
  const { expectedHours } = computeExpectedWorkload(WORK_YEAR, monthIndex);
  if (!expectedHours) return null;
  const efficiencies: number[] = [];
  Object.keys(attendanceData).forEach((employeeKey) => {
    const records: AttendanceRecord[] =
      attendanceData[employeeKey]?.[WORK_YEAR]?.[month] || [];
    if (Array.isArray(records) && records.length) {
      const total = records.reduce((sum, record) => sum + calculateRecordHours(record), 0);
      const eff = (total / expectedHours) * 100;
      efficiencies.push(eff);
    }
  });
  if (!efficiencies.length) return null;
  const avg = efficiencies.reduce((acc, value) => acc + value, 0) / efficiencies.length;
  return Math.round(avg * 10) / 10;
};

/* ================= Helpers / Styles ================= */
const card =
  "bg-white rounded-xl shadow-lg border border-gray-300 transition-all duration-300";

const tabStyle = (active: boolean) =>
  `px-6 py-3 font-semibold transition-all duration-200 whitespace-nowrap focus:outline-none ${
    active
      ? "text-[#004080] border-b-4 border-[#004080] font-bold"
      : "text-gray-600 border-b-4 border-transparent hover:border-gray-300 hover:text-gray-800"
  }`;

const stripPublicPrefix = (p?: string) => normalizeAssetPath(p);

const normalizeFotoPath = (emp?: Empleado) => {
  const fromField = assetUrl(emp?.url_foto || (emp as any)?.foto);
  if (fromField) return fromField;
  if (emp?.nombre) {
    const guess = assetUrl(`./fotos_empleados/${emp.nombre.replace(/\s+/g, " ").trim()}.jpeg`);
    if (guess) return guess;
  }
  return "https://placehold.co/160x160/004080/ffffff?text=PROFILE";
};

const normalizeDocPath = (p?: string) => assetUrl(p);
const formatList = (value?: string[] | string) => {
  if (Array.isArray(value)) return value.join(", ");
  return value || "—";
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return `${value.toLocaleString("es-GQ")} XAF`;
};

const listToInput = (value?: string[] | string) => {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
};

const splitListInput = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const sanitizeString = (value: string) => value.trim();

const titleCaseEs = (txt: string) =>
  txt ? txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase() : txt;

const parseFlexibleDate = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!match) return null;

  const [, d, m, y] = match;
  const day = Number(d);
  const month = Number(m) - 1;
  const year = Number(y.length === 2 ? `20${y}` : y);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
  const parsed = new Date(year, month, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function calcularEdad(fechaNacimiento?: string): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = parseFlexibleDate(fechaNacimiento);
  if (!nacimiento) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

/* ================= Detail helper ================= */
const Detail: React.FC<{
  label: string;
  value: string | number | undefined;
  fullWidth?: boolean;
  size?: "medium" | "large";
}> = ({ label, value, fullWidth = false, size = "medium" }) => {
  const valueDisplay = (value ?? "—") as string | number;
  const valueClasses =
    size === "large"
      ? "text-xl font-extrabold text-[#004080]"
      : "text-base font-medium text-gray-700";
  return (
    <div className={fullWidth ? "col-span-full" : ""}>
      <strong className="block text-sm font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </strong>
      <span className={`${valueClasses} block mt-1`}>{String(valueDisplay)}</span>
    </div>
  );
};

const FieldWrapper: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({
  label,
  className,
  children,
}) => (
  <label className={`flex flex-col text-sm font-semibold text-gray-600 gap-1 ${className ?? ""}`}>
    <span>{label}</span>
    {children}
  </label>
);

const DocumentPreviewCard: React.FC<{
  label: string;
  url?: string;
  onOpen?: (url: string, title: string) => void;
}> = ({ label, url, onOpen }) => (
  <div className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden flex flex-col">
    <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
      <span className="font-semibold text-[#004080] text-sm">{label}</span>
      {url && (
        <button
          className="text-xs px-2 py-1 border border-[#004080] text-[#004080] rounded hover:bg-[#004080] hover:text-white transition"
          onClick={() => onOpen?.(url, label)}
        >
          Abrir
        </button>
      )}
    </div>
    <div className="flex-1 min-h-[180px] bg-gray-50 flex items-center justify-center">
      {url ? (
        <iframe title={label} src={url} className="w-full h-full" style={{ border: "none" }} />
      ) : (
        <span className="text-sm text-gray-500 px-3 text-center">Documento no disponible</span>
      )}
    </div>
  </div>
);

/* ================= Animated Counter (single, used by Nómina) ================= */
const AnimatedCounter: React.FC<{ value: number; duration?: number; className?: string }> = ({
  value,
  duration = 1500,
  className,
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = value / (duration / 16);
    const interval = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(interval);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(interval);
  }, [value, duration]);
  return <div className={className}>{count.toLocaleString("es-GQ")}</div>;
};

const normalizePerfilEmpleado = (raw: any): Empleado => {
  if (!raw) return null as unknown as Empleado;
  const personal = raw.informacion_personal ?? {};
  const familiar = raw.informacion_familiar ?? {};
  const bancaria = raw.informacion_bancaria ?? {};
  const carrera = raw.datos_carrera ?? {};
  const documentacion = raw.documentacion ?? {};

  const readDocPath = (key: string) => stripPublicPrefix(documentacion[key] ?? raw[key]);

  const salarioFuente =
    bancaria.salario_mensual_cfa ??
    raw.salario_base ??
    raw.salariomensual ??
    carrera.salario_mensual_cfa;
  const salarioBase =
    typeof salarioFuente === "number"
      ? salarioFuente
      : salarioFuente && !Number.isNaN(Number(salarioFuente))
      ? Number(salarioFuente)
      : undefined;

  const dependientesFuente =
    familiar.numero_dependientes ?? personal.dependientes ?? raw.numero_dependientes;
  const numeroDependientes =
    typeof dependientesFuente === "number"
      ? dependientesFuente
      : dependientesFuente && !Number.isNaN(Number(dependientesFuente))
      ? Number(dependientesFuente)
      : undefined;

  return {
    id: raw.id ?? personal.numero_empleado ?? raw.numero_empleado,
    nombre:
      raw.nombre ||
      raw.nombres ||
      personal.nombre ||
      raw.nombrecompleto ||
      "",
    apellidos: raw.apellidos || raw.apellido || personal.apellidos || "",
    puesto: raw.puesto || carrera.puesto || carrera.descripcion_puesto || "",
    departamento: raw.departamento || carrera.departamento || carrera.area || "",

    correo:
      raw.correo ||
      raw.email ||
      raw.email_oficial ||
      personal.email_oficial ||
      personal.email_personal ||
      "",
    telefono:
      raw.telefono ||
      raw.telefono_oficial ||
      personal.telefono_oficial ||
      personal.telefono ||
      personal.telefono_personal ||
      "",
    direccion: raw.direccion || personal.direccion_personal || personal.direccion || "",

    lugar_nacimiento: personal.lugar_nacimiento || raw.lugar_nacimiento,
    fecha_nacimiento: personal.fecha_nacimiento || raw.fecha_nacimiento,
    genero: personal.genero || raw.genero,
    sexo: personal.sexo || raw.sexo,
    estado_civil: personal.estado_civil || raw.estado_civil,
    telefono_personal: personal.telefono_personal || raw.telefono_personal,
    email_personal: personal.email_personal || raw.email_personal,
    direccion_personal: personal.direccion_personal || raw.direccion_personal,
    nacionalidad: personal.nacionalidad || raw.nacionalidad,
    numero_identificacion:
      personal.numero_identificacion ||
      raw.numero_identificacion ||
      documentacion.numero_identificacion ||
      documentacion.dni ||
      raw.dni,
    grupo_sanguineo:
      personal.grupo_sanguineo ||
      familiar.grupo_sanguineo ||
      raw.grupo_sanguineo,

    next_of_kin: familiar.nombre_conyuge || familiar.next_of_kin || raw.next_of_kin,
    contacto_emergencia:
      familiar.contacto_emergencia_nombre ||
      familiar.contacto_emergencia ||
      raw.contacto_emergencia,
    contacto_emergencia_telefono:
      familiar.contacto_emergencia_telefono ||
      raw.contacto_emergencia_telefono,
    numero_dependientes: numeroDependientes,
    seguro_medico: familiar.seguro_medico || raw.seguro_medico,
    numero_poliza:
      familiar.numero_poliza || raw.numero_poliza || raw.no_poliza || raw.poliza,

    banco: bancaria.banco || raw.banco,
    numerocuenta: bancaria.numero_cuenta || raw.numerocuenta,
    codigo_swift: bancaria.codigo_swift || raw.codigo_swift,
    tipo_cuenta: bancaria.tipo_cuenta || raw.tipo_cuenta,

    fecha_ingreso: carrera.fecha_ingreso || raw.fecha_ingreso || raw.fechaincorporacion,
    fecha_incorporacion: carrera.fecha_incorporacion || raw.fechaincorporacion,
    tipo_contrato: carrera.tipo_contrato || raw.tipo_contrato || raw.tipocontrato,
    salario_base: salarioBase,
    descripcion_puesto: carrera.descripcion_puesto || raw.descripcion_puesto,
    modalidad_trabajo:
      carrera.modalidad_trabajo ||
      carrera.modalidad ||
      raw.modalidad_trabajo ||
      raw.modalidad,
    supervisor_directo:
      carrera.supervisor_directo ||
      raw.supervisor_directo ||
      raw.supervisor ||
      raw.jefe_inmediato,
    habilidades_tecnicas: carrera.habilidades_tecnicas || raw.habilidades_tecnicas,
    habilidades_blandas: carrera.habilidades_blandas || raw.habilidades_blandas,
    proyectos_destacados:
      carrera.proyectos_principales ||
      raw.proyectos_destacados ||
      carrera.proyectos_destacados,
    ultima_evaluacion:
      carrera.evaluacion_anual ||
      raw.ultima_evaluacion ||
      raw.evaluacion_reciente,

    url_foto: stripPublicPrefix(raw.url_foto || raw.foto || personal.foto),
    contrato_actual_pdf: readDocPath("contrato_actual_pdf") || readDocPath("contrato_pdf"),
    dip_pdf: readDocPath("dip_pdf"),
    curriculum_pdf: readDocPath("curriculum_pdf") || readDocPath("cv_pdf"),
    evaluacion_anual_pdf: readDocPath("evaluacion_anual_pdf"),
    id_empleado_elebi_pdf: readDocPath("id_empleado_elebi_pdf"),

    jerarquia: raw.jerarquia || carrera.jerarquia,
    responsabilidades: raw.responsabilidades || carrera.responsabilidades,
    numero_empleado:
      raw.numero_empleado ||
      personal.numero_empleado ||
      raw.employee_number ||
      raw.numeroempleado ||
      raw.id,

    ...raw,
  };
};

const buildPersonalForm = (emp: Empleado | null): PersonalForm => ({
  nombre: emp?.nombre ?? "",
  apellidos: emp?.apellidos ?? "",
  sexo: emp?.sexo ?? "",
  fecha_nacimiento: emp?.fecha_nacimiento ?? "",
  nacionalidad: emp?.nacionalidad ?? "",
  lugar_nacimiento: emp?.lugar_nacimiento ?? "",
  estado_civil: emp?.estado_civil ?? "",
  telefono_personal: emp?.telefono_personal ?? "",
  email_personal: emp?.email_personal ?? "",
  correo: emp?.correo ?? "",
  telefono: emp?.telefono ?? "",
  direccion_personal: emp?.direccion_personal ?? emp?.direccion ?? "",
  numero_identificacion: emp?.numero_identificacion ?? "",
});

const buildFamiliarForm = (emp: Empleado | null): FamiliarForm => ({
  contacto_emergencia: emp?.contacto_emergencia ?? "",
  contacto_emergencia_telefono: emp?.contacto_emergencia_telefono ?? "",
  numero_dependientes:
    emp?.numero_dependientes !== undefined && emp?.numero_dependientes !== null
      ? String(emp.numero_dependientes)
      : "",
  grupo_sanguineo: emp?.grupo_sanguineo ?? "",
  seguro_medico: emp?.seguro_medico ?? "",
  numero_poliza: emp?.numero_poliza ?? "",
});

const buildBancariaForm = (emp: Empleado | null): BancariaForm => ({
  banco: emp?.banco ?? "",
  tipo_cuenta: emp?.tipo_cuenta ?? "",
  codigo_swift: emp?.codigo_swift ?? "",
  salario_base:
    typeof emp?.salario_base === "number" ? String(emp.salario_base) : emp?.salario_base ?? "",
});

const buildCarreraForm = (emp: Empleado | null): CarreraForm => ({
  puesto: emp?.puesto ?? "",
  departamento: emp?.departamento ?? "",
  supervisor_directo: emp?.supervisor_directo ?? "",
  fecha_ingreso: emp?.fecha_ingreso ?? "",
  tipo_contrato: emp?.tipo_contrato ?? "",
  modalidad_trabajo: emp?.modalidad_trabajo ?? "",
  habilidades_tecnicas: listToInput(emp?.habilidades_tecnicas),
  habilidades_blandas: listToInput(emp?.habilidades_blandas),
  proyectos_destacados: listToInput(emp?.proyectos_destacados),
  ultima_evaluacion: emp?.ultima_evaluacion ?? "",
  descripcion_puesto: emp?.descripcion_puesto ?? "",
});

const buildDocumentosForm = (emp: Empleado | null): DocumentosForm => ({
  contrato_actual_pdf: emp?.contrato_actual_pdf ?? "",
  dip_pdf: emp?.dip_pdf ?? "",
  curriculum_pdf: emp?.curriculum_pdf ?? "",
  evaluacion_anual_pdf: emp?.evaluacion_anual_pdf ?? "",
  id_empleado_elebi_pdf: emp?.id_empleado_elebi_pdf ?? "",
});

/* ================= Component ================= */
const MyProfile: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<"personales" | "asistencia" | "nomina" | "puesto">(
    "personales"
  );
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [personalForm, setPersonalForm] = useState<PersonalForm>(() => buildPersonalForm(null));
  const [familiarForm, setFamiliarForm] = useState<FamiliarForm>(() => buildFamiliarForm(null));
  const [bancariaForm, setBancariaForm] = useState<BancariaForm>(() => buildBancariaForm(null));
  const [carreraForm, setCarreraForm] = useState<CarreraForm>(() => buildCarreraForm(null));
  const [documentosForm, setDocumentosForm] = useState<DocumentosForm>(() =>
    buildDocumentosForm(null)
  );
  const [editingSections, setEditingSections] = useState({
    personal: false,
    familiar: false,
    bancaria: false,
    carrera: false,
    documentacion: false,
  });
  const [savingSections, setSavingSections] = useState({
    personal: false,
    familiar: false,
    bancaria: false,
    carrera: false,
    documentacion: false,
  });
  const [sectionErrors, setSectionErrors] = useState({
    personal: null as string | null,
    familiar: null as string | null,
    bancaria: null as string | null,
    carrera: null as string | null,
    documentacion: null as string | null,
  });
  const [sectionSuccess, setSectionSuccess] = useState({
    personal: false,
    familiar: false,
    bancaria: false,
    carrera: false,
    documentacion: false,
  });
  const inputClasses =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#004080] focus:border-[#004080]";

  // Asistencia
  const [months, setMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [asistencia, setAsistencia] = useState<AttendanceRecord[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingExplanation, setEditingExplanation] = useState<{
    index: number;
    reason: string;
    detail: string;
  } | null>(null);

  // PDF modal
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("Documento");
  const generatedPdfUrlRef = useRef<string | null>(null);

  // Chart
  const pieRef = useRef<HTMLCanvasElement | null>(null);
  const pieInstance = useRef<Chart | null>(null);

  // Expand/collapse states for “Datos Personales”
  const [sectionsOpen, setSectionsOpen] = useState({
    personal: true,
    familiar: false,
    bancaria: false,
    carrera: false,
    documentacion: false,
  });
  const toggleSection = (key: keyof typeof sectionsOpen) =>
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const handlePersonalFormChange = (field: keyof PersonalForm, value: string) => {
    setPersonalForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFamiliarFormChange = (field: keyof FamiliarForm, value: string) => {
    setFamiliarForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleBancariaFormChange = (field: keyof BancariaForm, value: string) => {
    setBancariaForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCarreraFormChange = (field: keyof CarreraForm, value: string) => {
    setCarreraForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentosFormChange = (field: keyof DocumentosForm, value: string) => {
    setDocumentosForm((prev) => ({ ...prev, [field]: value }));
  };

  const employeeAttendanceKey = useMemo(
    () => (empleado ? `${empleado.nombre || ""} ${empleado.apellidos || ""}`.trim() : ""),
    [empleado]
  );
  const currentMonthIndex = useMemo(() => MONTHS.indexOf(selectedMonth), [selectedMonth]);
  const selectedMonthLabel = selectedMonth ? monthLabel(selectedMonth) : "";

  const enterSectionEditing = (section: keyof typeof editingSections) => {
    setEditingSections((prev) => ({ ...prev, [section]: true }));
    setSectionErrors((prev) => ({ ...prev, [section]: null }));
    setSectionSuccess((prev) => ({ ...prev, [section]: false }));
  };

  const cancelSectionEditing = (section: keyof typeof editingSections) => {
    if (!empleado) return;
    if (section === "personal") setPersonalForm(buildPersonalForm(empleado));
    if (section === "familiar") setFamiliarForm(buildFamiliarForm(empleado));
    if (section === "bancaria") setBancariaForm(buildBancariaForm(empleado));
    if (section === "carrera") setCarreraForm(buildCarreraForm(empleado));
    if (section === "documentacion") setDocumentosForm(buildDocumentosForm(empleado));
    setEditingSections((prev) => ({ ...prev, [section]: false }));
    setSectionErrors((prev) => ({ ...prev, [section]: null }));
  };

  const showSectionSuccess = (section: keyof typeof editingSections) => {
    setSectionSuccess((prev) => ({ ...prev, [section]: true }));
    setTimeout(
      () =>
        setSectionSuccess((prev) => ({
          ...prev,
          [section]: false,
        })),
      2500
    );
  };

  useEffect(() => {
    if (!empleado) return;
    setPersonalForm(buildPersonalForm(empleado));
    setFamiliarForm(buildFamiliarForm(empleado));
    setBancariaForm(buildBancariaForm(empleado));
    setCarreraForm(buildCarreraForm(empleado));
    setDocumentosForm(buildDocumentosForm(empleado));
  }, [empleado]);

  const persistEmployeeUpdates = useCallback(
    async (payload: Record<string, any>) => {
      if (!empleado) throw new Error("Empleado no disponible");
      const numericId = Number(empleado.id);
      const idForUpdate = Number.isNaN(numericId) ? empleado.id : numericId;
      const electronAPI = (window as any)?.electronAPI;
      if (electronAPI?.updateEmpleado) {
        try {
          const updated = await electronAPI.updateEmpleado({ id: idForUpdate, ...payload });
          return { ok: true, empleado: updated };
        } catch (err) {
          console.warn("Electron updateEmpleado falló, usando API HTTP:", err);
        }
      }
      const response = await fetch(`/api/employees/${empleado.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "No se pudo guardar la información");
      }
      return data;
    },
    [empleado]
  );

  const resolveUpdatedEmpleado = useCallback(
    (payload: Record<string, any>, responseData?: any) => {
      if (responseData?.empleado) {
        return normalizePerfilEmpleado(responseData.empleado);
      }
      if (!empleado) return null;
      return {
        ...empleado,
        ...payload,
      };
    },
    [empleado]
  );

  const savePersonalSection = async () => {
    if (!empleado) return;
    const payload: Record<string, any> = {
      nombre: sanitizeString(personalForm.nombre),
      apellidos: sanitizeString(personalForm.apellidos),
      sexo: sanitizeString(personalForm.sexo),
      fecha_nacimiento: personalForm.fecha_nacimiento.trim(),
      nacionalidad: sanitizeString(personalForm.nacionalidad),
      lugar_nacimiento: sanitizeString(personalForm.lugar_nacimiento),
      estado_civil: sanitizeString(personalForm.estado_civil),
      telefono_personal: sanitizeString(personalForm.telefono_personal),
      email_personal: sanitizeString(personalForm.email_personal),
      correo: sanitizeString(personalForm.correo),
      telefono: sanitizeString(personalForm.telefono),
      direccion_personal: personalForm.direccion_personal.trim(),
      numero_identificacion: sanitizeString(personalForm.numero_identificacion),
    };

    setSavingSections((prev) => ({ ...prev, personal: true }));
    setSectionErrors((prev) => ({ ...prev, personal: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const nextEmpleado = resolveUpdatedEmpleado(payload, response);
      if (nextEmpleado) {
        setEmpleado(nextEmpleado);
        setPersonalForm(buildPersonalForm(nextEmpleado));
      }
      setEditingSections((prev) => ({ ...prev, personal: false }));
      showSectionSuccess("personal");
    } catch (error) {
      setSectionErrors((prev) => ({
        ...prev,
        personal:
          error instanceof Error ? error.message : "No se pudo guardar la información personal",
      }));
    } finally {
      setSavingSections((prev) => ({ ...prev, personal: false }));
    }
  };

  const saveFamiliarSection = async () => {
    if (!empleado) return;
    const payload: Record<string, any> = {
      contacto_emergencia: sanitizeString(familiarForm.contacto_emergencia),
      contacto_emergencia_telefono: sanitizeString(familiarForm.contacto_emergencia_telefono),
      numero_dependientes: familiarForm.numero_dependientes.trim()
        ? Number(familiarForm.numero_dependientes)
        : undefined,
      grupo_sanguineo: sanitizeString(familiarForm.grupo_sanguineo),
      seguro_medico: sanitizeString(familiarForm.seguro_medico),
      numero_poliza: sanitizeString(familiarForm.numero_poliza),
    };

    setSavingSections((prev) => ({ ...prev, familiar: true }));
    setSectionErrors((prev) => ({ ...prev, familiar: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const nextEmpleado = resolveUpdatedEmpleado(payload, response);
      if (nextEmpleado) {
        setEmpleado(nextEmpleado);
        setFamiliarForm(buildFamiliarForm(nextEmpleado));
      }
      setEditingSections((prev) => ({ ...prev, familiar: false }));
      showSectionSuccess("familiar");
    } catch (error) {
      setSectionErrors((prev) => ({
        ...prev,
        familiar:
          error instanceof Error ? error.message : "No se pudo guardar la información familiar",
      }));
    } finally {
      setSavingSections((prev) => ({ ...prev, familiar: false }));
    }
  };

  const saveBancariaSection = async () => {
    if (!empleado) return;
    const salarioValue = bancariaForm.salario_base.trim();
    const payload: Record<string, any> = {
      banco: sanitizeString(bancariaForm.banco),
      tipo_cuenta: sanitizeString(bancariaForm.tipo_cuenta),
      codigo_swift: sanitizeString(bancariaForm.codigo_swift),
      salario_base: salarioValue ? Number(salarioValue) : undefined,
    };

    setSavingSections((prev) => ({ ...prev, bancaria: true }));
    setSectionErrors((prev) => ({ ...prev, bancaria: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const nextEmpleado = resolveUpdatedEmpleado(payload, response);
      if (nextEmpleado) {
        setEmpleado(nextEmpleado);
        setBancariaForm(buildBancariaForm(nextEmpleado));
      }
      setEditingSections((prev) => ({ ...prev, bancaria: false }));
      showSectionSuccess("bancaria");
    } catch (error) {
      setSectionErrors((prev) => ({
        ...prev,
        bancaria:
          error instanceof Error ? error.message : "No se pudo guardar la información bancaria",
      }));
    } finally {
      setSavingSections((prev) => ({ ...prev, bancaria: false }));
    }
  };

  const saveCarreraSection = async () => {
    if (!empleado) return;
    const payload: Record<string, any> = {
      puesto: sanitizeString(carreraForm.puesto),
      departamento: sanitizeString(carreraForm.departamento),
      supervisor_directo: sanitizeString(carreraForm.supervisor_directo),
      fecha_ingreso: carreraForm.fecha_ingreso.trim(),
      tipo_contrato: sanitizeString(carreraForm.tipo_contrato),
      modalidad_trabajo: sanitizeString(carreraForm.modalidad_trabajo),
      habilidades_tecnicas: splitListInput(carreraForm.habilidades_tecnicas),
      habilidades_blandas: splitListInput(carreraForm.habilidades_blandas),
      proyectos_destacados: splitListInput(carreraForm.proyectos_destacados),
      ultima_evaluacion: sanitizeString(carreraForm.ultima_evaluacion),
      descripcion_puesto: carreraForm.descripcion_puesto.trim(),
    };

    setSavingSections((prev) => ({ ...prev, carrera: true }));
    setSectionErrors((prev) => ({ ...prev, carrera: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const nextEmpleado = resolveUpdatedEmpleado(payload, response);
      if (nextEmpleado) {
        setEmpleado(nextEmpleado);
        setCarreraForm(buildCarreraForm(nextEmpleado));
      }
      setEditingSections((prev) => ({ ...prev, carrera: false }));
      showSectionSuccess("carrera");
    } catch (error) {
      setSectionErrors((prev) => ({
        ...prev,
        carrera:
          error instanceof Error ? error.message : "No se pudo guardar la información profesional",
      }));
    } finally {
      setSavingSections((prev) => ({ ...prev, carrera: false }));
    }
  };

  const saveDocumentosSection = async () => {
    if (!empleado) return;
    const cleanDoc = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return "";
      const normalized = stripPublicPrefix(trimmed);
      return normalized ?? trimmed;
    };
    const payload: Record<string, any> = {
      contrato_actual_pdf: cleanDoc(documentosForm.contrato_actual_pdf),
      dip_pdf: cleanDoc(documentosForm.dip_pdf),
      curriculum_pdf: cleanDoc(documentosForm.curriculum_pdf),
      evaluacion_anual_pdf: cleanDoc(documentosForm.evaluacion_anual_pdf),
      id_empleado_elebi_pdf: cleanDoc(documentosForm.id_empleado_elebi_pdf),
    };

    setSavingSections((prev) => ({ ...prev, documentacion: true }));
    setSectionErrors((prev) => ({ ...prev, documentacion: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const nextEmpleado = resolveUpdatedEmpleado(payload, response);
      if (nextEmpleado) {
        setEmpleado(nextEmpleado);
        setDocumentosForm(buildDocumentosForm(nextEmpleado));
      }
      setEditingSections((prev) => ({ ...prev, documentacion: false }));
      showSectionSuccess("documentacion");
    } catch (error) {
      setSectionErrors((prev) => ({
        ...prev,
        documentacion:
          error instanceof Error ? error.message : "No se pudo guardar la documentación",
      }));
    } finally {
      setSavingSections((prev) => ({ ...prev, documentacion: false }));
    }
  };

  /* ===== 1) Load employee (100% offline) ===== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const idStr = localStorage.getItem("currentEmployeeId");
        if (!idStr) throw new Error("No hay currentEmployeeId en localStorage");
        const res = await fetch("./datos_empleados.json", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar datos_empleados.json");
        const list = (await res.json()) as any[];

        const raw = list.find((e) => {
          const candidateId =
            e?.id ??
            e?.numero_empleado ??
            e?.informacion_personal?.numero_empleado ??
            e?.informacion_laboral?.numero_empleado;
          return String(candidateId ?? e?.id) === String(idStr);
        });
        if (!raw) throw new Error("Empleado no encontrado en datos_empleados.json");

        setEmpleado(normalizePerfilEmpleado(raw));
      } catch (err) {
        console.error("Error cargando empleado:", err);
        setEmpleado(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ===== 2) Load attendance for employee ===== */
  useEffect(() => {
    if (!empleado || !employeeAttendanceKey) return;
    (async () => {
      try {
        const res = await fetch("./attendance_2025.json", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar attendance_2025.json");
        const json = await res.json();
        setAttendanceData(json);
        const yearData = json[employeeAttendanceKey]?.[WORK_YEAR];
        if (!yearData) {
          setMonths([]);
          setSelectedMonth("");
          setAsistencia([]);
          return;
        }

        const monthKeys = Object.keys(yearData);
        setMonths(monthKeys);

        const currentMonthName = new Intl.DateTimeFormat("es-ES", { month: "long" })
          .format(new Date())
          .toLowerCase();
        const matchedMonth = monthKeys.find((m) => m.toLowerCase() === currentMonthName);
        const defaultMonth = matchedMonth || monthKeys[0];

        setSelectedMonth(defaultMonth);
        setAsistencia(yearData[defaultMonth] || []);
      } catch (err) {
        console.error("Error cargando asistencia:", err);
        setAttendanceData(null);
        setMonths([]);
        setSelectedMonth("");
        setAsistencia([]);
      }
    })();
  }, [empleado, employeeAttendanceKey]);

  // Al cambiar el mes
  useEffect(() => {
    if (!empleado || !selectedMonth || !attendanceData || !employeeAttendanceKey) return;
    const yearData = attendanceData[employeeAttendanceKey]?.[WORK_YEAR];
    if (yearData && yearData[selectedMonth]) {
      setAsistencia(yearData[selectedMonth]);
    } else {
      setAsistencia([]);
    }
  }, [selectedMonth, empleado, attendanceData, employeeAttendanceKey]);

  /* ===== 3) Summary numbers (hours & efficiency) ===== */
  const workMetrics = useMemo(() => {
    if (!selectedMonth) {
      return {
        expectedDays: 0,
        expectedHours: 0,
        workedDays: 0,
        actualHours: 0,
        remainingHours: 0,
        differenceHours: 0,
        medianHours: null as number | null,
        medianGap: null as number | null,
        efficiencyPct: 0,
        teamAvgEfficiencyPct: null as number | null,
        efficiencyDelta: null as number | null,
        classification: "Sin datos" as "Excelente" | "Satisfactorio" | "Por mejorar" | "Sin datos",
      };
    }

    const monthIndex = MONTHS.indexOf(selectedMonth);
    const { expectedDays, expectedHours } = computeExpectedWorkload(WORK_YEAR, monthIndex);

    let actualHours = 0;
    let workedDays = 0;
    asistencia.forEach((record) => {
      const hours = calculateRecordHours(record);
      if (hours > 0) workedDays += 1;
      actualHours += hours;
    });
    actualHours = Number(actualHours.toFixed(2));
    const remainingHours = Math.max(expectedHours - actualHours, 0);
    const differenceHours = Number((actualHours - expectedHours).toFixed(2));

    const efficiencyPct =
      expectedHours > 0 ? Math.round((actualHours / expectedHours) * 1000) / 10 : 0;

    const medianHours = computeMedianHoursForMonth(attendanceData, selectedMonth);
    const medianGap =
      medianHours === null ? null : Number((actualHours - medianHours).toFixed(2));

    const teamAvgEfficiencyPct = computeTeamAvgEfficiencyForMonth(attendanceData, selectedMonth);
    const efficiencyDelta =
      teamAvgEfficiencyPct === null
        ? null
        : Number((efficiencyPct - teamAvgEfficiencyPct).toFixed(1));

    let classification: "Excelente" | "Satisfactorio" | "Por mejorar" | "Sin datos" = "Sin datos";
    if (teamAvgEfficiencyPct !== null) {
      if (efficiencyPct >= teamAvgEfficiencyPct + 5) classification = "Excelente";
      else if (efficiencyPct < teamAvgEfficiencyPct - 10) classification = "Por mejorar";
      else classification = "Satisfactorio";
    }

    return {
      expectedDays,
      expectedHours,
      workedDays,
      actualHours,
      remainingHours,
      differenceHours,
      medianHours,
      medianGap,
      efficiencyPct,
      teamAvgEfficiencyPct,
      efficiencyDelta,
      classification,
    };
  }, [selectedMonth, asistencia, attendanceData]);

  const justificationOptions = useMemo(
    () => ["Emergencia", "Permiso Reglamentario", "Enfermedad", "Otro"],
    []
  );
  const currentMonthName = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", { month: "long" })
        .format(new Date())
        .toLowerCase(),
    []
  );
  const isEditableSelectedMonth = Boolean(
    selectedMonth && selectedMonth.toLowerCase() === currentMonthName
  );

  const hoursChartSegments = useMemo(() => {
    const { expectedHours, actualHours } = workMetrics;
    const remaining = Math.max(expectedHours - actualHours, 0);
    return [
      {
        label: "Horas trabajadas",
        value: Number(Math.min(actualHours, expectedHours).toFixed(2)),
        color: "#004080",
      },
      {
        label: "Horas pendientes",
        value: Number(remaining.toFixed(2)),
        color: "#F97316",
      },
    ];
  }, [workMetrics]);

  const efficiencyDeltaClass =
    workMetrics.efficiencyDelta !== null && workMetrics.efficiencyDelta >= 0
      ? "text-green-700"
      : "text-red-600";

  /* ===== 4) Doughnut chart (hours worked vs pending) ===== */
  const renderAttendanceChart = useCallback(() => {
    const canvas = pieRef.current;
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const data = {
      labels: hoursChartSegments.map((segment) => segment.label),
      datasets: [
        {
          label: "Distribución de horas",
          data: hoursChartSegments.map((segment) => segment.value),
          backgroundColor: hoursChartSegments.map((segment) => segment.color),
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1800,
        easing: "easeInOutQuad",
        animateRotate: true,
        animateScale: true,
      },
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 16, font: { size: 13 } } },
        title: { display: false },
        datalabels: {
          color: "#fff",
          font: { weight: "bold", size: 13 },
          formatter: (value: number) => (value > 0 ? `${value.toFixed(1)}h` : ""),
        },
      },
    };

    if (pieInstance.current) {
      pieInstance.current.data = data as any;
      pieInstance.current.options = options as any;
      pieInstance.current.update();
    } else {
      pieInstance.current = new Chart(ctx, {
        type: "doughnut",
        data,
        options: options as any,
        plugins: [ChartDataLabels],
      });
    }
  }, [hoursChartSegments]);

  useEffect(() => {
    if (activeTab === "asistencia") {
      renderAttendanceChart();
    } else if (pieInstance.current) {
      pieInstance.current.destroy();
      pieInstance.current = null;
    }
  }, [activeTab, renderAttendanceChart]);

  useEffect(() => {
    return () => {
      if (pieInstance.current) {
        pieInstance.current.destroy();
        pieInstance.current = null;
      }
    };
  }, []);

  const startExplanationEdit = useCallback(
    (record: AttendanceRecord, index: number) => {
      if (!isEditableSelectedMonth) return;
      const existing = record.explicacion?.trim() ?? "";
      const matchedReason =
        justificationOptions.find(
          (opt) => existing.toLowerCase() === opt.toLowerCase() || existing.toLowerCase().startsWith(`${opt.toLowerCase()}:`)
        ) || "Otro";
      let detail = "";
      if (matchedReason === "Otro") {
        detail = existing;
      } else if (existing) {
        detail = existing.slice(matchedReason.length).replace(/^:\s*/, "");
      }
      setEditingExplanation({
        index,
        reason: matchedReason,
        detail,
      });
    },
    [isEditableSelectedMonth, justificationOptions]
  );

  const updateEditingExplanation = useCallback(
    (fields: Partial<{ reason: string; detail: string }>) => {
      setEditingExplanation((prev) => (prev ? { ...prev, ...fields } : prev));
    },
    []
  );

  const saveExplanation = useCallback(() => {
    if (!editingExplanation) return;
    const { index, reason, detail } = editingExplanation;
    const trimmedDetail = detail.trim();
    const nextValue =
      reason === "Otro"
        ? trimmedDetail || "Otro"
        : trimmedDetail
        ? `${reason}: ${trimmedDetail}`
        : reason;
    setAsistencia((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, explicacion: nextValue } : entry))
    );
    setEditingExplanation(null);
  }, [editingExplanation]);

  const cancelExplanation = useCallback(() => setEditingExplanation(null), []);

  useEffect(() => {
    setEditingExplanation(null);
  }, [selectedMonth, activeTab]);

  /* ================= NÓMINAS (OFFLINE) ================= */
  const YEAR = 2025;
  const [nominas, setNominas] = useState<any[]>([]);
  const [filteredNominas, setFilteredNominas] = useState<any[]>([]);
  const [selectedNominaMonth, setSelectedNominaMonth] = useState("todos");
  const [totalPagado, setTotalPagado] = useState(0);
  const [totalPagadoPct, setTotalPagadoPct] = useState(0);
  const [expandedNomina, setExpandedNomina] = useState<string | null>(null);

  useEffect(() => {
    if (!empleado) return;

    async function loadNominas() {
      try {
        const res = await fetch("./NOMINAS.json", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar NOMINAS.json");
        const data = await res.json();

        const myNominas = (Array.isArray(data) ? data : Object.values(data || {})).filter(
          (n: any) =>
            (n.nombre || "").toLowerCase().trim() === (empleado.nombre || "").toLowerCase().trim() &&
            (n.apellidos || "").toLowerCase().trim() === (empleado.apellidos || "").toLowerCase().trim()
        );

        setNominas(myNominas);
        setFilteredNominas(myNominas);

        const totalPaid = myNominas
          .filter((n: any) => n.pagado)
          .reduce((acc: number, n: any) => acc + (n.neto || 0), 0);
        setTotalPagado(totalPaid);

        const totalAnnual = myNominas.reduce((acc: number, n: any) => acc + (n.neto || 0), 0);
        const pct = totalAnnual > 0 ? (totalPaid / totalAnnual) * 100 : 0;
        setTotalPagadoPct(pct);

        console.log(`✅ Nóminas cargadas: ${myNominas.length}`);
      } catch (err) {
        console.error("Error cargando nóminas:", err);
        setNominas([]);
        setFilteredNominas([]);
        setTotalPagado(0);
        setTotalPagadoPct(0);
      }
    }

    loadNominas();
  }, [empleado]);

  useEffect(() => {
    if (selectedNominaMonth === "todos") {
      setFilteredNominas(nominas);
    } else {
      const filtered = nominas.filter((n) => n.periodo === selectedNominaMonth);
      setFilteredNominas(filtered);
    }
  }, [selectedNominaMonth, nominas]);

  useEffect(() => {
    return () => {
      if (generatedPdfUrlRef.current) {
        URL.revokeObjectURL(generatedPdfUrlRef.current);
      }
    };
  }, []);

  /* ===== Common actions ===== */
  const fotoSrc = useMemo(() => normalizeFotoPath(empleado ?? undefined), [empleado]);
  const handleLogout = () => {
    localStorage.removeItem("currentEmployeeId");
    onLogout();
  };

  const openPdf = (url: string, title: string, options?: { generated?: boolean }) => {
    if (options?.generated) {
      if (generatedPdfUrlRef.current) {
        URL.revokeObjectURL(generatedPdfUrlRef.current);
      }
      generatedPdfUrlRef.current = url;
    }
    setPdfTitle(title);
    setPdfUrl(url);
    setPdfOpen(true);
  };

  const closePdfModal = () => {
    if (generatedPdfUrlRef.current) {
      URL.revokeObjectURL(generatedPdfUrlRef.current);
      generatedPdfUrlRef.current = null;
    }
    setPdfOpen(false);
    setPdfUrl(null);
  };

  const handleNominaPreview = (record: any) => {
    const doc = buildNominaPdf({
      ...record,
      nombre: record.nombre || empleado?.nombre || "",
      apellidos: record.apellidos || empleado?.apellidos || "",
      employee_role: record.employee_role || empleado?.puesto || record.puesto,
      puesto: record.puesto || empleado?.puesto || record.employee_role,
    });
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    openPdf(url, `Nómina ${record.periodo}`, { generated: true });
  };

  /* ===== Render ===== */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <HourglassIcon className="w-16 h-16 text-[#004080] animate-spin" />
        <p className="mt-3 font-semibold text-lg text-[#004080]">Cargando Perfil...</p>
      </div>
    );
  }

  if (!empleado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center space-y-4 p-6">
        <LockIcon className="w-16 h-16 text-[#004080]" />
        <p className="text-xl font-medium text-gray-700">
          No ha iniciado sesión o el ID no es válido.
        </p>
        <button
          onClick={handleLogout}
          className="bg-[#004080] text-white px-8 py-3 rounded-xl shadow-lg hover:bg-blue-800 transition"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div id="profile-content-wrapper" className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header Card */}
      <div className={`${card} p-8 mb-8 flex flex-col md:flex-row items-center md:items-start`}>
        <div className="mx-auto md:mx-0 w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#004080]/50 overflow-hidden shrink-0 shadow-xl">
          <img
            src={fotoSrc}
            alt="Foto de Perfil"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://placehold.co/160x160/004080/ffffff?text=PROFILE";
            }}
          />
        </div>

        <div className="text-center md:text-left mt-4 md:mt-0 md:ml-6 flex-grow">
          <h2 className="text-3xl font-extrabold text-[#004080] leading-snug">
            {empleado.nombre} {empleado.apellidos || ""}
          </h2>
          <p className="text-xl text-gray-700 font-medium mt-1">{empleado.puesto}</p>
          <p className="text-md text-gray-500">
            {empleado.departamento || "Departamento no asignado"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Número de empleado: <span className="font-semibold text-gray-700">{empleado.numero_empleado ?? "—"}</span>
          </p>
        </div>

        <div className="mt-4 md:mt-0 md:self-start">
          <button
            onClick={handleLogout}
            className="text-base px-5 py-2 bg-red-100 text-red-7EOF
00 rounded-lg border border-red-300 hover:bg-red-200 transition font-medium shadow-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-start overflow-x-auto border-b-2 border-gray-200 mb-6 bg-white/70 rounded-t-lg">
        <button className={tabStyle(activeTab === "personales")} onClick={() => setActiveTab("personales")}>
          Datos Personales
        </button>
        <button className={tabStyle(activeTab === "asistencia")} onClick={() => setActiveTab("asistencia")}>
          Mi Asistencia
        </button>
        <button className={tabStyle(activeTab === "nomina")} onClick={() => setActiveTab("nomina")}>
          Mis Nóminas
        </button>
        <button className={tabStyle(activeTab === "puesto")} onClick={() => setActiveTab("puesto")}>
          Mi Puesto
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* ===================== DATOS PERSONALES (expandable cards) ===================== */}
        {activeTab === "personales" && (
          <div className="space-y-6">
            {/* === 1️⃣ Información Personal === */}
            <div className={`${card} p-6`}>
              <button
                onClick={() => toggleSection("personal")}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-2xl font-bold text-[#004080]">Información Personal</h3>
                {sectionsOpen.personal ? (
                  <ChevronUpIcon className="w-5 h-5 text-[#004080]" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-[#004080]" />
                )}
              </button>

              <div
                className={`transition-all duration-500 overflow-hidden ${
                  sectionsOpen.personal ? "max-h-[1800px] mt-5" : "max-h-0"
                }`}
              >
                {sectionsOpen.personal && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {editingSections.personal ? (
                        <>
                          <FieldWrapper label="Nombre">
                            <input
                              className={inputClasses}
                              value={personalForm.nombre}
                              onChange={(e) => handlePersonalFormChange("nombre", e.target.value)}
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Apellidos">
                            <input
                              className={inputClasses}
                              value={personalForm.apellidos}
                              onChange={(e) =>
                                handlePersonalFormChange("apellidos", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Sexo">
                            <input
                              className={inputClasses}
                              value={personalForm.sexo}
                              onChange={(e) => handlePersonalFormChange("sexo", e.target.value)}
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Fecha de nacimiento">
                            <input
                              type="date"
                              className={inputClasses}
                              value={personalForm.fecha_nacimiento}
                              onChange={(e) =>
                                handlePersonalFormChange("fecha_nacimiento", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Nacionalidad">
                            <input
                              className={inputClasses}
                              value={personalForm.nacionalidad}
                              onChange={(e) =>
                                handlePersonalFormChange("nacionalidad", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Lugar de nacimiento">
                            <input
                              className={inputClasses}
                              value={personalForm.lugar_nacimiento}
                              onChange={(e) =>
                                handlePersonalFormChange("lugar_nacimiento", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Estado civil">
                            <input
                              className={inputClasses}
                              value={personalForm.estado_civil}
                              onChange={(e) =>
                                handlePersonalFormChange("estado_civil", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Teléfono personal">
                            <input
                              className={inputClasses}
                              value={personalForm.telefono_personal}
                              onChange={(e) =>
                                handlePersonalFormChange("telefono_personal", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Email personal">
                            <input
                              type="email"
                              className={inputClasses}
                              value={personalForm.email_personal}
                              onChange={(e) =>
                                handlePersonalFormChange("email_personal", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Email oficial">
                            <input
                              type="email"
                              className={inputClasses}
                              value={personalForm.correo}
                              onChange={(e) => handlePersonalFormChange("correo", e.target.value)}
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Teléfono oficial">
                            <input
                              className={inputClasses}
                              value={personalForm.telefono}
                              onChange={(e) => handlePersonalFormChange("telefono", e.target.value)}
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Dirección actual" className="sm:col-span-2 lg:col-span-3">
                            <input
                              className={inputClasses}
                              value={personalForm.direccion_personal}
                              onChange={(e) =>
                                handlePersonalFormChange("direccion_personal", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Num. de Identificación Personal">
                            <input
                              className={inputClasses}
                              value={personalForm.numero_identificacion}
                              onChange={(e) =>
                                handlePersonalFormChange("numero_identificacion", e.target.value)
                              }
                            />
                          </FieldWrapper>
                        </>
                      ) : (
                        <>
                          <Detail label="Nombre" value={empleado.nombre} />
                          <Detail label="Apellidos" value={empleado.apellidos} />
                          <Detail label="Sexo" value={empleado.sexo} />
                          <Detail label="Fecha de nacimiento" value={empleado.fecha_nacimiento} />
                          {(() => {
                            const edad = calcularEdad(empleado.fecha_nacimiento);
                            return (
                              <Detail
                                label="Edad"
                                value={edad !== null ? `${edad} años` : "—"}
                              />
                            );
                          })()}
                          <Detail label="Nacionalidad" value={empleado.nacionalidad} />
                          <Detail label="Lugar de nacimiento" value={empleado.lugar_nacimiento} />
                          <Detail label="Estado civil" value={empleado.estado_civil} />
                          <Detail label="Teléfono personal" value={empleado.telefono_personal} />
                          <Detail label="Email personal" value={empleado.email_personal} />
                          <Detail label="Email oficial" value={empleado.correo} />
                          <Detail label="Teléfono oficial" value={empleado.telefono} />
                          <Detail
                            label="Dirección actual"
                            value={empleado.direccion_personal || empleado.direccion}
                          />
                          <Detail
                            label="Num. de Identificación Personal"
                            value={empleado.numero_identificacion}
                          />
                        </>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      {sectionErrors.personal && (
                        <p className="text-sm text-red-600 font-semibold">
                          {sectionErrors.personal}
                        </p>
                      )}
                      {sectionSuccess.personal && (
                        <p className="text-sm text-green-700 font-semibold">
                          Cambios guardados correctamente.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {editingSections.personal ? (
                          <>
                            <button
                              onClick={() => cancelSectionEditing("personal")}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                              disabled={savingSections.personal}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={savePersonalSection}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                              disabled={savingSections.personal}
                            >
                              {savingSections.personal ? "Guardando..." : "Guardar cambios"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => enterSectionEditing("personal")}
                            className="px-4 py-2 border border-[#004080] text-[#004080] rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                          >
                            Editar información
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* === 2️⃣ Información Familiar === */}
            <div className={`${card} p-6`}>
              <button
                onClick={() => toggleSection("familiar")}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-2xl font-bold text-[#004080]">Información Familiar</h3>
                {sectionsOpen.familiar ? (
                  <ChevronUpIcon className="w-5 h-5 text-[#004080]" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-[#004080]" />
                )}
              </button>

              <div
                className={`transition-all duration-500 overflow-hidden ${
                  sectionsOpen.familiar ? "max-h-[1000px] mt-5" : "max-h-0"
                }`}
              >
                {sectionsOpen.familiar && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {editingSections.familiar ? (
                        <>
                          <FieldWrapper label="Nombre de contacto de emergencia">
                            <input
                              className={inputClasses}
                              value={familiarForm.contacto_emergencia}
                              onChange={(e) =>
                                handleFamiliarFormChange("contacto_emergencia", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Teléfono de contacto de emergencia">
                            <input
                              className={inputClasses}
                              value={familiarForm.contacto_emergencia_telefono}
                              onChange={(e) =>
                                handleFamiliarFormChange(
                                  "contacto_emergencia_telefono",
                                  e.target.value
                                )
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Número de dependientes">
                            <input
                              type="number"
                              min={0}
                              className={inputClasses}
                              value={familiarForm.numero_dependientes}
                              onChange={(e) =>
                                handleFamiliarFormChange("numero_dependientes", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Grupo sanguíneo">
                            <input
                              className={inputClasses}
                              value={familiarForm.grupo_sanguineo}
                              onChange={(e) =>
                                handleFamiliarFormChange("grupo_sanguineo", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Seguro médico">
                            <input
                              className={inputClasses}
                              value={familiarForm.seguro_medico}
                              onChange={(e) =>
                                handleFamiliarFormChange("seguro_medico", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="No. de póliza">
                            <input
                              className={inputClasses}
                              value={familiarForm.numero_poliza}
                              onChange={(e) =>
                                handleFamiliarFormChange("numero_poliza", e.target.value)
                              }
                            />
                          </FieldWrapper>
                        </>
                      ) : (
                        <>
                          <Detail
                            label="Nombre de contacto de emergencia"
                            value={empleado.contacto_emergencia}
                          />
                          <Detail
                            label="Teléfono de contacto de emergencia"
                            value={empleado.contacto_emergencia_telefono}
                          />
                          <Detail label="Número de dependientes" value={empleado.numero_dependientes} />
                          <Detail label="Grupo sanguíneo" value={empleado.grupo_sanguineo} />
                          <Detail label="Seguro médico" value={empleado.seguro_medico} />
                          <Detail label="No. de póliza" value={empleado.numero_poliza} />
                        </>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      {sectionErrors.familiar && (
                        <p className="text-sm text-red-600 font-semibold">
                          {sectionErrors.familiar}
                        </p>
                      )}
                      {sectionSuccess.familiar && (
                        <p className="text-sm text-green-700 font-semibold">
                          Cambios guardados correctamente.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {editingSections.familiar ? (
                          <>
                            <button
                              onClick={() => cancelSectionEditing("familiar")}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                              disabled={savingSections.familiar}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={saveFamiliarSection}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                              disabled={savingSections.familiar}
                            >
                              {savingSections.familiar ? "Guardando..." : "Guardar cambios"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => enterSectionEditing("familiar")}
                            className="px-4 py-2 border border-[#004080] text-[#004080] rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                          >
                            Editar información
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* === 3️⃣ Información Bancaria === */}
            <div className={`${card} p-6`}>
              <button
                onClick={() => toggleSection("bancaria")}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-2xl font-bold text-[#004080]">Información Bancaria</h3>
                {sectionsOpen.bancaria ? (
                  <ChevronUpIcon className="w-5 h-5 text-[#004080]" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-[#004080]" />
                )}
              </button>

              <div
                className={`transition-all duration-500 overflow-hidden ${
                  sectionsOpen.bancaria ? "max-h-[800px] mt-5" : "max-h-0"
                }`}
              >
                {sectionsOpen.bancaria && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {editingSections.bancaria ? (
                        <>
                          <FieldWrapper label="Nombre del banco">
                            <input
                              className={inputClasses}
                              value={bancariaForm.banco}
                              onChange={(e) => handleBancariaFormChange("banco", e.target.value)}
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Tipo de cuenta">
                            <input
                              className={inputClasses}
                              value={bancariaForm.tipo_cuenta}
                              onChange={(e) =>
                                handleBancariaFormChange("tipo_cuenta", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="SWIFT">
                            <input
                              className={inputClasses}
                              value={bancariaForm.codigo_swift}
                              onChange={(e) =>
                                handleBancariaFormChange("codigo_swift", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Salario base" className="sm:col-span-2 lg:col-span-1">
                            <input
                              type="number"
                              className={inputClasses}
                              value={bancariaForm.salario_base}
                              onChange={(e) =>
                                handleBancariaFormChange("salario_base", e.target.value)
                              }
                            />
                          </FieldWrapper>
                        </>
                      ) : (
                        <>
                          <Detail label="Nombre del banco" value={empleado.banco} />
                          <Detail label="Tipo de cuenta" value={empleado.tipo_cuenta} />
                          <Detail label="SWIFT" value={empleado.codigo_swift} />
                          <Detail
                            label="Salario base"
                            value={
                              typeof empleado.salario_base === "number"
                                ? `${empleado.salario_base.toLocaleString("es-GQ")} CFA`
                                : empleado.salario_base
                            }
                          />
                        </>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      {sectionErrors.bancaria && (
                        <p className="text-sm text-red-600 font-semibold">
                          {sectionErrors.bancaria}
                        </p>
                      )}
                      {sectionSuccess.bancaria && (
                        <p className="text-sm text-green-700 font-semibold">
                          Cambios guardados correctamente.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {editingSections.bancaria ? (
                          <>
                            <button
                              onClick={() => cancelSectionEditing("bancaria")}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                              disabled={savingSections.bancaria}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={saveBancariaSection}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                              disabled={savingSections.bancaria}
                            >
                              {savingSections.bancaria ? "Guardando..." : "Guardar cambios"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => enterSectionEditing("bancaria")}
                            className="px-4 py-2 border border-[#004080] text-[#004080] rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                          >
                            Editar información
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* === 4️⃣ Datos Profesionales === */}
            <div className={`${card} p-6`}>
              <button
                onClick={() => toggleSection("carrera")}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-2xl font-bold text-[#004080]">Datos Profesionales</h3>
                {sectionsOpen.carrera ? (
                  <ChevronUpIcon className="w-5 h-5 text-[#004080]" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-[#004080]" />
                )}
              </button>

              <div
                className={`transition-all duration-500 overflow-hidden ${
                  sectionsOpen.carrera ? "max-h-[2000px] mt-5" : "max-h-0"
                }`}
              >
                {sectionsOpen.carrera && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {editingSections.carrera ? (
                        <>
                          <FieldWrapper label="Puesto actual">
                            <input
                              className={inputClasses}
                              value={carreraForm.puesto}
                              onChange={(e) => handleCarreraFormChange("puesto", e.target.value)}
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Departamento / Área">
                            <input
                              className={inputClasses}
                              value={carreraForm.departamento}
                              onChange={(e) =>
                                handleCarreraFormChange("departamento", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Supervisor directo">
                            <input
                              className={inputClasses}
                              value={carreraForm.supervisor_directo}
                              onChange={(e) =>
                                handleCarreraFormChange("supervisor_directo", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Fecha de ingreso a Elebi">
                            <input
                              type="date"
                              className={inputClasses}
                              value={carreraForm.fecha_ingreso}
                              onChange={(e) =>
                                handleCarreraFormChange("fecha_ingreso", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Tipo de contrato">
                            <input
                              className={inputClasses}
                              value={carreraForm.tipo_contrato}
                              onChange={(e) =>
                                handleCarreraFormChange("tipo_contrato", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Modalidad de trabajo">
                            <input
                              className={inputClasses}
                              value={carreraForm.modalidad_trabajo}
                              onChange={(e) =>
                                handleCarreraFormChange("modalidad_trabajo", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Habilidades técnicas principales">
                            <input
                              className={inputClasses}
                              value={carreraForm.habilidades_tecnicas}
                              onChange={(e) =>
                                handleCarreraFormChange("habilidades_tecnicas", e.target.value)
                              }
                              placeholder="Separar por comas"
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Habilidades blandas relevantes">
                            <input
                              className={inputClasses}
                              value={carreraForm.habilidades_blandas}
                              onChange={(e) =>
                                handleCarreraFormChange("habilidades_blandas", e.target.value)
                              }
                              placeholder="Separar por comas"
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Proyectos destacados">
                            <input
                              className={inputClasses}
                              value={carreraForm.proyectos_destacados}
                              onChange={(e) =>
                                handleCarreraFormChange("proyectos_destacados", e.target.value)
                              }
                              placeholder="Separar por comas"
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Descripción del puesto" className="sm:col-span-2 lg:col-span-3">
                            <textarea
                              className={`${inputClasses} min-h-[90px]`}
                              value={carreraForm.descripcion_puesto}
                              onChange={(e) =>
                                handleCarreraFormChange("descripcion_puesto", e.target.value)
                              }
                            />
                          </FieldWrapper>
                          <FieldWrapper
                            label="Última evaluación / reconocimiento"
                            className="sm:col-span-2 lg:col-span-3"
                          >
                            <textarea
                              className={`${inputClasses} min-h-[90px]`}
                              value={carreraForm.ultima_evaluacion}
                              onChange={(e) =>
                                handleCarreraFormChange("ultima_evaluacion", e.target.value)
                              }
                            />
                          </FieldWrapper>
                        </>
                      ) : (
                        <>
                          <Detail label="Puesto actual" value={empleado.puesto} />
                          <Detail label="Departamento / Área" value={empleado.departamento} />
                          <Detail label="Supervisor directo" value={empleado.supervisor_directo} />
                          <Detail label="Fecha de ingreso a Elebi" value={empleado.fecha_ingreso} />
                          <Detail label="Tipo de contrato" value={empleado.tipo_contrato} />
                          <Detail label="Modalidad de trabajo" value={empleado.modalidad_trabajo} />
                          <Detail
                            label="Habilidades técnicas principales"
                            value={formatList(empleado.habilidades_tecnicas)}
                          />
                          <Detail
                            label="Habilidades blandas relevantes"
                            value={formatList(empleado.habilidades_blandas)}
                          />
                          <Detail
                            label="Proyectos destacados"
                            value={formatList(empleado.proyectos_destacados)}
                          />
                          <Detail
                            label="Última evaluación de desempeño / reconocimiento"
                            value={empleado.ultima_evaluacion}
                            fullWidth
                          />
                        </>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      {sectionErrors.carrera && (
                        <p className="text-sm text-red-600 font-semibold">
                          {sectionErrors.carrera}
                        </p>
                      )}
                      {sectionSuccess.carrera && (
                        <p className="text-sm text-green-700 font-semibold">
                          Cambios guardados correctamente.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {editingSections.carrera ? (
                          <>
                            <button
                              onClick={() => cancelSectionEditing("carrera")}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                              disabled={savingSections.carrera}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={saveCarreraSection}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                              disabled={savingSections.carrera}
                            >
                              {savingSections.carrera ? "Guardando..." : "Guardar cambios"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => enterSectionEditing("carrera")}
                            className="px-4 py-2 border border-[#004080] text-[#004080] rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                          >
                            Editar información
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* === 5️⃣ Documentación === */}
            <div className={`${card} p-6`}>
              <button
                onClick={() => toggleSection("documentacion")}
                className="w-full flex items-center justify-between"
              >
                <h3 className="text-2xl font-bold text-[#004080]">Documentación</h3>
                {sectionsOpen.documentacion ? (
                  <ChevronUpIcon className="w-5 h-5 text-[#004080]" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-[#004080]" />
                )}
              </button>

              <div
                className={`transition-all duration-500 overflow-hidden ${
                  sectionsOpen.documentacion ? "max-h-[1400px] mt-5" : "max-h-0"
                }`}
              >
                {sectionsOpen.documentacion && (
                  <>
                    {editingSections.documentacion ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldWrapper label="Contrato Actual (PDF)">
                          <input
                            className={inputClasses}
                            value={documentosForm.contrato_actual_pdf}
                            onChange={(e) =>
                              handleDocumentosFormChange("contrato_actual_pdf", e.target.value)
                            }
                          />
                        </FieldWrapper>
                        <FieldWrapper label="DIP (PDF)">
                          <input
                            className={inputClasses}
                            value={documentosForm.dip_pdf}
                            onChange={(e) => handleDocumentosFormChange("dip_pdf", e.target.value)}
                          />
                        </FieldWrapper>
                        <FieldWrapper label="Curriculum (PDF)">
                          <input
                            className={inputClasses}
                            value={documentosForm.curriculum_pdf}
                            onChange={(e) =>
                              handleDocumentosFormChange("curriculum_pdf", e.target.value)
                            }
                          />
                        </FieldWrapper>
                        <FieldWrapper label="Evaluación Anual (PDF)">
                          <input
                            className={inputClasses}
                            value={documentosForm.evaluacion_anual_pdf}
                            onChange={(e) =>
                              handleDocumentosFormChange("evaluacion_anual_pdf", e.target.value)
                            }
                          />
                        </FieldWrapper>
                        <FieldWrapper label="ID Empleado Elebi (PDF)">
                          <input
                            className={inputClasses}
                            value={documentosForm.id_empleado_elebi_pdf}
                            onChange={(e) =>
                              handleDocumentosFormChange("id_empleado_elebi_pdf", e.target.value)
                            }
                          />
                        </FieldWrapper>
                      </div>
                    ) : (
                      (() => {
                        const docItems = [
                          { key: "contrato_actual_pdf", label: "Contrato Actual" },
                          { key: "dip_pdf", label: "DIP" },
                          { key: "curriculum_pdf", label: "Curriculum" },
                          { key: "evaluacion_anual_pdf", label: "Evaluación Anual" },
                          { key: "id_empleado_elebi_pdf", label: "ID Empleado Elebi" },
                        ];
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {docItems.map((item) => (
                              <DocumentPreviewCard
                                key={item.key}
                                label={item.label}
                                url={normalizeDocPath((empleado as any)?.[item.key])}
                                onOpen={(url, title) => openPdf(url, title)}
                              />
                            ))}
                          </div>
                        );
                      })()
                    )}
                    <div className="mt-4 space-y-2">
                      {sectionErrors.documentacion && (
                        <p className="text-sm text-red-600 font-semibold">
                          {sectionErrors.documentacion}
                        </p>
                      )}
                      {sectionSuccess.documentacion && (
                        <p className="text-sm text-green-700 font-semibold">
                          Cambios guardados correctamente.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        {editingSections.documentacion ? (
                          <>
                            <button
                              onClick={() => cancelSectionEditing("documentacion")}
                              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                              disabled={savingSections.documentacion}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={saveDocumentosSection}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                              disabled={savingSections.documentacion}
                            >
                              {savingSections.documentacion ? "Guardando..." : "Guardar cambios"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => enterSectionEditing("documentacion")}
                            className="px-4 py-2 border border-[#004080] text-[#004080] rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                          >
                            Editar documentos
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== ASISTENCIA ===================== */}
        {activeTab === "asistencia" && (
          <div className={`${card} p-6 space-y-8`}>
            {/* Selector Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
              <h4 className="text-lg font-bold text-[#004080] mb-3">Seleccionar Mes</h4>
              <select
                id="monthSelect"
                className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-xs text-center font-medium text-gray-700 focus:ring-[#004080] focus:border-[#004080]"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {titleCaseEs(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Summary Table Card */}
              <div className="bg-white border border-gray-200 rounded-xl shadow p-5 md:col-span-2">
                <h4 className="text-lg font-bold text-[#004080] mb-3 text-center">
                  Resumen del Mes {selectedMonthLabel && `— ${selectedMonthLabel}`}
                </h4>
                <table className="min-w-full text-sm text-left">
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 font-semibold text-gray-700">Horas esperadas</td>
                      <td className="py-2 text-right font-bold text-[#004080]">
                        {workMetrics.expectedHours.toFixed(1)} h
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-semibold text-gray-700">Horas trabajadas</td>
                      <td className="py-2 text-right font-bold">
                        {workMetrics.actualHours.toFixed(1)} h
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-semibold text-gray-700">% Eficiencia del empleado</td>
                      <td className="py-2 text-right font-bold">{workMetrics.efficiencyPct}%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-semibold text-gray-700">% Media de la empresa</td>
                      <td className="py-2 text-right font-bold">
                        {workMetrics.teamAvgEfficiencyPct ?? "—"}
                        {workMetrics.teamAvgEfficiencyPct !== null ? "%" : ""}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-semibold text-gray-700">Diferencia vs media</td>
                      <td className={`py-2 text-right font-bold ${efficiencyDeltaClass}`}>
                        {workMetrics.efficiencyDelta !== null
                          ? `${workMetrics.efficiencyDelta > 0 ? "+" : ""}${workMetrics.efficiencyDelta.toFixed(
                              1
                            )}%`
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 font-semibold text-gray-700">Clasificación</td>
                      <td className="py-2 text-right font-bold">{workMetrics.classification}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mt-3 text-xs text-gray-600 italic">
                  Jornada estándar: L–J 09:00–17:00 (8h), Viernes 09:00–14:00 (5h).
                </div>
              </div>

              {/* Pie Chart Card */}
              <div className="bg-white border border-gray-200 rounded-xl shadow p-5 flex flex-col items-center">
                <h4 className="text-lg font-bold text-[#004080] mb-2 text-center">
                  Horas del empleado — {selectedMonthLabel || "Mes"}
                </h4>
                <div className="w-full max-w-[240px] h-[240px] flex items-center justify-center">
                  <canvas ref={pieRef} />
                </div>
                <div className="mt-3 text-center text-sm text-gray-600">
                  {workMetrics.efficiencyPct
                    ? (
                        <>
                          Eficiencia:&nbsp;
                          <span className="font-semibold">{workMetrics.efficiencyPct}%</span>
                          {workMetrics.teamAvgEfficiencyPct !== null && (
                            <>
                              {" · "}Media empresa:&nbsp;
                              <span className="font-semibold">{workMetrics.teamAvgEfficiencyPct}%</span>
                            </>
                          )}
                        </>
                      )
                    : "Sin horas registradas"}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-inner">
              <table className="min-w-full text-left text-base">
                <thead>
                  <tr className="bg-[#004080] text-white sticky top-0">
                    <th className="p-4 w-2/12">Día</th>
                    <th className="p-4 w-2/12">Entrada</th>
                    <th className="p-4 w-2/12">Salida</th>
                    <th className="p-4 w-1/12 text-center">Horas</th>
                    <th className="p-4 w-2/12">Estado</th>
                    <th className="p-4 w-3/12">Explicación</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencia.length ? (
                    asistencia.map((r, i) => {
                      const dayLabel = getWeekdayLabel(r.day, currentMonthIndex);
                      const expectedHoursForDay = getExpectedHoursForDay(r.day, currentMonthIndex);
                      const statusLabel = getStatusForRecord(r, expectedHoursForDay);
                      const hours = calculateRecordHours(r);
                      const rowKey = `attendance-${r.day}-${i}`;
                      const explanationAllowed =
                        statusLabel !== "Jornada completa" && isEditableSelectedMonth;
                      const rowClass = statusLabel !== "Jornada completa" ? "text-red-600 font-semibold" : "";
                      return (
                        <tr
                          key={rowKey}
                          className={`border-b ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 ${rowClass}`}
                        >
                          <td className="p-3 font-bold text-gray-800">{dayLabel}</td>
                          <td className="p-3">
                            {formatTimeDisplay(r.hora_entrada) || (
                              <span className="text-red-500 font-medium">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            {formatTimeDisplay(r.hora_salida) || (
                              <span className="text-red-500 font-medium">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-semibold text-[#004080]">
                            {hours.toFixed(2)}
                          </td>
                          <td className="p-3">{statusLabel}</td>
                          <td
                            className={`p-3 text-gray-700 ${
                              explanationAllowed ? "cursor-pointer" : ""
                            }`}
                            onDoubleClick={() => {
                              if (explanationAllowed) startExplanationEdit(r, i);
                            }}
                          >
                            {editingExplanation?.index === i && explanationAllowed ? (
                              <div className="space-y-2">
                                <select
                                  className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                                  value={editingExplanation.reason}
                                  onChange={(e) => {
                                    const nextReason = e.target.value;
                                    updateEditingExplanation({
                                      reason: nextReason,
                                      detail: nextReason === "Otro" ? editingExplanation.detail : "",
                                    });
                                  }}
                                >
                                  {justificationOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                {editingExplanation.reason === "Otro" && (
                                  <input
                                    className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm"
                                    placeholder="Añade una breve explicación"
                                    value={editingExplanation.detail}
                                    onChange={(e) => updateEditingExplanation({ detail: e.target.value })}
                                  />
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="px-3 py-1 rounded bg-[#004080] text-white text-sm"
                                    onClick={saveExplanation}
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-1 rounded border text-sm"
                                    onClick={cancelExplanation}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : r.explicacion ? (
                              <>
                                {r.explicacion}
                                {r.observaciones && (
                                  <div className="text-xs text-gray-500 mt-1">Obs: {r.observaciones}</div>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-gray-400 italic">N/A</span>
                                {r.observaciones && (
                                  <div className="text-xs text-gray-500 mt-1">Obs: {r.observaciones}</div>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        No hay registros de asistencia disponibles para este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== NÓMINA ===================== */}
        {activeTab === "nomina" && (
          <div className={`${card} p-6 space-y-8`}>
            <h3 className="text-2xl font-bold text-[#004080] border-b pb-3 mb-5">Mis Nóminas</h3>

            {/* Filtros + Resumen */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <label htmlFor="monthSelectNomina" className="font-semibold text-gray-700">
                  Seleccionar mes:
                </label>
                <select
                  id="monthSelectNomina"
                  className="ml-3 border border-gray-300 rounded-lg p-2 focus:ring-[#004080] focus:border-[#004080]"
                  value={selectedNominaMonth}
                  onChange={(e) => setSelectedNominaMonth(e.target.value)}
                >
                  <option value="todos">Todos</option>
                  {[
                    "enero","febrero","marzo","abril","mayo","junio",
                    "julio","agosto","septiembre","octubre","noviembre","diciembre",
                  ].map((m, i) => (
                    <option key={m} value={`${YEAR}-${String(i + 1).padStart(2, "0")}`}>
                      {titleCaseEs(m)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resumen anual */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-inner px-6 py-4 text-center w-full max-w-sm">
                <h4 className="text-lg font-bold text-[#004080] mb-1">Total Pagado este Año</h4>
                <AnimatedCounter
                  value={totalPagado}
                  duration={1500}
                  className="text-3xl font-extrabold text-green-700 tracking-wide"
                />
                <p aclassName="text-sm text-gray-500">CFA Francs</p>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-6EOF
00 mb-1">
                    <span>% Pagado</span>
                    <span>{totalPagadoPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-all bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-green-600 h-2 transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(totalPagadoPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de nóminas */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-inner">
              <table className="min-w-full text-left text-base">
                <thead>
                  <tr className="bg-[#004080] text-white sticky top-0">
                    <th className="p-4 border-r border-[#004080]/80 w-2/12">Periodo</th>
                    <th className="p-4 border-r border-[#004080]/80 w-2/12">Fecha de Pago</th>
                    <th className="p-4 border-r border-[#004080]/80 w-2/12">Salario Bruto</th>
                    <th className="p-4 border-r border-[#004080]/80 w-2/12">Salario Neto</th>
                    <th className="p-4 border-r border-[#004080]/80 w-1/12">Estado</th>
                    <th className="p-4 w-3/12 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNominas.length ? (
                    filteredNominas.map((n, i) => {
                      const rowId = `${n.periodo}-${i}`;
                      const bonuses = [
                        { label: "Bono rendimiento", value: n.bono_rendimiento },
                        { label: "Transporte", value: n.bono_transporte },
                        { label: "Alimentación", value: n.bono_alimentacion },
                      ];
                      const deductions = [
                        { label: "INSESO (3%)", value: n.ded_inceso },
                        { label: "IVA retenido (2%)", value: n.ded_iva },
                        { label: "IRPF (5-8%)", value: n.ded_irpf },
                        { label: "Otros", value: n.otros },
                      ];
                      const totals = [
                        { label: "Salario Base", value: n.salario_base },
                        { label: "Salario Bruto", value: n.bruto },
                        { label: "Salario Neto", value: n.neto },
                      ];
                      const isExpanded = expandedNomina === rowId;
                      return (
                        <React.Fragment key={rowId}>
                          <tr
                            className={`border-b ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50 transition-colors`}
                          >
                            <td className="p-4 font-bold text-gray-800">{n.periodo}</td>
                            <td className="p-4">{n.fecha_pago}</td>
                            <td className="p-4 font-semibold text-gray-800">
                              {formatCurrency(n.bruto)}
                            </td>
                            <td className="p-4 font-extrabold text-green-700 text-lg">
                              {formatCurrency(n.neto)}
                            </td>
                            <td className={`p-4 font-bold ${n.pagado ? "text-green-600" : "text-red-600"}`}>
                              {n.pagado ? "PAGADO" : "PENDIENTE"}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-2 justify-center">
                                <button
                                  onClick={() => setExpandedNomina((prev) => (prev === rowId ? null : rowId))}
                                  className="px-3 py-1 rounded-lg border border-[#004080] text-[#004080] hover:bg-[#004080] hover:text-white text-sm font-semibold"
                                >
                                  {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                                </button>
                                <button
                                  onClick={() => handleNominaPreview(n)}
                                  className="px-3 py-1 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 text-[#004080] font-semibold"
                                >
                                  Ver PDF
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-blue-50/40">
                              <td colSpan={6} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                                  <div>
                                    <h5 className="font-bold text-[#004080] mb-2">Bonificaciones</h5>
                                    <ul className="space-y-1">
                                      {bonuses.map((item) => (
                                        <li key={item.label} className="flex justify-between">
                                          <span>{item.label}</span>
                                          <span className="font-semibold">{formatCurrency(item.value)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-[#004080] mb-2">Deducciones</h5>
                                    <ul className="space-y-1">
                                      {deductions.map((item) => (
                                        <li key={item.label} className="flex justify-between">
                                          <span>{item.label}</span>
                                          <span className="font-semibold">{formatCurrency(item.value)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-[#004080] mb-2">Totales</h5>
                                    <ul className="space-y-1">
                                      {totals.map((item) => (
                                        <li key={item.label} className="flex justify-between">
                                          <span>{item.label}</span>
                                          <span className="font-semibold">{formatCurrency(item.value)}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-500">
                        No hay nóminas registradas para este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== PUESTO ===================== */}
        {activeTab === "puesto" && (
          <>
            {/* Descripción del Puesto */}
            {empleado.descripcion_puesto && (
              <div className="mt-6 bg-white rounded-2xl p-5 shadow">
                <h3 className="text-lg font-bold text-[#004080] mb-2">Descripción del Puesto</h3>
                <p className="text-gray-700 leading-relaxed">{empleado.descripcion_puesto}</p>
              </div>
            )}

            {/* Responsabilidades */}
            {empleado.responsabilidades && Array.isArray(empleado.responsabilidades) && (
              <div className="mt-6 bg-white rounded-2xl p-5 shadow">
                <h3 className="text-lg font-bold text-[#004080] mb-2">Responsabilidades</h3>
                <ul className="list-disc pl-6 text-gray-7EOF
00 space-y-1">
                  {empleado.responsabilidades.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Jerarquía (vertical) */}
            {empleado.jerarquia && (
              <div className="mt-6 bg-white rounded-2xl p-5 shadow">
                <h3 className="text-lg font-bold text-[#004080] mb-4">Jerarquía</h3>
                <div className="flex flex-col items-center text-sm text-gray-800 font-medium">
                  {empleado.jerarquia.split("→").map((level: string, i: number, arr: string[]) => (
                    <React.Fragment key={i}>
                      <div className="px-4 py-2 bg-[#e8f1ff] rounded-xl border border-[#004080]/20 shadow-sm text-center w-full max-w-xs">
                        {level.trim()}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="flex flex-col items-center my-1">
                          <div className="w-1 h-4 bg-[#004080]" />
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-[#004080]" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Compact PDF Modal */}
      {pdfOpen && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-white w-full max-w-3xl h-[80vh] rounded-xl shadow-2xl border border-gray-300 overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-[#004080] text-white flex justify-between items-center">
              <span className="font-semibold truncate">{pdfTitle}</span>
              <button
                onClick={closePdfModal}
                className="bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-sm"
                title="Cerrar"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe title={pdfTitle} src={pdfUrl ?? ""} className="w-full h-full" style={{ border: "none" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProfile;
