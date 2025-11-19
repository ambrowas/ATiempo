import React, { useEffect, useMemo, useState } from "react";
import {
  HomeIcon,
  GlobeIcon,
  UserIcon,
  CalendarIcon,
  UsersIcon,
  MoneyIcon,
  DocumentIcon,
  TruckIcon,
  SettingsIcon,
} from "./icons";
import Lottie from "lottie-react";
import { getHourglassAnimation } from "../data/lottieLoader";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, disabled }) => {
  const baseClass =
    "w-full flex items-center space-x-4 px-4 py-3 rounded-lg text-white font-semibold transition-colors text-left";
  const stateClass = disabled
    ? "bg-[#00325f] text-white/50 border border-transparent cursor-not-allowed shadow-none"
    : active
    ? "bg-sky-700 border border-black shadow-md"
    : "bg-[#0057b3] border border-black hover:bg-sky-600 shadow-md";
  return (
    <button onClick={onClick} className={`${baseClass} ${stateClass}`} disabled={disabled}>
      {icon}
      <span>{label}</span>
    </button>
  );
};

const navItems = [
  { viewId: "main", icon: <HomeIcon className="h-6 w-6 flex-shrink-0" />, label: "MENÚ PRINCIPAL" },
  { viewId: "organizacion", icon: <GlobeIcon className="h-6 w-6 flex-shrink-0" />, label: "MI ORGANIZACIÓN" },
  { viewId: "departamento", icon: <UsersIcon className="h-6 w-6 flex-shrink-0" />, label: "MI DEPARTAMENTO" },
  { viewId: "profile", icon: <UserIcon className="h-6 w-6 flex-shrink-0" />, label: "MI PERFIL" },
  { viewId: "empleados", icon: <UsersIcon className="h-6 w-6 flex-shrink-0" />, label: "EMPLEADOS" },
  { viewId: "asistencia", icon: <CalendarIcon className="h-6 w-6 flex-shrink-0" />, label: "ASISTENCIA" }, 
  { viewId: "nomina", icon: <MoneyIcon className="h-6 w-6 flex-shrink-0" />, label: "NÓMINA" },
  { viewId: "contabilidad", icon: <DocumentIcon className="h-6 w-6 flex-shrink-0" />, label: "CONTABILIDAD" },
  { viewId: "flota", icon: <TruckIcon className="h-6 w-6 flex-shrink-0" />, label: "GESTIÓN DE FLOTA" },
  { viewId: "ajustes", icon: <SettingsIcon className="h-6 w-6 flex-shrink-0" />, label: "AJUSTES" },
];

interface SidebarProps {
  setActiveView: (view: string) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = ({ setActiveView, activeView }) => {
  const [hourglassData, setHourglassData] = useState<any>(null);
  const lockCode = "1310 1984";
  const lockStart = useMemo(() => new Date("2026-02-01T00:00:00"), []);
  const storageKey = "menuPrincipalUnlocked";
  const [locked, setLocked] = useState(false);
  const [keyEntry, setKeyEntry] = useState("");
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now >= lockStart) {
      const unlocked = localStorage.getItem(storageKey) === "true";
      setLocked(!unlocked);
    }
  }, [lockStart]);

  const handleUnlock = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = keyEntry.replace(/\s+/g, "");
    if (normalized === lockCode.replace(/\s+/g, "")) {
      localStorage.setItem(storageKey, "true");
      setLocked(false);
      setKeyEntry("");
      setShowError(false);
    } else {
      setShowError(true);
    }
  };

  useEffect(() => {
    getHourglassAnimation()
      .then(setHourglassData)
      .catch((err) => console.error("Failed to load hourglass animation:", err));
  }, []);

  return (
    <aside className="relative w-72 bg-[#004080] p-5 pt-[6rem] flex flex-col border-r-2 border-black">
      {/* Navigation section */}
      <nav className="flex-1 flex flex-col space-y-2 overflow-y-auto pr-1">
        {navItems.map((item) => (
          <NavItem
            key={item.viewId}
            icon={item.icon}
            label={item.label}
            active={activeView === item.viewId}
            onClick={() => {
              if (!locked) setActiveView(item.viewId);
            }}
            disabled={locked}
          />
        ))}
      </nav>

      {/* Bottom animation section */}
      <div className="mt-4 flex flex-col items-center text-center text-gray-300 text-xs space-y-2">
        <div className="w-48 h-48 flex items-center justify-center animate-slow-pulse opacity-90">
          {hourglassData && (
            <Lottie
              animationData={hourglassData}
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          )}
        </div>

        <span className="opacity-80 tracking-wide text-base text-center leading-tight mb-2">
          Creado por{" "}
          <span className="text-white font-semibold block mt-1">INICIATIVAS ELEBI</span>
        </span>
      </div>
      {locked && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4 border border-[#004080]">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[#004080]">Acceso restringido</p>
              <h3 className="text-xl font-bold text-[#001637]">Introduce la clave</h3>
              <p className="text-sm text-gray-600">
                La protección se activa desde el 1 de febrero de 2026. Ingresa el número correcto para
                habilitar el menú principal.
              </p>
            </div>
            <form onSubmit={handleUnlock} className="space-y-2">
              <label className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Clave
                <input
                  type="text"
                  value={keyEntry}
                  onChange={(event) => setKeyEntry(event.target.value)}
                  className="mt-2 w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#004080]"
                  placeholder="•••• ••••"
                />
              </label>
              {showError && (
                <p className="text-[11px] text-red-600">Clave incorrecta. Intenta nuevamente.</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-[#004080] text-white font-semibold text-sm"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
