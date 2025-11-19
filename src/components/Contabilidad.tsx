import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Chart from "chart.js/auto";
import { jsPDF } from "jspdf";
import elebiLogo from "../assets/elebilogo.png";

type Expense = {
  fecha: string;
  monto: number;
  categoria: string;
  descripcion: string;
};

type Income = {
  fecha: string;
  monto: number;
  fuente: string;
  descripcion: string;
};

type MonthlyPlan = {
  plan: number;
  ingresos: number;
  gastos: number;
};

type CategorySlice = {
  nombre: string;
  monto: number;
};

type DepartmentBudget = {
  nombre: string;
  presupuesto_anual: number;
  presupuesto_mensual: Record<string, MonthlyPlan>;
  categorias_gasto: CategorySlice[];
  ingresos: Income[];
  gastos: Expense[];
};

type PresupuestoFile = {
  anio: number;
  departamentos: DepartmentBudget[];
};

type ResumenSnapshot = {
  months: string[];
  ingresosMes: number[];
  gastosMes: number[];
  totalPlan: number;
  totalIngresos: number;
  totalGastos: number;
  disponible: number;
  cumplimiento: number;
  categories: CategorySlice[];
};

const MONTH_ORDER = [
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

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatCurrency = (value: number) =>
  `${value.toLocaleString("es-GQ")} FCFA`;

const useAnimatedNumber = (
  target: number,
  options?: { duration?: number; delay?: number; trigger?: any }
) => {
  const { duration = 4000, delay = 0, trigger } = options || {};
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);

  useEffect(() => {
    if (trigger === undefined || trigger === null) {
      return;
    }
    fromRef.current = 0;
    startRef.current = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }
      const elapsed = timestamp - startRef.current;
      if (elapsed < delay) {
        frameId = requestAnimationFrame(step);
        return;
      }
      const localElapsed = elapsed - delay;
      const progress = Math.min(localElapsed / duration, 1);
      const next = fromRef.current + (target - fromRef.current) * progress;
      setValue(next);
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, delay, trigger]);

  return value;
};

const PdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    className={className}
  >
    <path d="M14 2H7a2 2 0 00-2 2v16c0 1.1.9 2 2 2h10a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h1.5a1.5 1.5 0 010 3H9zM14 16v-3h1a1 1 0 011 1v2M18 16v-3h2" />
  </svg>
);

const buildConsolidatedBudget = (
  list: DepartmentBudget[]
): DepartmentBudget | null => {
  if (!list.length) return null;
  const monthlyTotals: Record<string, MonthlyPlan> = MONTH_ORDER.reduce(
    (acc, month) => {
      acc[month] = { plan: 0, ingresos: 0, gastos: 0 };
      return acc;
    },
    {} as Record<string, MonthlyPlan>
  );
  const categoryMap = new Map<string, number>();
  const ingresos: Income[] = [];
  const gastos: Expense[] = [];

  list.forEach((dept) => {
    MONTH_ORDER.forEach((month) => {
      const row = dept.presupuesto_mensual?.[month];
      if (!row) return;
      monthlyTotals[month].plan += row.plan || 0;
      monthlyTotals[month].ingresos += row.ingresos || 0;
      monthlyTotals[month].gastos += row.gastos || 0;
    });
    (dept.categorias_gasto || []).forEach(({ nombre, monto }) => {
      categoryMap.set(nombre, (categoryMap.get(nombre) || 0) + (monto || 0));
    });
    (dept.ingresos || []).forEach((ing) => {
      ingresos.push({
        ...ing,
        fuente: `${dept.nombre} · ${ing.fuente}`,
      });
    });
    (dept.gastos || []).forEach((g) => {
      gastos.push({
        ...g,
        categoria: `${dept.nombre} · ${g.categoria}`,
      });
    });
  });

  ingresos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  gastos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const presupuesto_anual = MONTH_ORDER.reduce(
    (acc, month) => acc + (monthlyTotals[month].plan || 0),
    0
  );

  const categorias_gasto = Array.from(categoryMap.entries())
    .map(([nombre, monto]) => ({ nombre, monto }))
    .sort((a, b) => b.monto - a.monto);

  return {
    nombre: "Iniciativas Elebi · Consolidado",
    presupuesto_anual,
    presupuesto_mensual: monthlyTotals,
    categorias_gasto,
    ingresos,
    gastos,
  };
};

const Contabilidad: React.FC = () => {
  const [departments, setDepartments] = useState<string[]>([]);
  const [currentDept, setCurrentDept] = useState<string>("");
  const [departmentBudgets, setDepartmentBudgets] = useState<DepartmentBudget[]>([]);
  const [budgetYear, setBudgetYear] = useState<number>(new Date().getFullYear());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [activeTab, setActiveTab] = useState("resumen");
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [showPercentages, setShowPercentages] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const trendChartRef = useRef<HTMLCanvasElement | null>(null);
  const categoryChartRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartInstance = useRef<Chart | null>(null);
  const categoryChartInstance = useRef<Chart | null>(null);
  const categoryDetailChartRef = useRef<HTMLCanvasElement | null>(null);
  const categoryDetailChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("./presupuestos.json")
      .then((r) => r.json())
      .then((data: PresupuestoFile) => {
        if (cancelled) return;
        const list = data?.departamentos || [];
        setBudgetYear(data?.anio || new Date().getFullYear());
        const consolidated = buildConsolidatedBudget(list);
        const finalList = consolidated ? [consolidated, ...list] : list;
        setDepartmentBudgets(finalList);
        const deptNames = finalList.map((d) => d.nombre);
        setDepartments(deptNames);
        if (deptNames.length) {
          setCurrentDept((prev) =>
            prev && deptNames.includes(prev) ? prev : deptNames[0]
          );
        }
      })
      .catch((err) => console.error("Error loading presupuestos.json:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const currentDeptData = useMemo(
    () =>
      departmentBudgets.find((dept) => dept.nombre === currentDept) || null,
    [departmentBudgets, currentDept]
  );

  useEffect(() => {
    if (!currentDeptData) return;
    setExpenses(currentDeptData.gastos || []);
    setIncomes(currentDeptData.ingresos || []);
  }, [currentDeptData]);

  useEffect(() => {
    let active = true;
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
        if (active) setLogoDataUrl(dataUrl);
      })
      .catch(() => setLogoDataUrl(null));
    return () => {
      active = false;
    };
  }, []);

  const resumenMetrics = useMemo<ResumenSnapshot | null>(() => {
    if (!currentDeptData) return null;
    const entries = Object.entries(currentDeptData.presupuesto_mensual || {});
    const sorted = entries.sort(
      (a, b) =>
        MONTH_ORDER.indexOf(a[0].toLowerCase()) -
        MONTH_ORDER.indexOf(b[0].toLowerCase())
    );
    if (!sorted.length) return null;
    const months = sorted.map(([key]) => capitalize(key));
    const planMes = sorted.map(([, values]) => values.plan);
    const ingresosMes = sorted.map(([, values]) => values.ingresos);
    const gastosMes = sorted.map(([, values]) => values.gastos);
    const totalPlan =
      planMes.reduce((acc, val) => acc + val, 0) ||
      currentDeptData.presupuesto_anual ||
      0;
    const totalIngresos = ingresosMes.reduce((acc, val) => acc + val, 0);
    const totalGastos = gastosMes.reduce((acc, val) => acc + val, 0);
    const disponible = totalPlan - totalGastos;
    const cumplimiento = totalPlan ? Math.min(totalGastos / totalPlan, 1) : 0;
    return {
      months,
      ingresosMes,
      gastosMes,
      totalPlan,
      totalIngresos,
      totalGastos,
      disponible,
      cumplimiento,
      categories: currentDeptData.categorias_gasto || [],
    };
  }, [currentDeptData]);

  const chartCategories = useMemo<CategorySlice[]>(() => {
    if (!resumenMetrics || !currentDeptData) return [];
    const isConsolidated = currentDeptData.nombre.toLowerCase().includes("consolidado");
    if (!isConsolidated) return resumenMetrics.categories;

    const consolidatedCategories = departmentBudgets
      .filter((dept) => dept.nombre !== currentDeptData.nombre)
      .map((dept) => {
        const total = Object.values(dept.presupuesto_mensual || {}).reduce(
          (acc, row: MonthlyPlan) => acc + (row?.gastos || 0),
          0
        );
        return { nombre: dept.nombre, monto: total };
      })
      .filter((cat) => cat.monto > 0)
      .sort((a, b) => b.monto - a.monto);
    return consolidatedCategories.length ? consolidatedCategories : resumenMetrics.categories;
  }, [resumenMetrics, currentDeptData, departmentBudgets]);

  const [summaryAnimationKey, setSummaryAnimationKey] = useState(0);

  useEffect(() => {
    if (activeTab === "resumen" && resumenMetrics) {
      setSummaryAnimationKey((k) => k + 1);
    }
  }, [activeTab, resumenMetrics]);

  const animatedPlan = useAnimatedNumber(resumenMetrics?.totalPlan ?? 0, {
    duration: 6000,
    delay: 200,
    trigger: summaryAnimationKey,
  });
  const animatedIngresos = useAnimatedNumber(resumenMetrics?.totalIngresos ?? 0, {
    duration: 6800,
    delay: 450,
    trigger: summaryAnimationKey,
  });
  const animatedGastos = useAnimatedNumber(resumenMetrics?.totalGastos ?? 0, {
    duration: 7600,
    delay: 700,
    trigger: summaryAnimationKey,
  });
  const animatedDisponible = useAnimatedNumber(resumenMetrics?.disponible ?? 0, {
    duration: 8400,
    delay: 950,
    trigger: summaryAnimationKey,
  });
  const animatedCumplimiento = useAnimatedNumber(1, {
    duration: 9200,
    delay: 1200,
    trigger: summaryAnimationKey,
  });
  const animatedEjecucion = useAnimatedNumber(resumenMetrics?.totalGastos ?? 0, {
    duration: 6400,
    delay: 0,
    trigger: summaryAnimationKey,
  });
  const animatedBalance = useAnimatedNumber(
    (resumenMetrics?.totalIngresos ?? 0) - (resumenMetrics?.totalGastos ?? 0),
    {
      duration: 10000,
      delay: 1500,
      trigger: summaryAnimationKey,
    }
  );

  const animatedComplianceBar = useMemo(() => {
    if (!resumenMetrics) return 0;
    const target = Math.min(resumenMetrics.cumplimiento * 100, 100);
    const t = animatedCumplimiento; // 0 → 1
    const overshootFactor = 1.08;
    const midPoint = 0.7;

    let factor = 1;
    if (t <= midPoint) {
      const phase = t / Math.max(midPoint, 0.0001);
      factor = overshootFactor * phase;
    } else {
      const phase = (t - midPoint) / Math.max(1 - midPoint, 0.0001);
      factor = overshootFactor - (overshootFactor - 1) * phase;
    }

    const value = target * factor;
    return Math.min(value, 100);
  }, [animatedCumplimiento, resumenMetrics]);

  const handleGenerateReceipt = useCallback(
    (entry: Expense | Income, type: "gasto" | "ingreso") => {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const now = new Date();
      const amount = Number(entry.monto) || 0;
      const concept =
        entry.descripcion ||
        (type === "gasto"
          ? `Gasto registrado en ${(entry as Expense).categoria || "sin categoría"}.`
          : `Ingreso registrado desde ${(entry as Income).fuente || "fuente sin especificar"}.`);

      const logoWidth = 26;
      const logoHeight = 26;
      const textStartX = logoDataUrl ? 14 + logoWidth + 6 : 14;
      let cursorY = 20;

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", 14, 12, logoWidth, logoHeight);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Iniciativas Elebi — Contabilidad", textStartX, cursorY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      cursorY += 6;
      doc.text(`Documento: ${type === "gasto" ? "Comprobante de gasto" : "Recibo de ingreso"}`, textStartX, cursorY);
      cursorY += 6;
      doc.text(`Departamento: ${currentDeptData?.nombre ?? "Consolidado General"}`, textStartX, cursorY);
      cursorY += 6;
      doc.text(`Fecha emisión: ${now.toLocaleDateString("es-ES")}`, textStartX, cursorY);

      const sectionDividerY = Math.max(cursorY + 6, logoDataUrl ? 12 + logoHeight + 6 : cursorY + 6);
      doc.line(14, sectionDividerY, 196, sectionDividerY);

      doc.setFont("helvetica", "bold");
      doc.text("Detalle de la operación", 14, sectionDividerY + 8);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha operación: ${entry.fecha || "N/D"}`, 14, sectionDividerY + 15);
      doc.text(
        `${type === "gasto" ? "Categoría" : "Fuente"}: ${
          type === "gasto"
            ? (entry as Expense).categoria || "No especificada"
            : (entry as Income).fuente || "No especificada"
        }`,
        14,
        sectionDividerY + 21
      );
      doc.text(`Monto: ${formatCurrency(amount)}`, 14, sectionDividerY + 27);

      doc.setFont("helvetica", "bold");
      doc.text("Descripción / Concepto", 14, sectionDividerY + 38);
      doc.setFont("helvetica", "normal");
      const wrapped = doc.splitTextToSize(concept, 180);
      doc.text(wrapped, 14, sectionDividerY + 44);

      doc.line(14, 140, 196, 140);
      doc.setFont("helvetica", "italic");
      doc.text("Documento generado automáticamente por el módulo de Contabilidad.", 14, 147);

      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPdfPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          url,
          title: `${type === "gasto" ? "Comprobante" : "Recibo"} — ${entry.fecha || "Sin fecha"}`,
        };
      });
    },
    [currentDeptData, logoDataUrl]
  );

  useEffect(() => {
    return () => {
      if (pdfPreview) {
        URL.revokeObjectURL(pdfPreview.url);
      }
    };
  }, [pdfPreview]);

  useEffect(() => {
    if (!resumenMetrics || activeTab !== "resumen") return;
    renderCharts(resumenMetrics, chartCategories);

    return () => {
      trendChartInstance.current?.destroy();
      trendChartInstance.current = null;
      categoryChartInstance.current?.destroy();
      categoryChartInstance.current = null;
    };
  }, [resumenMetrics, activeTab, showPercentages, chartCategories]);

  useEffect(() => {
    if (!showCategoryModal || !resumenMetrics) return;
    const ctx = categoryDetailChartRef.current?.getContext("2d");
    if (!ctx) return;
    categoryDetailChartInstance.current?.destroy();
    categoryDetailChartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: resumenMetrics.categories.map((cat) => cat.nombre),
        datasets: [
          {
            data: resumenMetrics.categories.map((cat) => cat.monto),
            backgroundColor: [
              "#3b82f6",
              "#a855f7",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#0ea5e9",
              "#6366f1",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                const value = context.parsed;
                if (!showPercentages) {
                  return `${label}: ${formatCurrency(value || 0)}`;
                }
                const total =
                  (context.chart?.data?.datasets?.[0]?.data || []).reduce(
                    (acc: number, val: number) => acc + val,
                    0
                  ) || 1;
                const percent = ((value || 0) / total) * 100;
                return `${label}: ${percent.toFixed(1)}%`;
              },
            },
          },
        },
      },
    });

    return () => {
      categoryDetailChartInstance.current?.destroy();
      categoryDetailChartInstance.current = null;
    };
  }, [showCategoryModal, resumenMetrics, showPercentages]);

  const renderCharts = (metrics: ResumenSnapshot, categories: CategorySlice[]) => {
    if (!metrics) return;

    // Destroy old charts
    trendChartInstance.current?.destroy();
    categoryChartInstance.current?.destroy();

    // Trend chart (Ingresos vs Gastos)
    const ctx1 = trendChartRef.current?.getContext("2d");
    if (ctx1) {
      trendChartInstance.current = new Chart(ctx1, {
        type: "line",
        data: {
          labels: metrics.months || [],
          datasets: [
            {
              label: "Ingresos",
              data: metrics.ingresosMes || [],
              borderColor: "#22c55e",
              tension: 0.4,
              backgroundColor: "rgba(34,197,94,0.15)",
              fill: true,
            },
            {
              label: "Gastos",
              data: metrics.gastosMes || [],
              borderColor: "#ef4444",
              tension: 0.4,
              backgroundColor: "rgba(239,68,68,0.1)",
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const datasetLabel = context.dataset.label || "";
                  const value = context.parsed.y ?? context.parsed;
                  if (!showPercentages) {
                    return `${datasetLabel}: ${formatCurrency(value || 0)}`;
                  }
                  const total =
                    metrics.ingresosMes[context.dataIndex] +
                    metrics.gastosMes[context.dataIndex] || 1;
                  const percent = total ? ((value || 0) / total) * 100 : 0;
                  return `${datasetLabel}: ${percent.toFixed(1)}%`;
                },
              },
            },
          },
        },
      });
    }

    // Category chart
    const ctx2 = categoryChartRef.current?.getContext("2d");
    if (ctx2 && categories.length) {
      categoryChartInstance.current = new Chart(ctx2, {
        type: "doughnut",
        data: {
          labels: categories.map((cat) => cat.nombre),
          datasets: [
            {
              data: categories.map((cat) => cat.monto),
              backgroundColor: ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || "";
                  const value = context.parsed;
                  if (!showPercentages) {
                    return `${label}: ${formatCurrency(value || 0)}`;
                  }
                  const total =
                    (context.chart?.data?.datasets?.[0]?.data || []).reduce(
                      (acc: number, val: number) => acc + val,
                      0
                    ) || 1;
                  const percent = total ? ((value || 0) / total) * 100 : 0;
                  return `${label}: ${percent.toFixed(1)}%`;
                },
              },
            },
          },
        },
      });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-[#004080] mb-4">Contabilidad</h2>

      {/* Department selector */}
      <div className="card mb-6 border p-4 rounded-lg shadow">
        <label className="block text-lg font-medium mb-2">Departamento:</label>
        <select
          value={currentDept}
          onChange={(e) => setCurrentDept(e.target.value)}
          className="border p-2 rounded-md w-full"
        >
          {departments.length === 0 ? (
            <option>Cargando...</option>
          ) : (
            departments.map((d) => <option key={d}>{d}</option>)
          )}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "resumen" ? "text-[#004080] border-b-2 border-[#004080]" : "text-gray-500"
          }`}
        >
          Resumen Presupuestario
        </button>
        <button
          onClick={() => setActiveTab("gastos")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "gastos" ? "text-[#004080] border-b-2 border-[#004080]" : "text-gray-500"
          }`}
        >
          Gastos
        </button>
        <button
          onClick={() => setActiveTab("ingresos")}
          className={`px-4 py-2 font-semibold ${
            activeTab === "ingresos" ? "text-[#004080] border-b-2 border-[#004080]" : "text-gray-500"
          }`}
        >
          Ingresos
        </button>
      </div>

      {/* Resumen */}
      {activeTab === "resumen" && resumenMetrics && currentDeptData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">📈 Tendencia Mensual</h3>
            <div className="h-72">
              <canvas ref={trendChartRef}></canvas>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">💰 Distribución de Gastos</h3>
            <div className="h-72">
              <canvas ref={categoryChartRef}></canvas>
            </div>
            <div className="flex justify-end gap-2 text-xs text-gray-600 mt-3">
              <button
                type="button"
                onClick={() => setShowPercentages((prev) => !prev)}
                className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-200 transition-colors"
              >
                <span className="font-semibold text-[#004080]">Tooltip</span>
                <span className="text-gray-500">
                  {showPercentages ? "Mostrar % del total" : "Mostrar valores absolutos"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="inline-flex items-center gap-1 text-[#004080] border border-[#004080]/30 rounded-full px-3 py-1 hover:bg-[#004080]/10 transition-colors"
              >
                Ver detalle
              </button>
            </div>
          </div>

          <div className="col-span-2 bg-white p-4 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#004080]/70">
                  {currentDeptData.nombre} · {budgetYear}
                </p>
                <h3 className="text-lg font-semibold">💼 Estado del Presupuesto</h3>
                <p className="text-sm text-gray-500">
                  Plan aprobado: {formatCurrency(resumenMetrics.totalPlan)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Cumplimiento</p>
                <p className="text-3xl font-black text-[#004080]">
                  {(resumenMetrics.cumplimiento * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Ejecución acumulada</span>
                <span>{formatCurrency(animatedEjecucion)}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-[#00b4d8] to-[#0077b6]"
                  style={{
                    width: `${animatedComplianceBar}%`,
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="p-3 rounded-2xl bg-[#f0f6ff] border border-[#004080]/10">
                <p className="text-gray-600">Plan aprobado</p>
                <p className="text-xl font-semibold text-[#001e3c]">
                  {formatCurrency(animatedPlan)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#fef9c3] border border-yellow-200">
                <p className="text-gray-600">Ingresos confirmados</p>
                <p className="text-xl font-semibold text-[#8a5d00]">
                  {formatCurrency(animatedIngresos)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#fee2e2] border border-rose-200">
                <p className="text-gray-600">Gasto ejecutado</p>
                <p className="text-xl font-semibold text-[#991b1b]">
                  {formatCurrency(animatedGastos)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-[#dcfce7] border border-green-200">
                <p className="text-gray-600">Disponible</p>
                <p className="text-xl font-semibold text-[#14532d]">
                  {formatCurrency(animatedDisponible)}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              Balance operativo:{" "}
              <span
                className={`font-semibold ${
                  resumenMetrics.totalIngresos - resumenMetrics.totalGastos >= 0
                    ? "text-green-700"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(
                  resumenMetrics.totalIngresos - resumenMetrics.totalGastos
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-6 relative">
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-[#004080]"
            >
              ✕
            </button>
            <h3 className="text-xl font-semibold text-[#004080] mb-4">
              Detalle de categorías — {currentDeptData?.nombre}
            </h3>
            <div className="h-96">
              <canvas ref={categoryDetailChartRef}></canvas>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Pase el cursor para ver valores {showPercentages ? "en porcentaje" : "absolutos"}.
            </p>
          </div>
        </div>
      )}

      {/* Gastos */}
      {activeTab === "gastos" && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between mb-3">
            <h3 className="text-xl font-semibold">Gastos</h3>
          </div>
          <table className="min-w-full text-left border">
            <thead className="bg-[#004080] text-white">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2 text-center">Documento</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    No hay gastos registrados.
                  </td>
                </tr>
              ) : (
                expenses.map((g, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{g.fecha}</td>
                    <td className="px-3 py-2 text-right">{g.monto.toLocaleString()} FCFA</td>
                    <td className="px-3 py-2">{g.categoria}</td>
                    <td className="px-3 py-2">{g.descripcion}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center p-2 rounded-full border border-gray-200 text-[#004080] hover:bg-gray-100 transition"
                        aria-label={`Comprobante PDF del gasto del ${g.fecha}`}
                        onClick={() => handleGenerateReceipt(g, "gasto")}
                      >
                        <PdfIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Ingresos */}
      {activeTab === "ingresos" && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between mb-3">
            <h3 className="text-xl font-semibold">Ingresos</h3>
          </div>
          <table className="min-w-full text-left border">
            <thead className="bg-[#004080] text-white">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2">Fuente</th>
                <th className="px-3 py-2">Descripción</th>
                <th className="px-3 py-2 text-center">Documento</th>
              </tr>
            </thead>
            <tbody>
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-500">
                    No hay ingresos registrados.
                  </td>
                </tr>
              ) : (
                incomes.map((i, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{i.fecha}</td>
                    <td className="px-3 py-2 text-right">{i.monto.toLocaleString()} FCFA</td>
                    <td className="px-3 py-2">{i.fuente}</td>
                    <td className="px-3 py-2">{i.descripcion}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center p-2 rounded-full border border-gray-200 text-[#004080] hover:bg-gray-100 transition"
                        aria-label={`Recibo PDF del ingreso del ${i.fecha}`}
                        onClick={() => handleGenerateReceipt(i, "ingreso")}
                      >
                        <PdfIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {pdfPreview && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border border-black/10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-[#004080]">{pdfPreview.title}</h3>
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-[#004080]"
                onClick={() => {
                  URL.revokeObjectURL(pdfPreview.url);
                  setPdfPreview(null);
                }}
              >
                Cerrar ✕
              </button>
            </div>
            <div className="flex-1">
              <iframe
                title="Vista previa PDF"
                src={pdfPreview.url}
                className="w-full h-full rounded-b-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contabilidad;
