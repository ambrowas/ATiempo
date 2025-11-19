// src/components/Empleados.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import whatsappIcon from "./icons/whatsap.png";
import { assetUrl, normalizeAssetPath } from "../utils/assetPaths";

/* ================= Types ================= */
type Empleado = {
  id: string | number;
  nombre: string;
  apellidos?: string;
  nombrecompleto?: string;
  puesto?: string;
  departamento?: string;
  correo?: string;
  telefono?: string;
  direccion?: string;
  direccion_personal?: string;
  fecha_nacimiento?: string;
  fecha_ingreso?: string;
  tipo_contrato?: string;
  descripcion_puesto?: string;
  supervisor_directo?: string;
  modalidad_trabajo?: string;
  habilidades_tecnicas?: string[] | string;
  habilidades_blandas?: string[] | string;
  proyectos_destacados?: string[] | string;
  url_foto?: string;
  foto?: string;
  salario_base?: number;
  banco?: string;
  cuenta_bancaria?: string;
  metodo_pago?: string;
  telefono_personal?: string;
  email_personal?: string;
  nacionalidad?: string;
  lugar_nacimiento?: string;
  estado_civil?: string;
  contacto_emergencia?: string;
  contacto_emergencia_telefono?: string;
  numero_dependientes?: number;
  seguro_medico?: string;
  numero_poliza?: string;
  responsabilidades?: string[];
  jerarquia?: string;
  contrato_actual_pdf?: string;
  dip_pdf?: string;
  curriculum_pdf?: string;
  evaluacion_anual_pdf?: string;
  id_empleado_elebi_pdf?: string;
  [k: string]: any; // keep everything for PDFs and extra fields
};

type PersonalesForm = {
  correo: string;
  email_personal: string;
  telefono: string;
  telefono_personal: string;
  fecha_nacimiento: string;
  lugar_nacimiento: string;
  nacionalidad: string;
  estado_civil: string;
  numero_dependientes: string;
  contacto_emergencia: string;
  contacto_emergencia_telefono: string;
  seguro_medico: string;
  numero_poliza: string;
  direccion: string;
  direccion_personal: string;
};

type ProfesionalesForm = {
  puesto: string;
  departamento: string;
  fecha_ingreso: string;
  tipo_contrato: string;
  modalidad_trabajo: string;
  supervisor_directo: string;
  habilidades_tecnicas: string;
  habilidades_blandas: string;
  proyectos_destacados: string;
};

type FinancierosForm = {
  salario_base: string;
  banco: string;
  cuenta_bancaria: string;
  metodo_pago: string;
};

type EmployeeTab = "personales" | "profesionales" | "financieros" | "puesto" | "documentos";

/* ================= Helpers / Styles ================= */


const card =
  "bg-white rounded-xl shadow-lg border border-gray-300 transition-all duration-300";

const stripPublicPrefix = (p?: string) => normalizeAssetPath(p);

const buildPhotoCandidates = (emp?: Empleado): string[] => {
  const seen = new Set<string>();
  const list: string[] = [];

  const add = (value?: string) => {
    const normalized = assetUrl(value);
    if (!normalized) return;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      list.push(normalized);
    }
  };

  const addWithAlternateExt = (rawPath?: string) => {
    const cleaned = stripPublicPrefix(rawPath);
    if (!cleaned) return;
    add(cleaned);
    if (/\.jpg$/i.test(cleaned)) add(cleaned.replace(/\.jpg$/i, ".jpeg"));
    if (/\.jpeg$/i.test(cleaned)) add(cleaned.replace(/\.jpeg$/i, ".jpg"));
  };

  addWithAlternateExt(emp?.url_foto);
  addWithAlternateExt(emp?.foto);

  const nameVariants = [
    `${emp?.nombre || ""} ${emp?.apellidos || ""}`.trim(),
    emp?.nombrecompleto?.trim(),
    emp?.nombre?.trim(),
  ].filter(Boolean) as string[];

  nameVariants.forEach((variant) => {
    const normalizedName = variant.replace(/\s+/g, " ").trim();
    if (!normalizedName) return;
    add(`./fotos_empleados/${normalizedName}.jpeg`);
    add(`./fotos_empleados/${normalizedName}.jpg`);
  });

  add("https://placehold.co/160x160/004080/ffffff?text=PROFILE");
  return list;
};

const normalizeEmpleado = (raw: any): Empleado => {
  const personal = raw.informacion_personal ?? {};
  const familiar = raw.informacion_familiar ?? {};
  const bancaria = raw.informacion_bancaria ?? {};
  const carrera = raw.datos_carrera ?? {};
  const docs = raw.documentacion ?? {};

  const docPath = (key: string) => {
    if (docs[key]) return stripPublicPrefix(docs[key]);
    if (raw[key]) return stripPublicPrefix(raw[key]);
    const alt = key.endsWith("_pdf") ? key.replace(/_pdf$/, "") : `${key}_pdf`;
    if (docs[alt]) return stripPublicPrefix(docs[alt]);
    if (raw[alt]) return stripPublicPrefix(raw[alt]);
    return undefined;
  };

  const nombre = raw.nombre || raw.nombres || raw.nombrecompleto || "";
  const apellidos = raw.apellidos || raw.apellido || "";

  const salario =
    raw.salario_base ??
    raw.salariomensual ??
    carrera.salario_base ??
    bancaria.salario_mensual_cfa;

  return {
    ...raw,
    id: raw.id,
    nombre,
    apellidos,
    nombrecompleto: raw.nombrecompleto || `${nombre} ${apellidos}`.trim(),
    puesto: raw.puesto,
    departamento: raw.departamento || raw.ubicacion,
    correo: raw.correo || raw.email || raw.email_oficial || personal.email_personal,
    telefono: raw.telefono || raw.telefono_oficial || personal.telefono_personal,
    telefono_personal: personal.telefono_personal,
    email_personal: personal.email_personal,
    direccion: raw.direccion || personal.direccion_personal,
    direccion_personal: personal.direccion_personal || raw.direccion,
    fecha_nacimiento: raw.fecha_nacimiento || personal.fecha_nacimiento,
    lugar_nacimiento: personal.lugar_nacimiento,
    nacionalidad: personal.nacionalidad,
    estado_civil: personal.estado_civil,
    fecha_ingreso: raw.fecha_ingreso || carrera.fecha_ingreso || raw.fechaincorporacion,
    tipo_contrato: raw.tipo_contrato || carrera.tipo_contrato || raw.tipocontrato,
    descripcion_puesto: raw.descripcion_puesto || carrera.descripcion_puesto,
    supervisor_directo: raw.supervisor_directo || carrera.supervisor_directo,
    modalidad_trabajo: raw.modalidad_trabajo || carrera.modalidad_trabajo,
    habilidades_tecnicas: carrera.habilidades_tecnicas,
    habilidades_blandas: carrera.habilidades_blandas,
    proyectos_destacados: carrera.proyectos_principales || carrera.proyectos_destacados,
    salario_base: typeof salario === "number" ? salario : Number(salario) || undefined,
    banco: bancaria.banco,
    cuenta_bancaria: raw.numerocuenta || bancaria.numero_cuenta,
    metodo_pago: bancaria.tipo_cuenta || raw.metodo_pago,
    contacto_emergencia:
      familiar.contacto_emergencia_nombre ||
      raw.contacto_emergencia ||
      familiar.contacto_emergencia,
    contacto_emergencia_telefono:
      familiar.contacto_emergencia_telefono ||
      raw.contacto_emergencia_telefono ||
      raw.telefono_contacto_emergencia,
    numero_dependientes:
      familiar.numero_dependientes ?? personal.dependientes ?? raw.numero_dependientes,
    seguro_medico: familiar.seguro_medico || raw.seguro_medico,
    numero_poliza: familiar.numero_poliza || raw.numero_poliza,
    url_foto: stripPublicPrefix(raw.url_foto || raw.foto),
    responsabilidades: raw.responsabilidades || carrera.responsabilidades,
    jerarquia: raw.jerarquia || carrera.jerarquia,
    contrato_actual_pdf: docPath("contrato_actual_pdf"),
    dip_pdf: docPath("dip_pdf"),
    curriculum_pdf: docPath("curriculum_pdf"),
    evaluacion_anual_pdf: docPath("evaluacion_anual_pdf"),
    id_empleado_elebi_pdf: docPath("id_empleado_elebi_pdf"),
  };
};

const buildPersonalesForm = (emp: Empleado | null): PersonalesForm => ({
  correo: emp?.correo ?? "",
  email_personal: emp?.email_personal ?? "",
  telefono: emp?.telefono ?? "",
  telefono_personal: emp?.telefono_personal ?? "",
  fecha_nacimiento: emp?.fecha_nacimiento ?? "",
  lugar_nacimiento: emp?.lugar_nacimiento ?? "",
  nacionalidad: emp?.nacionalidad ?? "",
  estado_civil: emp?.estado_civil ?? "",
  numero_dependientes:
    emp?.numero_dependientes !== undefined && emp?.numero_dependientes !== null
      ? String(emp.numero_dependientes)
      : "",
  contacto_emergencia: emp?.contacto_emergencia ?? "",
  contacto_emergencia_telefono: emp?.contacto_emergencia_telefono ?? "",
  seguro_medico: emp?.seguro_medico ?? "",
  numero_poliza: emp?.numero_poliza ?? "",
  direccion: emp?.direccion ?? "",
  direccion_personal: emp?.direccion_personal ?? "",
});

const buildProfesionalesForm = (emp: Empleado | null): ProfesionalesForm => ({
  puesto: emp?.puesto ?? "",
  departamento: emp?.departamento ?? "",
  fecha_ingreso: emp?.fecha_ingreso ?? "",
  tipo_contrato: emp?.tipo_contrato ?? "",
  modalidad_trabajo: emp?.modalidad_trabajo ?? "",
  supervisor_directo: emp?.supervisor_directo ?? "",
  habilidades_tecnicas: listToInput(emp?.habilidades_tecnicas),
  habilidades_blandas: listToInput(emp?.habilidades_blandas),
  proyectos_destacados: listToInput(emp?.proyectos_destacados),
});

const buildFinancierosForm = (emp: Empleado | null): FinancierosForm => ({
  salario_base:
    typeof emp?.salario_base === "number" ? String(emp.salario_base) : emp?.salario_base ?? "",
  banco: emp?.banco ?? "",
  cuenta_bancaria: emp?.cuenta_bancaria ?? "",
  metodo_pago: emp?.metodo_pago ?? "",
});

const sanitizeString = (value: string) => value.trim();

const EmployeePhoto: React.FC<{ empleado?: Empleado }> = ({ empleado }) => {
  const candidates = useMemo(() => buildPhotoCandidates(empleado), [empleado]);
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [empleado]);

  const handleError = () => {
    setIndex((prev) => (prev >= candidates.length - 1 ? prev : prev + 1));
  };

  return (
    <img
      src={candidates[index]}
      alt="Foto de Perfil"
      className="w-full h-full object-cover"
      onError={handleError}
    />
  );
};

const titleCaseEs = (txt: string) =>
  txt ? txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase() : txt;

const labelize = (raw: string) =>
  raw
    .replace(/^url_/, "")
    .replace(/_/g, " ")
    .replace(/\bpdf\b/i, "PDF")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const collectPdfFields = (emp: Empleado | null) => {
  if (!emp) return [];
  const out: { key: string; label: string; path: string }[] = [];
  for (const [k, v] of Object.entries(emp)) {
    if (typeof v === "string" && v.toLowerCase().endsWith(".pdf")) {
      out.push({ key: k, label: labelize(k), path: stripPublicPrefix(v)! });
    } else if ((k.endsWith("_pdf") || k.endsWith("_file")) && typeof v === "string") {
      out.push({ key: k, label: labelize(k), path: stripPublicPrefix(v)! });
    }
  }
  return out;
};

const money = (n?: number) =>
  typeof n === "number" ? `${n.toLocaleString("es-GQ")} CFA` : "—";

const formatList = (value?: string[] | string) => {
  if (Array.isArray(value)) return value.join(", ");
  return value || "—";
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

/* ============== Detail helper ============== */
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

/* ================= Component ================= */
const Empleados: React.FC = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("todos");
  const [numFilter, setNumFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");

  // Tabs on employee page
  const [activeTab, setActiveTab] = useState<EmployeeTab>("personales");

  // PDF modal
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState("Documento");

  const [personalesForm, setPersonalesForm] = useState<PersonalesForm>(() => buildPersonalesForm(null));
  const [profesionalesForm, setProfesionalesForm] = useState<ProfesionalesForm>(() =>
    buildProfesionalesForm(null)
  );
  const [financierosForm, setFinancierosForm] = useState<FinancierosForm>(() =>
    buildFinancierosForm(null)
  );
  const [editingSection, setEditingSection] = useState<{
    personales: boolean;
    profesionales: boolean;
    financieros: boolean;
  }>({
    personales: false,
    profesionales: false,
    financieros: false,
  });
  const [savingSection, setSavingSection] = useState<{
    personales: boolean;
    profesionales: boolean;
    financieros: boolean;
  }>({
    personales: false,
    profesionales: false,
    financieros: false,
  });
  const [sectionError, setSectionError] = useState<{
    personales: string | null;
    profesionales: string | null;
    financieros: string | null;
  }>({
    personales: null,
    profesionales: null,
    financieros: null,
  });
  const [sectionSuccess, setSectionSuccess] = useState<{
    personales: boolean;
    profesionales: boolean;
    financieros: boolean;
  }>({
    personales: false,
    profesionales: false,
    financieros: false,
  });

  const openPdf = (url: string, title: string) => {
    setPdfTitle(title);
    setPdfUrl(url);
    setPdfOpen(true);
  };

  const persistEmployeeUpdates = useCallback(
    async (payload: Record<string, any>) => {
      const current = empleados.find((e) => String(e.id) === String(selectedId));
      if (!current) throw new Error("Empleado no encontrado");
      const numericId = Number(current.id);
      const idForUpdate = Number.isNaN(numericId) ? current.id : numericId;
      const electronAPI = (window as any)?.electronAPI;
      if (electronAPI?.updateEmpleado) {
        try {
          const updated = await electronAPI.updateEmpleado({ id: idForUpdate, ...payload });
          return { ok: true, empleado: updated };
        } catch (err) {
          console.warn("Electron updateEmpleado falló, usando API HTTP:", err);
        }
      }
      const response = await fetch(`/api/employees/${current.id}`, {
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
    [empleados, selectedId]
  );

  const updateLocalEmployee = useCallback(
    (nextData: any) => {
      const normalized = normalizeEmpleado(nextData);
      setEmpleados((prev) =>
        prev.map((emp) => (String(emp.id) === String(normalized.id) ? normalized : emp))
      );
    },
    [setEmpleados]
  );

  const handlePersonalesChange = (field: keyof PersonalesForm, value: string) => {
    setPersonalesForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfesionalesChange = (field: keyof ProfesionalesForm, value: string) => {
    setProfesionalesForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFinancierosChange = (field: keyof FinancierosForm, value: string) => {
    setFinancierosForm((prev) => ({ ...prev, [field]: value }));
  };

  const enterSectionEditing = (section: keyof typeof editingSection) => {
    setEditingSection((prev) => ({ ...prev, [section]: true }));
    setSectionError((prev) => ({ ...prev, [section]: null }));
    setSectionSuccess((prev) => ({ ...prev, [section]: false }));
  };

  const cancelSectionEditing = (section: keyof typeof editingSection) => {
    if (!empleado) return;
    if (section === "personales") setPersonalesForm(buildPersonalesForm(empleado));
    if (section === "profesionales") setProfesionalesForm(buildProfesionalesForm(empleado));
    if (section === "financieros") setFinancierosForm(buildFinancierosForm(empleado));
    setEditingSection((prev) => ({ ...prev, [section]: false }));
    setSectionError((prev) => ({ ...prev, [section]: null }));
  };

  const resetSectionStatus = (section: keyof typeof editingSection) => {
    setEditingSection((prev) => ({ ...prev, [section]: false }));
    setSavingSection((prev) => ({ ...prev, [section]: false }));
    setSectionError((prev) => ({ ...prev, [section]: null }));
    setSectionSuccess((prev) => ({ ...prev, [section]: false }));
  };

  const showSectionSuccess = (section: keyof typeof editingSection) => {
    setSectionSuccess((prev) => ({ ...prev, [section]: true }));
    setTimeout(() => {
      setSectionSuccess((prev) => ({ ...prev, [section]: false }));
    }, 2500);
  };

  const savePersonales = async () => {
    const payload: Record<string, any> = {
      correo: sanitizeString(personalesForm.correo),
      email_personal: sanitizeString(personalesForm.email_personal),
      telefono: sanitizeString(personalesForm.telefono),
      telefono_personal: sanitizeString(personalesForm.telefono_personal),
      fecha_nacimiento: sanitizeString(personalesForm.fecha_nacimiento),
      lugar_nacimiento: sanitizeString(personalesForm.lugar_nacimiento),
      nacionalidad: sanitizeString(personalesForm.nacionalidad),
      estado_civil: sanitizeString(personalesForm.estado_civil),
      numero_dependientes: personalesForm.numero_dependientes.trim()
        ? Number(personalesForm.numero_dependientes)
        : undefined,
      contacto_emergencia: sanitizeString(personalesForm.contacto_emergencia),
      contacto_emergencia_telefono: sanitizeString(personalesForm.contacto_emergencia_telefono),
      seguro_medico: sanitizeString(personalesForm.seguro_medico),
      numero_poliza: sanitizeString(personalesForm.numero_poliza),
      direccion: personalesForm.direccion,
      direccion_personal: personalesForm.direccion_personal,
    };

    setSavingSection((prev) => ({ ...prev, personales: true }));
    setSectionError((prev) => ({ ...prev, personales: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const updated = response?.empleado || { ...empleado, ...payload };
      updateLocalEmployee(updated);
      resetSectionStatus("personales");
      showSectionSuccess("personales");
      setPersonalesForm(buildPersonalesForm(normalizeEmpleado(updated)));
    } catch (error) {
      setSectionError((prev) => ({
        ...prev,
        personales: error instanceof Error ? error.message : "No se pudo guardar la información",
      }));
    } finally {
      setSavingSection((prev) => ({ ...prev, personales: false }));
    }
  };

  const saveProfesionales = async () => {
    const payload: Record<string, any> = {
      puesto: sanitizeString(profesionalesForm.puesto),
      departamento: sanitizeString(profesionalesForm.departamento),
      fecha_ingreso: sanitizeString(profesionalesForm.fecha_ingreso),
      tipo_contrato: sanitizeString(profesionalesForm.tipo_contrato),
      modalidad_trabajo: sanitizeString(profesionalesForm.modalidad_trabajo),
      supervisor_directo: sanitizeString(profesionalesForm.supervisor_directo),
      habilidades_tecnicas: splitListInput(profesionalesForm.habilidades_tecnicas),
      habilidades_blandas: splitListInput(profesionalesForm.habilidades_blandas),
      proyectos_destacados: splitListInput(profesionalesForm.proyectos_destacados),
    };

    setSavingSection((prev) => ({ ...prev, profesionales: true }));
    setSectionError((prev) => ({ ...prev, profesionales: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const updated = response?.empleado || { ...empleado, ...payload };
      updateLocalEmployee(updated);
      resetSectionStatus("profesionales");
      showSectionSuccess("profesionales");
      setProfesionalesForm(buildProfesionalesForm(normalizeEmpleado(updated)));
    } catch (error) {
      setSectionError((prev) => ({
        ...prev,
        profesionales:
          error instanceof Error ? error.message : "No se pudo guardar la información",
      }));
    } finally {
      setSavingSection((prev) => ({ ...prev, profesionales: false }));
    }
  };

  const saveFinancieros = async () => {
    const payload: Record<string, any> = {
      salario_base: financierosForm.salario_base.trim()
        ? Number(financierosForm.salario_base)
        : undefined,
      banco: sanitizeString(financierosForm.banco),
      numerocuenta: sanitizeString(financierosForm.cuenta_bancaria),
      cuenta_bancaria: sanitizeString(financierosForm.cuenta_bancaria),
      metodo_pago: sanitizeString(financierosForm.metodo_pago),
      tipo_cuenta: sanitizeString(financierosForm.metodo_pago),
    };

    setSavingSection((prev) => ({ ...prev, financieros: true }));
    setSectionError((prev) => ({ ...prev, financieros: null }));
    try {
      const response = await persistEmployeeUpdates(payload);
      const updated = response?.empleado || { ...empleado, ...payload };
      updateLocalEmployee(updated);
      resetSectionStatus("financieros");
      showSectionSuccess("financieros");
      setFinancierosForm(buildFinancierosForm(normalizeEmpleado(updated)));
    } catch (error) {
      setSectionError((prev) => ({
        ...prev,
        financieros:
          error instanceof Error ? error.message : "No se pudo guardar la información",
      }));
    } finally {
      setSavingSection((prev) => ({ ...prev, financieros: false }));
    }
  };


  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("./datos_empleados.json", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo cargar datos_empleados.json");
        const arr = (await res.json()) as any[];

        const normalized: Empleado[] = arr.map(normalizeEmpleado);

        // Sort alphabetically by full name
        normalized.sort((a, b) =>
          `${a.nombre} ${a.apellidos || ""}`.localeCompare(`${b.nombre} ${b.apellidos || ""}`, "es")
        );

        setEmpleados(normalized);

        // Default selected: first in sorted list
        if (normalized.length > 0) {
          setSelectedId(String(normalized[0].id));
        }
      } catch (e) {
        console.error("Error cargando empleados:", e);
        setEmpleados([]);
      }
    })();
  }, []);

  // Build department list
  const departamentos = useMemo(() => {
    const set = new Set<string>();
    empleados.forEach((e) => {
      if (e.departamento && e.departamento.trim()) set.add(e.departamento.trim());
    });
    return ["todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "es"))];
  }, [empleados]);

  // Apply filters to the list for the *selector*, not to hide the selected page
  const filteredForSelector = useMemo(() => {
    return empleados.filter((e) => {
      const deptOk = deptFilter === "todos" || (e.departamento || "").trim() === deptFilter;
      const numOk = numFilter.trim()
        ? String(e.id).toLowerCase().includes(numFilter.trim().toLowerCase())
        : true;
      return deptOk && numOk;
    });
  }, [empleados, deptFilter, numFilter]);

  // Auto-select first available when filters change (keep stable selection if still visible)
  useEffect(() => {
    if (!filteredForSelector.length) return;
    const stillVisible = filteredForSelector.some((e) => String(e.id) === selectedId);
    if (!stillVisible) {
      setSelectedId(String(filteredForSelector[0].id));
    }
  }, [filteredForSelector, selectedId]);

  // Currently selected employee
  const empleado = useMemo(
    () => empleados.find((e) => String(e.id) === String(selectedId)) || null,
    [empleados, selectedId]
  );

  useEffect(() => {
    setPersonalesForm(buildPersonalesForm(empleado));
    setProfesionalesForm(buildProfesionalesForm(empleado));
    setFinancierosForm(buildFinancierosForm(empleado));
    setEditingSection({ personales: false, profesionales: false, financieros: false });
    setSavingSection({ personales: false, profesionales: false, financieros: false });
    setSectionError({ personales: null, profesionales: null, financieros: null });
    setSectionSuccess({ personales: false, profesionales: false, financieros: false });
  }, [empleado]);

  // PDFs for selected employee
  const pdfs = useMemo(() => collectPdfFields(empleado), [empleado]);
  const tabs = useMemo<EmployeeTab[]>(() => {
    const base: EmployeeTab[] = ["personales", "profesionales", "financieros", "puesto"];
    if (pdfs.length > 0) base.push("documentos");
    return base;
  }, [pdfs.length]);

  useEffect(() => {
    if (activeTab === "documentos" && pdfs.length === 0) {
      setActiveTab("personales");
    }
  }, [activeTab, pdfs.length]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* ===== Filters bar ===== */}
      <div className={`${card} p-4 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Empleado selector */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">Seleccionar Empleado</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {filteredForSelector.map((emp) => (
                <option key={String(emp.id)} value={String(emp.id)}>
                  {emp.nombre} {emp.apellidos || ""} — #{emp.id}
                </option>
              ))}
            </select>
          </div>

          {/* Departamento filter */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">Filtrar por Departamento</label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d === "todos" ? "Todos" : d}
                </option>
              ))}
            </select>
          </div>

          {/* Nº Empleado filter */}
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-1">Filtrar por Nº de Empleado</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
              placeholder="Buscar por número…"
              value={numFilter}
              onChange={(e) => setNumFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ===== When an employee is selected, show header card + tabs ===== */}
      {empleado ? (
        <>
          {/* Header Card */}
          <div className={`${card} p-8 mb-8 flex flex-col md:flex-row items-center md:items-start`}>
            <div className="mx-auto md:mx-0 w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#004080]/50 overflow-hidden shrink-0 shadow-xl">
              <EmployeePhoto empleado={empleado} />
            </div>

            <div className="text-center md:text-left mt-4 md:mt-0 md:ml-6 flex-grow">
              <h2 className="text-3xl font-extrabold text-[#004080] leading-snug">
                {empleado.nombre} {empleado.apellidos || ""}
              </h2>
              <p className="text-xl text-gray-700 font-medium mt-1">{empleado.puesto || "—"}</p>
              <p className="text-md text-gray-500">
                {empleado.departamento || "Departamento no asignado"} &nbsp;•&nbsp; #{empleado.id}
              </p>
              {(empleado.correo || empleado.telefono) && (
                <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                  {empleado.correo && (
                    <a
                      href={`mailto:${empleado.correo}`}
                      className="flex items-center gap-2 px-3 py-1 border border-[#004080]/40 rounded-full text-[#004080] hover:bg-[#004080]/10 transition"
                      title="Enviar correo"
                    >
                      <span role="img" aria-label="email">✉️</span>
                      <span>{empleado.correo}</span>
                    </a>
                  )}
                  {empleado.telefono && (
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        const normalizedPhone = encodeURIComponent(
                          empleado.telefono.replace(/[^\d+]/g, "")
                        );
                        window.open(
                          `https://wa.me/${normalizedPhone}`,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                      aria-label="Abrir WhatsApp"
                      className="flex items-center gap-2 px-3 py-1 border border-green-500/40 rounded-full text-green-600 hover:bg-green-50 transition"
                    >
                      <img src={whatsappIcon} alt="WhatsApp" className="w-4 h-4" />
                      <span>{empleado.telefono}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex justify-start overflow-x-auto border-b-2 border-gray-200 mb-6 bg-white/70 rounded-t-lg">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-6 py-3 font-semibold transition-all duration-200 whitespace-nowrap focus:outline-none ${
                  activeTab === tab
                    ? "text-[#004080] border-b-4 border-[#004080] font-bold"
                    : "text-gray-600 border-b-4 border-transparent hover:border-gray-300 hover:text-gray-800"
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "personales" && "Datos Personales"}
                {tab === "profesionales" && "Datos Profesionales"}
                {tab === "financieros" && "Datos Financieros"}
                {tab === "puesto" && "Puesto"}
                {tab === "documentos" && "Documentación"}
              </button>
            ))}
          </div>

          {/* ===== TAB CONTENT ===== */}
          <div className="space-y-6">
            {/* Datos Personales */}
            {activeTab === "personales" && (
              <div className={`${card} p-6`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-3 mb-5">
                  <h3 className="text-2xl font-bold text-[#004080]">Información Personal</h3>
                  <div className="flex items-center gap-3">
                    {sectionSuccess.personales && (
                      <span className="text-sm font-semibold text-green-700">Cambios guardados</span>
                    )}
                    {editingSection.personales ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelSectionEditing("personales")}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
                          disabled={savingSection.personales}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={savePersonales}
                          className="bg-green-600 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-green-700 disabled:opacity-60"
                          disabled={savingSection.personales}
                        >
                          {savingSection.personales ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => enterSectionEditing("personales")}
                        className="border border-[#004080] text-[#004080] px-4 py-2 rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                {sectionError.personales && (
                  <p className="text-sm text-red-600 font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded mb-4">
                    {sectionError.personales}
                  </p>
                )}

                {editingSection.personales ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: "correo", label: "Correo oficial" },
                      { key: "email_personal", label: "Email personal" },
                      { key: "telefono", label: "Teléfono oficial" },
                      { key: "telefono_personal", label: "Teléfono personal" },
                      { key: "fecha_nacimiento", label: "Fecha de nacimiento" },
                      { key: "lugar_nacimiento", label: "Lugar de nacimiento" },
                      { key: "nacionalidad", label: "Nacionalidad" },
                      { key: "estado_civil", label: "Estado civil" },
                      { key: "numero_dependientes", label: "Nº de dependientes" },
                      { key: "contacto_emergencia", label: "Contacto de emergencia" },
                      { key: "contacto_emergencia_telefono", label: "Teléfono de emergencia" },
                      { key: "seguro_medico", label: "Seguro médico" },
                      { key: "numero_poliza", label: "No. de póliza" },
                      { key: "direccion", label: "Dirección oficial" },
                      { key: "direccion_personal", label: "Dirección personal" },
                    ].map((field) => (
                      <label key={field.key} className="flex flex-col text-sm font-medium text-gray-700">
                        <span>{field.label}</span>
                        <input
                          type={field.key === "numero_dependientes" ? "number" : "text"}
                          className="mt-1 border rounded-lg px-3 py-2"
                          value={personalesForm[field.key as keyof PersonalesForm]}
                          onChange={(e) =>
                            handlePersonalesChange(field.key as keyof PersonalesForm, e.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 text-base">
                    <Detail label="ID de Empleado" value={empleado.id} />
                    <Detail label="Correo oficial" value={empleado.correo} />
                    <Detail label="Email personal" value={empleado.email_personal} />
                    <Detail label="Teléfono oficial" value={empleado.telefono} />
                    <Detail label="Teléfono personal" value={empleado.telefono_personal} />
                    <Detail
                      label="Fecha de nacimiento"
                      value={
                        empleado.fecha_nacimiento
                          ? new Date(empleado.fecha_nacimiento).toLocaleDateString("es-ES")
                          : "—"
                      }
                    />
                    <Detail label="Lugar de nacimiento" value={empleado.lugar_nacimiento} />
                    <Detail label="Nacionalidad" value={empleado.nacionalidad} />
                    <Detail label="Estado civil" value={empleado.estado_civil} />
                    <Detail label="Nº de dependientes" value={empleado.numero_dependientes} />
                    <Detail label="Contacto de emergencia" value={empleado.contacto_emergencia} />
                    <Detail
                      label="Teléfono de emergencia"
                      value={empleado.contacto_emergencia_telefono}
                    />
                    <Detail label="Seguro médico" value={empleado.seguro_medico} />
                    <Detail label="No. de póliza" value={empleado.numero_poliza} />
                    <Detail label="Dirección" value={empleado.direccion} fullWidth />
                  </div>
                )}

              </div>
            )}

            {/* Datos Profesionales */}
            {activeTab === "profesionales" && (
              <div className={`${card} p-6`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-3 mb-5">
                  <h3 className="text-2xl font-bold text-[#004080]">Información Profesional</h3>
                  <div className="flex items-center gap-3">
                    {sectionSuccess.profesionales && (
                      <span className="text-sm font-semibold text-green-700">Cambios guardados</span>
                    )}
                    {editingSection.profesionales ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelSectionEditing("profesionales")}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
                          disabled={savingSection.profesionales}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveProfesionales}
                          className="bg-green-600 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-green-700 disabled:opacity-60"
                          disabled={savingSection.profesionales}
                        >
                          {savingSection.profesionales ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => enterSectionEditing("profesionales")}
                        className="border border-[#004080] text-[#004080] px-4 py-2 rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                {sectionError.profesionales && (
                  <p className="text-sm text-red-600 font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded mb-4">
                    {sectionError.profesionales}
                  </p>
                )}

                {editingSection.profesionales ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: "puesto", label: "Puesto" },
                      { key: "departamento", label: "Departamento" },
                      { key: "fecha_ingreso", label: "Fecha de ingreso" },
                      { key: "tipo_contrato", label: "Tipo de contrato" },
                      { key: "modalidad_trabajo", label: "Modalidad de trabajo" },
                      { key: "supervisor_directo", label: "Supervisor directo" },
                    ].map((field) => (
                      <label key={field.key} className="flex flex-col text-sm font-medium text-gray-700">
                        <span>{field.label}</span>
                        <input
                          type="text"
                          className="mt-1 border rounded-lg px-3 py-2"
                          value={profesionalesForm[field.key as keyof ProfesionalesForm]}
                          onChange={(e) =>
                            handleProfesionalesChange(field.key as keyof ProfesionalesForm, e.target.value)
                          }
                        />
                      </label>
                    ))}
                    <label className="flex flex-col text-sm font-medium text-gray-700 col-span-full">
                      <span>Habilidades técnicas (separadas por coma)</span>
                      <textarea
                        className="mt-1 border rounded-lg px-3 py-2"
                        rows={2}
                        value={profesionalesForm.habilidades_tecnicas}
                        onChange={(e) => handleProfesionalesChange("habilidades_tecnicas", e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-gray-700 col-span-full">
                      <span>Habilidades blandas (separadas por coma)</span>
                      <textarea
                        className="mt-1 border rounded-lg px-3 py-2"
                        rows={2}
                        value={profesionalesForm.habilidades_blandas}
                        onChange={(e) => handleProfesionalesChange("habilidades_blandas", e.target.value)}
                      />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-gray-700 col-span-full">
                      <span>Proyectos destacados (separados por coma)</span>
                      <textarea
                        className="mt-1 border rounded-lg px-3 py-2"
                        rows={2}
                        value={profesionalesForm.proyectos_destacados}
                        onChange={(e) =>
                          handleProfesionalesChange("proyectos_destacados", e.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 text-base">
                    <Detail label="Puesto" value={empleado.puesto} />
                    <Detail label="Departamento" value={empleado.departamento} />
                    <Detail label="Fecha de ingreso" value={empleado.fecha_ingreso} />
                    <Detail label="Tipo de contrato" value={empleado.tipo_contrato} />
                    <Detail label="Modalidad de trabajo" value={empleado.modalidad_trabajo} />
                    <Detail label="Supervisor directo" value={empleado.supervisor_directo} />
                    <Detail
                      label="Habilidades técnicas"
                      value={formatList(empleado.habilidades_tecnicas)}
                      fullWidth
                    />
                    <Detail
                      label="Habilidades blandas"
                      value={formatList(empleado.habilidades_blandas)}
                      fullWidth
                    />
                    <Detail
                      label="Proyectos destacados"
                      value={formatList(empleado.proyectos_destacados)}
                      fullWidth
                    />
                  </div>
                )}

              </div>
            )}

            {/* Datos Financieros */}
            {activeTab === "financieros" && (
              <div className={`${card} p-6`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-3 mb-5">
                  <h3 className="text-2xl font-bold text-[#004080]">Información Financiera</h3>
                  <div className="flex items-center gap-3">
                    {sectionSuccess.financieros && (
                      <span className="text-sm font-semibold text-green-700">Cambios guardados</span>
                    )}
                    {editingSection.financieros ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => cancelSectionEditing("financieros")}
                          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100"
                          disabled={savingSection.financieros}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={saveFinancieros}
                          className="bg-green-600 text-white font-semibold px-5 py-2 rounded-lg shadow hover:bg-green-700 disabled:opacity-60"
                          disabled={savingSection.financieros}
                        >
                          {savingSection.financieros ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => enterSectionEditing("financieros")}
                        className="border border-[#004080] text-[#004080] px-4 py-2 rounded-lg font-semibold hover:bg-[#004080] hover:text-white"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>

                {sectionError.financieros && (
                  <p className="text-sm text-red-600 font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded mb-4">
                    {sectionError.financieros}
                  </p>
                )}

                {editingSection.financieros ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: "salario_base", label: "Salario Base (CFA)", type: "number" },
                      { key: "banco", label: "Banco" },
                      { key: "metodo_pago", label: "Tipo de cuenta / método de pago" },
                      { key: "cuenta_bancaria", label: "Cuenta bancaria" },
                    ].map((field) => (
                      <label key={field.key} className="flex flex-col text-sm font-medium text-gray-700">
                        <span>{field.label}</span>
                        <input
                          type={field.type || "text"}
                          className="mt-1 border rounded-lg px-3 py-2"
                          value={financierosForm[field.key as keyof FinancierosForm]}
                          onChange={(e) =>
                            handleFinancierosChange(field.key as keyof FinancierosForm, e.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-8 text-base">
                    <Detail
                      label="Salario Base"
                      value={
                        typeof empleado.salario_base === "number"
                          ? money(empleado.salario_base)
                          : money(undefined)
                      }
                    />
                    <Detail label="Banco" value={empleado.banco} />
                    <Detail label="Tipo de Cuenta" value={empleado.metodo_pago} />
                    <Detail label="Cuenta Bancaria" value={empleado.cuenta_bancaria} />
                  </div>
                )}

              </div>
            )}

            {/* Puesto */}
            {activeTab === "puesto" && (
              <div className={`${card} p-6 space-y-6`}>
                {/* Descripción */}
                {empleado.descripcion_puesto && (
                  <div className="bg-white rounded-2xl p-5 shadow border border-gray-200">
                    <h3 className="text-lg font-bold text-[#004080] mb-2">Descripción del Puesto</h3>
                    <p className="text-gray-700 leading-relaxed">{empleado.descripcion_puesto}</p>
                  </div>
                )}

                {/* Responsabilidades */}
                {empleado.responsabilidades &&
                  Array.isArray(empleado.responsabilidades) &&
                  empleado.responsabilidades.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 shadow border border-gray-200">
                      <h3 className="text-lg font-bold text-[#004080] mb-2">Responsabilidades</h3>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        {empleado.responsabilidades.map((r: string, i: number) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Jerarquía — vertical diagram */}
                {empleado.jerarquia && (
                  <div className="bg-white rounded-2xl p-5 shadow border border-gray-200">
                    <h3 className="text-lg font-bold text-[#004080] mb-4">Jerarquía</h3>
                    <div className="flex flex-col items-center text-sm text-gray-800 font-medium">
                      {String(empleado.jerarquia)
                        .split("→")
                        .map((level: string, i: number, arr: string[]) => (
                          <React.Fragment key={i}>
                            <div className="px-4 py-2 bg-[#e8f1ff] rounded-xl border border-[#004080]/20 shadow-sm text-center w-full max-w-xs">
                              {level.trim()}
                            </div>
                            {i < arr.length - 1 && (
                              <div className="flex flex-col items-center my-1">
                                <div className="w-1 h-4 bg-[#004080]"></div>
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-transparent border-t-[#004080]"></div>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documentación */}
            {activeTab === "documentos" && (
              <div className={`${card} p-6`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3 mb-5">
                  <div>
                    <h3 className="text-2xl font-bold text-[#004080]">Documentación</h3>
                    <p className="text-sm text-gray-500">
                      {pdfs.length > 0
                        ? "Selecciona un documento para previsualizarlo."
                        : "Todavía no hay documentos digitales para este empleado."}
                    </p>
                  </div>
                  {pdfs.length > 0 && (
                    <span className="text-sm font-semibold text-gray-600">
                      {pdfs.length} documento{pdfs.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {pdfs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pdfs.map((doc) => (
                      <div
                        key={doc.key}
                        className="border border-gray-200 rounded-xl shadow-sm bg-white flex flex-col gap-3 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase text-gray-500 tracking-wide font-semibold">
                              Documento
                            </p>
                            <h4 className="text-lg font-bold text-[#004080] leading-snug">{doc.label}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => openPdf(doc.path, doc.label)}
                            className="px-3 py-1.5 rounded-lg border border-[#004080] text-[#004080] text-sm font-semibold hover:bg-[#004080] hover:text-white transition"
                          >
                            Abrir PDF
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 font-mono break-words border border-gray-100">
                          {doc.path}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8">
                    <p className="text-base font-medium">No hay documentos digitales para este empleado.</p>
                    <p className="text-sm mt-2">
                      Cuando se carguen archivos PDF aparecerán automáticamente en esta sección.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder when no Documentación tab */}
            {pdfs.length === 0 && !tabs.includes("documentos") && (
              <div className={`${card} p-6 text-center text-gray-600`}>
                <h3 className="text-lg font-bold text-[#004080] mb-2">Documentación</h3>
                <p>No hay archivos PDF registrados para este empleado.</p>
              </div>
            )}
          </div>

          {/* PDF Modal */}
          {pdfOpen && pdfUrl && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
              <div className="bg-white w-full max-w-3xl h-[80vh] rounded-xl shadow-2xl border border-gray-300 overflow-hidden flex flex-col">
                <div className="px-4 py-2 bg-[#004080] text-white flex justify-between items-center">
                  <span className="font-semibold truncate">{pdfTitle}</span>
                  <button
                    onClick={() => setPdfOpen(false)}
                    className="bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-sm"
                    title="Cerrar"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="flex-1 bg-gray-100">
                  <iframe title={pdfTitle} src={pdfUrl} className="w-full h-full" style={{ border: "none" }} />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={`${card} p-10 text-center`}>
          <p className="text-gray-600">No hay empleados para mostrar.</p>
        </div>
      )}
    </div>
  );
};

export default Empleados;
