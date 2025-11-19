import React, { useEffect, useRef, useState } from "react";
import { getQrAnimation } from "../data/lottieLoader";
import { normalizeAssetPath } from "../utils/assetPaths";

interface MainContentProps {
  showLoginModal: boolean;
  onCloseLogin: () => void;
  onLoginSuccess: (id: number) => void;
  onRequestLogin: () => void;
  isLoggedIn: boolean;
}

const MainContent: React.FC<MainContentProps> = ({
  showLoginModal,
  onCloseLogin,
  onLoginSuccess,
  onRequestLogin,
  isLoggedIn,
}) => {
  const container = useRef<HTMLDivElement>(null);
  const [animationData, setAnimationData] = useState<any>(null);

  // 🔹 Login state
  const [email, setEmail] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // 🔹 Load Lottie QR animation
  useEffect(() => {
    getQrAnimation().then(setAnimationData).catch(() => setAnimationData(null));
  }, []);

useEffect(() => {
  if (animationData && container.current && (window as any).lottie) {
    const anim = (window as any).lottie.loadAnimation({
      container: container.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData,
    });
    return () => anim.destroy();
  }
}, [animationData]);

  useEffect(() => {
    if (isLoggedIn) {
      setEmployeeName(localStorage.getItem("currentEmployeeName"));
    } else {
      setEmployeeName(null);
    }
  }, [isLoggedIn]);


const normalizeEmployeeId = (emp: any) => {
  return (
    (emp?.id !== undefined && emp?.id !== null ? String(emp.id) : null) ||
    (emp?.numero_empleado ? String(emp.numero_empleado) : null) ||
    (emp?.informacion_personal?.numero_empleado
      ? String(emp.informacion_personal.numero_empleado)
      : null)
  );
};

const normalizeEmployeeEmail = (emp: any) => {
  const emailCandidate =
    emp?.correo ||
    emp?.email ||
    emp?.email_oficial ||
    emp?.emailpersonal ||
    emp?.informacion_personal?.email_personal;
  return emailCandidate ? emailCandidate.trim().toLowerCase() : "";
};

const getDisplayName = (emp: any) =>
  emp?.nombre ||
  emp?.nombres ||
  emp?.nombrecompleto ||
  emp?.informacion_personal?.nombre ||
  "";

const getRoleLabel = (emp: any) =>
  emp?.puesto ||
  emp?.datos_carrera?.descripcion_puesto ||
  emp?.departamento ||
  "Empleado";

const fetchFallbackEmployee = async (id: string, email: string) => {
  try {
    const response = await fetch("./datos_empleados.json", { cache: "no-store" });
    if (!response.ok) return null;
    const json = await response.json();
    const list: any[] = Array.isArray(json)
      ? json
      : json?.empleados
      ? json.empleados
      : Object.values(json || {});
    return (
      list.find((emp) => {
        const empId = normalizeEmployeeId(emp);
        const empEmail = normalizeEmployeeEmail(emp);
        return empId === id && empEmail === email;
      }) || null
    );
  } catch (err) {
    console.error("❌ Error cargando fallback datos_empleados.json:", err);
    return null;
  }
};

// 🔹 Handle login
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    // ✅ Load employee list from local JSON (through Electron)
    const empleados = await (window as any).electronAPI.getEmpleados();
    console.log("✅ Empleados cargados:", empleados);

    // ✅ Match by numeric ID and the "correo" field
    const enteredId = employeeNumber.trim();
    const enteredEmail = email.trim().toLowerCase();

    let found = empleados.find((emp: any) => {
      const empId = normalizeEmployeeId(emp);
      const empEmail = normalizeEmployeeEmail(emp);
      return empId === enteredId && empEmail === enteredEmail;
    });

    if (!found) {
      const fallback = await fetchFallbackEmployee(enteredId, enteredEmail);
      if (fallback) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.updateEmpleado) {
          try {
            await electronAPI.updateEmpleado({ id: fallback.id, ...fallback });
          } catch (syncErr) {
            console.warn("⚠️ No se pudo sincronizar empleado fallback:", syncErr);
          }
        }
        found = fallback;
      }
    }

    if (!found) {
      setError("Credenciales inválidas. Verifique su ID o correo.");
      return;
    }

    // ✅ Save user locally
    localStorage.setItem("currentEmployeeId", found.id.toString());
    localStorage.setItem("currentEmployeeName", getDisplayName(found));
    localStorage.setItem("currentEmployeeRole", getRoleLabel(found));
    const normalizedPhoto = normalizeAssetPath(
      (found.foto as string | undefined) || (found as any).url_foto
    );
    if (normalizedPhoto) {
      localStorage.setItem("currentEmployeePhoto", normalizedPhoto);
    } else {
      localStorage.removeItem("currentEmployeePhoto");
    }

    // ✅ Mark login success
    setEmployeeName(getDisplayName(found));
    setShowSuccess(true);
    const normalizedId = normalizeEmployeeId(found);
    const parsedId = normalizedId ? Number(normalizedId) : Number(found.id ?? 0);
    const resolvedId = Number.isNaN(parsedId) ? Date.now() : parsedId;
    onLoginSuccess(resolvedId);
    onCloseLogin();

    setTimeout(() => setShowSuccess(false), 3000);
  } catch (err) {
    console.error("❌ Error al iniciar sesión:", err);
    setError("Error al acceder a los datos locales.");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="h-full w-full flex flex-col justify-center items-center text-center relative">
      {/* QR Animation */}
      <div className="mb-4">
        {animationData && (
          <div
            ref={container}
            className="h-64 w-64 drop-shadow-[0_0_25px_rgba(0,200,255,0.6)]"
          ></div>
        )}
      </div>

      {!isLoggedIn && (
        <div className="flex flex-col items-center space-y-3 text-sm text-gray-600">
          <p>Inicie sesión para vincular su identificación antes de escanear.</p>
          <button
            onClick={onRequestLogin}
            className="bg-[#004080] text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-[#003060]"
          >
            INICIAR SESIÓN
          </button>
        </div>
      )}

      {/* ✅ Logged-in view */}
      {isLoggedIn && (
        <div className="mt-4 flex flex-col items-center">
          <p className="text-gray-600 text-sm">
            Bienvenido{employeeName ? `, ${employeeName}` : ""}. Escanee su código para registrar
            asistencia o utilice el menú para navegar.
          </p>
        </div>
      )}

      {/* ✅ Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-96 border border-gray-300 animate-fade-in">
            <h2 className="text-xl font-bold text-[#004080] mb-4">
              Iniciar Sesión Offline
            </h2>

            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Número de Empleado"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                className="w-full mb-3 p-2 border rounded"
              />
              <input
                type="email"
                placeholder="Correo Electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mb-3 p-2 border rounded"
              />

              {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#004080] text-white py-2 rounded font-semibold hover:bg-blue-800 transition"
              >
                {loading ? "Verificando..." : "Entrar"}
              </button>

              <button
                type="button"
                onClick={onCloseLogin}
                className="mt-3 w-full bg-gray-200 py-2 rounded hover:bg-gray-300 text-sm"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Success Dialog */}
      {showSuccess && (
        <div className="fixed bottom-8 bg-green-600 text-white px-6 py-3 rounded-md shadow-lg animate-bounce text-sm font-semibold">
          ✅ Sesión iniciada correctamente
        </div>
      )}
    </div>
  );
};

export default MainContent;
