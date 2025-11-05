import firebase_admin
from firebase_admin import credentials, firestore
import sys
import random
from datetime import datetime
import json

# --- HELPER FUNCTION ---
def calculate_age(birth_date_str):
    if not isinstance(birth_date_str, str): return '---'
    try:
        birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
        today = datetime.today()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    except (ValueError, TypeError):
        return '---'

# --- INITIALIZE FIREBASE ADMIN SDK ---
try:
    cred = credentials.Certificate("atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"❌ Firebase initialization error: {e}")
    sys.exit()

# --- SCRIPT LOGIC ---
if len(sys.argv) < 2:
    print("❌ Error: Please provide the submission ID to approve.")
    print("Usage: python approve_employee.py <submission_id>")
    sys.exit()

submission_id = sys.argv[1]
print(f"🚀 Approving submission with ID: {submission_id}")

try:
    # 1. Get the pending data from Firestore
    pending_ref = db.collection('pending_hires').document(submission_id)
    pending_doc = pending_ref.get()

    if not pending_doc.exists:
        print(f"❌ No pending request found with ID: {submission_id}")
        sys.exit()
    
    data_from_form = pending_doc.to_dict()

    # 2. Generate a unique 6-digit employee number
    employees_ref = db.collection('EMPLEADOS')
    while True:
        new_employee_id = str(random.randint(100000, 999999))
        if not employees_ref.document(new_employee_id).get().exists:
            break
            
    print(f"  - Generated new Employee ID: {new_employee_id}")

    # 3. Prepare the complete data object to be saved
    # This combines the form data with generated data
    full_employee_data = {
        **data_from_form, # Add all data submitted from the form
        "numero_empleado": new_employee_id,
        "edad": calculate_age(data_from_form.get('fecha_nacimiento')),
        "email_corporativo": f"{data_from_form.get('apellidos', 'user').split()[0].lower()}@elebi.com",
        "puesto": "Nuevo Ingreso",
        "departamento": "Sin asignar",
        # Convert JSON strings from form back into arrays
        "titulacion_academica": json.loads(data_from_form.get('titulaciones_json', '[]')),
        "experiencia_laboral": json.loads(data_from_form.get('experiencia_json', '[]')),
        "observaciones": [],
        "url_cv": data_from_form.get('url_cv', ''), # Assuming you add url fields after file upload
        "url_identidad": data_from_form.get('url_identidad', ''),
        "url_reconocimientos": data_from_form.get('url_reconocimientos', '')
    }
    # Remove the temporary JSON fields
    full_employee_data.pop('titulaciones_json', None)
    full_employee_data.pop('experiencia_json', None)

    # 4. Save the single, complete data object into 'datos_biometricos/info'
    employees_ref.document(new_employee_id).collection("datos_biometricos").document("info").set(full_employee_data)
    
    # 5. Create the simple top-level document for searches
    top_level_data = {
        "nombre": data_from_form.get('nombre_completo'),
        "email": data_from_form.get('email_personal'),
        "rol": "Usuario"
    }
    employees_ref.document(new_employee_id).set(top_level_data)
    
    print(f"  - Employee '{data_from_form.get('nombre_completo')}' created successfully in the database.")

    # 6. Delete the pending request
    pending_ref.delete()
    print(f"  - Pending request deleted.")
    print("\n✅ Approval process complete!")
    
except Exception as e:
    print(f"\n❌ An error occurred during the approval process: {e}")