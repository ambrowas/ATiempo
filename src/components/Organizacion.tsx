import React, { useState } from "react";
import elebiLogo from "../assets/elebilogo.png";
import whatsappIcon from "./icons/whatsap.png";
import { assetUrl } from "../utils/assetPaths";

type EmployeeNode = {
  name: string;
  role: string;
  avatar?: string;
  email?: string;
  whatsapp?: string;
};

type SectionNode = {
  name: string;
  lead: string;
  focus: string;
  employees: EmployeeNode[];
};

type DepartmentNode = {
  name: string;
  lead: string;
  mission: string;
  color: string;
  sections: SectionNode[];
};

const executiveCouncilTeam: EmployeeNode[] = [
  {
    name: "Victor Manuel Ele Ela",
    role: "Consejero Delegado (CEO)",
    avatar: "/fotos_empleados/Victor Manuel Ele Ela.jpeg",
    email: "victor.eleela@iniciativaselebi.com",
    whatsapp: "+24022780886",
  },
  {
    name: "Anakyn Angue Biong",
    role: "Director de Gabinete",
    email: "anakyn.angue@iniciativaselebi.com",
    whatsapp: "+240770001111",
  },
  {
    name: "Marina Micha Ela",
    role: "Asistenta Personal",
    email: "marina.micha@iniciativaselebi.com",
    whatsapp: "+240227123456",
  },
  {
    name: "Jovita Eyang Malabo",
    role: "Secretaria Ejecutiva",
    email: "jovita.eyang@iniciativaselebi.com",
    whatsapp: "+240227654321",
  },
  {
    name: "Francisco Ntutumu Medang",
    role: "Técnico de Operaciones",
    email: "francisco.ntutumu@iniciativaselebi.com",
    whatsapp: "+240660009876",
  },
  {
    name: "Juan Nchaso Lohoba",
    role: "Conductor Ejecutivo",
    email: "juan.nchaso@iniciativaselebi.com",
    whatsapp: "+240550009876",
  },
  {
    name: "Jaime Mandome Zaragoza",
    role: "Coordinador Operativo",
    email: "jaime.mandome@iniciativaselebi.com",
    whatsapp: "+240225009900",
  },
];

// Mocked structure inferred from datos_empleados.json and previous modules.
const organizationTree: DepartmentNode[] = [
  {
    name: "Dirección General",
    lead: "",
    mission:
      "Define la visión corporativa, asegura el gobierno y coordina las alianzas institucionales.",
    color: "#0f172a",
    sections: [
      {
        name: "Consejo Ejecutivo",
        lead: "Victor Manuel Ele Ela",
        focus: "Estrategia 2025, gobierno corporativo y relación con el consejo.",
        employees: executiveCouncilTeam,
      },
    ],
  },
  {
    name: "Dirección Comercial",
    lead: "Policarpo Obugase Mbuña",
    mission:
      "Crece el pipeline de servicios portuarios y mantiene la proximidad con clientes clave.",
    color: "#1d4ed8",
    sections: [
      {
        name: "Desarrollo de Negocio",
        lead: "Policarpo Obugase Mbuña",
        focus: "Expansión regional, acuerdos con navieras y ventas corporativas.",
        employees: [
          {
            name: "Policarpo Obugase Mbuña",
            role: "Director de Marketing y Ventas",
            avatar: "/fotos_empleados/Policarpo Obugase Mbuña.jpeg",
            email: "policarpo.obugase@iniciativaselebi.com",
            whatsapp: "+240222100001",
          },
          {
            name: "Belén Ada Mangue",
            role: "Gerente de Cuentas Clave",
            email: "belen.ada@iniciativaselebi.com",
            whatsapp: "+240222110033",
          },
          {
            name: "Justo Obama Micha",
            role: "Coordinador de Alianzas Comerciales",
            email: "justo.obama@iniciativaselebi.com",
            whatsapp: "+240222119988",
          },
          {
            name: "Rosa Mangue Andeme",
            role: "Especialista en Inteligencia de Mercado",
            email: "rosa.mangue@iniciativaselebi.com",
            whatsapp: "+24055220077",
          },
        ],
      },
    ],
  },
  {
    name: "Dirección de Proyectos",
    lead: "Damian Ondo Mañe Nchama",
    mission:
      "Transforma las iniciativas estratégicas en proyectos financiables y medibles.",
    color: "#0369a1",
    sections: [
      {
        name: "PMO & Inversiones",
        lead: "Damian Ondo Mañe Nchama",
        focus: "Portafolio de proyectos, priorización y control de hitos.",
        employees: [
          {
            name: "Damian Ondo Mañe Nchama",
            role: "Director de Proyectos e Inversiones",
            avatar: "/fotos_empleados/Damian Ondo Mañe Nchama.jpg",
            email: "damian.ondo@iniciativaselebi.com",
            whatsapp: "+240333120050",
          },
          {
            name: "Sabina Upanga Belope",
            role: "Oficial PMO Senior",
            email: "sabina.nsue@iniciativaselebi.com",
            whatsapp: "+240333125566",
          },
          {
            name: "Eloy Bokung Sima",
            role: "Analista de Inversiones",
            email: "eloy.bokung@iniciativaselebi.com",
            whatsapp: "+24055177001",
          },
          {
            name: "Gema Alicante Sierra",
            role: "Coordinadora de Hitos Estratégicos",
            email: "gema.alicante@iniciativaselebi.com",
            whatsapp: "+24077110044",
          },
        ],
      },
    ],
  },
  {
    name: "Diseño y Experiencia de Usuario",
    lead: "Jessica Esono Obama",
    mission:
      "Define estándares de experiencia y prototipa servicios internos para los equipos.",
    color: "#0ea5e9",
    sections: [
      {
        name: "UX Research & UI Lab",
        lead: "Jessica Esono Obama",
        focus: "Prototipos, guías visuales y estudios con usuarios internos.",
        employees: [
          {
            name: "Jessica Esono Obama",
            role: "Diseñadora UX/UI",
            avatar: "/fotos_empleados/Jessica Esono Obama.jpg",
            email: "jessica.esono@iniciativaselebi.com",
            whatsapp: "+24055122004",
          },
          {
            name: "Sara Mico Abeso",
            role: "Investigadora UX",
            email: "sara.mico@iniciativaselebi.com",
            whatsapp: "+24055122033",
          },
          {
            name: "Orlando Esono Nguema",
            role: "Lead UI Systems",
            email: "orlando.esono@iniciativaselebi.com",
            whatsapp: "+24055122321",
          },
          {
            name: "Nuria Bokale Ela",
            role: "Diseñadora de Prototipos",
            email: "nuria.bokale@iniciativaselebi.com",
            whatsapp: "+24077500991",
          },
        ],
      },
    ],
  },
  {
    name: "Finanzas y Control",
    lead: "Luis Bioko Dougan",
    mission:
      "Garantiza la salud financiera, cierres oportunos y control de presupuestos.",
    color: "#0284c7",
    sections: [
      {
        name: "Contabilidad y Fiscalidad",
        lead: "Luis Bioko Dougan",
        focus: "Cierres contables, reporting en CFA y cumplimiento fiscal.",
        employees: [
          {
            name: "Luis Bioko Dougan",
            role: "Contable Senior",
            avatar: "/fotos_empleados/Luis Bioko Dougan.jpg",
            email: "luis.bioko@iniciativaselebi.com",
            whatsapp: "+24044120012",
          },
          {
            name: "Carmen Nsogo Abaga",
            role: "Especialista Fiscal",
            email: "carmen.nsogo@iniciativaselebi.com",
            whatsapp: "+24044121199",
          },
          {
            name: "Norberto Okenve Eyang",
            role: "Controller Financiero",
            email: "norberto.okenve@iniciativaselebi.com",
            whatsapp: "+24044123007",
          },
          {
            name: "Leticia Ebang Mangue",
            role: "Analista de Presupuestos",
            email: "leticia.ebang@iniciativaselebi.com",
            whatsapp: "+24055199821",
          },
        ],
      },
    ],
  },
  {
    name: "Logística y Suministros",
    lead: "Pedro German Nve Ela",
    mission:
      "Coordina entregas portuarias, inventario crítico y relaciones con proveedores.",
    color: "#0f766e",
    sections: [
      {
        name: "Operaciones 3PL",
        lead: "Pedro German Nve Ela",
        focus: "Rutas marítimas, contratos logísticos y control de almacenes.",
        employees: [
          {
            name: "Pedro German Nve Ela",
            role: "Director Logística y Suministros",
            avatar: "/fotos_empleados/Pedro German Nve Ela.jpeg",
            email: "pedro.nve@iniciativaselebi.com",
            whatsapp: "+24055177005",
          },
          {
            name: "Inés Ndong Ela",
            role: "Planificadora de Rutas",
            email: "ines.ndong@iniciativaselebi.com",
            whatsapp: "+24055177555",
          },
          {
            name: "Manuel Obama Mbomio",
            role: "Supervisor de Almacenes",
            email: "manuel.obama@iniciativaselebi.com",
            whatsapp: "+24044188001",
          },
          {
            name: "Eduardo Mba Maho",
            role: "Responsable de Compras Estratégicas",
            email: "eduardo.mba@iniciativaselebi.com",
            whatsapp: "+24077100456",
          },
        ],
      },
    ],
  },
  {
    name: "Marketing y Comunicación",
    lead: "Gabriel Epiko Massoko",
    mission:
      "Posiciona la marca Iniciativas Elebi y genera demanda para los servicios CFA.",
    color: "#7c3aed",
    sections: [
      {
        name: "Brand & Contenido",
        lead: "Gabriel Epiko Massoko",
        focus: "Campañas digitales, prensa sectorial y narrativas de valor.",
        employees: [
          {
            name: "Gabriel Epiko Massoko",
            role: "Responsable de Marketing Digital",
            avatar: "/fotos_empleados/Gabriel Epiko Massoko.jpg",
            email: "gabriel.epiko@iniciativaselebi.com",
            whatsapp: "+24022870001",
          },
          {
            name: "Ada Mangue Beloba",
            role: "Coordinadora de Contenido",
            email: "ada.beloba@iniciativaselebi.com",
            whatsapp: "+24022870032",
          },
          {
            name: "Iván Ncogo Owono",
            role: "Especialista en Medios",
            email: "ivan.ncogo@iniciativaselebi.com",
            whatsapp: "+24077122005",
          },
          {
            name: "Lola Ebana Bokolo",
            role: "Diseñadora Multimedia",
            email: "lola.ebana@iniciativaselebi.com",
            whatsapp: "+24077122115",
          },
        ],
      },
    ],
  },
  {
    name: "Recursos Humanos",
    lead: "Maria Inmaculada Avomo Obama",
    mission:
      "Desarrolla talento, impulsa cultura y asegura compensaciones competitivas.",
    color: "#9333ea",
    sections: [
      {
        name: "People Operations",
        lead: "Maria Inmaculada Avomo Obama",
        focus: "Plan de talento, clima laboral y gestión documental.",
        employees: [
          {
            name: "Maria Inmaculada Avomo Obama",
            role: "Directora de Recursos Humanos",
            avatar: "/fotos_empleados/Maria Inmaculada Avomo Obama.jpg",
            email: "maria.avomo@iniciativaselebi.com",
            whatsapp: "+24033040001",
          },
          {
            name: "Dina Mayé Osa",
            role: "HR Business Partner",
            email: "dina.maye@iniciativaselebi.com",
            whatsapp: "+24033040222",
          },
          {
            name: "Arsenio Mba Messie",
            role: "Coordinador de Clima Laboral",
            email: "arsenio.mba@iniciativaselebi.com",
            whatsapp: "+24033040335",
          },
          {
            name: "Elena Mangue Eneme",
            role: "Especialista en Selección",
            email: "elena.mangue@iniciativaselebi.com",
            whatsapp: "+24055180032",
          },
        ],
      },
      {
        name: "Compensación y Gobierno Corporativo",
        lead: "Maria Jose Biong Bill",
        focus: "Compensación ejecutiva, nómina y supervisión financiera desde RR.HH.",
        employees: [
          {
            name: "Maria Jose Biong Bill",
            role: "CFO · Contabilidad, Finanzas y RR.HH.",
            avatar: "/fotos_empleados/Maria Jose Biong Bill.jpeg",
            email: "maria.biong@iniciativaselebi.com",
            whatsapp: "+24033041000",
          },
          {
            name: "Lucrecia Abeso Bonifacio",
            role: "Especialista en Compensación",
            email: "lucrecia.abeso@iniciativaselebi.com",
            whatsapp: "+24033041515",
          },
          {
            name: "Angelino Eyang Nve",
            role: "Analista de Beneficios",
            email: "angelino.eyang@iniciativaselebi.com",
            whatsapp: "+24055180333",
          },
          {
            name: "Marta Simha Ebuka",
            role: "Coordinadora de Gobierno Corporativo",
            email: "marta.simha@iniciativaselebi.com",
            whatsapp: "+24077123009",
          },
        ],
      },
    ],
  },
  {
    name: "Tecnologías de la Información",
    lead: "Santiago Abaga Nchama",
    mission:
      "Sostiene las plataformas internas, automatiza nóminas y garantiza soporte 24/7.",
    color: "#0891b2",
    sections: [
      {
        name: "Arquitectura Digital",
        lead: "Santiago Abaga Nchama",
        focus: "Moderniza Atiempo, integra APIs y define la hoja de ruta tecnológica.",
        employees: [
          {
            name: "Santiago Abaga Nchama",
            role: "Director de Tecnología (CTO)",
            avatar: "/fotos_empleados/Santiago Abaga Nchama.jpg",
          },
          {
            name: "Carla Ndong Avomo",
            role: "Ingeniera de Software Senior",
            avatar: "/fotos_empleados/Carla Ndong Avomo .jpg",
            email: "carla.ndong@iniciativaselebi.com",
            whatsapp: "+24066450202",
          },
          {
            name: "Bruno Ndongo Muete",
            role: "DevOps & Integraciones",
            email: "bruno.ndongo@iniciativaselebi.com",
            whatsapp: "+24066450777",
          },
          {
            name: "Yolanda Andeme Mico",
            role: "Líder QA",
            email: "yolanda.andeme@iniciativaselebi.com",
            whatsapp: "+24077533021",
          },
        ],
      },
      {
        name: "Operaciones y Soporte",
        lead: "Anselmo Medina Sisa",
        focus: "Monitoreo, soporte de campo y continuidad operativa.",
        employees: [
          {
            name: "Anselmo Medina Sisa",
            role: "Técnico de Soporte y Redes",
            avatar: "/fotos_empleados/Anselmo Medina Sisa.jpg",
            email: "anselmo.medina@iniciativaselebi.com",
            whatsapp: "+24066220002",
          },
          {
            name: "Rocío Obama Ebana",
            role: "Especialista de Soporte de Campo",
            email: "rocio.obama@iniciativaselebi.com",
            whatsapp: "+24066220777",
          },
          {
            name: "Rodrigo Ada Ncogo",
            role: "Analista NOC",
            email: "rodrigo.ada@iniciativaselebi.com",
            whatsapp: "+24066220911",
          },
          {
            name: "Ofelia Mayé Nsue",
            role: "Coordinadora de Continuidad Operativa",
            email: "ofelia.maye@iniciativaselebi.com",
            whatsapp: "+24077533555",
          },
        ],
      },
    ],
  },
];

const sumEmployees = (dept: DepartmentNode) =>
  dept.sections.reduce(
    (acc, section) => acc + section.employees.length,
    0
  );

const EmailIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-4 h-4 text-[#004080]"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3,7 12,13 21,7" />
  </svg>
);

const ExecutiveMemberCard: React.FC<{ member: EmployeeNode; className?: string }> = ({
  member,
  className = "",
}) => {
  const avatar = assetUrl(member.avatar) || "https://placehold.co/96x96?text=Foto";
  const whatsappHref = member.whatsapp
    ? `https://wa.me/${member.whatsapp.replace(/[^0-9]/g, "")}`
    : null;
  return (
    <div
      className={`p-4 border border-gray-200 rounded-2xl bg-white shadow-sm flex items-start gap-4 ${className}`}
    >
      <img
        src={avatar}
        alt={`Foto de ${member.name}`}
        className="w-20 h-20 object-cover rounded-2xl border"
      />
      <div className="space-y-1 text-left">
        <p className="text-lg font-semibold text-[#0b2b57]">{member.name}</p>
        <p className="text-sm text-gray-600">{member.role}</p>
        <div className="flex flex-wrap gap-3 text-sm pt-1">
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1 text-[#004080] hover:underline"
            >
              <EmailIcon />
              Email
            </a>
          )}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-green-600 hover:underline"
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

const OrgTree: React.FC = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    organizationTree.forEach((dept) => {
      dept.sections.forEach((section) => {
        const key = `${dept.name}-${section.name}`;
        defaults[key] =
          dept.name.toLowerCase() === "dirección general" &&
          section.name.toLowerCase() === "consejo ejecutivo";
      });
    });
    return defaults;
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSectionMembers = (employees: EmployeeNode[]) => {
    if (!employees.length) return null;
    const [leader, ...team] = employees;
    return (
      <div className="mt-4 space-y-4">
        <div className="flex justify-center">
          <ExecutiveMemberCard member={leader} className="w-full max-w-md" />
        </div>
        {team.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {team.map((member) => (
              <ExecutiveMemberCard key={member.name} member={member} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {organizationTree.map((dept) => (
        <section
          key={dept.name}
          className="relative bg-white border border-black/5 rounded-3xl p-6 shadow-lg"
        >
          <span
            className="absolute left-4 top-6 bottom-6 w-1 rounded-full hidden sm:block"
            style={{ background: dept.color }}
          />
          <header className="sm:pl-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2
                className={`text-2xl text-[#001637] ${
                  dept.name === "Dirección General"
                    ? "font-extrabold tracking-tight"
                    : "font-bold"
                }`}
              >
                {dept.name}
              </h2>
              <span className="text-xs uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                Lidera {dept.lead}
              </span>
              <span className="text-xs uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                {sumEmployees(dept)} colaboradores
              </span>
            </div>
            <p className="mt-2 text-gray-600">{dept.mission}</p>
          </header>

          <div className="mt-6 space-y-4 sm:pl-6">
            {dept.sections.map((section, index) => {
              const sectionKey = `${dept.name}-${section.name}`;
              const isOpen = openSections[sectionKey] ?? false;
              return (
                <div
                  key={sectionKey}
                  className="relative border border-gray-200 rounded-2xl bg-[#fdfdff]"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex flex-col gap-3 px-4 py-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="text-lg font-semibold text-[#00224d]">
                          {section.name}
                        </h3>
                        <p className="text-sm text-gray-500">{section.focus}</p>
                      </div>
                      <span className="text-2xl font-semibold text-[#004080]">
                        {isOpen ? "−" : "+"}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 bg-white/70 px-3 py-1 rounded-full border border-gray-200 w-fit">
                      Lidera {section.lead}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      {renderSectionMembers(section.employees)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

const OrgChart: React.FC = () => {
  const executive =
    organizationTree.find(
      (dept) => dept.name.toLowerCase() === "dirección general"
    ) || organizationTree[0];
  const rest = organizationTree.filter((dept) => dept !== executive);

  return (
    <div className="space-y-10">
      <div className="flex justify-center">
        <div className="rounded-3xl border-2 border-[#004080] bg-gradient-to-b from-white to-[#f0f6ff] px-8 py-6 text-center shadow-xl">
          <p className="text-xs uppercase tracking-[0.4em] text-[#004080]/70">
            Iniciativas Elebi
          </p>
          <p className="text-2xl font-black text-[#001637]">Consejo Corporativo</p>
          <span className="text-sm text-gray-500">
            Visión 2025 · Expansión logística y servicios portuarios
          </span>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="w-0.5 h-12 bg-[#004080]/25" />
      </div>
      {executive && (
        <>
          <div className="flex justify-center">
            <div className="max-w-2xl rounded-3xl border border-[#004080]/40 bg-white px-6 py-5 shadow-lg text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Dirección General
              </p>
              <p className="text-xl font-bold text-[#001637]">
                {executive.lead}
              </p>
              <p className="text-sm text-gray-600">{executive.mission}</p>
              <div className="mt-3 grid gap-2">
                {executive.sections.map((section) => (
                  <div
                    key={section.name}
                    className="rounded-2xl border border-dashed border-[#004080]/25 bg-[#f4f7ff] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-[#001637]">
                      {section.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Lidera {section.lead}
                    </p>
                    <p className="text-xs text-gray-500">
                      {section.employees.map((emp) => emp.name).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="w-0.5 h-10 bg-[#004080]/15" />
          </div>
        </>
      )}
      <div className="relative">
        <div className="absolute left-12 right-12 top-0 mx-auto hidden xl:block">
          <div className="h-0.5 bg-[#004080]/15" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((dept) => (
            <div
              key={`chart-${dept.name}`}
              className="rounded-3xl border border-[#004080]/15 bg-white p-5 shadow-md"
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="inline-flex h-3 w-3 rounded-full"
                  style={{ background: dept.color }}
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                    Departamento
                  </p>
                  <h3 className="text-lg font-semibold text-[#001637]">
                    {dept.name}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">{dept.mission}</p>
              <div className="space-y-3">
                {dept.sections.map((section) => (
                  <div
                    key={`${dept.name}-${section.name}-chart`}
                    className="rounded-2xl border border-[#004080]/15 bg-[#f9fbff] px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-[#001637]">
                      {section.name}
                    </p>
                    <p className="text-xs text-gray-500 mb-1">
                      Lidera {section.lead}
                    </p>
                    <div className="text-xs text-gray-600">
                      {section.employees.map((emp) => emp.name).join(" · ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Organizacion: React.FC = () => {
  const [viewMode, setViewMode] = useState<"chart" | "list">("chart");
  const totalDepartments = organizationTree.length;
  const totalSections = organizationTree.reduce(
    (acc, dept) => acc + dept.sections.length,
    0
  );
  const totalEmployees = organizationTree.reduce(
    (acc, dept) => acc + sumEmployees(dept),
    0
  );

  return (
    <div className="space-y-8">
      <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white border border-[#004080]/40 rounded-2xl shadow-lg">
              <img
                src={elebiLogo}
                alt="Logo Iniciativas Elebi"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#004080]/70">
                Iniciativas Elebi · 2025
              </p>
              <h1 className="text-3xl font-extrabold text-[#001637]">
                Mapa Organizacional
              </h1>
              <p className="text-gray-600">
                Vista resumida de departamentos, secciones operativas y todos
                los colaboradores actualmente cargados en Atiempo.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Departamentos", value: totalDepartments },
                { label: "Secciones activas", value: totalSections },
                { label: "Colaboradores", value: totalEmployees },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#f0f6ff] border border-[#004080]/20 rounded-2xl px-4 py-3 text-center"
                >
                  <p className="text-xs uppercase tracking-wide text-[#004080]/70">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-[#00224d]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="inline-flex rounded-2xl border border-gray-200 bg-gray-50 p-1 shadow-inner">
              {[
                { key: "chart", label: "Diagrama jerárquico" },
                { key: "list", label: "Vista detallada" },
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setViewMode(option.key as "chart" | "list")}
                  className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    viewMode === option.key
                      ? "bg-white text-[#004080] shadow"
                      : "text-gray-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewMode === "chart" ? <OrgChart /> : <OrgTree />}
    </div>
  );
};

export default Organizacion;
