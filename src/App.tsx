// src/App.tsx
import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import Footer from "./components/Footer";
import MyProfile from "./components/MyProfile";
import Asistencia from "./components/Asistencia";
import Empleados from "./components/Empleados";
import Nomina from "./components/Nomina";
import Contabilidad from "./components/Contabilidad";
import Flota from "./components/Flota";
import Ajustes from "./components/Ajustes";
import Organizacion from "./components/Organizacion";
import MiDepartamento from "./components/MiDepartamento";
import { preloadAllLotties } from "./data/lottieLoader";

const App: React.FC = () => {
  const [activeView, setActiveView] = useState("main");
  const [loggedInId, setLoggedInId] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ✅ Preload animations once
  useEffect(() => {
    preloadAllLotties();
  }, []);

  // ✅ Restore login state from localStorage (e.g., after refresh)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedId = localStorage.getItem("currentEmployeeId");
    if (savedId) {
      const parsed = Number(savedId);
      setLoggedInId(Number.isNaN(parsed) ? null : parsed);
    }
  }, []);

  // ✅ Called when user logs in successfully
  const handleLoginSuccess = (id: number) => {
    console.log("✅ Sesión iniciada con ID:", id);
    setLoggedInId(id);
    setShowLoginModal(false);
  };

  // ✅ Called when user logs out
  const handleLogout = () => {
    console.log("👋 Sesión cerrada");
    localStorage.removeItem("currentEmployeeId");
    localStorage.removeItem("currentEmployeeName");
    localStorage.removeItem("currentEmployeeRole");
    localStorage.removeItem("currentEmployeePhoto");
    setLoggedInId(null);
  };

  const isLoggedIn = Boolean(loggedInId);
  const isMainView = activeView === "main";
  const hideHeaderLogin = !isLoggedIn && isMainView;

  // ✅ Helper to render selected view
  const renderActiveView = () => {
    switch (activeView) {
      case "main":
        return (
          <MainContent
            showLoginModal={showLoginModal}
            onCloseLogin={() => setShowLoginModal(false)}
            onLoginSuccess={handleLoginSuccess}
            onRequestLogin={() => setShowLoginModal(true)}
            isLoggedIn={isLoggedIn}
          />
        );
      case "organizacion":
        return <Organizacion />;
      case "departamento":
        return <MiDepartamento />;
      case "profile":
        return <MyProfile onLogout={handleLogout} />;
      case "asistencia":
        return <Asistencia />;
      case "empleados":
        return <Empleados />;
      case "nomina":
        return <Nomina />;
      case "contabilidad":
        return <Contabilidad />;
      case "flota":
        return <Flota />;
      case "ajustes":
        return <Ajustes />;
      default:
        return (
          <div className="p-10 text-center text-gray-600">
            <h2 className="text-2xl font-semibold text-[#004080] mb-2">
              Módulo no disponible
            </h2>
            <p>Seleccione una opción del menú lateral.</p>
          </div>
        );
    }
  };

return (
  <div className="h-screen w-screen flex text-gray-800 font-sans overflow-hidden bg-gray-100">
    {/* Sidebar */}
    <Sidebar setActiveView={setActiveView} activeView={activeView} />

    {/* Main section */}
    <div className="flex-1 flex flex-col h-full">
      {/* Header (anchored top) */}
      <Header
        onLoginClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        loggedInId={loggedInId}
        hideLoginButton={hideHeaderLogin}
      />

      {/* Scrollable main content */}
      <main className="flex-1 bg-[#f0f2f5] overflow-y-auto p-6">
        {renderActiveView()}
      </main>

      {/* Footer (anchored bottom) */}
      <Footer />
    </div>
  </div>
);
};

export default App;
