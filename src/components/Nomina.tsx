import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Chart from "chart.js/auto";
import {
  buildNominaPdf,
  computeNominaBonos as computeNominaBonosBase,
  computeNominaDeducciones as computeNominaDeduccionesBase,
  formatNominaCurrency,
  NominaLike,
} from "../utils/nominaPdf";

/* ================= Types ================= */
type NominaRecord = NominaLike & {
  employee_id: string;
  pagado: boolean;
};

type GenerationScope = "todos" | "departamento" | "empleado";
type PayType = "regular" | "extraordinario";

/* ================= Helpers ================= */
const formatXAF = (val: number) => formatNominaCurrency(val);
const card =
  "bg-white rounded-xl shadow-lg border border-gray-300 transition-all duration-300";

const computeBonos = (record: NominaRecord) => computeNominaBonosBase(record);
const computeDeducciones = (record: NominaRecord) => computeNominaDeduccionesBase(record);

const PAGE_SIZE = 25;

/* ================= Component ================= */
const Nomina: React.FC = () => {
  const [nominas, setNominas] = useState<NominaRecord[]>([]);
  const [filtered, setFiltered] = useState<NominaRecord[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ver" | "generar">("ver");
  const [page, setPage] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "periodo",
    direction: "desc",
  });

  /* ========== Load local JSON ========== */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("./NOMINAS.json", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data)) {
          setNominas(data);
          setFiltered(data);
        }
      } catch (err) {
        console.error("Error cargando nóminas:", err);
      }
    })();
  }, []);

  /* ========== Filtering ========== */
  useEffect(() => {
    let list = nominas;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((n) =>
        `${n.nombre} ${n.apellidos}`.toLowerCase().includes(s)
      );
    }
    if (month) list = list.filter((n) => n.periodo === month);
    setFiltered(list);
    setPage(0);
  }, [search, month, nominas]);

  /* ========== Chart refs ========== */
  const barRef = useRef<HTMLCanvasElement | null>(null);
  const pieRef = useRef<HTMLCanvasElement | null>(null);
  const barChart = useRef<Chart | null>(null);
  const pieChart = useRef<Chart | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  /* ========== Chart Data ========== */
  const summary = useMemo(() => {
    const byMonth: Record<string, { base: number; bonos: number; neto: number; deducciones: number }> =
      {};
    filtered.forEach((n) => {
      if (!byMonth[n.periodo]) {
        byMonth[n.periodo] = { base: 0, bonos: 0, neto: 0, deducciones: 0 };
      }
      byMonth[n.periodo].base += n.salario_base;
      byMonth[n.periodo].bonos += computeBonos(n);
      byMonth[n.periodo].neto += n.neto;
      byMonth[n.periodo].deducciones += computeDeducciones(n);
    });
    return byMonth;
  }, [filtered]);

  const totalPagado = useMemo(
    () => filtered.filter((n) => n.pagado).reduce((acc, n) => acc + n.neto, 0),
    [filtered]
  );
  const totalPendiente = useMemo(
    () => filtered.filter((n) => !n.pagado).reduce((acc, n) => acc + n.neto, 0),
    [filtered]
  );

  /* ========== Sorting & Pagination ========== */
  const sortedNominas = useMemo(() => {
    const list = [...filtered];
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (key) {
        case "empleado":
          aValue = `${a.nombre} ${a.apellidos || ""}`.trim().toLowerCase();
          bValue = `${b.nombre} ${b.apellidos || ""}`.trim().toLowerCase();
          break;
        case "salario_base":
          aValue = a.salario_base;
          bValue = b.salario_base;
          break;
        case "bonos":
          aValue = computeBonos(a);
          bValue = computeBonos(b);
          break;
        case "bruto":
          aValue = a.bruto;
          bValue = b.bruto;
          break;
        case "deducciones":
          aValue = computeDeducciones(a);
          bValue = computeDeducciones(b);
          break;
        case "neto":
          aValue = a.neto;
          bValue = b.neto;
          break;
        case "estado":
          aValue = a.pagado ? 1 : 0;
          bValue = b.pagado ? 1 : 0;
          break;
        case "periodo":
        default:
          aValue = a.periodo;
          bValue = b.periodo;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * multiplier;
      }
      const aStr = String(aValue);
      const bStr = String(bValue);
      return aStr.localeCompare(bStr) * multiplier;
    });
    return list;
  }, [filtered, sortConfig]);

  const pageCount = Math.ceil(sortedNominas.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, pageCount - 1);
  const paginatedNominas = sortedNominas.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    nominas.forEach((n) => {
      const dep = (n.employee_role || n.puesto || "").trim();
      if (dep) set.add(dep);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [nominas]);

  const employeesByDept = useMemo(() => {
    const map = new Map<string, Set<string>>();
    nominas.forEach((n) => {
      const dep = (n.employee_role || n.puesto || "").trim();
      if (!dep) return;
      if (!map.has(dep)) map.set(dep, new Set<string>());
      const fullName = `${n.nombre} ${n.apellidos || ""}`.trim() || "Empleado sin nombre";
      map.get(dep)!.add(fullName);
    });
    const result: Record<string, string[]> = {};
    map.forEach((set, dep) => {
      result[dep] = Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
    });
    return result;
  }, [nominas]);

  const employeeOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        label: string;
      }
    >();
    nominas.forEach((n) => {
      const id = String(n.employee_id ?? `${n.nombre}-${n.apellidos}`);
      if (!map.has(id)) {
        const label = `${n.nombre} ${n.apellidos || ""}`.trim() || `Empleado ${id}`;
        map.set(id, { id, label });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [nominas]);

  const toggleRow = (rowId: string) => {
    setExpandedRow((prev) => (prev === rowId ? null : rowId));
  };

  const openNominaPdf = useCallback((record: NominaRecord, fullName: string) => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
    }
    const doc = buildNominaPdf(record);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    pdfUrlRef.current = url;
    setPdfPreview({ url, title: `Nómina - ${fullName} (${record.periodo})` });
  }, []);

  const closePdfPreview = useCallback(() => {
    if (pdfUrlRef.current) {
      URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = null;
    }
    setPdfPreview(null);
  }, []);

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  };

  /* ========== Draw Charts ========== */
  useEffect(() => {
    const barCanvas = barRef.current;
    const pieCanvas = pieRef.current;
    if (!barCanvas || !pieCanvas) return;

    const months = Object.keys(summary);
    const base = months.map((m) => summary[m].base);
    const bonos = months.map((m) => summary[m].bonos);
    const deducciones = months.map((m) => summary[m].deducciones);
    const neto = months.map((m) => summary[m].neto);

    // Destroy old charts
    if (barChart.current) barChart.current.destroy();
    if (pieChart.current) pieChart.current.destroy();

    // Bar chart
    barChart.current = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          { label: "Salario Base", data: base, backgroundColor: "#004080" },
          { label: "Bonos", data: bonos, backgroundColor: "#2D7DFF" },
          { label: "Deducciones", data: deducciones, backgroundColor: "#CBD5E1" },
          { label: "Neto", data: neto, backgroundColor: "#10B981" },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          title: { display: false },
        },
        scales: { x: { stacked: true }, y: { stacked: true } },
      },
    });

    // Pie chart
    pieChart.current = new Chart(pieCanvas, {
      type: "doughnut",
      data: {
        labels: ["Pagado", "Pendiente"],
        datasets: [
          {
            data: [totalPagado, totalPendiente],
            backgroundColor: ["#10B981", "#EF4444"],
          },
        ],
      },
      options: {
        plugins: { legend: { position: "bottom" } },
      },
    });
  }, [summary, totalPagado, totalPendiente]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  /* ========== Simulated Generation (same as before) ========== */
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [periodGen, setPeriodGen] = useState("");
  const [scope, setScope] = useState<GenerationScope>("todos");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [payType, setPayType] = useState<PayType>("regular");
  const [extraConcept, setExtraConcept] = useState("Pago extraordinario");
  const [extraAmount, setExtraAmount] = useState("");
  const [includeBonos, setIncludeBonos] = useState(true);
  const [includeDeducciones, setIncludeDeducciones] = useState(true);
  const [sendSummaryEmail, setSendSummaryEmail] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (scope !== "departamento" && selectedDept) setSelectedDept("");
    if (scope !== "empleado" && selectedEmployeeId) setSelectedEmployeeId("");
  }, [scope, selectedDept, selectedEmployeeId]);

  const startGeneration = async () => {
    if (!periodGen) {
      alert("Seleccione un periodo (YYYY-MM)");
      return;
    }
    if (scope === "departamento" && !selectedDept) {
      alert("Seleccione un departamento");
      return;
    }
    if (scope === "empleado" && !selectedEmployeeId) {
      alert("Seleccione un empleado");
      return;
    }
    const amountNumber =
      payType === "extraordinario"
        ? Number((extraAmount || "0").replace(/[^\d.-]/g, ""))
        : 0;
    if (payType === "extraordinario" && (!amountNumber || amountNumber <= 0)) {
      alert("Indique un monto válido para el pago extraordinario");
      return;
    }
    const scopeLabel =
      scope === "todos"
        ? "Toda la organización"
        : scope === "departamento"
        ? `Departamento: ${selectedDept}`
        : `Empleado: ${
            employeeOptions.find((opt) => opt.id === selectedEmployeeId)?.label ||
            selectedEmployeeId
          }`;

    setGenerating(true);
    setLog([]);
    setProgress(0);
    const steps: string[] = [
      `Iniciando generación ${payType === "regular" ? "regular" : "extraordinaria"}…`,
      `Periodo seleccionado: ${periodGen}`,
      `Ámbito: ${scopeLabel}`,
      includeBonos ? "Bonificaciones activadas" : "Bonificaciones omitidas",
      includeDeducciones ? "Deducciones aplicadas" : "Deducciones omitidas",
    ];
    if (payType === "extraordinario") {
      steps.splice(
        3,
        0,
        `Concepto extraordinario: ${extraConcept} — ${formatXAF(amountNumber)}`
      );
    }
    if (notes.trim()) {
      steps.push(`Nota interna: ${notes.trim()}`);
    }
    steps.push(
      sendSummaryEmail ? "Se enviará resumen por correo" : "No se enviará correo automático",
      "Preparando datos locales...",
      "Aplicando cálculos...",
      "Generando PDFs...",
      "Finalizando proceso..."
    );
    for (let i = 0; i < steps.length; i++) {
      setLog((prev) => [...prev, steps[i]]);
      setProgress(Math.round(((i + 1) / steps.length) * 100));
      await new Promise((r) => setTimeout(r, 800));
    }
    setLog((prev) => [...prev, "✅ Nóminas generadas exitosamente (modo offline)."]);
    setGenerating(false);
  };

  /* ========== Render ========== */
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Tabs */}
      <div className="flex mb-6 border-b-2 border-gray-200">
        <button
          className={`px-6 py-3 font-semibold ${
            activeTab === "ver"
              ? "text-[#004080] border-b-4 border-[#004080]"
              : "text-gray-600 border-b-4 border-transparent"
          }`}
          onClick={() => setActiveTab("ver")}
        >
          VER NÓMINAS
        </button>
        <button
          className={`px-6 py-3 font-semibold ${
            activeTab === "generar"
              ? "text-[#004080] border-b-4 border-[#004080]"
              : "text-gray-600 border-b-4 border-transparent"
          }`}
          onClick={() => setActiveTab("generar")}
        >
          GENERAR NÓMINAS
        </button>
      </div>

      {/* ================= TAB 1 ================= */}
      {activeTab === "ver" && (
        <div className="space-y-6">
          {/* === Summary cards === */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
              <h4 className="text-sm text-gray-600">Total Pagado</h4>
              <div className="text-2xl font-bold text-green-700 mt-1">
                {formatXAF(totalPagado)}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
              <h4 className="text-sm text-gray-600">Pendiente de Pago</h4>
              <div className="text-2xl font-bold text-red-700 mt-1">
                {formatXAF(totalPendiente)}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
              <h4 className="text-sm text-gray-600">Registros Totales</h4>
              <div className="text-2xl font-bold text-[#004080] mt-1">
                {filtered.length}
              </div>
            </div>
          </div>

      
          {/* === Filters + Table (same logic) === */}
          <div className={`${card} p-6`}>
            <h3 className="text-xl font-bold text-[#004080] mb-4">
              Buscar y Filtrar Nóminas
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Buscar empleado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded-lg p-2"
              />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="border rounded-lg p-2"
              />
              <button
                onClick={() => {
                  setSearch("");
                  setMonth("");
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg shadow"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          <div className={`${card} p-6 overflow-x-auto`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-3 text-sm text-gray-600">
              <span>
                Mostrando{" "}
                <strong>
                  {sortedNominas.length ? currentPage * PAGE_SIZE + 1 : 0}-
                  {Math.min((currentPage + 1) * PAGE_SIZE, sortedNominas.length)}
                </strong>{" "}
                de <strong>{sortedNominas.length}</strong> registros
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={currentPage === 0}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
                  disabled={currentPage >= pageCount - 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#004080] text-white">
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("empleado")}>
                    Empleado{renderSortIndicator("empleado")}
                  </th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("periodo")}>
                    Periodo{renderSortIndicator("periodo")}
                  </th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("salario_base")}>
                    Salario Base{renderSortIndicator("salario_base")}
                  </th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("bonos")}>
                    Bonos{renderSortIndicator("bonos")}
                  </th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("bruto")}>
                    Bruto{renderSortIndicator("bruto")}
                  </th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("deducciones")}>
                    Deducciones{renderSortIndicator("deducciones")}
                  </th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("neto")}>
                    Neto{renderSortIndicator("neto")}
                  </th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort("estado")}>
                    Estado{renderSortIndicator("estado")}
                  </th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedNominas.length ? (
                  paginatedNominas.map((n, i) => {
                    const fullName = `${n.nombre} ${n.apellidos || ""}`.trim() || "Colaborador";
                    const deducciones = computeDeducciones(n);
                    const bonos = computeBonos(n);
                    const rowId = `${n.periodo}-${fullName}-${i}`;
                    const isExpanded = expandedRow === rowId;
                    const bonusBreakdown = [
                      { label: "Bono ventas", value: n.bono_ventas },
                      { label: "Bono rendimiento", value: n.bono_rendimiento },
                      { label: "Transporte", value: n.bono_transporte },
                      { label: "Alimentación", value: n.bono_alimentacion },
                    ];
                    const deductionBreakdown = [
                      { label: "INSESO / Seg. social", value: n.ded_inceso ?? n.seg_social },
                      { label: "IVA retenido", value: n.ded_iva },
                      { label: "IRPF", value: n.ded_irpf ?? n.irpf },
                      { label: "Otros", value: n.otros },
                    ];
                    const totalsBreakdown = [
                      { label: "Salario base", value: n.salario_base },
                      { label: "Salario bruto", value: n.bruto },
                      { label: "Salario neto", value: n.neto },
                    ];
                    return (
                      <React.Fragment key={rowId}>
                        <tr
                          className={`border-b ${i % 2 ? "bg-gray-50" : "bg-white"}`}
                        >
                          <td className="p-2 font-medium">{fullName}</td>
                          <td className="p-2">{n.periodo}</td>
                          <td className="p-2">{formatXAF(n.salario_base)}</td>
                          <td className="p-2">{formatXAF(bonos)}</td>
                          <td className="p-2">{formatXAF(n.bruto)}</td>
                          <td className="p-2">{formatXAF(deducciones)}</td>
                          <td className="p-2 font-bold text-green-700">{formatXAF(n.neto)}</td>
                          <td
                            className={`p-2 font-bold ${
                              n.pagado ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {n.pagado ? "PAGADO" : "PENDIENTE"}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-2 min-w-[150px]">
                              <button
                                type="button"
                                onClick={() => toggleRow(rowId)}
                                className="px-3 py-1 rounded-md border border-[#004080] text-[#004080] hover:bg-[#004080] hover:text-white text-xs font-semibold transition-colors"
                              >
                                {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                              </button>
                              <button
                                type="button"
                                onClick={() => openNominaPdf(n, fullName)}
                                className="px-3 py-1 rounded-md border border-gray-300 bg-gray-100 text-[#004080] hover:bg-gray-200 text-xs font-semibold transition-colors"
                              >
                                Ver comprobante
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-blue-50/40">
                            <td colSpan={9} className="p-4">
                              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700">
                                <div>
                                  <h5 className="font-bold text-[#004080] mb-2">Bonificaciones</h5>
                                  <ul className="space-y-1">
                                    {bonusBreakdown.map((item) => (
                                      <li key={`${rowId}-bonus-${item.label}`} className="flex justify-between">
                                        <span>{item.label}</span>
                                        <span className="font-semibold">{formatXAF(item.value ?? 0)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h5 className="font-bold text-[#004080] mb-2">Deducciones</h5>
                                  <ul className="space-y-1">
                                    {deductionBreakdown.map((item) => (
                                      <li key={`${rowId}-ded-${item.label}`} className="flex justify-between">
                                        <span>{item.label}</span>
                                        <span className="font-semibold">{formatXAF(item.value ?? 0)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h5 className="font-bold text-[#004080] mb-2">Totales</h5>
                                  <ul className="space-y-1">
                                    {totalsBreakdown.map((item) => (
                                      <li key={`${rowId}-tot-${item.label}`} className="flex justify-between">
                                        <span>{item.label}</span>
                                        <span className="font-semibold">{formatXAF(item.value ?? 0)}</span>
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
                    <td colSpan={9} className="text-center py-4 text-gray-500">
                      No hay nóminas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2 ================= */}
      {activeTab === "generar" && (
        <div className={`${card} p-6 space-y-6`}>
          <div className="flex flex-col gap-2">
            <h3 className="text-xl font-bold text-[#004080]">
              Configurar generación de nómina
            </h3>
            <p className="text-sm text-gray-500">
              Ajusta los parámetros para emitir una nómina regular o un pago extraordinario a un
              grupo específico.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4 border border-gray-200 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-[#004080]">Configuración básica</h4>
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Periodo (YYYY-MM)
                <input
                  type="month"
                  value={periodGen}
                  onChange={(e) => setPeriodGen(e.target.value)}
                  className="border rounded-lg p-2"
                />
              </label>
              <div>
                <span className="text-sm font-semibold text-gray-700">Tipo de pago</span>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  {[
                    { value: "regular", label: "Nómina regular" },
                    { value: "extraordinario", label: "Pago extraordinario" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="payType"
                        value={option.value}
                        checked={payType === option.value}
                        onChange={(e) => setPayType(e.target.value as PayType)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              {payType === "extraordinario" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                    Concepto
                    <input
                      type="text"
                      value={extraConcept}
                      onChange={(e) => setExtraConcept(e.target.value)}
                      placeholder="Bono especial, Ajuste, etc."
                      className="border rounded-lg p-2"
                    />
                  </label>
                  <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                    Monto (XAF)
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={extraAmount}
                      onChange={(e) => setExtraAmount(e.target.value)}
                      className="border rounded-lg p-2"
                      placeholder="500000"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-4 border border-gray-200 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-[#004080]">Ámbito del cálculo</h4>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  { value: "todos", label: "Toda la organización" },
                  { value: "departamento", label: "Solo un departamento" },
                  { value: "empleado", label: "Empleado específico" },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="scope"
                      value={option.value}
                      checked={scope === option.value}
                      onChange={(e) => setScope(e.target.value as GenerationScope)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {scope === "departamento" && (
                <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                  Seleccione un departamento
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="border rounded-lg p-2"
                  >
                    <option value="">— Elegir departamento —</option>
                    {departmentOptions.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                  {departmentOptions.length === 0 && (
                    <span className="text-xs text-gray-500">
                      No se detectaron departamentos en las nóminas actuales.
                    </span>
                  )}
                  {selectedDept && employeesByDept[selectedDept]?.length ? (
                    <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50 text-xs text-gray-700 max-h-40 overflow-y-auto">
                      <p className="font-semibold text-[#004080] mb-2">
                        Empleados en {selectedDept}
                      </p>
                      <ul className="space-y-1">
                        {employeesByDept[selectedDept].map((name) => (
                          <li key={name} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#004080]" />
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    selectedDept && (
                      <p className="mt-2 text-xs text-red-500">
                        No se encontraron empleados para este departamento.
                      </p>
                    )
                  )}
                </label>
              )}
              {scope === "empleado" && (
                <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                  Seleccione un empleado
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="border rounded-lg p-2"
                  >
                    <option value="">— Elegir empleado —</option>
                    {employeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.label}
                      </option>
                    ))}
                  </select>
                  {employeeOptions.length === 0 && (
                    <span className="text-xs text-gray-500">
                      No se detectaron empleados en el historial cargado.
                    </span>
                  )}
                </label>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4 border border-gray-200 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-[#004080]">Parámetros adicionales</h4>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeBonos}
                    onChange={(e) => setIncludeBonos(e.target.checked)}
                  />
                  Incluir bonificaciones
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeDeducciones}
                    onChange={(e) => setIncludeDeducciones(e.target.checked)}
                  />
                  Aplicar deducciones
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sendSummaryEmail}
                    onChange={(e) => setSendSummaryEmail(e.target.checked)}
                  />
                  Enviar resumen por correo
                </label>
              </div>
              <label className="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Notas internas (opcional)
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Observaciones, motivos o instrucciones especiales…"
                  className="border rounded-lg p-2"
                />
              </label>
              <button
                onClick={startGeneration}
                disabled={generating}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${
                  generating ? "bg-gray-400 cursor-not-allowed" : "bg-[#004080] hover:bg-blue-800"
                }`}
              >
                {generating ? "Generando..." : "Iniciar generación"}
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 flex flex-col">
              <div className="font-semibold text-[#004080] mb-2">
                Progreso de Generación
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                <div
                  className="bg-green-600 h-3 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mb-2">{progress}%</div>
              <div className="flex-1 overflow-y-auto bg-gray-50 p-2 rounded text-xs font-mono">
                {log.map((l, i) => (
                  <div key={i} className="mb-1">
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PDF MODAL ===== */}
      {pdfPreview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center bg-[#004080] text-white px-4 py-2">
              <span className="font-semibold">{pdfPreview.title}</span>
              <div className="flex gap-2">
                <a
                  href={pdfPreview.url}
                  download={`${pdfPreview.title.replace(/\s+/g, "_")}.pdf`}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Descargar
                </a>
                <button
                  onClick={closePdfPreview}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <iframe
              src={pdfPreview.url}
              className="flex-1 w-full border-none"
              title="Nomina PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Nomina;
