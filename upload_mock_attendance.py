import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import random
from calendar import monthrange

# ==============================
# 🔥 FIREBASE INITIALIZATION
# ==============================
cred = credentials.Certificate("atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# ==============================
# 📅 CONFIGURATION
# ==============================
MONTHS_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
]
YEAR = 2025

# ==============================
# 👤 EMPLOYEE PROFILE HELPER
# ==============================
def ensure_employee_profile(employee_id):
    """Ensures each employee has a basic profile under datos_personales/info."""
    personal_ref = (
        db.collection("EMPLEADOS")
        .document(employee_id)
        .collection("datos_personales")
        .document("info")
    )
    if not personal_ref.get().exists:
        personal_ref.set({
            "nombre": f"Empleado {employee_id}",
            "puesto": random.choice(["Analista", "Manager de Área", "Asistente", "Técnico", "Coordinador"]),
            "url_foto": "https://placehold.co/160x160",
            "email": f"empleado{employee_id}@atiempo.com"
        })
        print(f"🧾 Perfil básico creado para {employee_id}")
    else:
        print(f"✅ Perfil existente para {employee_id}")

# ==============================
# 📊 MOCK ATTENDANCE GENERATOR
# ==============================
def generate_mock_attendance(employee_id):
    """Creates realistic attendance data for all months of 2025 and summary stats."""
    for month_name in MONTHS_ES:
        month_index = MONTHS_ES.index(month_name) + 1
        days_in_month = monthrange(YEAR, month_index)[1]

        month_ref = (
            db.collection("EMPLEADOS")
            .document(employee_id)
            .collection("datos_asistencia")
            .document(str(YEAR))
            .collection(month_name)
        )

        # Clean existing docs
        for doc in month_ref.stream():
            doc.reference.delete()

        # Initialize stats
        stats = {
            "dias_esperados": 0,
            "dias_trabajados": 0,
            "dias_ausentes": 0,
            "tardanzas": 0,
            "horas_trabajadas": 0.0,
            "horas_esperadas": 0.0,
        }

        # Generate data
        for day in range(1, days_in_month + 1):
            date = datetime(YEAR, month_index, day)
            weekday = date.weekday()  # 0=Mon, 6=Sun
            if weekday >= 5:
                continue  # Skip weekends

            stats["dias_esperados"] += 1
            stats["horas_esperadas"] += 8.0

            # 10% chance absence
            if random.random() < 0.1:
                stats["dias_ausentes"] += 1
                month_ref.document(f"{day:02d}").set({
                    "hora_entrada": "",
                    "hora_salida": "",
                    "explicacion": "Ausencia no justificada"
                })
                continue

            # Simulate normal day
            hora_entrada = date.replace(hour=8 + random.randint(0, 2), minute=random.randint(0, 59))
            salida_delay = timedelta(hours=8, minutes=random.randint(-20, 45))
            hora_salida = hora_entrada + salida_delay

            entrada_str = hora_entrada.strftime("%Y-%m-%d %H:%M:%S")
            salida_str = hora_salida.strftime("%Y-%m-%d %H:%M:%S")

            # Determine tardiness
            if hora_entrada.hour >= 9 and random.random() < 0.6:
                stats["tardanzas"] += 1
                explicacion = "Llegada tarde"
            elif random.random() < 0.05:
                explicacion = "Salida rápida"
            else:
                explicacion = ""

            # Calculate worked hours
            horas_trabajadas = ((hora_salida - hora_entrada).total_seconds()) / 3600.0
            stats["horas_trabajadas"] += max(0, horas_trabajadas)
            stats["dias_trabajados"] += 1

            # Store per-day doc
            month_ref.document(f"{day:02d}").set({
                "hora_entrada": entrada_str,
                "hora_salida": salida_str,
                "explicacion": explicacion
            })

        # Compute summary stats
        asistencia_pct = (
            (stats["dias_trabajados"] / stats["dias_esperados"]) * 100
            if stats["dias_esperados"] > 0 else 0
        )
        puntualidad_pct = (
            ((stats["dias_trabajados"] - stats["tardanzas"]) / stats["dias_trabajados"]) * 100
            if stats["dias_trabajados"] > 0 else 0
        )

        summary_data = {
            "resumen": {
                "dias_trabajados": stats["dias_trabajados"],
                "dias_habiles": stats["dias_esperados"],
                "ausencias": stats["dias_ausentes"],
                "tardanzas": stats["tardanzas"],
                "horas_trabajadas": round(stats["horas_trabajadas"], 1),
                "horas_habiles": round(stats["horas_esperadas"], 1),
                "%_asistencia": round(asistencia_pct, 1),
                "%_puntualidad": round(puntualidad_pct, 1)
            }
        }

        # Save summary in month root (for faster dashboard loading)
        db.collection("EMPLEADOS").document(employee_id).collection("datos_asistencia").document(str(YEAR)).set({
            month_name: summary_data
        }, merge=True)

        print(f"📅 {employee_id}: Datos creados para {month_name} ({stats['dias_trabajados']} días trabajados)")

# ==============================
# 🧭 MAIN EXECUTION
# ==============================
if __name__ == "__main__":
    empleados = list(db.collection("EMPLEADOS").stream())
    total = 0

    for empleado in empleados:
        emp_id = empleado.id
        print(f"\n🛠️ Generando datos mock para {emp_id}...")
        ensure_employee_profile(emp_id)
        generate_mock_attendance(emp_id)
        total += 1

    print(f"\n🎯 Mock data completa generada correctamente para {total} empleados (enero–diciembre 2025).")
