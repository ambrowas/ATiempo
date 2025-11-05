import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import sys
import random

# --- HELPER FUNCTIONS ---

def calculate_age(birth_date_str):
    if not isinstance(birth_date_str, str): return '---'
    try:
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
        today = datetime.today()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    except (ValueError, TypeError):
        return '---'

def get_last_name(full_name):
    if not isinstance(full_name, str) or not full_name.strip(): return "user"
    return full_name.split()[-1]

# --- INITIALIZE FIREBASE ADMIN SDK ---
try:
    cred = credentials.Certificate("atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase initialized successfully.")
except Exception as e:
    print(f"❌ Firebase initialization error: {e}")
    sys.exit()

# --- MOCK DATA LISTS ---
DEPARTMENTS = ["Tecnología", "Recursos Humanos", "Finanzas", "Operaciones", "Logística", "Dirección"]
POSITIONS = ["Analista", "Técnico Especializado", "Manager de Área", "Asistente Administrativo", "Conductor", "Director"]
BANKS = ["Bange", "SGBGE", "CCEI Bank", "EcoBank", "BGFI"]
PROVINCES = ["Bioko Norte", "Bioko Sur", "Litoral", "Centro Sur", "Wele-Nzas", "Kié-Ntem", "Annobón"]

# --- MAIN SCRIPT LOGIC ---
print("🚀 Starting rebuild of 'datos_rrhh' for all employees...")
try:
    employees_ref = db.collection('EMPLEADOS')
    all_employees = employees_ref.stream()
    
    update_count = 0
    for doc in all_employees:
        employee_id = doc.id
        print(f"\nProcessing Employee ID: {employee_id}...")

        # STEP 1: DELETE the entire old 'datos_rrhh' subcollection first
        rrhh_subcollection_ref = doc.reference.collection('datos_rrhh')
        for rrhh_doc in rrhh_subcollection_ref.stream():
            rrhh_doc.reference.delete()
        print(f"  - Old 'datos_rrhh' subcollection deleted.")

        # STEP 2: READ existing data from 'datos_personales'
        personal_info_doc = doc.reference.collection('datos_personales').document('info').get()
        personal_info_data = personal_info_doc.to_dict() if personal_info_doc.exists else {}

        # STEP 3: GENERATE new mock data based on your rules
        full_name = personal_info_data.get('nombre', 'Empleado Desconocido')
        last_name = get_last_name(full_name).lower().replace(' ', '')
        
        mock_data = {
            "email_corporativo": f"{last_name}@elebi.com",
            "telefono_corporativo": f"+240 222 {random.randint(100, 999)} {random.randint(100, 999)}",
            "departamento": random.choice(DEPARTMENTS),
            "puesto": random.choice(POSITIONS),
            "categoria_empleado": random.choice(["Permanente", "Temporal", "Sub-contratado"]),
            "banco": random.choice(BANKS),
            "numero_cuenta": f"{random.randint(1000, 9999)} {random.randint(1000, 9999)} {random.randint(1000, 9999)}",
        }

        # STEP 4: ASSEMBLE the final data structure
        full_hr_data = {
            "email_corporativo": mock_data["email_corporativo"],
            "telefono_corporativo": mock_data["telefono_corporativo"],
            "fecha_incorporacion": personal_info_data.get('fecha_incorporacion', '---'),
            "departamento": mock_data["departamento"],
            "puesto": mock_data["puesto"],
            "categoria_empleado": mock_data["categoria_empleado"],
            "datos_biometricos": {
                "nombre": full_name,
                "fecha_nacimiento": personal_info_data.get('fecha_nacimiento', '---'),
                "edad": calculate_age(personal_info_data.get('fecha_nacimiento')),
                "estado_civil": personal_info_data.get('estado_civil', '---'),
                "sexo": personal_info_data.get('sexo', '---'),
                "dependientes": personal_info_data.get('dependientes', 0),
                "direccion": personal_info_data.get('direccion', '---'),
                "email_personal": personal_info_data.get('email', '---'),
                "telefono_personal": personal_info_data.get('telefono', '---'),
                "contacto_emergencia_nombre": personal_info_data.get('contacto_emergencia', '---'),
                "contacto_emergencia_telefono": personal_info_data.get('telefono_emergencia', '---'),
                "natural_de": random.choice(PROVINCES),
                "dip_numero": personal_info_data.get('dip_numero', '---'),
                "pasaporte_numero": personal_info_data.get('pasaporte_numero', '---'),
                "nacionalidad": personal_info_data.get('nacionalidad', 'Ecuatoguineana')
            },
            "datos_financieros": {
                "banco": mock_data["banco"],
                "numero_cuenta": mock_data["numero_cuenta"],
                "salario_bruto_anual": personal_info_data.get('salario_bruto_anual', 0),
                "tipo_contrato": personal_info_data.get('tipo_contrato', '---')
            },
            "datos_carrera": {
                "contrato_actual": "Contrato estándar 2024 - Presente",
                "contratos_anteriores": [],
                "titulacion_academica": personal_info_data.get('titulacion_academica', []),
                "observaciones": []
            }
        }
        
        # STEP 5: WRITE the new data to the 'datos_rr_hh' subcollection
        doc.reference.collection("datos_rr_hh").document("info").set(full_hr_data)
        print(f"  - New 'datos_rrhh/info' document created successfully.")

        update_count += 1

    print(f"\n🔥 Process complete. {update_count} employee records were rebuilt.")

except Exception as e:
    print(f"\n❌ An error occurred during the process: {e}")