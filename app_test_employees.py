from flask import Flask, jsonify
import firebase_admin
from firebase_admin import credentials, firestore

# Inicializar Flask
app = Flask(__name__)

# Ruta al archivo de credenciales
firebase_key_path = "/Users/eleela/Downloads/atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json"

# Inicializar Firebase Admin
if not firebase_admin._apps:
    cred = credentials.Certificate(firebase_key_path)
    firebase_admin.initialize_app(cred)

# Inicializar Firestore
db = firestore.client()

@app.route("/employees", methods=["GET"])
def get_employees():
    try:
        empleados = []
        snapshot = db.collection("EMPLEADOS").stream()

        for doc in snapshot:
            emp_id = doc.id
            print(f"🔎 Verificando empleado: {emp_id}")
            info_ref = db.collection("EMPLEADOS").document(emp_id).collection("datos_personales").document("info")
            info_doc = info_ref.get()

            if info_doc.exists:
                info_data = info_doc.to_dict()
                print(f"✅ Documento encontrado: {info_data}")
                nombre = info_data.get("nombre", f"Empleado {emp_id} sin nombre")
                empleados.append({"id": emp_id, "nombre": nombre})
            else:
                print(f"⚠️ No se encontró documento 'info' para {emp_id}")

        print(f"📦 Total empleados cargados: {len(empleados)}")
        return jsonify({"status": "success", "employees": empleados})

    except Exception as e:
        print(f"❌ ERROR: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)
