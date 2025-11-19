// src/components/Asistencia.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";


/* ==================== TYPES ==================== */
type AttendanceRecord = {
  day: number;
  hora_entrada: string | null;
  hora_salida: string | null;
  observaciones?: string;
  explicacion?: string;
};

type Employee = {
  id: string;
  nombrecompleto?: string;
  nombres?: string;
  apellidos?: string;
  puesto?: string;
  departamento?: string;
  foto?: string;
  activo?: boolean;
};

type MonthlyAttendanceByEmployee = {
  [employeeId: string]: {
    [year: number]: {
      [month: string]: AttendanceRecord[];
    };
  };
};

type MonthOption = {
  value: string; // "enero", ...
  label: string; // "Enero 2025"
};

/* ==================== CONSTANTS ==================== */
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

const sanitizePdfText = (text: string) =>
  (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");

/* ==================== HELPERS ==================== */
const monthLabel = (month: string, year = WORK_YEAR) => {
  const idx = MONTHS.indexOf(month);
  const pretty =
    idx >= 0
      ? month.charAt(0).toUpperCase() + month.slice(1)
      : month;
  return `${pretty} ${year}`;
};

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
  if (start === null || end === null || end < start) return 0;
  const diff = (end - start) / 60;
  return Number(diff.toFixed(2));
};


const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

const getWeekdayNameEs = (weekday: number) => {
  const names = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  return names[weekday] ?? "";
};

const computeExpectedWorkload = (year: number, monthIndex: number) => {
  let expectedHours = 0;
  let expectedDays = 0;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    const wd = d.getDay(); // 0 Sunday ... 6 Saturday
    if (wd >= 1 && wd <= 4) {
      expectedHours += WEEKDAY_HOURS;
      expectedDays++;
    } else if (wd === 5) {
      expectedHours += FRIDAY_HOURS;
      expectedDays++;
    }
  }
  return { expectedDays, expectedHours };
};

const calculateRecordHours = (record: AttendanceRecord) => diffHours(record.hora_entrada, record.hora_salida);

const getExpectedHoursForDay = (day: number, monthIndex: number) => {
  if (monthIndex < 0) return WEEKDAY_HOURS;
  const date = new Date(WORK_YEAR, monthIndex, day);
  const weekday = date.getDay();
  if (weekday >= 1 && weekday <= 4) return WEEKDAY_HOURS;
  if (weekday === 5) return FRIDAY_HOURS;
  return 0;
};

const getWeekdayLabel = (day: number, monthIndex: number) => {
  if (monthIndex < 0) return `Día`;
  const date = new Date(WORK_YEAR, monthIndex, day);
  return getWeekdayNameEs(date.getDay());
};

const getStatusForRecord = (record: AttendanceRecord, expectedHours: number) => {
  if (!record.hora_entrada || record.hora_entrada.trim() === "") {
    return "Ausente";
  }
  if (!record.hora_salida || record.hora_salida.trim() === "") {
    return "Sin registro de salida";
  }
  const actualHours = calculateRecordHours(record);
  const target = expectedHours > 0 ? expectedHours : WEEKDAY_HOURS;
  if (actualHours >= target - 0.05) {
    return "Jornada completa";
  }
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
  return median(values);
};

const computeTeamAvgEfficiencyForMonth = (
  attendanceData: Record<string, any> | null,
  month: string
) => {
  if (!attendanceData || !month) return null;
  const values: number[] = [];
  const [y] = [WORK_YEAR];
  const monthIndex = MONTHS.indexOf(month);
  const { expectedHours } = computeExpectedWorkload(y, monthIndex);
  if (!expectedHours) return null;

  Object.keys(attendanceData).forEach((employeeKey) => {
    const records: AttendanceRecord[] =
      attendanceData[employeeKey]?.[WORK_YEAR]?.[month] || [];
    if (Array.isArray(records) && records.length) {
      const total = records.reduce((sum, record) => sum + calculateRecordHours(record), 0);
      const eff = (total / expectedHours) * 100;
      values.push(eff);
    }
  });
  if (!values.length) return null;
  const avg = values.reduce((a,b)=>a+b,0)/values.length;
  return Math.round(avg * 10) / 10; // 1 decimal
};

/* ==================== COMPONENT ==================== */
const Asistencia: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<MonthlyAttendanceByEmployee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart
  const pieRef = useRef<HTMLCanvasElement | null>(null);
  const pieInstance = useRef<Chart | null>(null);
  const currentMonthIndex = MONTHS.indexOf(selectedMonth);

  /* ==================== LOAD EMPLOYEES ==================== */
  useEffect(() => {
    async function loadEmployees() {
      try {
        const resp = await fetch("./datos_empleados.json", { cache: "no-store" });
        const json = await resp.json();
        const list: Employee[] = Array.isArray(json) ? json : json.empleados || Object.values(json);
        const normalized = list.map(e => ({
          ...e,
          id: String(e.id),
          nombrecompleto: e.nombrecompleto || `${e.nombres ?? ""} ${e.apellidos ?? ""}`.trim(),
        }));
        setEmployees(normalized);
        if (!selectedEmployeeId && normalized.length) {
          setSelectedEmployeeId(String(normalized[0].id));
        }
      } catch (e) {
        console.error("Error loading empleados:", e);
      }
    }
    loadEmployees();
  }, []);

  /* ==================== LOAD ATTENDANCE ==================== */
  useEffect(() => {
    async function loadAttendance() {
      try {
        const resp = await fetch("./attendance_2025.json", { cache: "no-store" });
        const json = await resp.json();
        setAttendanceData(json);
      } catch (e) {
        console.error("Error loading attendance_2025:", e);
      } finally {
        setLoading(false);
      }
    }
    loadAttendance();
  }, []);

  /* ==================== DEFAULT MONTH ==================== */
  useEffect(() => {
    if (!selectedMonth) {
      const today = new Date();
      const monthIdx = today.getFullYear() === WORK_YEAR ? today.getMonth() : 10; // default: noviembre
      setSelectedMonth(MONTHS[monthIdx]);
    }
  }, [selectedMonth]);

  /* ==================== FILTER CURRENT EMPLOYEE LOGS ==================== */
useEffect(() => {
 if (!selectedEmployeeId || !attendanceData) return;

  // ✅ Find employee key by ID or by full name (matches your JSON structure)
  const employeeKey =
    attendanceData[selectedEmployeeId]
      ? selectedEmployeeId
      : Object.keys(attendanceData).find((k) =>
          k.toLowerCase() ===
          (employees.find((e) => e.id === selectedEmployeeId)?.nombrecompleto ?? "").toLowerCase()
        );

  // ✅ Extract records for the selected month and year
  const employeeMonths = employeeKey
    ? attendanceData[employeeKey]?.[WORK_YEAR] || {}
    : {};

  if (!selectedMonth || !employeeMonths[selectedMonth]) {
    const availableMonths = Object.keys(employeeMonths);
    if (availableMonths.length && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }

  const monthRecords: AttendanceRecord[] = employeeMonths[selectedMonth] || [];
  setAttendance(monthRecords);
  }, [attendanceData, selectedEmployeeId, selectedMonth, employees]);

  /* ==================== WORK METRICS (UPDATED) ==================== */
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
    attendance.forEach((record) => {
      const hours = calculateRecordHours(record);
      if (hours > 0) workedDays += 1;
      actualHours += hours;
    });
    actualHours = Number(actualHours.toFixed(2));
    const differenceHours = Number((actualHours - expectedHours).toFixed(2));
    const remainingHours = Math.max(expectedHours - actualHours, 0);

    // Employee efficiency %
    const efficiencyPct = expectedHours > 0 ? Math.round((actualHours / expectedHours) * 1000) / 10 : 0;

    // Team median hours (existing)
    const medianHours = computeMedianHoursForMonth(attendanceData, selectedMonth);
    const medianGap =
      medianHours === null ? null : Number((actualHours - medianHours).toFixed(2));

    // Team average efficiency %
    const teamAvgEfficiencyPct = computeTeamAvgEfficiencyForMonth(attendanceData, selectedMonth);
    const efficiencyDelta =
      teamAvgEfficiencyPct === null ? null : Number((efficiencyPct - teamAvgEfficiencyPct).toFixed(1));

    // Classification
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
  }, [attendance, selectedMonth, attendanceData]);

  /* ==================== PIE CHART DATA (SIMPLIFIED) ==================== */
  const hoursChartSegments = useMemo(() => {
    const segments: { label: string; value: number; color: string }[] = [];
    const { expectedHours, actualHours } = workMetrics;
    const remaining = Math.max(expectedHours - actualHours, 0);

    // Empleado: Horas trabajadas vs Horas pendientes
    segments.push({
      label: "Horas trabajadas",
      value: Number(Math.min(actualHours, expectedHours).toFixed(2)),
      color: "#004080",
    });
    segments.push({
      label: "Horas pendientes",
      value: Number(remaining.toFixed(2)),
      color: "#F97316",
    });

    return segments;
  }, [workMetrics]);

  const workedDaysPct =
    workMetrics.expectedDays > 0
      ? ((workMetrics.workedDays / workMetrics.expectedDays) * 100).toFixed(1)
      : null;
  const workedHoursPct =
    workMetrics.expectedHours > 0
      ? ((workMetrics.actualHours / workMetrics.expectedHours) * 100).toFixed(1)
      : null;
  const differenceClass =
    workMetrics.differenceHours >= 0 ? "text-green-700" : "text-red-600";
  const medianGapClass =
    workMetrics.medianGap !== null && workMetrics.medianGap >= 0
      ? "text-green-700"
      : "text-red-600";

  /* ==================== PIE CHART WITH LABELS ==================== */
  useEffect(() => {
    const node = pieRef.current;
    if (!node) return;
    const ctx = node.getContext("2d");
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

    if (pieInstance.current) {
      pieInstance.current.data = data as any;
      pieInstance.current.update();
    } else {
      pieInstance.current = new Chart(ctx, {
        type: "doughnut",
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom" as const,
              labels: {
                usePointStyle: true,
              },
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.label || "";
                  const value = context.raw ?? 0;
                  return `${label}: ${Number(value).toFixed(1)} h`;
                },
              },
            },
            datalabels: {
              color: "#111827",
              formatter: (value: any, ctx: any) => {
                if (value <= 0.1) return "";
                const label = ctx.chart.data.labels?.[ctx.dataIndex] ?? "";
                return `${label}\n${Number(value).toFixed(1)}h`;
              },
              anchor: "end",
              align: "start",
              offset: 8,
              clamp: true,
            } as any,
          },
        },
        plugins: [ChartDataLabels],
      });
    }

    return () => {
      if (pieInstance.current) {
        pieInstance.current.destroy();
        pieInstance.current = null;
      }
    };
  }, [hoursChartSegments]);

  /* ==================== UI ==================== */
  if (loading) {
    return (
      <div className="p-6 text-gray-500">
        Cargando asistencia…
      </div>
    );
  }

  const monthOptions: MonthOption[] = MONTHS.map((m) => ({
    value: m,
    label: monthLabel(m),
  }));

  return (
    <div className="p-6 text-gray-800">
      <h2 className="text-3xl font-bold text-[#004080] mb-1">Asistencia</h2>
      <p className="text-gray-500 mb-6">
        Mantén el registro diario, revisa el desempeño mensual y compara contra la media de la empresa.
      </p>

      {/* Filters */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm text-gray-600 block mb-1">Empleado</label>
          <select
            className="border rounded-lg px-3 py-2 w-full"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombrecompleto || `${e.nombres ?? ""} ${e.apellidos ?? ""}`.trim()} — {e.puesto ?? ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">Mes</label>
          <select
            className="border rounded-lg px-3 py-2 w-full"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ======= MANAGERIAL SUMMARY (ABOVE THE TABLE) ======= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Summary */}
        <div className="bg-white border border-gray-200 rounded-xl shadow p-5 md:col-span-2">
          <h4 className="text-lg font-bold text-[#004080] mb-3 text-center">Resumen del Mes</h4>
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
                  <td className="py-2 text-right font-bold">
                    {workMetrics.efficiencyPct}%
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-semibold text-gray-700">% Media de la empresa</td>
                  <td className="py-2 text-right font-bold">
                    {workMetrics.teamAvgEfficiencyPct ?? "—"}{workMetrics.teamAvgEfficiencyPct !== null ? "%" : ""}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-semibold text-gray-700">Diferencia vs media</td>
                  <td className={"py-2 text-right font-bold " + (workMetrics.efficiencyDelta !== null && workMetrics.efficiencyDelta >= 0 ? "text-green-700" : "text-red-600")}>
                    {workMetrics.efficiencyDelta !== null ? (workMetrics.efficiencyDelta > 0 ? "+" : "") + workMetrics.efficiencyDelta.toFixed(1) + "%" : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-semibold text-gray-700">Clasificación</td>
                  <td className="py-2 text-right font-bold">{workMetrics.classification}</td>
                </tr>
            </tbody>
          </table>

          {/* Executive note */}
          <div className="mt-3 text-xs text-gray-600 italic">
            Jornada estándar: L–J 09:00–17:00 (8h), Viernes 09:00–14:00 (5h).
          </div>
        </div>

        {/* Pie chart */}
        <div className="bg-white border border-gray-200 rounded-xl shadow p-5">
          <h4 className="text-lg font-bold text-[#004080] mb-3 text-center">
            Horas del empleado — {monthLabel(selectedMonth)}
          </h4>
          <div className="h-64">
            <canvas ref={pieRef} />
          </div>
          <div className="mt-3 text-center text-sm text-gray-600">
            {workedHoursPct !== null
              ? <>Eficiencia: <span className="font-semibold">{workedHoursPct}%</span></>
              : "Sin horas registradas"}
            {workMetrics.teamAvgEfficiencyPct !== null && (
              <>
                {" · "}Media empresa: <span className="font-semibold">{workMetrics.teamAvgEfficiencyPct}%</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======= DETAILED TABLE ======= */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-inner">
        <table className="min-w-full text-left text-base">
          <thead>
            <tr className="bg-[#004080] text-white sticky top-0">
              <th className="px-3 py-2">Día</th>
              <th className="px-3 py-2">Entrada</th>
              <th className="px-3 py-2">Salida</th>
              <th className="px-3 py-2 text-center">Horas</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Explicación</th>
            </tr>
          </thead>
          <tbody>
            {attendance && attendance.length ? (
              attendance.map((log) => {
                const dayLabel = `${getWeekdayLabel(log.day, currentMonthIndex)}, ${String(log.day).padStart(2, "0")}`;
                const expectedHoursForDay = getExpectedHoursForDay(log.day, currentMonthIndex);
                const statusLabel = getStatusForRecord(log, expectedHoursForDay);
                const hours = calculateRecordHours(log);
                const isIncomplete = statusLabel !== "Jornada completa";
                const rowClass = isIncomplete ? "text-red-600 font-semibold" : "";
                return (
                  <tr key={log.day} className={`border-b hover:bg-gray-50 ${rowClass}`}>
                    <td className="px-3 py-2">{dayLabel}</td>
                    <td className="px-3 py-2">
                      {formatTimeDisplay(log.hora_entrada) ?? <span className="text-red-500 font-medium">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {formatTimeDisplay(log.hora_salida) ?? <span className="text-red-500 font-medium">—</span>}
                    </td>
                    <td className={`px-3 py-2 text-center font-semibold ${isIncomplete ? "text-red-600" : "text-[#004080]"}`}>
                      {hours.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">{statusLabel}</td>
                    <td className="px-3 py-2">{log.explicacion ?? ""}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  No hay registros en {monthLabel(selectedMonth)} para este empleado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTNOTE */}
      <div className="mt-6 text-xs text-gray-500">
        Este resumen prioriza la toma de decisiones: compara desempeño del empleado con la media de la empresa
        y contrasta horas trabajadas vs esperadas en el mes seleccionado.
      </div>
    </div>
  );
};

export default Asistencia;
