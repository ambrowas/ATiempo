import firebase_admin
from firebase_admin import credentials, firestore
import random
import re

# ==============================
# FIREBASE INIT
# ==============================
cred = credentials.Certificate("atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# ==============================
# HELPERS
# ==============================

def generate_employee_number(existing_ids):
    """Generate a random 6-digit number not already used."""
    while True:
        num = str(random.randint(200000, 999999))
        if num not in existing_ids:
            return num

def copy_photo_url(employee_id):
    """Copy url_foto from datos_biometricos/info to datos_personales/info."""
    emp_ref = db.collection("EMPLEADOS").document(employee_id)
    biometric_ref = emp_ref.collection("datos_biometricos").document("info")
    personal_ref = emp_ref.collection("datos_personales").document("info")

    biometric_doc = biometric_ref.get()
    if biometric_doc.exists:
        data = biometric_doc.to_dict()
        url_foto = data.get("url_foto")
        if url_foto:
            personal_ref.set({"url_foto": url_foto}, merge=True)
            print(f"📸 Copied photo for {employee_id}")
        else:
            print(f"⚠️ No url_foto found for {employee_id}")
    else:
        print(f"❌ No biometric info found for {employee_id}")

def rename_employee_document(old_id, new_id):
    """Clone an employee doc (with subcollections) to a new numeric ID, then delete the old one."""
    old_ref = db.collection("EMPLEADOS").document(old_id)
    new_ref = db.collection("EMPLEADOS").document(new_id)

    # Copy top-level fields
    old_data = old_ref.get().to_dict() or {}
    new_ref.set(old_data)
    print(f"🔁 Created new doc {new_id} from {old_id}")

    # Clone all subcollections
    subcollections = old_ref.collections()
    for sub in subcollections:
        sub_name = sub.id
        for doc in sub.stream():
            new_ref.collection(sub_name).document(doc.id).set(doc.to_dict())
    print(f"📂 Copied all subcollections from {old_id} → {new_id}")

    # Delete old one
    old_ref.delete()
    print(f"🗑️ Deleted old document {old_id}")

# ==============================
# MAIN EXECUTION
# ==============================
if __name__ == "__main__":
    empleados = list(db.collection("EMPLEADOS").stream())
    all_ids = [doc.id for doc in empleados]

    print(f"🔍 Found {len(all_ids)} employee records")

    # STEP 1: Copy photos
    for doc in empleados:
        emp_id = doc.id
        # Only process numeric IDs
        if re.match(r"^\d+$", emp_id):
            copy_photo_url(emp_id)

    # STEP 2: Fix non-numeric IDs
    for doc in empleados:
        emp_id = doc.id
        if not re.match(r"^\d+$", emp_id):
            new_id = generate_employee_number(all_ids)
            rename_employee_document(emp_id, new_id)
            all_ids.append(new_id)

    print("✅ Completed photo copy + ID normalization for all employees.")
