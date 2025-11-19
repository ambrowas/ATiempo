// =============================================================
//  Electron Preload Script (Safe bridge between Renderer & Main)
// =============================================================

const { contextBridge, ipcRenderer } = require("electron");

// Expose limited IPC API to your React app
contextBridge.exposeInMainWorld("electronAPI", {
  getEmpleados: () => ipcRenderer.invoke("get-empleados"),
  addEmpleado: (empleado) => ipcRenderer.invoke("add-empleado", empleado),
  updateEmpleado: (empleado) => ipcRenderer.invoke("update-empleado", empleado),
  getAsistencia: () => ipcRenderer.invoke("get-asistencia"),
  addAsistencia: (registro) => ipcRenderer.invoke("add-asistencia", registro),
  updateAttendance: (payload) => ipcRenderer.invoke("update-attendance", payload),
  saveFlotaData: (payload) => ipcRenderer.invoke("save-flota", payload),
});

console.log("✅ Preload script loaded successfully");
