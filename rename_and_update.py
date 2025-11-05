import firebase_admin
from firebase_admin import credentials, firestore
import sys
import random

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

# --- NAME POOLS FOR MORE REALISTIC GENERATION ---
first_names = [
    "Andres", "Maria", "Juan", "Monica", "Santiago", "Isabel", "Pedro", "Sofia",
    "Javier", "Catalina", "Felipe", "Teresa", "Agustin", "Elena", "Martin", "Lucia"
]
last_names = [
    "Nguema", "Obiang", "Mba", "Esono", "Ndong", "Obono", "Ela", "Asumu",
    "Mitogo", "Eneme", "Nsue", "Nchama", "Abaga", "Mbengono", "Owono", "Bikoro"
]

# --- MAIN SCRIPT LOGIC ---
print("🚀 Starting to update names and clear photo URLs for all employees...")
try:
    employees_ref = db.collection('EMPLEADOS')
    all_employees_docs = list(employees_ref.stream())
    
    if not all_employees_docs:
        print("No employees found to update.")
        sys.exit()

    update_count = 0
    for doc in all_employees_docs:
        employee_id = doc.id
        
        # --- NEW NAME GENERATION LOGIC ---
        # 1. Pick a random first name
        first = random.choice(first_names)
        # 2. Pick two DIFFERENT random last names
        last1, last2 = random.sample(last_names, 2)
        # 3. Combine them
        random_name = f"{first} {last1} {last2}"
        
        # Prepare the data for the update
        update_data = {
            "nombre_completo": random_name,
            "url_foto": ""  # Set the photo URL to be empty
        }

        # Update the 'datos_biometricos/info' document
        doc.reference.collection('datos_biometricos').document('info').set(update_data, merge=True)
        
        # Update the top-level document for consistency
        doc.reference.set({"nombre": random_name}, merge=True)

        print(f"  - Updated employee {employee_id} to name: '{random_name}'")
        update_count += 1

    print(f"\n🔥 Process complete. {update_count} employee records were updated.")

except Exception as e:
    print(f"\n❌ An error occurred: {e}")