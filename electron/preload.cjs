const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // 🧩 EMPLEADOS CRUD
  getEmpleados: () => ipcRenderer.invoke("get-empleados"),
  addEmpleado: (empleado) => ipcRenderer.invoke("add-empleado", empleado),
  updateEmpleado: (empleado) => ipcRenderer.invoke("update-empleado", empleado),
  deleteEmpleado: (id) => ipcRenderer.invoke("delete-empleado", id),

  // 🧩 ASISTENCIA
  getAsistencia: () => ipcRenderer.invoke("get-asistencia"),
  addAsistencia: (registro) => ipcRenderer.invoke("add-asistencia", registro),

  // 🧩 NOMINAS
  getNominas: () => ipcRenderer.invoke("get-nominas"),
  addNomina: (nomina) => ipcRenderer.invoke("add-nomina", nomina),

  // 🧩 PHOTO
  selectPhoto: () => ipcRenderer.invoke("select-photo"),

  // 🧩 EVENT LISTENERS (for UI sync)
  onEmpleadosUpdated: (callback) => ipcRenderer.on("empleados-updated", (_, d) => callback(d)),
  onEmpleadoModificado: (callback) => ipcRenderer.on("empleado-modificado", (_, d) => callback(d)),
  onEmpleadoEliminado: (callback) => ipcRenderer.on("empleado-eliminado", (_, d) => callback(d)),
});
  