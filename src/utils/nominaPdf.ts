import { jsPDF } from "jspdf";

export type NominaLike = {
  nombre: string;
  apellidos?: string;
  employee_role?: string;
  puesto?: string;
  periodo: string;
  fecha_pago: string;
  salario_base: number;
  bruto: number;
  neto: number;
  bono_ventas?: number;
  bono_rendimiento?: number;
  bono_transporte?: number;
  bono_alimentacion?: number;
  seg_social?: number;
  ded_inceso?: number;
  ded_iva?: number;
  ded_irpf?: number;
  irpf?: number;
  otros?: number;
};

export const formatNominaCurrency = (value: number) =>
  value.toLocaleString("es-GQ", { style: "currency", currency: "XAF" });

export const computeNominaBonos = (record: NominaLike) =>
  (record.bono_ventas ?? 0) +
  (record.bono_rendimiento ?? 0) +
  (record.bono_transporte ?? 0) +
  (record.bono_alimentacion ?? 0);

export const computeNominaDeducciones = (record: NominaLike) =>
  (record.ded_inceso ?? record.seg_social ?? 0) +
  (record.ded_iva ?? 0) +
  (record.ded_irpf ?? record.irpf ?? 0) +
  (record.otros ?? 0);

export const buildNominaPdf = (record: NominaLike) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fullName = `${record.nombre} ${record.apellidos || ""}`.trim() || "Colaborador";
  const bonos = computeNominaBonos(record);
  const deducciones = computeNominaDeducciones(record);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Recibo de Nómina", 20, 24);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Colaborador: ${fullName}`, 20, 38);
  doc.text(`Departamento: ${record.employee_role || record.puesto || "—"}`, 20, 46);
  doc.text(`Periodo: ${record.periodo}`, 20, 54);
  doc.text(`Fecha de pago: ${record.fecha_pago}`, 20, 62);

  doc.setFont("helvetica", "bold");
  doc.text("Resumen salarial", 20, 78);
  doc.setFont("helvetica", "normal");
  doc.text(`Salario base: ${formatNominaCurrency(record.salario_base)}`, 20, 88);
  doc.text(`Bonificaciones: ${formatNominaCurrency(bonos)}`, 20, 96);
  doc.text(`Total bruto: ${formatNominaCurrency(record.bruto)}`, 20, 104);
  doc.text(`Deducciones: ${formatNominaCurrency(deducciones)}`, 20, 112);
  doc.text(`Neto a pagar: ${formatNominaCurrency(record.neto)}`, 20, 120);

  const bonusEntries: Array<[string, number | undefined]> = [
    ["Bono por ventas", record.bono_ventas],
    ["Bono rendimiento", record.bono_rendimiento],
    ["Transporte", record.bono_transporte],
    ["Alimentación", record.bono_alimentacion],
  ];
  const deductionEntries: Array<[string, number | undefined]> = [
    ["INSESO / Seg. social", record.ded_inceso ?? record.seg_social],
    ["IVA retenido", record.ded_iva],
    ["IRPF", record.ded_irpf ?? record.irpf],
    ["Otros descuentos", record.otros],
  ];

  let y = 140;
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de bonificaciones", 20, y);
  doc.text("Detalle de deducciones", 120, y);
  doc.setFont("helvetica", "normal");
  y += 8;

  bonusEntries.forEach(([label, value]) => {
    doc.text(`${label}: ${formatNominaCurrency(value ?? 0)}`, 20, y);
    y += 6;
  });

  let yDed = 148;
  deductionEntries.forEach(([label, value]) => {
    doc.text(`${label}: ${formatNominaCurrency(value ?? 0)}`, 120, yDed);
    yDed += 6;
  });

  const summaryY = Math.max(y, yDed) + 10;
  doc.setFont("helvetica", "bold");
  doc.text(`Total neto: ${formatNominaCurrency(record.neto)}`, 20, summaryY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Documento generado automáticamente por Atiempo para fines informativos internos.",
    20,
    278
  );
  return doc;
};
