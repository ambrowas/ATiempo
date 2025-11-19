# generate_nominas_2025_realista.py — realistic CFA payroll generator

import io, os, json, random, shutil
from datetime import date
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from PyPDF2 import PdfReader, PdfWriter

# ---------- PATHS ----------
PROJECT_ROOT = Path(__file__).resolve().parent
PUBLIC_DIR   = PROJECT_ROOT / "public"
EMP_FILE     = PUBLIC_DIR / "datos_empleados.json"
NOMINAS_DIR  = PUBLIC_DIR / "nominas_2025"
NOMINAS_JSON = PUBLIC_DIR / "NOMINAS.json"

LOGO_PATH = PROJECT_ROOT / "src" / "assets" / "elebilogo.png"
COMPANY_NAME = "Iniciativas Elebi"
YEAR = 2025

MONTHS = ["enero","febrero","marzo","abril","mayo","junio",
          "julio","agosto","septiembre","octubre","noviembre","diciembre"]

def load_logo():
    img = Image.open(LOGO_PATH).convert("RGB")
    buf = io.BytesIO()
    img.thumbnail((180, 180))
    img.save(buf, format="JPEG", quality=60, optimize=True)
    buf.seek(0)
    return ImageReader(buf)

LOGO_READER = load_logo()

# ---------- EMPLOYEES ----------
def load_employees():
    with open(EMP_FILE, "r", encoding="utf-8") as f:
        arr = json.load(f)
    employees = []
    for e in arr:
        base = e.get("salariomensual") or e.get("salario_base")
        try:
            base = float(base)
        except:
            base = random.uniform(1200000, 4000000)
        puesto = (e.get("puesto") or e.get("descripcion_puesto") or "").lower()
        # Normalize unrealistically low salaries
        if base < 1200000:
            if "director" in puesto or "consejero" in puesto:
                base = random.uniform(3500000, 4500000)
            elif "jefe" in puesto or "manager" in puesto:
                base = random.uniform(2200000, 3200000)
            else:
                base = random.uniform(1200000, 2000000)
        nombre = e.get("nombres") or e.get("nombre") or e.get("nombrecompleto") or ""
        apellidos = e.get("apellidos") or e.get("apellido") or ""
        employees.append({
            "employee_id": e.get("id"),
            "nombre": nombre.strip(),
            "apellidos": apellidos.strip(),
            "puesto": e.get("puesto") or e.get("descripcion_puesto"),
            "salario_base": round(base)
        })
    return employees

def sanitize_filename(value: str) -> str:
    safe = "".join(ch for ch in value if ch.isalnum() or ch in (" ", "_", "-")).strip()
    return safe.replace(" ", "_") or "empleado"

# ---------- CALCULATIONS ----------
def calc_nomina(salario_base: float):
    # Bonuses
    bono_rendimiento  = salario_base * random.uniform(0.02, 0.08)
    bono_transporte   = random.randint(30000, 60000)
    bono_alimentacion = random.randint(25000, 50000)

    bruto = salario_base + bono_rendimiento + bono_transporte + bono_alimentacion

    # Deductions
    ded_inceso  = bruto * 0.03
    ded_iva     = bruto * 0.02
    ded_irpf    = bruto * random.uniform(0.05, 0.08)
    otros       = random.randint(2000, 10000)

    total_deducciones = ded_inceso + ded_iva + ded_irpf + otros
    neto = bruto - total_deducciones

    return bruto, neto, {
        "bono_rendimiento": bono_rendimiento,
        "bono_transporte": bono_transporte,
        "bono_alimentacion": bono_alimentacion,
        "ded_inceso": ded_inceso,
        "ded_iva": ded_iva,
        "ded_irpf": ded_irpf,
        "otros": otros
    }

# ---------- PDF CREATION ----------
def create_pdf(fullname, puesto, salario_base, periodo):
    NOMINAS_DIR.mkdir(parents=True, exist_ok=True)
    pdf_path = NOMINAS_DIR / f"nomina_{sanitize_filename(fullname)}_{periodo}.pdf"

    bruto, neto, brk = calc_nomina(salario_base)
    c = canvas.Canvas(str(pdf_path), pagesize=A4, pageCompression=1)

    # Header
    c.drawImage(LOGO_READER, 2*cm, 26*cm, 2.5*cm, 2.5*cm, mask="auto")
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(10.5*cm, 27*cm, f"Nómina - {COMPANY_NAME}")
    c.setFont("Helvetica", 9)
    c.drawCentredString(10.5*cm, 26.4*cm, f"Periodo: {periodo}")

    # Datos del empleado
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, 24.6*cm, "Empleado:")
    c.setFont("Helvetica", 9)
    c.drawString(6*cm, 24.6*cm, fullname)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, 24.0*cm, "Puesto:")
    c.setFont("Helvetica", 9)
    c.drawString(6*cm, 24.0*cm, puesto or "-")

    # Bonificaciones
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, 22.6*cm, "Bonificaciones:")
    c.setFont("Helvetica", 9)
    y = 22.1
    for label, val in [
        ("Bono rendimiento", brk["bono_rendimiento"]),
        ("Transporte", brk["bono_transporte"]),
        ("Alimentación", brk["bono_alimentacion"]),
    ]:
        c.drawString(2.5*cm, y*cm, label)
        c.drawRightString(18.5*cm, y*cm, f"{val:,.0f} XAF")
        y -= 0.5

    # Deducciones
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, (y-0.3)*cm, "Deducciones:")
    y -= 0.8
    c.setFont("Helvetica", 9)
    for label, val in [
        ("INSESO (3%)", brk["ded_inceso"]),
        ("IVA Retenido (2%)", brk["ded_iva"]),
        ("IRPF (5-8%)", brk["ded_irpf"]),
        ("Otros", brk["otros"]),
    ]:
        c.drawString(2.5*cm, y*cm, label)
        c.drawRightString(18.5*cm, y*cm, f"{val:,.0f} XAF")
        y -= 0.5

    # Totales
    y -= 0.3
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2*cm, y*cm, "Totales:")
    y -= 0.5
    c.setFont("Helvetica", 9)
    for label, val in [
        ("Salario Base", salario_base),
        ("Salario Bruto", bruto),
        ("Salario Neto", neto),
    ]:
        c.drawString(2.5*cm, y*cm, label)
        c.drawRightString(18.5*cm, y*cm, f"{val:,.0f} XAF")
        y -= 0.5

    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(10.5*cm, 2.2*cm, f"Pago correspondiente al 25 de {periodo}")
    c.drawCentredString(10.5*cm, 1.8*cm, f"{COMPANY_NAME} © {YEAR}")
    c.showPage()
    c.save()
    return bruto, neto, brk, pdf_path

# ---------- MAIN ----------
def main():
    employees = load_employees()
    if NOMINAS_DIR.exists():
        shutil.rmtree(NOMINAS_DIR)
    NOMINAS_DIR.mkdir(parents=True, exist_ok=True)
    if NOMINAS_JSON.exists():
        NOMINAS_JSON.unlink()
    all_rows = []

    for mm_idx, month in enumerate(MONTHS, start=1):
        periodo = f"{YEAR}-{mm_idx:02d}"
        for e in employees:
            full_name = f"{e['nombre']} {e['apellidos']}".strip()
            bruto, neto, brk, pdf = create_pdf(full_name, e["puesto"], e["salario_base"], periodo)
            all_rows.append({
                "employee_id": e["employee_id"],
                "nombre": e["nombre"],
                "apellidos": e["apellidos"],
                "puesto": e["puesto"],
                "periodo": periodo,
                "fecha_pago": f"{YEAR}-{mm_idx:02d}-25",
                "salario_base": round(e["salario_base"]),
                "bono_rendimiento": round(brk["bono_rendimiento"]),
                "bono_transporte": round(brk["bono_transporte"]),
                "bono_alimentacion": round(brk["bono_alimentacion"]),
                "bruto": round(bruto),
                "ded_inceso": round(brk["ded_inceso"]),
                "ded_iva": round(brk["ded_iva"]),
                "ded_irpf": round(brk["ded_irpf"]),
                "otros": round(brk["otros"]),
                "neto": round(neto),
                "pagado": date(YEAR, mm_idx, 25) <= date.today()
            })

    with open(NOMINAS_JSON, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2)

    print(f"✅ Nóminas generadas — PDFs: {NOMINAS_DIR}, JSON: {NOMINAS_JSON}")

if __name__ == "__main__":
    main()
