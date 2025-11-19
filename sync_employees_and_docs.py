#!/usr/bin/env python3
# sync_employees_and_docs.py
# Sync nombres/apellidos → nombrecompleto, fix doc paths by id, and regenerate PDFs reflecting updated names.

import os, json, datetime
from pathlib import Path

# ---------------- Config ----------------
ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
DOC_ROOT = PUBLIC / "documentos_empleados"
JSON_PATH = PUBLIC / "datos_empleados.json"
LOGO_PATH = PUBLIC / "src/assets/elebilogo.png"  # adjust if different
MOTTO = "Desde EG para el Mundo"                # ✅ per your instruction

# ------------- PDF Generation ------------
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from PIL import Image

def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

def rel_doc_path(emp_id: int, filename: str) -> str:
    return f"/documentos_empleados/{emp_id}/{filename}"

def abs_doc_path(emp_id: int, filename: str) -> Path:
    return DOC_ROOT / str(emp_id) / filename

def draw_header(c: canvas.Canvas, w, h, title: str):
    c.setFillColor(colors.HexColor("#004080"))
    c.rect(0, h-30, w, 30, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20, h-22, "INICIATIVAS ELEBI")
    c.setFont("Helvetica", 10)
    c.drawRightString(w-20, h-22, title)

def draw_footer(c: canvas.Canvas, w):
    c.setStrokeColor(colors.HexColor("#004080"))
    c.line(20, 30, w-20, 30)
    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(colors.HexColor("#004080"))
    c.drawCentredString(w/2, 18, MOTTO)

def try_draw_logo(c: canvas.Canvas, w, h):
    try:
        if LOGO_PATH.exists():
            c.drawImage(str(LOGO_PATH), w-120, h-75, width=90, height=40, preserveAspectRatio=True, mask='auto')
    except Exception:
        pass

def write_key_value(c, x, y, key, val, key_w=150):
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.black)
    c.drawString(x, y, f"{key}:")
    c.setFont("Helvetica", 10)
    c.drawString(x + key_w, y, str(val) if val is not None else "")

def gen_pdf(emp: dict, kind: str, out_path: Path):
    w, h = A4
    c = canvas.Canvas(str(out_path), pagesize=A4)
    try_draw_logo(c, w, h)
    draw_header(c, w, h, kind.replace("_", " ").upper())

    y = h - 80
    x = 30

    # Core identity block
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(colors.HexColor("#004080"))
    c.drawString(x, y, emp.get("nombrecompleto") or f'{emp.get("nombres","")} {emp.get("apellidos","")}')
    y -= 8
    c.setLineWidth(0.8)
    c.setStrokeColor(colors.HexColor("#004080"))
    c.line(x, y, w-30, y)
    y -= 12

    c.setFont("Helvetica", 10)
    write_key_value(c, x, y, "ID", emp.get("id")); y -= 14
    write_key_value(c, x, y, "Puesto", emp.get("puesto")); y -= 14
    write_key_value(c, x, y, "Departamento", emp.get("departamento")); y -= 20

    info_p = emp.get("informacion_personal", {})
    write_key_value(c, x, y, "Lugar de nacimiento", info_p.get("lugar_nacimiento")); y -= 14
    write_key_value(c, x, y, "Fecha de nacimiento", info_p.get("fecha_nacimiento")); y -= 14
    write_key_value(c, x, y, "Género", info_p.get("genero")); y -= 14
    write_key_value(c, x, y, "Estado civil", info_p.get("estado_civil")); y -= 14
    write_key_value(c, x, y, "Dependientes", info_p.get("dependientes")); y -= 14
    write_key_value(c, x, y, "Teléfono", info_p.get("telefono_personal")); y -= 14
    write_key_value(c, x, y, "Email", info_p.get("email_personal")); y -= 14
    write_key_value(c, x, y, "Dirección", info_p.get("direccion_personal")); y -= 20

    datos_c = emp.get("datos_carrera", {})
    write_key_value(c, x, y, "Fecha de ingreso", datos_c.get("fecha_ingreso")); y -= 14
    write_key_value(c, x, y, "Tipo de contrato", datos_c.get("tipo_contrato")); y -= 14

    info_b = emp.get("informacion_bancaria", {})
    y -= 6
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.HexColor("#004080"))
    c.drawString(x, y, "Datos Bancarios")
    y -= 10
    c.setFont("Helvetica", 10)
    write_key_value(c, x, y, "Banco", info_b.get("banco")); y -= 14
    write_key_value(c, x, y, "Nº de cuenta", info_b.get("numero_cuenta")); y -= 14
    write_key_value(c, x, y, "Tipo de cuenta", info_b.get("tipo_cuenta")); y -= 14
    write_key_value(c, x, y, "Salario mensual (CFA)", info_b.get("salario_mensual_cfa")); y -= 14
    write_key_value(c, x, y, "Salario anual (CFA)", info_b.get("salario_anual_cfa")); y -= 20

    draw_footer(c, w)
    c.showPage()
    c.save()

def ensure_doc_paths(emp: dict):
    emp_id = emp["id"]
    doc = emp.get("documentacion", {})
    doc["contrato_actual_pdf"]   = rel_doc_path(emp_id, "Contrato_Actual.pdf")
    doc["dip_pdf"]               = rel_doc_path(emp_id, "DIP.pdf")
    doc["curriculum_pdf"]        = rel_doc_path(emp_id, "Curriculum.pdf")
    doc["evaluacion_anual_pdf"]  = rel_doc_path(emp_id, "Evaluacion_Anual.pdf")
    doc["id_empleado_elebi_pdf"] = rel_doc_path(emp_id, "ID_Empleado_ELEBI.pdf")
    emp["documentacion"] = doc

def infer_missing(emp: dict):
    # nombrecompleto
    nom = emp.get("nombres", "").strip()
    ape = emp.get("apellidos", "").strip()
    emp["nombrecompleto"] = emp.get("nombrecompleto") or (nom + " " + ape).strip()

    # Build default blocks if absent
    emp.setdefault("informacion_personal", {})
    emp.setdefault("informacion_familiar", {})
    emp.setdefault("informacion_bancaria", {})
    emp.setdefault("datos_carrera", {})

    ip = emp["informacion_personal"]
    ip.setdefault("lugar_nacimiento", "Malabo, Guinea Ecuatorial")
    ip.setdefault("fecha_nacimiento", "")
    if "edad" not in ip or not ip.get("edad"):
        # Try to compute if fecha provided
        try:
            if ip.get("fecha_nacimiento"):
                y, m, d = [int(x) for x in ip["fecha_nacimiento"].split("-")]
                b = datetime.date(y, m, d)
                today = datetime.date.today()
                age = today.year - b.year - ((today.month, today.day) < (b.month, b.day))
                ip["edad"] = age
            else:
                ip["edad"] = None
        except Exception:
            ip["edad"] = None
    ip.setdefault("genero", "No especificado")
    ip.setdefault("estado_civil", "No especificado")
    ip.setdefault("dependientes", 0)
    ip.setdefault("telefono_personal", "+240222780886")
    ip.setdefault("email_personal", f"{nom.lower().replace(' ','')}.{ape.lower().replace(' ','')}@iniciativaselebi.com")
    ip.setdefault("direccion_personal", "Malabo II")
    ip.setdefault("nacionalidad", "Ecuatoguineana")

    ifam = emp["informacion_familiar"]
    ifam.setdefault("nombre_conyuge", "")
    ifam.setdefault("numero_dependientes", ip.get("dependientes", 0))
    ifam.setdefault("contacto_emergencia_nombre", ape.split(" ")[0] if ape else nom or "Contacto")
    ifam.setdefault("contacto_emergencia_telefono", "+240222780886")
    ifam.setdefault("contacto_emergencia_relacion", "Familiar")
    ifam.setdefault("seguro_medico", "NSIA Salud")

    ib = emp["informacion_bancaria"]
    ib.setdefault("banco", "BGFI")
    ib.setdefault("numero_cuenta", f"BGFI{emp['id']}")
    ib.setdefault("tipo_cuenta", "Corriente")
    # Preserve existing salarios if present; otherwise make a sane inference
    ib.setdefault("salario_mensual_cfa", 2000000)
    ib.setdefault("salario_anual_cfa", ib["salario_mensual_cfa"] * 12)

    dc = emp["datos_carrera"]
    dc.setdefault("fecha_ingreso", "2021-01-01")
    dc.setdefault("tipo_contrato", "Indefinido")
    dc.setdefault("descripcion_puesto", f"Funciones propias del puesto de {emp.get('puesto','')}.")
    dc.setdefault("responsabilidades", [])
    dc.setdefault("jerarquia", f"{emp.get('departamento','')}")

def main():
    if not JSON_PATH.exists():
        raise FileNotFoundError(f"No se encontró {JSON_PATH}")

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Your file is either a list or has {"empleados":[...]} — handle both.
    if isinstance(data, dict) and "empleados" in data:
        empleados = data["empleados"]
        root_is_obj = True
    elif isinstance(data, list):
        empleados = data
        root_is_obj = False
    else:
        raise ValueError("Formato de JSON no reconocido (lista o { empleados: [] })")

    for emp in empleados:
        # Infer + normalize
        infer_missing(emp)
        ensure_doc_paths(emp)

        # Regenerate PDFs with updated names/fields
        emp_id = emp["id"]
        out_dir = DOC_ROOT / str(emp_id)
        ensure_dir(out_dir)

        # Create/overwrite the standard set
        pdfs = {
            "Contrato_Actual.pdf": "Contrato de Trabajo",
            "DIP.pdf": "Documento de Identidad Profesional",
            "Curriculum.pdf": "Curriculum Vitae",
            "Evaluacion_Anual.pdf": "Evaluación Anual",
            "ID_Empleado_ELEBI.pdf": "ID de Empleado"
        }
        for filename, title in pdfs.items():
            gen_pdf(emp, title, out_dir / filename)

                # --- AUTO-FIX FOTO PATHS ---
    fotos_dir = PUBLIC / "fotos_empleados"
    if fotos_dir.exists():
        available_photos = {f.name.lower(): f for f in fotos_dir.iterdir() if f.is_file()}
        fixed, missing = [], []
        for emp in empleados:
            nombre = (emp.get("nombres","") + " " + emp.get("apellidos","")).lower().replace("  "," ").strip()
            match = None
            for fn in available_photos:
                if all(part in fn for part in nombre.split()):
                    match = available_photos[fn]
                    break
            if match:
                emp["foto"] = f"public/fotos_empleados/{match.name}"
                fixed.append(match.name)
            else:
                missing.append(nombre)
        print(f"📸 Fotos corregidas: {len(fixed)}  |  Faltantes: {len(missing)}")
        if missing:
            print("⚠️ No se encontraron fotos para:", ", ".join(missing))
    else:
        print("⚠️ No se encontró el directorio de fotos_empleados, se omite verificación.")


    # Write JSON back
    if root_is_obj:
        out_json = {"empleados": empleados}
    else:
        out_json = empleados

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(out_json, f, ensure_ascii=False, indent=2)

    print("✅ Sincronizado: nombres, rutas de PDFs y generación de documentos actualizados.")

if __name__ == "__main__":
    main()
