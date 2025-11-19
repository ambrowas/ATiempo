import React, { useEffect, useMemo, useRef, useState } from "react";
import { UsersIcon, DocumentIcon, TruckIcon, CalendarIcon } from "./icons";
import { jsPDF } from "jspdf";
import { useSpring, animated } from "@react-spring/web";
import elebiLogo from "../assets/elebilogo.png";
import whatsappIcon from "./icons/whatsap.png";
import { assetUrl } from "../utils/assetPaths";

type EmployeeRecord = {
  id?: number | string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  nombrecompleto?: string;
  departamento?: string;
  puesto?: string;
  foto?: string;
  email_oficial?: string;
  correo?: string;
  telefono_oficial?: string;
  telefono?: string;
};

type VehicleRecord = {
  id: string;
  descripcion?: string;
  departamento?: string;
  asignacion?: string;
  matricula?: string;
  conductor?: string;
  foto?: string;
};

type DepartmentBudget = {
  nombre: string;
  presupuesto_anual: number;
  presupuesto_mensual: Record<
    string,
    { plan: number; ingresos: number; gastos: number }
  >;
};

type InventoryCategory = {
  categoria: string;
  descripcion?: string;
  items: string[];
  responsable?: string;
  contacto?: string;
};

type AnimatedNumberProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
};

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2500,
  className,
}) => {
  const spring = useSpring({
    from: { number: 0 },
    number: value,
    config: { duration },
  });
  return (
    <animated.span className={className}>
      {spring.number.to((n) =>
        `${prefix}${Number(n).toLocaleString("es-GQ", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`
      )}
    </animated.span>
  );
};

const ObjectiveProgress: React.FC<{ value: number; duration?: number }> = ({ value, duration = 2800 }) => {
  const spring = useSpring({ from: { width: 0 }, to: { width: value }, config: { duration } });
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <animated.div
        className="h-2 rounded-full bg-gradient-to-r from-[#00b4d8] via-[#0077b6] to-[#004080]"
        style={{ width: spring.width.to((n) => `${Math.min(n, 125)}%`) }}
      />
    </div>
  );
};

const CORE_TEAM = [
  {
    id: "marina-micha",
    name: "Marina Micha Ela",
    role: "Asistenta Personal",
    email: "marina.micha@iniciativaselebi.com",
    whatsapp: "+240227123456",
    photo: "/fotos_empleados/marina.jpg",
  },
  {
    id: "jovita-eyang",
    name: "Jovita Eyang Malabo",
    role: "Secretaria Ejecutiva",
    email: "jovita.eyang@iniciativaselebi.com",
    whatsapp: "+240227654321",
    photo: "/fotos_empleados/jovita.webp",
  },
  {
    id: "anakyn-angue",
    name: "Anakyn Angue Biong",
    role: "Director de Gabinete",
    email: "anakyn.angue@iniciativaselebi.com",
    whatsapp: "+240770001111",
    photo: "/fotos_empleados/Mandombe .webp",
  },
  {
    id: "juan-nchaso",
    name: "Juan Nchaso Lohoba",
    role: "Conductor",
    email: "juan.nchaso@iniciativaselebi.com",
    whatsapp: "+240550009876",
    photo: "/fotos_empleados/juan.webp",
  },
  {
    id: "francisco-ntutumu",
    name: "Francisco Ntutumu Medang",
    role: "Técnico",
    email: "francisco.ntutumu@iniciativaselebi.com",
    whatsapp: "+240333198765",
    photo: "/fotos_empleados/francisco.webp",
  },
];

const CORE_TEAM_MAP = CORE_TEAM.reduce<Record<string, typeof CORE_TEAM[number]>>(
  (acc, member) => {
    acc[member.id] = member;
    return acc;
  },
  {}
);

const HIERARCHY_SECTIONS = [
  {
    title: "Dirección y Gabinete",
    description: "Liderazgo estratégico y toma de decisiones.",
    members: ["anakyn-angue"],
  },
  {
    title: "Asistencia Ejecutiva",
    description: "Coordinación administrativa y enlace protocolario.",
    members: ["marina-micha", "jovita-eyang"],
  },
  {
    title: "Operaciones y Soporte Técnico",
    description: "Acompañamiento en campo y soporte especializado.",
    members: ["francisco-ntutumu", "juan-nchaso"],
  },
];

const extraTeamPhotoKey = "mi_departamento_extra_team_photos";
const EXTRA_EXTENDED_TEAM: EmployeeRecord[] = [
  {
    id: "jaime-mandome",
    nombrecompleto: "Jaime Mandome Zaragoza",
    puesto: "Coordinador Operativo",
    correo: "jaime.mandome@iniciativaselebi.com",
    telefono_oficial: "+240225009900",
    foto: "/fotos_empleados/jaime.webp",
  },
];

const CALENDARIO_MESES = [
  {
    mes: "Enero 2025",
    clave: "ene-2025",
    eventos: [
      {
        id: "CAL-001",
        titulo: "Kickoff anual",
        fecha: "08 Ene 2025",
        hora: "09:30",
        lugar: "Sala Ejecutiva Sipopo",
        responsable: "Anakyn Angue",
        descripcion: "Presentación del plan estratégico y prioridades del año.",
      },
      {
        id: "CAL-002",
        titulo: "Mesa de transparencia",
        fecha: "22 Ene 2025",
        hora: "11:00",
        lugar: "Sala Consejo",
        responsable: "Victor M. Ele Ela",
        descripcion: "Actualización de reportes y compromisos con organismos multilaterales.",
      },
    ],
  },
  {
    mes: "Febrero 2025",
    clave: "feb-2025",
    eventos: [
      {
        id: "CAL-003",
        titulo: "Comité de alianzas",
        fecha: "04 Feb 2025",
        hora: "10:00",
        lugar: "Sala Consejo",
        responsable: "Victor M. Ele Ela",
        descripcion: "Revisión de convenios y acuerdos con nuevos socios.",
      },
      {
        id: "CAL-004",
        titulo: "Mesa técnica de movilidad",
        fecha: "18 Feb 2025",
        hora: "16:00",
        lugar: "Sala Malibú",
        responsable: "Jaime Mandome",
        descripcion: "Evaluación de rutas y optimización de flota ejecutiva.",
      },
    ],
  },
  {
    mes: "Marzo 2025",
    clave: "mar-2025",
    eventos: [
      {
        id: "CAL-005",
        titulo: "Seguimiento de objetivos",
        fecha: "10 Mar 2025",
        hora: "09:00",
        lugar: "Sala Ejecutiva",
        responsable: "Anakyn Angue",
        descripcion: "Balance trimestral de indicadores KPI y ajustes tácticos.",
      },
      {
        id: "CAL-006",
        titulo: "Sesión de storytelling institucional",
        fecha: "24 Mar 2025",
        hora: "11:30",
        lugar: "Estudio Media Elebi",
        responsable: "Marina Micha",
        descripcion: "Guionización de campañas y mensajes para stakeholders.",
      },
    ],
  },
  {
    mes: "Abril 2025",
    clave: "abr-2025",
    eventos: [
      {
        id: "CAL-007",
        titulo: "Revisión de proyectos prioritarios",
        fecha: "07 Abr 2025",
        hora: "10:15",
        lugar: "Sala Consejo",
        responsable: "Victor M. Ele Ela",
        descripcion: "Supervisión de hitos y recursos para proyectos estratégicos.",
      },
      {
        id: "CAL-008",
        titulo: "Clínica de protocolo",
        fecha: "18 Abr 2025",
        hora: "13:00",
        lugar: "Centro de Formación",
        responsable: "Jovita Eyang",
        descripcion: "Repaso de lineamientos ceremoniales y manual de imagen.",
      },
    ],
  },
  {
    mes: "Mayo 2025",
    clave: "may-2025",
    eventos: [
      {
        id: "CAL-009",
        titulo: "Mesa de innovación logística",
        fecha: "07 May 2025",
        hora: "09:45",
        lugar: "Laboratorio Elebi",
        responsable: "Francisco Ntutumu",
        descripcion: "Pruebas piloto de seguimiento vehicular y telemetría.",
      },
      {
        id: "CAL-010",
        titulo: "Consejo de relaciones públicas",
        fecha: "21 May 2025",
        hora: "15:15",
        lugar: "Sala Sipopo",
        responsable: "Marina Micha",
        descripcion: "Definición de mensajes clave para el foro regional.",
      },
    ],
  },
  {
    mes: "Junio 2025",
    clave: "jun-2025",
    eventos: [
      {
        id: "CAL-011",
        titulo: "Planeación del segundo semestre",
        fecha: "04 Jun 2025",
        hora: "10:00",
        lugar: "Sala Consejo",
        responsable: "Anakyn Angue",
        descripcion: "Alineación de prioridades y calendario de iniciativas.",
      },
      {
        id: "CAL-012",
        titulo: "Simulacro de contingencia",
        fecha: "19 Jun 2025",
        hora: "08:00",
        lugar: "War room Dirección General",
        responsable: "Jovita Eyang",
        descripcion: "Ejercicio integral de continuidad operativa.",
      },
    ],
  },
  {
    mes: "Julio 2025",
    clave: "jul-2025",
    eventos: [
      {
        id: "CAL-013",
        titulo: "Reunión estratégica con Gabinete",
        fecha: "21 Jul 2025",
        hora: "10:00",
        lugar: "Sala Ejecutiva Sipopo",
        responsable: "Anakyn Angue",
        descripcion: "Seguimiento trimestral de compromisos diplomáticos y ajustes de agenda.",
      },
      {
        id: "CAL-014",
        titulo: "Briefing operativo",
        fecha: "30 Jul 2025",
        hora: "08:30",
        lugar: "War room Dirección General",
        responsable: "Jovita Eyang",
        descripcion: "Sincronización semanal de tareas y alertas prioritarias.",
      },
    ],
  },
  {
    mes: "Agosto 2025",
    clave: "ago-2025",
    eventos: [
      {
        id: "CAL-015",
        titulo: "Audiencia con socios internacionales",
        fecha: "05 Ago 2025",
        hora: "11:00",
        lugar: "Sala Consejo (Malabo II)",
        responsable: "Victor M. Ele Ela",
        descripcion: "Presentación de resultados y pipeline de proyectos multilaterales.",
      },
      {
        id: "CAL-016",
        titulo: "Capacitación ElebiSuite",
        fecha: "12 Ago 2025",
        hora: "09:00",
        lugar: "Centro de Innovación",
        responsable: "Francisco Ntutumu",
        descripcion: "Actualización de herramientas digitales para personal administrativo.",
      },
    ],
  },
  {
    mes: "Septiembre 2025",
    clave: "sep-2025",
    eventos: [
      {
        id: "CAL-017",
        titulo: "Planificación misiones bilaterales",
        fecha: "03 Sep 2025",
        hora: "10:30",
        lugar: "Sala Malabo Urbano",
        responsable: "Marina Micha",
        descripcion: "Coordinación logística para las visitas oficiales del trimestre.",
      },
      {
        id: "CAL-018",
        titulo: "Taller de seguridad y protocolo",
        fecha: "18 Sep 2025",
        hora: "15:00",
        lugar: "Centro de Innovación",
        responsable: "Francisco Ntutumu",
        descripcion: "Simulacro de respuesta ante incidentes para el personal clave.",
      },
    ],
  },
  {
    mes: "Octubre 2025",
    clave: "oct-2025",
    eventos: [
      {
        id: "CAL-019",
        titulo: "Revisión presupuestaria",
        fecha: "07 Oct 2025",
        hora: "09:00",
        lugar: "Sala Consejo",
        responsable: "Victor M. Ele Ela",
        descripcion: "Ajuste de metas financieras de cierre anual.",
      },
      {
        id: "CAL-020",
        titulo: "Encuentro con representantes regionales",
        fecha: "23 Oct 2025",
        hora: "12:00",
        lugar: "Sala Sipopo",
        responsable: "Anakyn Angue",
        descripcion: "Intercambio de buenas prácticas y necesidades operativas.",
      },
    ],
  },
  {
    mes: "Noviembre 2025",
    clave: "nov-2025",
    eventos: [
      {
        id: "CAL-021",
        titulo: "Mesa de innovación",
        fecha: "05 Nov 2025",
        hora: "11:00",
        lugar: "Laboratorio Elebi",
        responsable: "Francisco Ntutumu",
        descripcion: "Presentación de pilotos tecnológicos y mejoras de procesos.",
      },
      {
        id: "CAL-022",
        titulo: "Briefing operativo especial",
        fecha: "19 Nov 2025",
        hora: "08:00",
        lugar: "War room Dirección General",
        responsable: "Jovita Eyang",
        descripcion: "Seguimiento de misiones y estatus de seguridad para fin de año.",
      },
    ],
  },
  {
    mes: "Diciembre 2025",
    clave: "dic-2025",
    eventos: [
      {
        id: "CAL-023",
        titulo: "Comité de cierre anual",
        fecha: "09 Dic 2025",
        hora: "10:00",
        lugar: "Sala Consejo",
        responsable: "Victor M. Ele Ela",
        descripcion: "Validación de hitos y aprobación de memoria institucional.",
      },
      {
        id: "CAL-024",
        titulo: "Cena de reconocimiento",
        fecha: "20 Dic 2025",
        hora: "19:30",
        lugar: "Club Diplomático Malabo",
        responsable: "Marina Micha",
        descripcion: "Evento protocolario para reconocer al equipo directivo.",
      },
    ],
  },
];
const OBJETIVOS_DPTO = {
  mensuales: [
    {
      id: "OBJ-001",
      titulo: "Implementar tablero de mando unificado",
      avance: 72,
      responsable: "Anakyn Angue",
      deadline: "Julio 2025",
      descripcion: "Construcción del cuadro de mando con datos de logística, RRHH y finanzas.",
    },
    {
      id: "OBJ-002",
      titulo: "Digitalizar 100% de actas y acuerdos",
      avance: 48,
      responsable: "Jovita Eyang",
      deadline: "Agosto 2025",
      descripcion: "Migración de archivos físicos a repositorio cifrado con firmas electrónicas.",
    },
  ],
  trimestrales: [
    {
      id: "OBJ-003",
      titulo: "Reducir tiempos de respuesta logística",
      avance: 61,
      responsable: "Jaime Mandome",
      deadline: "Q3 2025",
      descripcion: "Diseñar esquema express para desplazamientos diplomáticos urgentes.",
    },
    {
      id: "OBJ-004",
      titulo: "Actualizar manual de protocolo",
      avance: 35,
      responsable: "Jovita Eyang",
      deadline: "Q4 2025",
      descripcion: "Revisión completa del manual ceremonial y lineamientos de imagen.",
    },
  ],
  semestrales: [
    {
      id: "OBJ-005",
      titulo: "Certificar centro de innovación",
      avance: 52,
      responsable: "Francisco Ntutumu",
      deadline: "2S 2025",
      descripcion: "Proceso de certificación y homologación de laboratorios Elebi.",
    },
  ],
  anuales: [
    {
      id: "OBJ-006",
      titulo: "Fortalecer alianzas multilaterales",
      avance: 40,
      responsable: "Victor M. Ele Ela",
      deadline: "2025",
      descripcion: "Expansión de acuerdos y memorandos con organismos clave.",
    },
  ],
};

const OBJETIVOS_CATEGORIES = [
  { key: "mensuales", label: "Mensuales" },
  { key: "trimestrales", label: "Trimestrales" },
  { key: "semestrales", label: "Semestrales" },
  { key: "anuales", label: "Anuales" },
] as const;

const MiDepartamento: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "equipo" | "calendario" | "objetivos" | "recursos" | "presupuestos" | "solicitudes"
  >("equipo");
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [deptName, setDeptName] = useState<string>("Dirección General");
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [budgets, setBudgets] = useState<DepartmentBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeRecord | null>(null);
  const [inventory, setInventory] = useState<InventoryCategory[]>([]);
  const [docPreview, setDocPreview] = useState<{ url: string; title: string } | null>(null);
  const [calendarData, setCalendarData] = useState(CALENDARIO_MESES);
  const [calendarOpen, setCalendarOpen] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    CALENDARIO_MESES.forEach((section, idx) => {
      defaults[section.clave] = idx === 0;
    });
    return defaults;
  });
  const [calendarFullView, setCalendarFullView] = useState(false);
  const [newActivityModal, setNewActivityModal] = useState(false);
  const [newActivity, setNewActivity] = useState({
    titulo: "",
    tipo: "Reunión",
    fecha: "",
    hora: "",
    lugar: "",
    responsable: "",
    descripcion: "",
  });
  const [objetivosOpen, setObjetivosOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    OBJETIVOS_CATEGORIES.forEach(({ key }) => {
      initial[key] = true;
    });
    return initial;
  });
  const toggleCalendarSection = (key: string) => {
    setCalendarOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const toggleFullCalendar = () => {
    setCalendarFullView((prev) => {
      const enteringFullView = !prev;
      if (enteringFullView) {
        setCalendarOpen((current) => {
          const nextState = { ...current };
          calendarData.forEach((section) => {
            nextState[section.clave] = true;
          });
          return nextState;
        });
      }
      return enteringFullView;
    });
  };
  const toggleObjetivoSection = (key: string) => {
    setObjetivosOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const handleNewCalendarEntry = () => {
    setNewActivity({
      titulo: "",
      tipo: "Reunión",
      fecha: "",
      hora: "",
      lugar: "",
      responsable: "",
      descripcion: "",
    });
    setNewActivityModal(true);
  };
  const handleActivityChange = (field: keyof typeof newActivity, value: string) => {
    setNewActivity((prev) => ({ ...prev, [field]: value }));
  };
  const [teamPhotos] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const cached = localStorage.getItem("team_photos");
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [empRes, flotaRes, budgetRes, inventoryRes] = await Promise.all([
          fetch("./datos_empleados.json", { cache: "no-store" }),
          fetch("./flota.json", { cache: "no-store" }),
          fetch("./presupuestos.json", { cache: "no-store" }),
          fetch("./inventario_clave.json", { cache: "no-store" }),
        ]);

        if (!empRes.ok) throw new Error("datos_empleados");
        if (!flotaRes.ok) throw new Error("flota");
        if (!budgetRes.ok) throw new Error("presupuestos");
        if (!inventoryRes.ok) throw new Error("inventario");

        const empJson = await empRes.json();
        const flotaJson = await flotaRes.json();
        const budgetJson = await budgetRes.json();
        const inventoryJson = await inventoryRes.json();

        if (!mounted) return;

        const empList: EmployeeRecord[] = Array.isArray(empJson)
          ? empJson
          : empJson?.empleados || [];
        setEmployees(empList);

        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem("currentEmployeeId")
            : null;
        const normalizedId = savedId ? Number(savedId) : null;
        const matched =
          empList.find((emp) => {
            const empId =
              emp.id ??
              (emp as any)?.numero_empleado ??
              (emp as any)?.informacion_personal?.numero_empleado;
            if (empId === undefined || empId === null) return false;
            return Number(empId) === normalizedId;
          }) || null;
        setDeptName(
          matched?.departamento ||
            matched?.puesto ||
            "Dirección General"
        );
        setCurrentEmployee(matched);

        setVehicles(flotaJson?.vehiculos || []);

        const departmentBudget =
          budgetJson?.departamentos?.find(
            (dept: DepartmentBudget) => dept.nombre === (matched?.departamento || deptName)
          ) ||
          budgetJson?.departamentos?.[0] ||
          null;
        setBudgets(departmentBudget);

        const inventoryList = Array.isArray(inventoryJson?.inventario)
          ? inventoryJson.inventario
          : [];
        setInventory(inventoryList);
      } catch (err) {
        console.error("Error cargando datos de MiDepartamento:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (docPreview) {
        URL.revokeObjectURL(docPreview.url);
      }
    };
  }, [docPreview]);

  const colegas = useMemo(() => {
    if (!deptName) return [];
    return employees
      .filter(
        (emp) => (emp.departamento || "").toLowerCase() === deptName.toLowerCase()
      )
      .filter((emp) => {
        if (!currentEmployee?.id) return true;
        return String(emp.id ?? "") !== String(currentEmployee.id);
      });
  }, [employees, deptName, currentEmployee?.id]);

  const deptVehicles = useMemo(() => {
    if (!deptName) return [];
    return vehicles.filter(
      (veh) =>
        (veh.departamento || "").toLowerCase() === deptName.toLowerCase()
    );
  }, [vehicles, deptName]);

const resumenPresupuesto = useMemo(() => {
  if (!budgets) return null;
  const meses = Object.entries(budgets.presupuesto_mensual || {});
  const totals = meses.reduce(
      (acc, [, data]) => {
        acc.plan += data.plan || 0;
        acc.ingresos += data.ingresos || 0;
        acc.gastos += data.gastos || 0;
        return acc;
      },
      { plan: 0, ingresos: 0, gastos: 0 }
    );
    return {
      ...totals,
      disponible: totals.plan - totals.gastos,
      cumplimiento: totals.plan ? totals.gastos / totals.plan : 0,
    };
}, [budgets]);

const ejecucionTargetBase = resumenPresupuesto
  ? Math.min(resumenPresupuesto.cumplimiento * 100, 120)
  : 0;
const ejecucionOvershoot = Math.min(ejecucionTargetBase * 1.05, 125);
const ejecucionSpring = useSpring({
  from: { value: 0 },
  to: resumenPresupuesto
    ? [
        { value: ejecucionOvershoot, config: { duration: 3200 } },
        { value: ejecucionTargetBase, config: { duration: 800 } },
      ]
    : { value: 0 },
  reset: !resumenPresupuesto,
});

  const solicitudesMock = [
  {
    id: "SOL-001",
    tipo: "Vacaciones",
    fecha: "2025-07-01",
    estado: "Aprobado",
    },
    {
      id: "SOL-002",
      tipo: "Material",
      fecha: "2025-07-03",
      estado: "Pendiente",
    },
  {
    id: "SOL-003",
    tipo: "Viáticos",
    fecha: "2025-06-25",
    estado: "Rechazado",
  },
  {
    id: "SOL-004",
    tipo: "Capacitación",
    fecha: "2025-07-08",
    estado: "Pendiente",
  },
  {
    id: "SOL-005",
    tipo: "Licencia Médica",
    fecha: "2025-07-10",
    estado: "Aprobado",
  },
  {
    id: "SOL-006",
    tipo: "Cambio de puesto",
    fecha: "2025-07-12",
    estado: "Pendiente",
  },
  {
    id: "SOL-007",
    tipo: "Anticipo de gastos",
    fecha: "2025-07-14",
    estado: "Pendiente",
  },
  {
    id: "SOL-008",
    tipo: "Horas extra",
    fecha: "2025-07-16",
    estado: "Rechazado",
  },
  ];
  const handleSolicitudPdf = (req: typeof solicitudesMock[number]) => {
    const doc = buildSolicitudPdf(req);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setDocPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { url, title: `${req.id} · ${req.tipo}` };
    });
  };

const handleMinutaPdf = (mes: string, evento: (typeof calendarData[number]["eventos"])[number]) => {
    const doc = buildMinutaPdf(mes, evento);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setDocPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { url, title: `${evento.id} · ${evento.titulo}` };
    });
  };
  const handleObjetivoPdf = (categoria: string, objetivo: (typeof OBJETIVOS_DPTO[keyof typeof OBJETIVOS_DPTO])[number]) => {
    const doc = buildMinutaPdf(categoria, {
      id: objetivo.id,
      titulo: objetivo.titulo,
      fecha: objetivo.deadline,
      hora: "",
      lugar: categoria,
      responsable: objetivo.responsable,
      descripcion: objetivo.descripcion,
    });
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setDocPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { url, title: `${objetivo.id} · ${objetivo.titulo}` };
    });
  };
  const handleSaveNewActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.titulo.trim() || !newActivity.fecha || !newActivity.hora.trim()) {
      alert("Completa al menos título, fecha y hora.");
      return;
    }
    const date = new Date(newActivity.fecha);
    if (Number.isNaN(date.getTime())) {
      alert("Fecha inválida.");
      return;
    }
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const label = `${monthNames[monthIndex]} ${year}`;
    const key = `${monthAbbr[monthIndex]}-${year}`;
    const day = date.getDate().toString().padStart(2, "0");
    const monthLabelShort = monthAbbr[monthIndex].charAt(0).toUpperCase() + monthAbbr[monthIndex].slice(1);
    const formattedDate = `${day} ${monthLabelShort} ${year}`;
    const newId = `CAL-${Math.floor(Date.now() / 1000)}`;
    const event = {
      id: newId,
      titulo: `${newActivity.tipo}: ${newActivity.titulo}`,
      fecha: formattedDate,
      hora: newActivity.hora,
      lugar: newActivity.lugar || "Pendiente",
      responsable: newActivity.responsable || "Equipo Dirección",
      descripcion: newActivity.descripcion || "Actividad registrada manualmente.",
    };
    setCalendarData((prev) => {
      const next = prev.map((section) => ({
        ...section,
        eventos: section.eventos.map((evt) => ({ ...evt })),
      }));
      const target = next.find((section) => section.clave === key);
      if (target) {
        target.eventos = [...target.eventos, event];
      } else {
        next.push({
          mes: label,
          clave: key,
          eventos: [event],
        });
      }
      next.sort((a, b) => monthSortValue(a.clave) - monthSortValue(b.clave));
      setCalendarOpen((prevOpen) => ({ ...prevOpen, [key]: true }));
      return next;
    });
    setNewActivityModal(false);
  };

const buildSolicitudPdf = (req: typeof solicitudesMock[number]) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Detalle de solicitud", 20, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`ID: ${req.id}`, 20, 45);
  doc.text(`Tipo: ${req.tipo}`, 20, 55);
  doc.text(`Fecha: ${req.fecha}`, 20, 65);
  doc.text(`Estado: ${req.estado}`, 20, 75);
  doc.text(
    "Resumen: Esta solicitud fue generada automáticamente para efectos de seguimiento.",
    20,
    90,
    { maxWidth: 170 }
  );
  return doc;
};

const buildMinutaPdf = (
  mes: string,
  evento: { id: string; titulo: string; fecha: string; hora: string; lugar: string; responsable: string; descripcion: string }
) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Minuta — ${evento.titulo}`, 20, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Mes: ${mes}`, 20, 45);
  doc.text(`ID: ${evento.id}`, 20, 53);
  doc.text(`Fecha: ${evento.fecha} · ${evento.hora}`, 20, 61);
  doc.text(`Lugar: ${evento.lugar}`, 20, 69);
  doc.text(`Responsable: ${evento.responsable}`, 20, 77);
  doc.text("Resumen de la sesión:", 20, 93);
  doc.text(evento.descripcion, 20, 101, { maxWidth: 170 });
  doc.text("1. Acuerdos preliminares", 20, 115);
  doc.text("2. Compromisos y próximos pasos", 20, 123);
  doc.text("3. Observaciones logísticas", 20, 131);
  doc.text("Firma digital pendiente", 20, 150);
  return doc;
};

  const resolvePhotoSrc = (path?: string, fallback?: string) =>
    assetUrl(path) || fallback || "https://placehold.co/96x96?text=Foto";

  const renderCoreMemberCard = (member: typeof CORE_TEAM[number]) => {
    const fallbackPhoto = assetUrl(teamPhotos[member.id]);
    const photoSrc = resolvePhotoSrc(member.photo, fallbackPhoto);
    return (
      <div
        key={member.id}
        className="w-full max-w-sm mx-auto p-4 border border-gray-200 rounded-2xl shadow-sm flex items-start gap-4 bg-white relative"
      >
        <img
          src={photoSrc}
          alt={member.name}
          className="w-20 h-20 object-cover rounded-2xl border"
        />
        <div>
          <p className="text-lg font-semibold text-[#0b2b57]">{member.name}</p>
          <p className="text-sm text-gray-600">{member.role}</p>
          <div className="flex flex-wrap gap-3 mt-2 text-sm items-center">
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1 text-[#004080] hover:underline"
            >
              <span aria-hidden="true">✉️</span>
              Email
            </a>
            <a
              href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-green-600 hover:underline"
            >
              <img src={whatsappIcon} alt="" className="w-4 h-4" />
              WhatsApp
              </a>
          </div>
        </div>
      </div>
    );
  };

  const renderAdditionalEmployeeCard = (
  emp: EmployeeRecord,
  customRole?: string,
  keyOverride?: string
) => {
  const email =
    emp.email_oficial || emp.correo || (emp as any)?.emailpersonal;
  const phone =
    emp.telefono_oficial ||
    emp.telefono ||
    (emp as any)?.informacion_personal?.telefono_personal;
  const fullName =
    emp.nombrecompleto ||
    emp.nombre ||
    `${emp.nombres || ""} ${emp.apellidos || ""}`.trim() ||
    "Colaborador";
  const fallbackKey = keyOverride || fullName;
  const cachedPhoto = assetUrl(teamPhotos[fallbackKey]);
  const currentPhoto = resolvePhotoSrc(emp.foto, cachedPhoto);
  return (
    <div
      key={keyOverride || emp.id || fullName}
      className="w-full max-w-sm mx-auto p-4 border border-gray-200 rounded-2xl shadow-sm flex items-start gap-4 bg-white relative"
    >
      <img
        src={currentPhoto}
        alt={fullName}
        className="w-20 h-20 object-cover rounded-2xl border"
      />
      <div>
        <p className="text-lg font-semibold text-[#0b2b57]">{fullName}</p>
        <p className="text-sm text-gray-600">
          {customRole || emp.puesto || "Colaborador"}
        </p>
          <div className="flex flex-wrap gap-3 mt-2 text-sm items-center">
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1 text-[#004080] hover:underline"
              >
                <span aria-hidden="true">✉️</span>
                Email
            </a>
          )}
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/[^0-9]/g, "")}`}
              className="inline-flex items-center gap-1 text-green-600 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              <img src={whatsappIcon} alt="" className="w-4 h-4" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

  const renderCompañeros = () => (
    <div className="space-y-12 max-w-5xl mx-auto w-full px-4 flex flex-col items-center">
      {currentEmployee && (
        <div className="flex flex-col items-center text-center gap-4 w-full">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-[#b91c1c] text-white flex items-center justify-center font-semibold shadow">
              CD
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#b91c1c]">
                Consejero Delegado
              </h4>
              <p className="text-sm text-gray-600 max-w-md">
                Máxima autoridad ejecutiva del departamento.
              </p>
            </div>
          </div>
          <div className="grid gap-4 w-full justify-items-center">
            {renderAdditionalEmployeeCard(
              currentEmployee,
              "Consejero Delegado",
              "consejero-delegado"
            )}
          </div>
        </div>
      )}
      {currentEmployee && HIERARCHY_SECTIONS.length > 0 && (
        <div className="w-px h-10 bg-[#004080]/15" />
      )}

      <div className="space-y-12 w-full">
        {HIERARCHY_SECTIONS.map((section, idx) => {
          const members = section.members
            .map((id) => CORE_TEAM_MAP[id])
            .filter(Boolean) as typeof CORE_TEAM[number][];
          if (!members.length) return null;
          const columnClass =
            members.length === 1
              ? "md:grid-cols-1"
              : members.length === 2
              ? "md:grid-cols-2"
              : "md:grid-cols-3";
          return (
            <div key={section.title} className="flex flex-col items-center text-center gap-4 w-full">
              <div className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-full bg-[#004080] text-white flex items-center justify-center font-semibold shadow">
                  {section.title
                    .split(" ")
                    .map((word) => word[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-[#0b2b57]">{section.title}</h4>
                  <p className="text-sm text-gray-600 max-w-xl">{section.description}</p>
                </div>
              </div>
              <div className="hidden md:block w-3/4 h-px bg-gradient-to-r from-transparent via-[#004080]/25 to-transparent" />
              <div className={`grid gap-4 w-full justify-items-center ${columnClass}`}>
                {members.map((member) => renderCoreMemberCard(member))}
              </div>
              {idx < HIERARCHY_SECTIONS.length - 1 && (
                <div className="w-px h-10 bg-[#004080]/10" />
              )}
            </div>
          );
        })}
      </div>

      {(() => {
        const extendedMembers = [...EXTRA_EXTENDED_TEAM, ...colegas];
        if (!extendedMembers.length) return null;
        const columnClass =
          extendedMembers.length === 1
            ? "md:grid-cols-1"
            : extendedMembers.length === 2
            ? "md:grid-cols-2"
            : "md:grid-cols-3";
        return (
          <div className="flex flex-col items-center text-center gap-4 w-full">
            <div className="w-11 h-11 rounded-full bg-[#0b2b57] text-white flex items-center justify-center font-semibold shadow">
              EQ
            </div>
            <div>
              <h4 className="text-xl font-semibold text-[#0b2b57]">
                Equipo Administrativo Extendido
              </h4>
              <p className="text-sm text-gray-600 max-w-xl">
                Colaboradores adicionales dentro del departamento.
              </p>
            </div>
            <div className="hidden md:block w-3/4 h-px bg-gradient-to-r from-transparent via-[#0b2b57]/20 to-transparent" />
            <div className={`grid gap-4 w-full justify-items-center ${columnClass}`}>
              {extendedMembers.map((emp) => {
                const isExtra = EXTRA_EXTENDED_TEAM.some((extra) => extra.id === emp.id);
                const keyVal = isExtra ? `extra-${emp.id || emp.nombrecompleto}` : emp.id || undefined;
                return renderAdditionalEmployeeCard(
                  emp,
                  isExtra ? emp.puesto : undefined,
                  keyVal
                );
              })}
            </div>
          </div>
        );
      })()}

      {!colegas.length && (
        <p className="text-gray-500 italic text-center">
          Sin compañeros adicionales en este departamento.
        </p>
      )}
    </div>
  );

  const renderRecursos = () => (
    <div className="space-y-6">
      <div className="p-4 border rounded-2xl bg-white shadow">
        <h4 className="text-lg font-semibold text-[#0b2b57] mb-1 flex items-center gap-2">
          <TruckIcon className="h-5 w-5 text-[#004080]" />
          Vehículos asignados
        </h4>
        {deptVehicles.length === 0 ? (
          <p className="text-sm text-gray-500">No hay vehículos asignados.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {deptVehicles.map((veh) => (
              <div
                key={veh.id}
                className="border border-gray-200 rounded-xl p-3 flex gap-3 items-center"
              >
                <img
                  src={
                    veh.foto ||
                    "https://placehold.co/80x50?text=Veh"
                  }
                  alt={veh.descripcion}
                  className="w-24 h-16 object-cover rounded-lg border"
                />
                <div>
                  <p className="font-semibold text-[#0b2b57]">
                    {veh.descripcion || veh.id}
                  </p>
                  <p className="text-sm text-gray-600">{veh.matricula}</p>
                  <p className="text-xs text-gray-500">
                    Conductor: {veh.conductor || "No asignado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-4 border rounded-2xl bg-white shadow">
        <h4 className="text-lg font-semibold text-[#0b2b57] flex items-center gap-2">
          <DocumentIcon className="h-5 w-5 text-[#004080]" />
          Inventario clave
        </h4>
        {!inventory.length ? (
          <p className="text-sm text-gray-500 mt-2">
            No hay inventario registrado para este departamento.
          </p>
        ) : (
          <ul className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3 text-sm text-gray-600">
            {inventory.map((category) => (
              <li key={category.categoria} className="p-3 border rounded-xl bg-[#f8fafc] flex flex-col gap-2">
                <div>
                  <p className="font-semibold text-[#0b2b57]">{category.categoria}</p>
                  {category.descripcion && (
                    <p className="text-xs text-gray-500">{category.descripcion}</p>
                  )}
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  {category.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {(category.responsable || category.contacto) && (
                  <p className="text-xs text-gray-500">
                    {category.responsable && (
                      <>
                        Responsable: <span className="font-medium">{category.responsable}</span>
                      </>
                    )}
                    {category.responsable && category.contacto && " · "}
                    {category.contacto && (
                      <a
                        href={`mailto:${category.contacto}`}
                        className="text-[#004080] hover:underline"
                      >
                        {category.contacto}
                      </a>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const renderCalendario = () => (
    <div className="p-5 border border-black rounded-3xl bg-white shadow space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-[#004080]" />
          <div>
            <h4 className="text-xl font-semibold text-[#0b2b57]">Calendario del departamento</h4>
            <p className="text-sm text-gray-600">
              Reuniones y actividades agrupadas por mes. Usa el botón “Minuta” para ver y/o generar actas.
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className="px-4 py-2 rounded-full border border-[#004080] text-[#004080] hover:bg-[#004080] hover:text-white transition"
            onClick={toggleFullCalendar}
          >
            {calendarFullView ? "Vista cronológica" : "Calendario completo"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-full bg-[#004080] text-white font-semibold hover:bg-[#002b5c] transition"
            onClick={handleNewCalendarEntry}
          >
            Nueva actividad
          </button>
        </div>
      </div>

      {calendarFullView ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {calendarData.map((section) => (
            <div key={section.clave} className="border rounded-2xl bg-[#f8fafc] p-4 shadow-sm">
              <h5 className="text-lg font-semibold text-[#0b2b57] mb-2">{section.mes}</h5>
              <ul className="space-y-3 text-sm text-gray-600">
                {section.eventos.map((evento) => (
                  <li key={evento.id} className="bg-white border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{evento.fecha}</span>
                      <span className="font-semibold text-[#004080]">{evento.hora}</span>
                    </div>
                    <p className="font-semibold text-[#0b2b57] text-sm">{evento.titulo}</p>
                    <p>{evento.descripcion}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>📍 {evento.lugar}</span>
                      <span>👤 {evento.responsable}</span>
                    </div>
                    <button
                      type="button"
                      className="text-[11px] text-[#004080] font-semibold underline"
                      onClick={() => handleMinutaPdf(section.mes, evento)}
                    >
                      Minuta
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {calendarData.map((section) => {
            const isOpen = calendarOpen[section.clave];
            return (
              <div key={section.clave} className="border rounded-2xl bg-[#f8fafc]">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => toggleCalendarSection(section.clave)}
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Mes</p>
                    <h5 className="text-lg font-semibold text-[#0b2b57]">{section.mes}</h5>
                  </div>
                  <span className="text-2xl font-semibold text-[#004080]">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-4">
                    {section.eventos.map((evento) => (
                      <div key={evento.id} className="p-4 bg-white border rounded-2xl shadow-sm">
                        <div className="flex flex-wrap gap-3 items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-gray-500">{evento.fecha}</p>
                            <h6 className="text-lg font-semibold text-[#0b2b57]">{evento.titulo}</h6>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-[#004080] bg-[#e0f2ff] px-3 py-1 rounded-full">
                              {evento.hora}
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-[#004080] hover:text-[#001637] underline"
                              onClick={() => handleMinutaPdf(section.mes, evento)}
                            >
                              Minuta
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{evento.descripcion}</p>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-3">
                          <span className="flex items-center gap-1">📍 {evento.lugar}</span>
                          <span className="flex items-center gap-1">👤 {evento.responsable}</span>
                          <span className="flex items-center gap-1">ID {evento.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderObjetivos = () => {
    return (
      <div className="space-y-5">
        {OBJETIVOS_CATEGORIES.map(({ key, label }) => {
          const items = OBJETIVOS_DPTO[key];
          if (!items?.length) return null;
          const isOpen = objetivosOpen[key];
          return (
            <div key={key} className="border rounded-3xl bg-white shadow overflow-hidden">
              <button
                type="button"
                onClick={() => toggleObjetivoSection(key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Objetivos</p>
                  <h5 className="text-lg font-semibold text-[#0b2b57]">{label}</h5>
                </div>
                <span className="text-2xl font-semibold text-[#004080]">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 px-5 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {items.map((objetivo) => (
                      <div key={objetivo.id} className="p-5 border rounded-2xl bg-[#f8fafc] shadow-sm flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{objetivo.id}</p>
                            <h4 className="text-lg font-semibold text-[#0b2b57]">{objetivo.titulo}</h4>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>Responsable</p>
                            <p className="font-semibold text-[#004080]">{objetivo.responsable}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{objetivo.descripcion}</p>
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                            <span>Avance actual</span>
                            <AnimatedNumber value={objetivo.avance} suffix="%" className="text-sm font-semibold text-[#0b2b57]" />
                          </div>
                          <ObjectiveProgress value={objetivo.avance} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            🗓 Deadline: <span className="font-semibold text-[#0b2b57]">{objetivo.deadline}</span>
                          </span>
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-[#004080] hover:text-[#001637] underline"
                            onClick={() => handleObjetivoPdf(label, objetivo)}
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPresupuestos = () => {
    if (!budgets || !resumenPresupuesto) {
      return <p className="text-gray-500">No hay datos de presupuesto disponibles.</p>;
    }
    const { plan, ingresos, gastos, disponible, cumplimiento } = resumenPresupuesto;
    const monthlyEntries = Object.entries(budgets.presupuesto_mensual || {});
    const top3Expenses = monthlyEntries
      .slice()
      .sort(([, a], [, b]) => (b.gastos || 0) - (a.gastos || 0))
      .slice(0, 3);
    const alertMessages = [];
    if (disponible < plan * 0.1) {
      alertMessages.push("⚠️ El presupuesto disponible es inferior al 10% del plan anual.");
    }
    if (cumplimiento > 1.1) {
      alertMessages.push("⚠️ Se han superado los gastos previstos. Revise las partidas de emergencia.");
    }

    return (
      <div className="space-y-6">
        <div className="p-5 border rounded-2xl bg-white shadow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Presupuesto {budgets.nombre}
              </p>
              <AnimatedNumber
                value={plan}
                suffix=" FCFA"
                className="text-2xl font-semibold text-[#0b2b57] block"
                duration={3200}
              />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Ejecución</p>
              <AnimatedNumber
                value={Math.min(cumplimiento * 100, 120)}
                suffix="%"
                className="text-3xl font-black text-[#004080]"
                duration={3200}
              />
            </div>
          </div>
          <div className="mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
            <animated.div
              className={`h-3 rounded-full ${
                cumplimiento <= 1
                  ? "bg-gradient-to-r from-[#00b4d8] to-[#0077b6]"
                  : "bg-gradient-to-r from-[#f97316] to-[#dc2626]"
              }`}
              style={{ width: ejecucionSpring.value.to((n) => `${n}%`) }}
            />
          </div>
          {alertMessages.length > 0 && (
            <div className="mt-4 bg-[#fff7ed] border border-[#fed7aa] rounded-xl p-3 text-sm text-[#9a3412] space-y-1">
              {alertMessages.map((msg) => (
                <p key={msg}>{msg}</p>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
            <div className="p-3 rounded-xl border bg-[#eef5ff]">
              <p className="text-gray-600">Ingresos</p>
              <AnimatedNumber
                value={ingresos}
                suffix=" FCFA"
                className="text-lg font-semibold text-[#0b2b57] block"
              />
            </div>
            <div className="p-3 rounded-xl border bg-[#fee2e2]">
              <p className="text-gray-600">Gastos</p>
              <AnimatedNumber
                value={gastos}
                suffix=" FCFA"
                className="text-lg font-semibold text-[#b42318] block"
              />
            </div>
            <div className="p-3 rounded-xl border bg-[#dcfce7]">
              <p className="text-gray-600">Disponible</p>
              <AnimatedNumber
                value={disponible}
                suffix=" FCFA"
                className="text-lg font-semibold text-[#14532d] block"
                duration={3200}
              />
            </div>
            <div className="p-3 rounded-xl border bg-[#fef9c3]">
              <p className="text-gray-600">Meses activos</p>
              <AnimatedNumber
                value={monthlyEntries.length}
                className="text-lg font-semibold text-[#92400e] block"
                duration={2200}
              />
            </div>
          </div>
        </div>
        <div className="p-5 border rounded-2xl bg-white shadow space-y-4">
          <div>
            <h5 className="text-lg font-semibold text-[#0b2b57]">
              Concentración mensual de gasto
            </h5>
            <p className="text-sm text-gray-500">
              Top 3 partidas con mayor ejecución acumulada.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            {top3Expenses.map(([mes, data]) => (
              <div key={mes} className="p-3 border rounded-xl bg-[#f8fafc]">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {mes.charAt(0).toUpperCase() + mes.slice(1)}
                </p>
                <AnimatedNumber
                  value={data.gastos || 0}
                  suffix=" FCFA"
                  className="text-2xl font-bold text-[#004080] block"
                  duration={2600}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Plan: {(data.plan || 0).toLocaleString("es-GQ")} · Ingresos:{" "}
                  {(data.ingresos || 0).toLocaleString("es-GQ")}
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 rounded-full bg-[#22c55e]"
                    style={{
                      width: `${
                        data.plan ? Math.min((data.gastos / data.plan) * 100, 120) : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="border rounded-2xl p-4 bg-[#f1f5f9] text-sm text-gray-700 space-y-2">
            <h6 className="font-semibold text-[#0b2b57]">
              Notas del área financiera
            </h6>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Consolidar las órdenes de compra pendientes antes del cierre de trimestre.
              </li>
              <li>Priorizar activos existentes sobre nuevas adquisiciones.</li>
              <li>
                Confirmar los reembolsos con Gabinete antes de desembolsar fondos para misiones.
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

const renderSolicitudes = () => (
    <div className="space-y-4">
      <div className="border rounded-2xl p-4 bg-white shadow-sm">
      <h4 className="text-lg font-semibold text-[#0b2b57] mb-2">
        Solicitudes activas
      </h4>
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#004080] text-white">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesMock.map((req) => (
                <tr key={req.id} className="border-b">
                  <td className="px-3 py-2">{req.id}</td>
                  <td className="px-3 py-2">{req.tipo}</td>
                  <td className="px-3 py-2">{req.fecha}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        req.estado === "Aprobado"
                          ? "bg-emerald-50 text-emerald-700"
                          : req.estado === "Pendiente"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {req.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-[#004080] hover:underline text-xs"
                      onClick={() => handleSolicitudPdf(req)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Cargando datos del departamento...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 border border-black rounded-3xl bg-white shadow flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img
            src={elebiLogo}
            alt="Elebi logo"
            className="w-16 h-16 object-contain"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Mi Departamento
            </p>
            <h1 className="text-3xl font-black text-[#001637]">{deptName}</h1>
            <p className="text-sm text-gray-600">
              Gestión unificada de compañeros, recursos y presupuesto.
            </p>
          </div>
        </div>
        <div className="border-b border-gray-200 w-full">
          <nav className="flex flex-wrap gap-4">
            {
              (["equipo", "calendario", "objetivos", "recursos", "presupuestos", "solicitudes"] as const).map(
              (tab) => {
                const label =
                  tab === "equipo"
                    ? "Equipo"
                    : tab === "calendario"
                    ? "Calendario"
                    : tab === "objetivos"
                    ? "Objetivos"
                    : tab === "recursos"
                    ? "Recursos"
                    : tab === "presupuestos"
                    ? "Presupuestos"
                    : "Solicitudes";
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab
                        ? "text-[#004080]"
                        : "text-gray-500 hover:text-[#004080]"
                    }`}
                  >
                    {label}
                    {activeTab === tab && (
                      <span className="absolute left-0 right-0 -bottom-[1px] h-[3px] rounded-full bg-gradient-to-r from-[#00b4d8] to-[#004080]" />
                    )}
                  </button>
                );
              }
            )}
          </nav>
        </div>
      </div>

      {activeTab === "equipo" && renderCompañeros()}
      {activeTab === "calendario" && renderCalendario()}
      {activeTab === "objetivos" && renderObjetivos()}
      {activeTab === "recursos" && renderRecursos()}
      {activeTab === "presupuestos" && renderPresupuestos()}
      {activeTab === "solicitudes" && renderSolicitudes()}

      {docPreview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Documento</p>
                <h4 className="text-lg font-semibold text-[#0b2b57]">
                  {docPreview.title}
                </h4>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[#004080] hover:text-[#001637]"
                onClick={() => {
                  URL.revokeObjectURL(docPreview.url);
                  setDocPreview(null);
                }}
              >
                Cerrar
              </button>
            </div>
            <iframe
              src={docPreview.url}
              title={docPreview.title}
              className="flex-1 w-full border-none"
            />
          </div>
        </div>
      )}

      {newActivityModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4"
            onSubmit={handleSaveNewActivity}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-gray-500">Calendario</p>
                <h4 className="text-xl font-semibold text-[#0b2b57]">Nueva actividad</h4>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-[#004080] hover:text-[#001637]"
                onClick={() => setNewActivityModal(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex flex-col text-sm text-gray-600 gap-1">
                Tipo
                <select
                  className="border rounded-xl px-3 py-2"
                  value={newActivity.tipo}
                  onChange={(e) => handleActivityChange("tipo", e.target.value)}
                >
                  <option>Reunión</option>
                  <option>Actividad</option>
                  <option>Otro</option>
                </select>
              </label>
              <label className="flex flex-col text-sm text-gray-600 gap-1">
                Título
                <input
                  className="border rounded-xl px-3 py-2"
                  value={newActivity.titulo}
                  onChange={(e) => handleActivityChange("titulo", e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm text-gray-600 gap-1">
                Fecha
                <input
                  type="date"
                  className="border rounded-xl px-3 py-2"
                  value={newActivity.fecha}
                  onChange={(e) => handleActivityChange("fecha", e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm text-gray-600 gap-1">
                Hora
                <input
                  type="time"
                  className="border rounded-xl px-3 py-2"
                  value={newActivity.hora}
                  onChange={(e) => handleActivityChange("hora", e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm text-gray-600 gap-1">
                Lugar
                <input
                  className="border rounded-xl px-3 py-2"
                  value={newActivity.lugar}
                  onChange={(e) => handleActivityChange("lugar", e.target.value)}
                />
              </label>
              <label className="flex flex-col text-sm text-gray-600 gap-1">
                Responsable
                <input
                  className="border rounded-xl px-3 py-2"
                  value={newActivity.responsable}
                  onChange={(e) => handleActivityChange("responsable", e.target.value)}
                />
              </label>
            </div>
            <label className="flex flex-col text-sm text-gray-600 gap-1">
              Descripción
              <textarea
                className="border rounded-xl px-3 py-2 min-h-[80px]"
                value={newActivity.descripcion}
                onChange={(e) => handleActivityChange("descripcion", e.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3 text-sm">
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-gray-300 text-gray-600"
                onClick={() => setNewActivityModal(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#004080] text-white font-semibold hover:bg-[#002b5c]"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default MiDepartamento;
