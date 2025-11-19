const PERSONAL_SECTION_KEYS = [
  "lugar_nacimiento",
  "fecha_nacimiento",
  "genero",
  "estado_civil",
  "telefono_personal",
  "email_personal",
  "direccion_personal",
  "nacionalidad",
  "numero_identificacion",
  "dependientes",
];

const FAMILIAR_SECTION_KEYS = [
  "contacto_emergencia",
  "contacto_emergencia_telefono",
  "numero_dependientes",
  "seguro_medico",
  "numero_poliza",
  "next_of_kin",
  "grupo_sanguineo",
];

const BANCARIA_SECTION_KEYS = [
  "banco",
  "numerocuenta",
  "numero_cuenta",
  "tipo_cuenta",
  "codigo_swift",
  "salario_base",
  "salario_mensual_cfa",
];

const CARRERA_SECTION_KEYS = [
  "puesto",
  "departamento",
  "supervisor_directo",
  "fecha_ingreso",
  "fecha_incorporacion",
  "tipo_contrato",
  "modalidad_trabajo",
  "habilidades_tecnicas",
  "habilidades_blandas",
  "proyectos_destacados",
  "ultima_evaluacion",
  "descripcion_puesto",
];

const DOCUMENT_KEYS = [
  "contrato_actual_pdf",
  "dip_pdf",
  "curriculum_pdf",
  "evaluacion_anual_pdf",
  "id_empleado_elebi_pdf",
];

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

function mergeEmployeeRecord(original = {}, updates = {}) {
  const next = { ...original };
  const personal = { ...(original.informacion_personal || {}) };
  const familiar = { ...(original.informacion_familiar || {}) };
  const bancaria = { ...(original.informacion_bancaria || {}) };
  const carrera = { ...(original.datos_carrera || {}) };
  const docs = { ...(original.documentacion || {}) };

  PERSONAL_SECTION_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
      personal[key] = updates[key];
    }
  });

  if (Object.keys(personal).length > 0) {
    next.informacion_personal = personal;
  }

  if (updates.nombre !== undefined) {
    next.nombre = updates.nombre;
    next.nombres = updates.nombre;
  }

  if (updates.apellidos !== undefined) {
    next.apellidos = updates.apellidos;
  }

  if (updates.sexo !== undefined && updates.sexo !== "") {
    next.sexo = updates.sexo;
  }

  if (updates.genero !== undefined && updates.genero !== "") {
    next.genero = updates.genero;
    personal.genero = updates.genero;
    next.informacion_personal = personal;
  }

  if (updates.correo !== undefined) {
    next.correo = updates.correo;
    next.email_oficial = updates.correo;
  }

  if (updates.telefono !== undefined) {
    next.telefono = updates.telefono;
    next.telefono_oficial = updates.telefono;
  }

  if (updates.direccion !== undefined && updates.direccion !== "") {
    next.direccion = updates.direccion;
  }

  if (updates.numero_identificacion !== undefined) {
    next.numero_identificacion = updates.numero_identificacion;
    personal.numero_identificacion = updates.numero_identificacion;
    next.informacion_personal = personal;
  }

  if (updates.direccion_personal !== undefined) {
    personal.direccion_personal = updates.direccion_personal;
    next.informacion_personal = personal;
  }

  if (updates.nacionalidad !== undefined) {
    personal.nacionalidad = updates.nacionalidad;
    next.informacion_personal = personal;
  }

  // Familiar
  FAMILIAR_SECTION_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
      const value = updates[key];
      switch (key) {
        case "contacto_emergencia":
          familiar.contacto_emergencia_nombre = value;
          next.contacto_emergencia = value;
          break;
        case "contacto_emergencia_telefono":
          familiar.contacto_emergencia_telefono = value;
          next.contacto_emergencia_telefono = value;
          break;
        case "numero_dependientes":
          {
            const parsed = toNumber(value);
            familiar.numero_dependientes = parsed;
            next.numero_dependientes = parsed;
            personal.dependientes = parsed;
            next.informacion_personal = personal;
          }
          break;
        case "seguro_medico":
          familiar.seguro_medico = value;
          next.seguro_medico = value;
          break;
        case "numero_poliza":
          familiar.numero_poliza = value;
          next.numero_poliza = value;
          break;
        case "next_of_kin":
          familiar.nombre_conyuge = value;
          next.next_of_kin = value;
          break;
        case "grupo_sanguineo":
          personal.grupo_sanguineo = value;
          next.grupo_sanguineo = value;
          next.informacion_personal = personal;
          break;
        default:
          familiar[key] = value;
      }
    }
  });

  if (Object.keys(familiar).length > 0) {
    next.informacion_familiar = familiar;
  }

  // Bancaria
  BANCARIA_SECTION_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
      const value = updates[key];
      switch (key) {
        case "numerocuenta":
        case "numero_cuenta":
          bancaria.numero_cuenta = value;
          next.numerocuenta = value;
          break;
        case "salario_base":
        case "salario_mensual_cfa":
          {
            const parsed = toNumber(value);
            bancaria.salario_mensual_cfa = parsed;
            next.salario_base = parsed;
          }
          break;
        default:
          bancaria[key] = value;
          next[key] = value;
      }
    }
  });

  if (Object.keys(bancaria).length > 0) {
    next.informacion_bancaria = bancaria;
  }

  // Carrera
  CARRERA_SECTION_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
      let value = updates[key];
      if (
        ["habilidades_tecnicas", "habilidades_blandas", "proyectos_destacados"].includes(key) &&
        typeof value === "string"
      ) {
        value = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      carrera[key] = value;
      next[key] = value;
    }
  });

  if (Object.keys(carrera).length > 0) {
    next.datos_carrera = carrera;
  }

  // Documentos
  DOCUMENT_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
      docs[key] = updates[key];
      next[key] = updates[key];
    }
  });

  if (Object.keys(docs).length > 0) {
    next.documentacion = docs;
  }

  const nombreCompleto =
    [next.nombre || next.nombres || "", next.apellidos || ""]
      .map((part) => (part || "").trim())
      .filter(Boolean)
      .join(" ");
  if (nombreCompleto) {
    next.nombrecompleto = nombreCompleto;
  }

  return next;
}

module.exports = {
  mergeEmployeeRecord,
};
