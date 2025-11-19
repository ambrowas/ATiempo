import React from "react";
import { LockIcon } from "./icons";
import atiempoLogo from "../assets/atiempologo.png";
import { assetUrl } from "../utils/assetPaths";

interface HeaderProps {
  onLoginClick: () => void;
  onLogout?: () => void;
  loggedInId?: number | null;
  hideLoginButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onLoginClick,
  onLogout,
  loggedInId,
  hideLoginButton = false,
}) => {
  const isLoggedIn = !!loggedInId;
  const employeeName = localStorage.getItem("currentEmployeeName");
  const employeeId = localStorage.getItem("currentEmployeeId");
  const employeePhoto = assetUrl(localStorage.getItem("currentEmployeePhoto"));

  return (
    <header className="bg-[#003366] text-white p-4 flex justify-between items-center border-b-2 border-black flex-shrink-0">
      {/* 🔹 Logo + Title */}
      <div className="flex items-center space-x-5">
        <img
          src={atiempoLogo}
          alt="Atiempo Logo"
          className="h-20 w-20 object-contain"
        />
        <h1 className="text-3xl font-bold tracking-wider">ATIEMPO</h1>
      </div>

      {/* 🔹 Right side: status + login/logout button */}
      <div className="flex items-center space-x-4">
        {/* 🔴 Offline badge */}
        <div className="flex items-center space-x-2 bg-[#7a0000] px-3 py-1 rounded-md text-sm shadow border border-black/60">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-100"></span>
          </span>
          <span className="font-semibold tracking-wide">Offline</span>
        </div>

        {/* 🟢 Logged-in user indicator */}
        {isLoggedIn && employeeId && (
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-[#1f2937] flex-shrink-0">
              {employeePhoto ? (
                <img
                  src={employeePhoto}
                  alt={employeeName || "Empleado"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-semibold">
                  {employeeName
                    ? employeeName
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("")
                    : "ID"}
                </div>
              )}
            </div>
            <div className="flex flex-col leading-tight">
              {employeeName && (
                <span className="font-semibold text-white text-sm truncate max-w-[180px]">
                  {employeeName}
                </span>
              )}
              <span className="text-[11px] text-gray-200/80">
                Nº Empleado: <span className="font-mono">{employeeId}</span>
              </span>
            </div>
          </div>
        )}

        {/* 🔒 / 🔓 Login-Logout Button */}
        {!isLoggedIn && !hideLoginButton ? (
          <button
            onClick={onLoginClick}
            className="bg-white text-[#003366] font-semibold px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-gray-200 transition-colors shadow"
          >
            <LockIcon className="h-5 w-5" />
            <span>INICIAR SESIÓN</span>
          </button>
        ) : null}

        {isLoggedIn && (
          <button
            onClick={onLogout}
            className="bg-white text-red-700 font-semibold px-4 py-2 rounded-md flex items-center space-x-2 hover:bg-gray-200 transition-colors shadow"
          >
            <LockIcon className="h-5 w-5 rotate-45 text-red-700" />
            <span>CERRAR SESIÓN</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
