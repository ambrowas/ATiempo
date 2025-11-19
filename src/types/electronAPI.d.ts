export {};

declare global {
  interface Window {
    electronAPI: {
      getEmpleados: () => Promise<any[]>;
      addEmpleado?: (empleado: any) => Promise<any>;
      updateEmpleado?: (empleado: any) => Promise<any>;
      getAsistencia?: () => Promise<any[]>;
      addAsistencia?: (registro: any) => Promise<any>;
      getNominas?: () => Promise<any[]>;
      addNomina?: (nomina: any) => Promise<any>;
      selectPhoto?: () => Promise<{ url_foto: string; url_thumb?: string } | null>;
      saveFlotaData?: (payload: {
        vehiculos?: any[];
        conductores?: any[];
        driver_usage?: any[];
      }) => Promise<any>;
    };
  }
}
