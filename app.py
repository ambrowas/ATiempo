from firebase_admin import credentials, firestore
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from calendar import monthrange
import logging
import firebase_admin
import smtplib
from email.message import EmailMessage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# Initialize Firebase (firebase_admin_sdk.json will be in the same folder)
# IMPORTANT: You MUST place your Firebase Admin SDK JSON file in this folder
# And ensure the filename below matches exactly.
# You will need to manually copy this file from your previous location or re-download it.
cred = credentials.Certificate("atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

import base64
from email.utils import make_msgid

def send_welcome_email(to_email, employee_name, qr_code_base64):
    msg = EmailMessage()
    msg["Subject"] = "Bienvenido a ATIEMPO"
    msg["From"] = "info.elebi@gmail.com"
    msg["To"] = to_email

    image_cid = make_msgid(domain="atiempo.app")[1:-1]

    msg.set_content(f"""
Hola y bienvenido a esta gran familia {employee_name},

Tu registro en ATIEMPO ha sido completado con éxito.

Adjunto encontrarás tu código QR, guárdalo y utilízalo para registrar tus horas de entrada y salida.

Saludos,
Equipo ATIEMPO
""")

    # HTML version with embedded image
    msg.add_alternative(f"""
<html>
  <body>
    <p>Hola y bienvenido a esta gran familia <strong>{employee_name}</strong>,</p>
    <p>Tu registro en <strong>ATIEMPO</strong> ha sido completado con éxito.</p>
    <p>Aquí tienes tu código QR:</p>
    <img src="cid:{image_cid}" alt="QR Code">
    <p>Por favor, guarda esta imagen y utilízala para registrar tus horas de entrada y salida.</p>
    <p>Saludos,<br>Equipo ATIEMPO</p>
  </body>
</html>
""", subtype='html')

    # Decode base64 and attach image
    if qr_code_base64.startswith("data:image"):
        qr_code_base64 = qr_code_base64.split(",")[1]

    qr_bytes = base64.b64decode(qr_code_base64)
    msg.get_payload()[1].add_related(qr_bytes, 'image', 'png', cid=f"<{image_cid}>")

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login("info.elebi@gmail.com", "zftlzvphvwopxnob") # <<< IMPORTANT: Replace with your actual App Password
            smtp.send_message(msg)
            logging.info(f"✅ Email sent to {to_email}")
    except Exception as e:
        logging.error(f"❌ Failed to send email: {str(e)}")


def initialize_attendance_structure(employee_id, year):
    months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]

    for i, month in enumerate(months, start=1):
        days_in_month = monthrange(year, i)[1]
        for day in range(1, days_in_month + 1):
            day_str = f"{day:02d}"
            doc_ref = db.collection("EMPLEADOS") \
                .document(employee_id) \
                .collection("ASISTENCIA") \
                .document(month) \
                .collection("DIAS") \
                .document(day_str)

            doc_ref.set({
                "hora_entrada": "",
                "hora_salida": "",
                "explicacion": ""
            }, merge=True)

def should_initialize(employee_id):
    enero_ref = db.collection("EMPLEADOS") \
        .document(employee_id) \
        .collection("ASISTENCIA") \
        .document("enero")
    return not enero_ref.get().exists

@app.route('/scan', methods=['POST'])
def log_scan():
    data = request.json
    employee_id = data.get("employee_id")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not employee_id:
        logging.warning("Scan request missing employee_id")
        return jsonify({"status": "error", "message": "employee_id is required"}), 400

    if should_initialize(employee_id):
        initialize_attendance_structure(employee_id, datetime.now().year)

    now = datetime.now()
    month_name = now.strftime("%B").lower()
    day = now.strftime("%d")

    doc_ref = db.collection("EMPLEADOS") \
        .document(employee_id) \
        .collection("ASISTENCIA") \
        .document(month_name) \
        .collection("DIAS") \
        .document(day)

    existing_doc = doc_ref.get()
    update_data = {}

    if existing_doc.exists:
        record = existing_doc.to_dict()
        hora_entrada = record.get("hora_entrada", "")
        hora_salida = record.get("hora_salida", "")

        if not hora_entrada:
            update_data["hora_entrada"] = timestamp
        elif not hora_salida:
            update_data["hora_salida"] = timestamp
        else:
            update_data["explicacion"] = "Escaneo adicional detectado: posible olvido de cerrar sesión anterior."
    else:
        update_data["hora_entrada"] = timestamp

    doc_ref.set(update_data, merge=True)

    logging.info(f"Scan logged: {employee_id} at {timestamp} -> {update_data}")
    return jsonify({"status": "success", "employee_id": employee_id, "timestamp": timestamp})

@app.route('/create-employee', methods=['POST'])
def create_employee(): # Removed duplicate decorator
    data = request.json
    employee_id = data.get("employee_id")
    personal_data = data.get("datos_personales", {})
    qr_code_base64 = data.get("qr_code", "")

    if not employee_id or not personal_data:
        logging.warning("Invalid employee creation data: missing employee_id or datos_personales")
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    logging.info(f"Creating employee: {employee_id} -> {personal_data}")

    try:
        doc_ref = db.collection("EMPLEADOS").document(employee_id).collection("datos_personales").document()
        doc_ref.set(personal_data)
        logging.info(f"Employee {employee_id} created successfully")

        send_welcome_email(
            to_email=personal_data.get("email", ""),
            employee_name=personal_data.get("nombre", ""),
            qr_code_base64=qr_code_base64
        )

        return jsonify({"status": "success", "employee_id": employee_id})
    except Exception as e:
        logging.error(f"Error creating employee {employee_id}: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
