// src/components/Ajustes.tsx
import React, { useState } from "react";
import elebiLogo from "../assets/elebilogo.png";
import whatsappIcon from "./icons/whatsap.png";

const Ajustes: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("es");
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);

  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-10 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h2 className="text-3xl font-bold text-[#004080] mb-6 text-center">
          Ajustes del Sistema
        </h2>
        <p className="text-gray-600 text-center mb-10">
          Configure los parámetros locales de la aplicación. <br /> 
          Los cambios se aplicarán automáticamente cuando estén disponibles.<br /><br />
          Version Demo 1.0 <br />
          El 1 de Febrero de 2026 la licencia libre expirará y el sistema requerirá una clave de acceso.<br />Póngase en contacto con nosotros para recibirla
        </p>

        <div className="space-y-8">
          {/* Preferencias Generales */}
          <section>
            <h3 className="text-xl font-semibold text-[#004080] mb-3 border-b pb-2">
              Preferencias Generales
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100">
              <label className="font-medium text-gray-700">Idioma de la Aplicación</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="mt-2 sm:mt-0 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-[#004080] focus:border-[#004080]"
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                <option value="fr">Francés</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100">
              <label className="font-medium text-gray-700">Modo Oscuro</label>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  darkMode
                    ? "bg-[#004080] text-white hover:bg-blue-800"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {darkMode ? "Activado" : "Desactivado"}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100">
              <label className="font-medium text-gray-700">Modo Offline</label>
              <button
                onClick={() => setOfflineMode(!offlineMode)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  offlineMode
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {offlineMode ? "Activo" : "Inactivo"}
              </button>
            </div>
          </section>

          {/* Notificaciones */}
          <section>
            <h3 className="text-xl font-semibold text-[#004080] mb-3 border-b pb-2">
              Notificaciones
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3">
              <label className="font-medium text-gray-700">
                Activar notificaciones locales
              </label>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  notifications
                    ? "bg-[#004080] text-white hover:bg-blue-800"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                {notifications ? "Activadas" : "Desactivadas"}
              </button>
            </div>
          </section>

          {/* Resumen */}
          <section className="mt-10 bg-[#f9fafb] rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-[#004080] mb-2">Resumen Actual</h3>
            <ul className="text-gray-700 space-y-1 text-sm">
              <li>
                🌐 <strong>Idioma:</strong>{" "}
                {language === "es" ? "Español" : language === "en" ? "Inglés" : "Francés"}
              </li>
              <li>
                💡 <strong>Modo Oscuro:</strong> {darkMode ? "Activado" : "Desactivado"}
              </li>
              <li>
                ⚙️ <strong>Modo Offline:</strong> {offlineMode ? "Activo" : "Inactivo"}
              </li>
              <li>
                🔔 <strong>Notificaciones:</strong>{" "}
                {notifications ? "Activadas" : "Desactivadas"}
              </li>
            </ul>
          </section>
         <section className="relative bg-gradient-to-br from-[#00132b] to-[#003a73] rounded-2xl p-6 border border-white/20 text-white shadow-xl space-y-3 overflow-hidden">
  <img src={elebiLogo} alt="Iniciativas Elebi" className="absolute top-4 right-4 w-16 opacity-70" />

  <h3 className="text-lg font-semibold">Contacto Corporativo</h3>

  {/* New paragraph */}
  <p className="text-sm leading-relaxed">
    ¿Te interesaría una aplicación como ésta para mejorar la productividad, eficiencia
    que te permita conocer y manejar todos los parámetros de tu pequeña o mediana empresa para ayudarte en la toma de decisiones?
    Contáctanos. Ofrecemos soluciones personalizadas a tu medida, con las
    características propias de tu organización, sin importar el sector.
  </p>

  <p className="text-sm leading-relaxed">
    Victor Ele Ela
    <br />
    <a
      href="mailto:info.elebi@gmail.com"
      className="inline-flex items-center gap-2 underline text-white"
    >
      <span aria-hidden="true">✉️</span>
      info.elebi@gmail.com
              </a>
            </p>
            <div className="text-sm space-y-2">
              <a
                href="https://wa.me/24022780886"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-white underline-offset-2 hover:underline"
              >
                <img src={whatsappIcon} alt="" className="w-4 h-4" />
                Guinea Ecuatorial: +240 22780886
              </a>
              <br />
              <a
                href="https://wa.me/12026771852"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-white underline-offset-2 hover:underline"
              >
                <img src={whatsappIcon} alt="" className="w-4 h-4" />
                Estados Unidos: +1 202 6771852
              </a>
            </div>
            <p className="text-xs text-white/70 mt-2">Malabo / Washington</p>
            <p className="text-xs text-white/70 mt-4 text-right">© 2025 Iniciativas Elebi. Todos los derechos reservados</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Ajustes;
