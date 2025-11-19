export {};

declare global {
  var __publicField: ((obj: any, value: any) => any) | undefined;

  interface Window {
    electronAPI: {
      // EMPLEADOS
      getEmpleados: () => Promise<any[]>;
      addEmpleado?: (empleado: any) => Promise<any>;
      updateEmpleado?: (empleado: any) => Promise<any>;

      // ARCHIVOS / FOTOS
      selectPhoto?: () => Promise<{ url_foto: string; url_thumb?: string } | null>;

      // ASISTENCIA
      getAsistencia?: () => Promise<any[]>;
      addAsistencia?: (registro: any) => Promise<any>;

      // NOMINAS
      getNominas?: () => Promise<any[]>;
      addNomina?: (nomina: any) => Promise<any>;
    };
  }
}
