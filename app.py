import requests 
import io
import qrcode
import smtplib
from flask import request, jsonify

# ==========================================================
# 🔥 FIREBASE INITIALIZATION (Fail-fast)
# ==========================================================
import os
import firebase_admin
from firebase_admin import credentials, firestore

cred_path = os.path.join(os.path.dirname(__file__), "atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")

if not os.path.exists(cred_path):
    raise FileNotFoundError(f"🚫 Firebase credential file not found at: {cred_path}")

try:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print(f"✅ Firebase initialized successfully using: {cred_path}")
except Exception as e:
    print(f"❌ Firebase initialization failed: {e}")
    raise SystemExit("🛑 Cannot continue without Firestore — check your credential path or permissions.")



from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.mime.base import MIMEBase
from email import encoders
from email.utils import formataddr
from email.headerregistry import Address
import logging
import os
import uuid
import smtplib
from email.message import EmailMessage
from datetime import datetime
import time
from werkzeug.utils import secure_filename
import re  # For the secure_filename function
import random
from email.utils import make_msgid
from flask import Flask, send_from_directory, jsonify, request, render_template, render_template_string, url_for, make_response
from flask_cors import CORS
from dotenv import load_dotenv
import json
from datetime import datetime
from firebase_admin import firestore
from flask import jsonify, request
import logging
from io import BytesIO
from flask import send_file
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
load_dotenv()
import platform, subprocess, time, os



def sync_system_clock():
    try:
        os_type = platform.system().lower()
        print("🕒 Checking system clock synchronization...")

        if "darwin" in os_type:  # macOS
            subprocess.run(["sntp", "-sS", "time.google.com"], check=False)
        elif "windows" in os_type:
            subprocess.run(["w32tm", "/resync"], check=False)
        elif "linux" in os_type:
            subprocess.run(["ntpdate", "-u", "time.google.com"], check=False)
        else:
            print("⚠️ Unknown OS — skipping clock sync")

        print("✅ Clock sync check completed.")
    except Exception as e:
        print(f"⚠️ Clock sync attempt failed: {e}")

# Run this at startup for all environments
sync_system_clock()

from firebase_admin import auth



def verify_token_safe(token):
    """
    Secure token verification with extended clock skew handling.
    Use this function wherever tokens are validated.
    """
    try:
        return auth.verify_id_token(token, clock_skew_seconds=300)
    except Exception as e:
        if "Token used too early" in str(e) or "expired" in str(e):
            print("⚠️ Retrying token verification with relaxed tolerance (600s)...")
            return auth.verify_id_token(token, clock_skew_seconds=600)
        raise





app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# --- Lightweight auth helper for Firebase ID tokens (non-blocking) ---
try:
    from flask import g as flask_g
except Exception:
    flask_g = None

def _extract_bearer_token():
    """Return the Bearer token from the Authorization header, if present."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ', 1)[1].strip() or None

@app.before_request
def _attach_firebase_user_if_any():
    """
    For any /api/* request, attempt to verify the Firebase ID token and attach
    it to flask.g as `firebase_user`. This is *best effort* and **does not**
    enforce auth; existing route guards still apply. This keeps behavior
    unchanged while allowing persistent sessions to be recognized centrally.
    """
    try:
        # Only attempt for API calls
        if not request.path.startswith('/api'):
            return

        token = _extract_bearer_token()
        if not token:
            # No token — leave firebase_user unset
            return

        # Verify token (clock skew tolerated)
        decoded = auth.verify_id_token(token, clock_skew_seconds=120)
        if flask_g is not None:
            flask_g.firebase_user = decoded
    except Exception as e:
        # Do not block the request; routes may handle auth themselves.
        # Optionally store the error for debugging.
        if flask_g is not None:
            flask_g.firebase_user_error = str(e)
        return

import firebase_admin
from firebase_admin import credentials, firestore, auth, storage 
from functools import lru_cache
import time


# Import WeasyPrint for PDF generation
try:
    from weasyprint import HTML, CSS
    logging.info("✅ WeasyPrint imported successfully for PDF generation.")
except ImportError as e:
    logging.error(f"❌ WeasyPrint import failed: {e}. Please ensure it's installed along with its dependencies.")
    # You might want to handle this more gracefully in a production app,
    # e.g., fall back to just HTML if PDF generation is not critical.

# --- Diagnostic Imports and Version Checks ---
# This block helps us understand which versions are actually loaded
try:
    import google.cloud.firestore as gcf_module
    logging.info(f"Firestore client (google.cloud.firestore) version: {gcf_module.__version__}")
except Exception as version_e:
    logging.warning(f"Could not determine google.cloud.firestore version: {version_e}")

try:
    logging.info(f"Firebase Admin SDK (firebase_admin) version: {firebase_admin.__version__}")
except Exception as version_e:
    logging.warning(f"Could not determine firebase_admin version: {version_e}")

# IMPORTANT: We are explicitly NOT importing FieldPath directly here
# and will use '__name__' for document ID ordering as a workaround.
# If FieldPath was the issue, this should bypass it.

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

import os, logging

# ✅ Create log directory automatically
log_dir = os.path.expanduser("~/Library/Application Support/ATiempo")
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "atiempo_runtime.log")

logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logging.info("🚀 ATiempo backend starting up...")


# ✅ TEST LOG (only for verification)
print("=== Flask Environment Check ===")
print("FUNCTIONS_BASE_URL:", os.getenv("FUNCTIONS_BASE_URL"))
print("EMAIL_USER:", os.getenv("EMAIL_USER"))
print("EMAIL_PASS:", "✅ Loaded" if os.getenv("EMAIL_PASS") else "❌ Missing")
print("===============================")



FUNCTIONS_BASE_URL = os.getenv("FUNCTIONS_BASE_URL")
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")

# ============================================================
# 🔒 Cached Firebase Token Verification (prevents quota spikes)
# ============================================================
@lru_cache(maxsize=512)
def verify_token_cached(token: str):
    """
    Verifies a Firebase ID token and caches the result for ~15 minutes.
    Prevents hitting Firebase Auth daily verification quotas.
    """
    decoded = auth.verify_id_token(token)
    decoded["_verified_at"] = time.time()
    return decoded

@app.before_request
def clear_cache_if_stale():
    # Clear cache every 15 minutes
    if not hasattr(clear_cache_if_stale, "last_clear"):
        clear_cache_if_stale.last_clear = time.time()
    if time.time() - clear_cache_if_stale.last_clear > 900:
        verify_token_cached.cache_clear()
        clear_cache_if_stale.last_clear = time.time()

@app.route('/api/debug/cache')
def debug_cache():
    return jsonify({
        "cache_size": verify_token_cached.cache_info().currsize,
        "cache_hits": verify_token_cached.cache_info().hits,
        "cache_misses": verify_token_cached.cache_info().misses,
        "last_clear": getattr(clear_cache_if_stale, "last_clear", "unknown")
    })


# ============================================================
# 🚀 Firestore Read Cache (reduces read costs and latency)
# ============================================================
from functools import lru_cache
import time

READ_CACHE_TTL = 30  # seconds

@lru_cache(maxsize=256)
def cached_firestore_query(collection_name: str):
    """
    Returns cached Firestore data for the specified collection.
    Auto-refreshes every READ_CACHE_TTL seconds.
    """
    docs = db.collection(collection_name).stream()
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(data)

    # Store a timestamp so we know when it was last updated
    result.append({"_cached_at": time.time()})
    return result


def get_firestore_data(collection_name: str):
    """
    Retrieves Firestore data with short-term caching.
    """
    data = cached_firestore_query(collection_name)
    if time.time() - data[-1]["_cached_at"] > READ_CACHE_TTL:
        cached_firestore_query.cache_clear()
        data = cached_firestore_query(collection_name)
    return data[:-1]  # strip the metadata




# --- Cloud Functions (unified) caller ---------------------------------------
import requests

def call_cf(path, *, json=None, data=None, files=None, timeout=30):
    """
    Calls the unified Cloud Run 'api' service with proper timeouts & errors.
    Example: call_cf('/sendRegistrationEmail', json={"nombre":"X","email":"Y"})
    """
    if not FUNCTIONS_BASE_URL:
        raise RuntimeError("FUNCTIONS_BASE_URL is not set")

    base = FUNCTIONS_BASE_URL.rstrip('/')
    url = f"{base}{path if path.startswith('/') else '/' + path}"

    try:
        if json is not None:
            resp = requests.post(url, json=json, timeout=timeout)
        else:
            resp = requests.post(url, data=data, files=files, timeout=timeout)
        resp.raise_for_status()
        # Some of your functions return JSON; if not, return text
        try:
            return resp.json()
        except ValueError:
            return {"status": "success", "message": resp.text}
    except requests.exceptions.RequestException as e:
        # Bubble up a clean message for the caller
        raise RuntimeError(f"Unified endpoint call failed: {e}") from e


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response



# Define the directory where your static files are located.
STATIC_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

# Ensure the static folder exists (useful for local development)
if not os.path.exists(STATIC_FOLDER):
    os.makedirs(STATIC_FOLDER)
    logging.info(f"Created static folder at: {STATIC_FOLDER}")

# Create a dummy refranes.json if it doesn't exist for testing purposes
REFRANES_FILE = os.path.join(STATIC_FOLDER, 'refranes.json')
if not os.path.exists(REFRANES_FILE):
    with open(REFRANES_FILE, 'w', encoding='utf-8') as f:
        f.write('{"proverbios": ["No hay mal que dure cien años, ni cuerpo que lo resista.", "Más vale tarde que nunca."]}')
    logging.info(f"Created dummy refranes.json at: {REFRANES_FILE}")

def calculate_salary_with_bonuses(base_salary, employee_role, performance_rating=None, years_of_service=None):
    """
    Calculate salary with performance and loyalty bonuses based on role
    """
    # Role-based base salaries
    role_salaries = {
        'Director': 2500000,
        'Gerente': 1800000,
        'Supervisor': 1200000,
        'Contador': 1500000,
        'Conductor': 800000,
        'Técnico': 900000,
        'Administrativo': 1000000,
        'Limpieza': 600000,
        'Default': 751000  # Fallback for unspecified roles
    }
    
    # Use role-based salary or default
    base_salary = role_salaries.get(employee_role, role_salaries['Default'])
    
    # Generate random performance rating if not provided (1-5 scale)
    if performance_rating is None:
        performance_rating = round(random.uniform(3.5, 5.0), 1)
    
    # Generate random years of service if not provided (0-10 years)
    if years_of_service is None:
        years_of_service = random.randint(0, 10)
    
    # Performance bonus (0-20% based on rating 1-5)
    performance_bonus = base_salary * (performance_rating * 0.04)
    
    # Loyalty bonus (5% per year of service, capped at 25%)
    loyalty_bonus = base_salary * (min(years_of_service, 5) * 0.05)
    
    # Random special achievement bonus (0-10%)
    special_bonus = base_salary * (random.uniform(0, 0.10))
    
    total_salary = base_salary + performance_bonus + loyalty_bonus + special_bonus
    
    return {
        'base_salary': base_salary,
        'performance_rating': performance_rating,
        'years_of_service': years_of_service,
        'performance_bonus': performance_bonus,
        'loyalty_bonus': loyalty_bonus,
        'special_bonus': special_bonus,
        'total_salary': total_salary
    }

def animate_salary_calculation(employee_name, salary_data):
    """
    Simulated animation for salary calculation (for logging)
    """
    logging.info(f"\n🎯 Calculating salary for: {employee_name}")
    logging.info("═" * 50)
    logging.info(f"💰 Base Salary: FCFA {salary_data['base_salary']:,.0f}")
    
    if salary_data['performance_bonus'] > 0:
        logging.info(f"⭐ Performance Bonus (+{salary_data['performance_bonus']/salary_data['base_salary']*100:.1f}%): FCFA +{salary_data['performance_bonus']:,.0f}")
    
    if salary_data['loyalty_bonus'] > 0:
        logging.info(f"🏆 Loyalty Bonus: FCFA +{salary_data['loyalty_bonus']:,.0f}")
    
    if salary_data['special_bonus'] > 0:
        logging.info(f"🎲 Special Bonus: FCFA +{salary_data['special_bonus']:,.0f}")
    
    logging.info("─" * 30)
    logging.info(f"🎉 TOTAL SALARY: FCFA {salary_data['total_salary']:,.0f}")
    logging.info("═" * 50)

# --- 3. HTML PAGE SERVING ROUTES ---
# All pages extend base.html automatically

@app.route('/')
def main_panel():
    return render_template('panel_principal.html')

@app.route('/gestion-empleados')
def page_gestion_empleados():
    return render_template('empleados.html')

@app.route('/asistencia')
def page_visualizar_asistencia():
    return render_template('visualizar_asistencia.html')

@app.route('/registro')
def page_registro_empleado():
    return render_template('registro_empleado.html')

@app.route('/mi-perfil')
def page_mi_perfil():
    return render_template('mi_perfil.html')

@app.route('/nomina')
def page_nomina():
    return render_template('nomina.html')

@app.route('/contabilidad')
def page_contabilidad():
    return render_template('contabilidad.html')

@app.route('/flota')
def page_flota():
    return render_template('gestion_de_flota.html')

@app.route('/ajustes')
def page_ajustes():
    return render_template('ajustes.html')

# --- 4. API ROUTES (for data handling) ---

# NUEVA RUTA: Simula el monitoreo en vivo de la ubicación del vehículo
@app.route('/api/vehicle/<string:vehicle_id>/location', methods=['GET'])
def get_vehicle_location(vehicle_id):
    """
    Simulates live vehicle tracking around Malabo with realistic gradual movement.
    """
    import random
    import datetime

    try:
        # ✅ Optional token check (keep as-is for now)
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Authorization token is missing or invalid'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        # ✅ Initialize static in-memory position store
        if not hasattr(app, "vehicle_positions"):
            app.vehicle_positions = {}

        # ✅ Default starting point — Malabo center
        center_lat, center_lng = 3.75, 8.78

        # ✅ Get last position for this vehicle, or start at Malabo
        last_pos = app.vehicle_positions.get(vehicle_id, {
            "latitude": center_lat + random.uniform(-0.01, 0.01),
            "longitude": center_lng + random.uniform(-0.01, 0.01)
        })

        # ✅ Small drift to simulate realistic movement (0.001° ≈ 100m)
        delta_lat = random.uniform(-0.001, 0.001)
        delta_lng = random.uniform(-0.001, 0.001)

        new_lat = last_pos["latitude"] + delta_lat
        new_lng = last_pos["longitude"] + delta_lng

        # ✅ Keep vehicles within Malabo area boundaries
        new_lat = max(min(new_lat, 3.78), 3.72)
        new_lng = max(min(new_lng, 8.82), 8.74)

        # ✅ Store new position
        app.vehicle_positions[vehicle_id] = {"latitude": new_lat, "longitude": new_lng}

        # ✅ Compose response
        location_data = {
            "latitude": new_lat,
            "longitude": new_lng,
            "timestamp": datetime.datetime.now().isoformat(),
            "speed_kmh": round(abs(random.gauss(40, 15)), 1),
            "status": random.choice(["En movimiento", "Detenido", "En ruta", "Estacionado"])
        }

        return jsonify({"status": "success", "location": location_data})

    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        import logging
        logging.error(f"Error en /api/vehicle/{vehicle_id}/location: {e}")
        return jsonify({'status': 'error', 'message': f'Error interno del servidor: {e}'}), 500

# [Full function definition from app.py, lines 1499-1528]

@app.route("/api/vehicles", methods=["GET"])
def get_vehicles():
    """
    Retrieves all vehicle records from Firestore.
    Requires Firebase ID token for authentication.
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            logging.warning("[AUTH] Missing or malformed Authorization header: %s", auth_header)
            return jsonify({"status": "error", "message": "Cabecera Authorization ausente o incorrecta"}), 401

        # Extract raw token
        token = auth_header.split("Bearer ")[1].strip()
        if not token:
            logging.warning("[AUTH] Empty Bearer token received.")
            return jsonify({"status": "error", "message": "Token vacío"}), 401

        # Verify against Firebase
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        logging.info(f"[AUTH] ✅ Token verified for UID: {uid}")

        # Fetch vehicles from Firestore
        vehicles_ref = db.collection("VEHICULOS")
        docs = vehicles_ref.stream()

        vehicles = []
        for doc in docs:
            data = doc.to_dict() or {}
            data["id"] = doc.id
            vehicles.append(data)

        logging.info(f"[FLOTA] 🚗 Retrieved {len(vehicles)} vehicle records for UID: {uid}")
        return jsonify({"status": "success", "vehicles": vehicles})

    except auth.InvalidIdTokenError as e:
        logging.error(f"[AUTH] ❌ InvalidIdTokenError: {e}")
        return jsonify({"status": "error", "message": "El token es inválido o ha expirado"}), 401
    except Exception as e:
        logging.exception("[FLOTA] ⚠️ Unexpected server error")
        return jsonify({"status": "error", "message": f"Error interno: {str(e)}"}), 500


@app.route('/api/vehicle', methods=['POST'])
def add_vehicle():
    """
    Adds a new vehicle record to Firestore.
    Requires Firebase ID token for authentication.
    """
    try:
        # Authentication check
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Authorization token is missing or invalid'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data provided'}), 400

        # Basic validation for required fields
        required_fields = ["marca", "modelo", "año", "color", "vin"]
        if not all(field in data for field in required_fields):
            return jsonify({'status': 'error', 'message': 'Missing required vehicle data'}), 400
        
        # Prepare data for Firestore, including a server timestamp
        new_vehicle_data = {
            "marca": data["marca"],
            "modelo": data["modelo"],
            "año": int(data["año"]), # Ensure year is an integer
            "color": data["color"],
            "vin": data["vin"],
            "createdAt": firestore.SERVER_TIMESTAMP # Server-side timestamp for creation
        }
        
        # Add the new document to the 'vehicles' collection
        # Firestore will automatically generate a unique ID
        doc_ref = db.collection('VEHICULOS').add(new_vehicle_data)
        
        # Get the auto-generated document ID and add it to the response data
        # doc_ref is a tuple: (update_time, document_reference)
        new_vehicle_data['id'] = doc_ref[1].id

        return jsonify({"status": "success", "message": "Vehículo registrado con éxito", "vehicle": new_vehicle_data}), 201
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/vehicle (POST) a Firestore: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor al añadir vehículo a Firestore'}), 500

@app.route('/api/vehicle/<string:vehicle_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_single_vehicle(vehicle_id):
    """
    Manages a single vehicle record by ID (GET, PUT, DELETE).
    Requires Firebase ID token for authentication.
    """
    try:
        # Authentication check
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Authorization token is missing or invalid'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        # Get a reference to the specific vehicle document
        vehicle_doc_ref = db.collection('VEHICULOS').document(vehicle_id)
        vehicle_doc = vehicle_doc_ref.get()

        # Check if the document exists
        if not vehicle_doc.exists:
            return jsonify({'status': 'error', 'message': 'Vehículo no encontrado'}), 404
        
        # Obtenemos los datos base del vehículo
        current_vehicle_data = vehicle_doc.to_dict()
        
        # --- Lógica para GET, PUT, DELETE ---
        if request.method == 'GET':
            # Creamos explícitamente el diccionario de respuesta para evitar problemas de serialización
            response_vehicle = {
                "id": vehicle_doc.id, # Asegúrate de que el ID se obtenga aquí, no después
                "matricula": current_vehicle_data.get("matricula"),
                "marca": current_vehicle_data.get("marca"),
                "modelo": current_vehicle_data.get("modelo"),
                "año": current_vehicle_data.get("año"),
                "color": current_vehicle_data.get("color"),
                "vin": current_vehicle_data.get("vin"),
                "tipo": current_vehicle_data.get("tipo"),
                "foto": current_vehicle_data.get("foto"),
                "seguro": current_vehicle_data.get("seguro"),
                "fecha_de_adquisicion": current_vehicle_data.get("fecha_de_adquisicion")
            }
            
            # --- Fetch Maintenance Data ---
            maintenance_log = []
            mantenimiento_doc_ref = vehicle_doc_ref.collection('datos_mantenimiento').document('registro_principal')
            mantenimiento_doc = mantenimiento_doc_ref.get()
            if mantenimiento_doc.exists:
                mantenimiento_data = mantenimiento_doc.to_dict()
                if 'historial_incidentes' in mantenimiento_data and isinstance(mantenimiento_data['historial_incidentes'], list):
                    for incident in mantenimiento_data['historial_incidentes']:
                        incident_date = '---'
                        import re
                        from datetime import datetime
                        match = re.search(r'\((\d{2}/\d{4})\)', incident)
                        if match:
                            try:
                                month_year_str = match.group(1)
                                parsed_date = datetime.strptime(f"01/{month_year_str}", "%d/%m/%Y").strftime("%Y-%m-%d")
                                incident_date = parsed_date
                            except ValueError:
                                pass
                        maintenance_log.append({
                            'date': incident_date,
                            'description': incident,
                            'cost': '---'
                        })
            response_vehicle['mantenimiento'] = maintenance_log

            # --- Fetch Usage Data ---
            usage_log = []
            datos_uso_ref = vehicle_doc_ref.collection('datos_uso')
            weekly_usage_docs = datos_uso_ref.stream()
            for weekly_doc in weekly_usage_docs:
                week_id = weekly_doc.id
                week_data = weekly_doc.to_dict()
                usage_date = '---'
                match = re.search(r'semana_(\d{2})_(\d{4})', week_id)
                if match:
                    try:
                        week_num = match.group(1)
                        year_num = match.group(2)
                        usage_date = f"Semana {week_num}, {year_num}"
                    except ValueError:
                        pass
                if 'conductores' in week_data and isinstance(week_data['conductores'], list):
                    for driver_entry in week_data['conductores']:
                        usage_entry = {
                            'date': usage_date,
                            'driver': driver_entry.get('nombre', 'Desconocido'),
                            'start_km': '---',
                            'end_km': '---',
                            'purpose': '---'
                        }
                        usage_log.append(usage_entry)
            usage_log.sort(key=lambda x: x.get('date', ''))
            response_vehicle['uso'] = usage_log

            # Devolvemos el diccionario construido
            return jsonify({"status": "success", "vehicle": response_vehicle})
        
        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'status': 'error', 'message': 'No data provided for update'}), 400
            vehicle_doc_ref.update(data)
            updated_vehicle_doc = vehicle_doc_ref.get()
            updated_vehicle_data = updated_vehicle_doc.to_dict()
            updated_vehicle_data['id'] = updated_vehicle_doc.id
            return jsonify({"status": "success", "message": "Vehículo actualizado con éxito", "vehicle": updated_vehicle_data})

        elif request.method == 'DELETE':
            vehicle_doc_ref.delete()
            return jsonify({"status": "success", "message": "Vehículo eliminado con éxito"}), 200

    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        import logging
        logging.error(f"Error en /api/vehicle/{vehicle_id} desde Firestore: {e}")
        return jsonify({'status': 'error', 'message': f'Error interno del servidor al gestionar vehículo {vehicle_id}: {e}'}), 500

@app.route("/api/attendance/justification", methods=["POST"])
def api_attendance_justification():
    try:
        data = request.get_json()
        employee_id = data.get("employee_id")
        date_str = data.get("date")
        justification = data.get("justification", "")
        observation = data.get("observation", "")

        if not employee_id or not date_str:
            return jsonify({"status": "error", "message": "Missing employee_id or date"}), 400

        from datetime import datetime
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        year = str(dt.year)
        month_num = dt.month
        day = f"{dt.day:02d}"
        month_name = [
            "enero","febrero","marzo","abril","mayo","junio",
            "julio","agosto","septiembre","octubre","noviembre","diciembre"
        ][month_num - 1]

        doc_ref = (
            db.collection("EMPLEADOS")
            .document(employee_id)
            .collection("asistencia")
            .document(f"{year}-{month_name}")
            .collection("dias")
            .document(day)
        )

        doc_ref.set(
            {
                "explicacion": justification,
                "observaciones": observation,
            },
            merge=True,
        )

        return jsonify({"status": "success", "message": "Justificación guardada correctamente."})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
    
# ============================================================
# 🔹 USER PROFILE ENDPOINT (/api/me)
# ============================================================
@app.route("/api/me", methods=["GET"])
def get_my_profile():
    global db   # 👈 add this line
    """
    Returns the profile data for the currently authenticated user.
    It checks both datos_biometricos and datos_rr_hh subcollections.
    If no matching employee is found, it falls back to eleelavm@gmail.com.
    """
    from flask import request, jsonify
    import firebase_admin
    from firebase_admin import auth

    id_token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not id_token:
        return jsonify({"status": "error", "message": "Token no proporcionado"}), 401

    try:
        decoded_token = auth.verify_id_token(id_token)
        user_email = decoded_token.get("email")
        print(f"🔎 Buscando empleado con email: {user_email}")

        empleados_ref = db.collection("EMPLEADOS")

        # Buscar en cada documento de empleado
        for empleado_doc in empleados_ref.stream():
            empleado_id = empleado_doc.id
            for subcollection in ["datos_biometricos", "datos_rr_hh"]:
                info_ref = (
                    empleados_ref.document(empleado_id)
                    .collection(subcollection)
                    .document("info")
                )
                info_doc = info_ref.get()
                if info_doc.exists:
                    info_data = info_doc.to_dict()
                    if (
                        info_data.get("email_corporativo") == user_email
                        or info_data.get("email_personal") == user_email
                    ):
                        info_data["id"] = empleado_id
                        print(f"✅ Empleado encontrado: {empleado_id} ({subcollection})")
                        return jsonify({"status": "success", **info_data}), 200

        # Si no se encontró coincidencia, aplicar fallback automático
        print("⚠️ No se encontró coincidencia. Aplicando fallback a eleelavm@gmail.com ...")
        fallback_email = "eleelavm@gmail.com"
        fallback_doc_id = None

        # Buscar el documento de fallback
        for empleado_doc in empleados_ref.stream():
            empleado_id = empleado_doc.id
            for subcollection in ["datos_biometricos", "datos_rr_hh"]:
                info_ref = (
                    empleados_ref.document(empleado_id)
                    .collection(subcollection)
                    .document("info")
                )
                info_doc = info_ref.get()
                if info_doc.exists:
                    info_data = info_doc.to_dict()
                    if (
                        info_data.get("email_corporativo") == fallback_email
                        or info_data.get("email_personal") == fallback_email
                    ):
                        fallback_doc_id = empleado_id
                        info_data["id"] = empleado_id
                        print(f"🪄 Fallback exitoso: usando {fallback_email} ({empleado_id})")
                        return jsonify({"status": "success", **info_data}), 200

        print("❌ No se encontró ningún registro, ni siquiera fallback.")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Registro de empleado no encontrado (ni fallback).",
                }
            ),
            404,
        )

    except Exception as e:
        print(f"🔥 Error verificando token o buscando empleado: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# =====================================================
# 🧾 EMPLOYEE DETAILS (GET + UPDATE with Fallback)
# =====================================================

@app.route('/employees', methods=['GET'])
def get_employees():
    """
    Fetches a list of all employees from Firestore.
    """
    try:
        employees_list = []
        docs = db.collection("EMPLEADOS").stream()
        for doc in docs:
            data = doc.to_dict()
            employees_list.append({ "id": doc.id, "nombre": data.get("nombre", "Sin Nombre") })
        return jsonify({"status": "success", "employees": employees_list})
    except Exception as e:
        logging.error(f"Error fetching employees: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/employee-details/<employee_id>", methods=["GET"])
def get_employee_details(employee_id):
    try:
        base_ref = db.collection("EMPLEADOS").document(employee_id)
        if not base_ref.get().exists:
            return jsonify({"status": "error", "message": "Empleado no encontrado"}), 404

        response_data = {}
        url_foto = None

        # 🔹 1. Try loading from datos_personales/info
        personales_ref = base_ref.collection("datos_personales").document("info")
        personales_doc = personales_ref.get()
        if personales_doc.exists:
            personales_data = personales_doc.to_dict()
            response_data.update(personales_data)
            if "url_foto" in personales_data:
                url_foto = personales_data["url_foto"]

        # 🔹 2. Merge datos_biometricos/info (fallback for older records)
        biom_ref = base_ref.collection("datos_biometricos").document("info")
        biom_doc = biom_ref.get()
        if biom_doc.exists:
            biom_data = biom_doc.to_dict()
            response_data.update(biom_data)
            if not url_foto and "url_foto" in biom_data:
                url_foto = biom_data["url_foto"]

        # 🔹 3. Merge datos_financieros/info
        fin_ref = base_ref.collection("datos_financieros").document("info")
        fin_doc = fin_ref.get()
        if fin_doc.exists:
            fin_data = fin_doc.to_dict()
            response_data.update(fin_data)

        # 🔹 4. Merge basic top-level fields (e.g. nombre_completo, puesto)
        base_doc = base_ref.get().to_dict()
        if base_doc:
            response_data.update(base_doc)
            if not url_foto and "url_foto" in base_doc:
                url_foto = base_doc["url_foto"]

        # 🔹 5. Add photo URL to response if available
        if url_foto:
            response_data["url_foto"] = url_foto

        return jsonify({"status": "success", "data": response_data}), 200

    except Exception as e:
        print("❌ Error en get_employee_details:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/employee-details/<employee_id>', methods=['PUT'])
def update_employee(employee_id):
    try:
        data = request.get_json()
        employee_ref = db.collection('EMPLEADOS').document(employee_id)

        # ✅ Merge new data instead of overwriting entire document
        employee_ref.set(data, merge=True)

        return jsonify({
            "status": "success",
            "message": "Employee updated successfully (merged)"
        })
    except Exception as e:
        print(f"❌ Error updating employee {employee_id}: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# =====================================================
# 👥 EMPLOYEE LIST (with Datos Personales Fallback)
# =====================================================
@app.route('/employees', methods=['GET'])
def get_all_employees():
    """
    Returns a clean, alphabetically sorted list of employees.
    - Merges datos_personales + datos_biometricos
    - Ensures photo URLs are valid
    - Skips 'Sin Nombre' or empty-name entries
    """
    try:
        employees_ref = db.collection('EMPLEADOS')
        docs = employees_ref.stream()
        employees = []

        for doc in docs:
            emp_data = doc.to_dict()
            emp_id = doc.id

            # --- Pull from datos_personales/info ---
            personales_ref = employees_ref.document(emp_id).collection('datos_personales').document('info')
            personales_doc = personales_ref.get()
            if personales_doc.exists:
                personales_data = personales_doc.to_dict()
                emp_data.update(personales_data)

            # --- Pull from datos_biometricos/info ---
            biom_ref = employees_ref.document(emp_id).collection('datos_biometricos').document('info')
            biom_doc = biom_ref.get()
            if biom_doc.exists:
                biom_data = biom_doc.to_dict()
                emp_data.update(biom_data)
                if 'url_foto' in biom_data and biom_data['url_foto']:
                    emp_data['url_foto'] = biom_data['url_foto']

            # --- Validate and construct name ---
            nombre = emp_data.get('nombre') or emp_data.get('nombre_completo')
            apellidos = emp_data.get('apellidos', '')
            puesto = emp_data.get('puesto', '').strip()

            if not nombre or nombre.strip().lower() in ['sin nombre', 'none', 'null', '']:
                print(f"⚠️ Skipping {emp_id} — missing or invalid name")
                continue

            full_name = f"{nombre.strip()} {apellidos.strip()}".strip()
            emp_data['nombre_completo'] = full_name

            # --- Default placeholder if photo missing ---
            if not emp_data.get('url_foto'):
                emp_data['url_foto'] = "https://placehold.co/160"

            # --- Append to list ---
            employees.append({
                'id': emp_id,
                'nombre_completo': full_name,
                'puesto': puesto,
                'url_foto': emp_data['url_foto']
            })

        # --- Sort alphabetically by name ---
        employees.sort(key=lambda e: e['nombre_completo'].lower())

        return jsonify({'status': 'success', 'employees': employees}), 200

    except Exception as e:
        logging.error(f"❌ Error fetching employees with merged data: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# =====================================================
# LOGIN
# =====================================================

@app.route('/login', methods=['POST'])
def handle_login():
    """
    Handles user login by verifying Firebase ID token and checking employee role.
    """
    try:
        token = request.json.get('token')
        decoded_token = auth.verify_id_token(token)
        email = decoded_token['email']
        users_ref = db.collection('EMPLEADOS')
        # Using the new filter method for positional arguments warning
        query = users_ref.where('email', '==', email).limit(1).stream()
        user_doc = next(query, None)
        if user_doc:
            user_data = user_doc.to_dict()
            return jsonify({'status': 'success', 'role': user_data.get('rol', 'Usuario'), 'name': user_data.get('nombre', 'Usuario')})
        else:
            return jsonify({'status': 'error', 'message': 'User not found in employee database.'}), 401
    except Exception as e:
        logging.error(f"Error during login: {e}")
        return jsonify({'status': 'error', 'message': 'Internal server error'}), 500


@app.route('/scan', methods=['POST'])
def log_scan():
    try:
        data = request.get_json()
        employee_id = str(data.get("employee_id", "")).strip()
        if not employee_id:
            return jsonify({"status": "error", "message": "Código QR inválido"}), 400

        employee_doc = db.collection("EMPLEADOS").document(employee_id).get()
        if not employee_doc.exists:
            return jsonify({"status": "error", "message": "Empleado no encontrado"}), 404

        empleado = employee_doc.to_dict()
        nombre = empleado.get("nombre", "Empleado")

        now = datetime.now()
        month_name = now.strftime("%B").lower()  # 'octubre'
        day_str = f"{now.day:02d}"
        hora_actual = now.strftime("%H:%M:%S")

        # ✅ Match your Firestore structure exactly
        doc_ref = (
            db.collection("EMPLEADOS")
              .document(employee_id)
              .collection("datos_asistencia")
              .document(month_name)
              .collection("DIAS")
              .document(day_str)
        )

        transaction = db.transaction()

        @firestore.transactional
        def update_in_transaction(transaction, ref):
            snapshot = ref.get(transaction=transaction)
            if not snapshot.exists or not snapshot.to_dict().get("hora_entrada"):
                transaction.set(ref, {
                    "hora_entrada": hora_actual,
                    "explicacion": "",
                    "fecha": now.strftime("%Y-%m-%d"),
                    "registrado_por": "QR"
                })
                return f"✅ Entrada registrada para {nombre} a las {hora_actual}"
            elif not snapshot.to_dict().get("hora_salida"):
                transaction.update(ref, {"hora_salida": hora_actual})
                return f"👋 Salida registrada para {nombre} a las {hora_actual}"
            else:
                return f"⚠️ Ya se registró entrada y salida para {nombre} hoy."

        message = update_in_transaction(transaction, doc_ref)
        return jsonify({"status": "success", "message": message})

    except Exception as e:
        logging.exception("Error durante registro de escaneo")
        return jsonify({
            "status": "error",
            "message": f"Ocurrió un error en el servidor: {str(e)}"
        }), 500

# -------- SEND REGISTRATION EMAIL (proxy to unified /sendRegistrationEmail) --
@app.route('/send-registration-email', methods=['POST', 'OPTIONS'])
def send_registration_email():
    if request.method == 'OPTIONS':
        return ("", 204)
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = call_cf('/sendRegistrationEmail', json=data, timeout=30)
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error hitting sendRegistrationEmail: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# -------- SUBMIT NEW HIRE (files + fields) -> unified /submitNewHire ---------
@app.route('/submit-new-hire', methods=['POST', 'OPTIONS'])
def submit_new_hire():
    if request.method == 'OPTIONS':
        return ("", 204)
    try:
        files = {
            k: (f.filename, f.stream, f.content_type or 'application/octet-stream')
            for k, f in request.files.items()
        }
        result = call_cf('/submitNewHire', data=request.form, files=files, timeout=60)
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error hitting submitNewHire: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# -------- UPDATE HIRE STATUS -> unified /updateHireStatus --------------------
@app.route('/update-hire-status', methods=['POST', 'OPTIONS'])
def update_hire_status():
    if request.method == 'OPTIONS':
        return ("", 204)
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = call_cf('/updateHireStatus', json=data, timeout=30)
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error hitting updateHireStatus: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# -------- SEND WELCOME EMAIL -> unified /sendWelcomeEmail --------------------
@app.route('/send-welcome-email', methods=['POST', 'OPTIONS'])
def send_welcome_email():
    if request.method == 'OPTIONS':
        return ("", 204)
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = call_cf('/sendWelcomeEmail', json=data, timeout=30)
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error hitting sendWelcomeEmail: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


# -------- ADD COMMENT TO HIRE --------
@app.route('/add-hire-comment', methods=['POST', 'OPTIONS'])
def add_hire_comment():
    if request.method == 'OPTIONS':
        return ("", 204)
    try:
        data = request.get_json(force=True, silent=True) or {}
        result = call_cf('/addHireComment', json=data, timeout=30)
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error hitting addHireComment: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


from flask import request, jsonify
from datetime import datetime

# ======================================================
# ✅ ROUTE: GET ATTENDANCE (READ)
# ======================================================
@app.route("/attendance", methods=["GET"])
def get_attendance():
    """
    Returns attendance records for a specific employee, year, and month.
    Defaults to current year/month if not provided.
    """
    employee_id = request.args.get("employee_id")
    year = request.args.get("year")
    month = request.args.get("month")

    if not employee_id:
        return jsonify({
            "status": "error",
            "message": "Employee ID is required"
        }), 400

    # Default year/month to current date if missing
    now = datetime.now()
    if not year:
        year = str(now.year)
    if not month:
        # allow both numeric and spanish month names
        month = now.strftime("%B").lower()

    # Normalize month input to Spanish name
    ES_MONTHS = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]
    if month.isdigit():
        month = ES_MONTHS[int(month) - 1]

    try:
        doc_ref = (
            db.collection("EMPLEADOS")
            .document(employee_id)
            .collection("datos_asistencia")
            .document(year)
            .collection(month)
        )

        days_docs = doc_ref.stream()
        result = {}
        for d in days_docs:
            result[d.id] = d.to_dict() or {}

        return jsonify({
            "status": "success",
            "employee_id": employee_id,
            "year": year,
            "month": month,
            "days": result
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to retrieve attendance: {str(e)}"
        }), 500


# ======================================================
# ✅ ROUTE: LOG ATTENDANCE (WRITE)
# ======================================================
@app.route("/scan", methods=["POST"])
def scan():
    """
    Logs entry or exit time for an employee.
    Ensures data structure: EMPLEADOS/{id}/datos_asistencia/{year}/{mes}/{día}
    """
    try:
        data = request.get_json(silent=True) or {}
        employee_id = data.get("employee_id")
        scan_type = data.get("type", "entrada")  # "entrada" or "salida"
        explanation = data.get("explicacion", "")

        if not employee_id:
            return jsonify({"status": "error", "message": "employee_id is required"}), 400

        now = datetime.now()
        year = str(now.year)
        ES_MONTHS = [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ]
        month = ES_MONTHS[now.month - 1]
        day_str = f"{now.day:02d}"
        hour_now = now.strftime("%H:%M:%S")

        day_ref = (
            db.collection("EMPLEADOS")
            .document(employee_id)
            .collection("datos_asistencia")
            .document(year)
            .collection(month)
            .document(day_str)
        )

        day_data = day_ref.get().to_dict() or {}

        if scan_type == "entrada":
            day_data["hora_entrada"] = hour_now
        elif scan_type == "salida":
            day_data["hora_salida"] = hour_now

        day_data["explicacion"] = explanation
        day_ref.set(day_data, merge=True)

        return jsonify({
            "status": "success",
            "employee_id": employee_id,
            "year": year,
            "month": month,
            "day": day_str,
            "type": scan_type
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Scan failed: {str(e)}"
        }), 500

# -------- PAYROLL FUNCTIONS --------
# ======================================================

# API endpoint to fetch payroll data from Firestore
# ==========================================================
# 💰 PERSONAL PAYROLL ENDPOINT (Firestore datos_nomina)
# ==========================================================
@app.route('/api/me/payroll', methods=['GET'], strict_slashes=False)
def get_my_payroll():
    """
    Fetches payroll data from the authenticated user's 'datos_nomina' subcollection in Firestore.
    Supports both flat and nested ('deducciones') field structures.
    """
    try:
        # 1️⃣ Authenticate user
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401

        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        email = decoded_token.get('email')
        if not email:
            return jsonify({'status': 'error', 'message': 'Token sin correo asociado'}), 400

        # 2️⃣ Locate employee by email
        users_ref = db.collection('EMPLEADOS')
        query = users_ref.where('email', '==', email).limit(1).stream()
        user_doc = next(query, None)

        if not user_doc:
            return jsonify({'status': 'error', 'message': 'Empleado no encontrado'}), 404

        employee_id = user_doc.id

        # 3️⃣ Retrieve payroll records
        payroll_data = []
        nomina_ref = db.collection('EMPLEADOS').document(employee_id).collection('datos_nomina')
        nomina_docs = nomina_ref.order_by('__name__').stream()

        for doc in nomina_docs:
            raw = doc.to_dict() or {}
            ded = raw.get("deducciones", {})

            # Flatten and normalize data
            payroll_data.append({
                "periodo": raw.get("periodo", doc.id),
                "fecha_pago": raw.get("fecha_pago"),
                "salario_bruto": float(raw.get("salario_bruto", 0)),
                "salario_neto": float(raw.get("salario_neto", 0)),
                "seg_social": float(raw.get("seg_social") or ded.get("seguridad_social", 0)),
                "irpf": float(raw.get("irpf") or ded.get("irpf", 0)),
                "pdge": float(raw.get("pdge") or ded.get("pdge", 0)),
                "otros": float(raw.get("otros") or ded.get("otros", 0)),
                "employee_name": raw.get("employee_name"),
                "employee_id": raw.get("employee_id", employee_id),
            })

        # 4️⃣ Return response
        return jsonify({"status": "success", "payroll": payroll_data})

    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        import traceback
        traceback.print_exc()
        logging.error(f"Error en /api/me/payroll: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500



@app.route("/api/nomina/all", methods=["GET"])
@app.route("/api/payroll/all", methods=["GET"])
def get_all_nomina_or_payroll():
    """
    ✅ Optimized unified route for payroll data.
    - Uses bulk employee preload (no per-employee Firestore calls)
    - Keeps same data format used by frontend table
    - Supports filters: employee_id, period
    - Automatically generates mock data if no real payrolls found
    """
    try:
        import random
        from datetime import datetime

        employee_id = request.args.get("employee_id")
        period = request.args.get("period")

        print("🟢 /api/nomina|payroll/all called:", employee_id, period)

        # ----------------------------------------------------------
        # 1️⃣ Bulk preload all employees just once
        # ----------------------------------------------------------
        print("⏳ Loading all employees into memory...")
        emp_map = {}
        for e in db.collection("EMPLEADOS").stream():
            d = e.to_dict() or {}

            # Nested datos_personales/info
            nested = {}
            try:
                info_doc = (
                    db.collection("EMPLEADOS")
                    .document(e.id)
                    .collection("datos_personales")
                    .document("info")
                    .get()
                )
                if info_doc.exists:
                    nested = info_doc.to_dict() or {}
            except Exception as err:
                print(f"⚠️ Error loading nested info for {e.id}: {err}")

            emp_map[e.id] = {
                "nombre": (
                    d.get("nombre_completo")
                    or d.get("nombre")
                    or nested.get("nombre_completo")
                    or nested.get("nombre")
                    or f"Empleado {e.id}"
                ),
                "puesto": (
                    d.get("puesto")
                    or nested.get("puesto")
                    or d.get("cargo")
                    or nested.get("cargo")
                    or "Sin especificar"
                ),
            }

        print(f"👥 Loaded {len(emp_map)} employees into cache.")

        # ----------------------------------------------------------
        # 2️⃣ Try Firestore NOMINAS first (real payrolls)
        # ----------------------------------------------------------
        payroll_ref = db.collection("NOMINAS")
        query = payroll_ref
        if employee_id:
            query = query.where("employee_id", "==", employee_id)
        if period:
            query = query.where("periodo", "==", period)

        payroll_docs = list(query.stream())
        print(f"📄 Firestore NOMINAS docs found: {len(payroll_docs)}")

        if payroll_docs:
            results = []
            for doc in payroll_docs:
                data = doc.to_dict()
                emp_id = data.get("employee_id", "")
                emp_info = emp_map.get(emp_id, {})

                # ✅ Only resolve name and role if not already set
                data["employee_name"] = emp_info.get("nombre", data.get("employee_name", f"Empleado {emp_id}"))
                data["employee_role"] = data.get("employee_role") or emp_info.get("puesto", "Sin especificar")

                results.append({"id": doc.id, **data})

            print(f"✅ Returning {len(results)} real NOMINAS records from Firestore.")
            return jsonify({"status": "success", "payroll": results})

        # ----------------------------------------------------------
        # 3️⃣ No Firestore data → generate mock payrolls
        # ----------------------------------------------------------
        print("⚠️ No Firestore NOMINAS found — generating mock payrolls...")

        employees = [{"id": eid, **info} for eid, info in emp_map.items()]
        print(f"👥 Total employees for mock data: {len(employees)}")

        mock_results = []
        months = [f"2025-{str(m).zfill(2)}" for m in range(1, 13)]
        today = datetime.now().strftime("%Y-%m-%d")

        for emp in employees:
            for m in months:
                salario_base = random.randint(400000, 1200000)
                bono = random.randint(0, int(salario_base * 0.15))
                bruto = salario_base + bono

                puesto_lower = emp["puesto"].lower()
                if "manager" in puesto_lower or "jefe" in puesto_lower:
                    seg_social = int(bruto * 0.05)
                    irpf = int(bruto * 0.09)
                    inseso = int(bruto * 0.03)
                elif "técnico" in puesto_lower or "tecnico" in puesto_lower:
                    seg_social = int(bruto * 0.045)
                    irpf = int(bruto * 0.07)
                    inseso = int(bruto * 0.025)
                elif "asistente" in puesto_lower or "analista" in puesto_lower:
                    seg_social = int(bruto * 0.04)
                    irpf = int(bruto * 0.06)
                    inseso = int(bruto * 0.02)
                else:
                    seg_social = int(bruto * 0.04)
                    irpf = int(bruto * 0.065)
                    inseso = int(bruto * 0.02)

                otros = random.randint(0, 8000)
                neto = bruto - (seg_social + irpf + inseso + otros)

                mock_results.append({
                    "employee_id": emp["id"],
                    "employee_name": emp["nombre"],
                    "employee_role": emp["puesto"],
                    "periodo": m,
                    "salario_base": salario_base,
                    "bono_ventas": bono,
                    "bruto": bruto,
                    "seg_social": seg_social,
                    "irpf": irpf,
                    "inseso": inseso,
                    "otros": otros,
                    "neto": neto,
                    "fecha_pago": today,
                })

        print(f"🧮 Generated {len(mock_results)} mock payroll rows total.")

        # ----------------------------------------------------------
        # 4️⃣ Apply filters
        # ----------------------------------------------------------
        if employee_id:
            before = len(mock_results)
            mock_results = [r for r in mock_results if r["employee_id"] == employee_id]
            print(f"🔎 Filtered by employee_id={employee_id}: {before} → {len(mock_results)}")

        if period:
            before = len(mock_results)
            mock_results = [r for r in mock_results if r["periodo"] == period]
            print(f"🔎 Filtered by period={period}: {before} → {len(mock_results)}")

        # ----------------------------------------------------------
        # 5️⃣ Return final data
        # ----------------------------------------------------------
        for r in mock_results[:5]:
            print(f"▶ {r['employee_name']} | {r['employee_role']} | {r['periodo']} | Neto={r['neto']:,}")

        return jsonify({"status": "success", "payroll": mock_results})

    except Exception as e:
        import traceback
        traceback.print_exc()
        print("💥 Error in get_all_nomina_or_payroll:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/payroll/generate", methods=["POST"])
def generate_payrolls():
    """
    Generates payrolls for all employees for a given period.
    - Supports force=True to overwrite existing payrolls.
    - Uses role-based salary scaling and deductions.
    - Pulls nombre and puesto prioritizing ROOT-level fields,
      then falls back to datos_personales/info.
    """
    try:
        from datetime import datetime
        import random

        data = request.get_json()
        period = data.get("period")
        force = data.get("force", False)

        if not period:
            return jsonify({
                "status": "error",
                "message": "Falta el periodo (YYYY-MM)."
            }), 400

        payroll_ref = db.collection("NOMINAS")
        existing_docs = list(payroll_ref.where("periodo", "==", period).stream())

        # 🚫 Block if payrolls already exist and force=False
        if existing_docs and not force:
            return jsonify({
                "status": "error",
                "message": f"Las nóminas para el periodo {period} ya existen ({len(existing_docs)} registros)."
            }), 409

        # ⚠️ If force=True, delete existing records
        if existing_docs and force:
            count = 0
            for doc in existing_docs:
                doc.reference.delete()
                count += 1
            print(f"⚠️ Eliminadas {count} nóminas previas para el periodo {period}. Regenerando...")

        # Fetch all employees
        empleados_ref = db.collection("EMPLEADOS")
        empleados_docs = list(empleados_ref.stream())

        if not empleados_docs:
            return jsonify({
                "status": "error",
                "message": "No hay empleados registrados."
            }), 404

        results = []
        today = datetime.now().strftime("%Y-%m-%d")

        for emp_doc in empleados_docs:
            emp_id = str(emp_doc.id)
            emp_data = emp_doc.to_dict() or {}

            # 🧩 Unified logic for name (same as dropdown)
            nombre = (
                emp_data.get("nombre_completo")
                or emp_data.get("nombre")
                or emp_data.get("nombreEmpleado")
                or emp_data.get("nombres")
                or f"Empleado {emp_id}"
            ).strip()

            # 🧩 Unified logic for puesto (same as dropdown and payroll/all)
            puesto = (
                emp_data.get("puesto")
                or emp_data.get("cargo")
                or emp_data.get("funcion")
                or emp_data.get("puestoEmpleado")
                or "No especificado"
            ).strip()

            # ✅ Merge from datos_personales/info if exists
            try:
                info_ref = (
                    db.collection("EMPLEADOS")
                    .document(emp_id)
                    .collection("datos_personales")
                    .document("info")
                )
                info_doc = info_ref.get()
                if info_doc.exists:
                    info_data = info_doc.to_dict() or {}
                    nombre = (
                        info_data.get("nombre_completo")
                        or info_data.get("nombre")
                        or nombre
                    ).strip()
                    puesto = (
                        info_data.get("puesto")
                        or info_data.get("cargo")
                        or info_data.get("funcion")
                        or puesto
                    ).strip()
            except Exception as e:
                print(f"⚠️ Error al recuperar datos personales para {emp_id}: {e}")

            # 💰 Role-based salary scaling
            puesto_lower = puesto.lower()
            if "manager" in puesto_lower or "jefe" in puesto_lower:
                salario_base = random.randint(1_200_000, 1_800_000)
                bono_ventas = random.randint(50_000, 150_000)
                seg_social_pct, irpf_pct, inseso_pct = 0.05, 0.09, 0.03
            elif "técnico" in puesto_lower or "tecnico" in puesto_lower:
                salario_base = random.randint(800_000, 1_200_000)
                bono_ventas = random.randint(30_000, 100_000)
                seg_social_pct, irpf_pct, inseso_pct = 0.045, 0.07, 0.025
            elif "asistente" in puesto_lower or "analista" in puesto_lower:
                salario_base = random.randint(600_000, 950_000)
                bono_ventas = random.randint(20_000, 70_000)
                seg_social_pct, irpf_pct, inseso_pct = 0.04, 0.06, 0.02
            else:
                salario_base = random.randint(450_000, 800_000)
                bono_ventas = random.randint(10_000, 50_000)
                seg_social_pct, irpf_pct, inseso_pct = 0.04, 0.065, 0.02

            bruto = salario_base + bono_ventas
            seg_social = int(bruto * seg_social_pct)
            irpf = int(bruto * irpf_pct)
            inseso = int(bruto * inseso_pct)
            otros = random.randint(0, 8000)
            neto = bruto - (seg_social + irpf + inseso + otros)

            # Save to Firestore
            doc_ref = payroll_ref.document(f"{emp_id}_{period}")
            doc_ref.set({
                "employee_id": emp_id,
                "employee_name": nombre,
                "employee_role": puesto,
                "periodo": str(period),
                "salario_base": salario_base,
                "bono_ventas": bono_ventas,
                "bruto": bruto,
                "seg_social": seg_social,
                "irpf": irpf,
                "inseso": inseso,
                "otros": otros,
                "neto": neto,
                "fecha_pago": today,
                "created_at": firestore.SERVER_TIMESTAMP
            })

            results.append({
                "id": emp_id,
                "name": nombre,
                "role": puesto,
                "status": "success",
                "net_salary": neto
            })

            print(f"💼 {nombre} ({puesto}) → Neto: {neto:,} FCFA")

        print(f"✅ Generadas {len(results)} nóminas para el periodo {period}.")
        return jsonify({
            "status": "success",
            "message": f"Nóminas generadas correctamente para {period}.",
            "results": results
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

import os
import time
from io import BytesIO
from flask import send_file, jsonify
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet


@app.route("/api/payroll/pdf/<employee_id>/<period>", methods=["GET"])
def generate_payroll_pdf(employee_id, period):
    """
    Generates and caches a professional payroll PDF for an employee and period.
    Automatically cleans up cached files older than 30 days.
    """
    try:
        # ----------------------------------------------------------
        # 1️⃣ Cache setup and cleanup
        # ----------------------------------------------------------
        cache_dir = "static/cache_pdfs"
        os.makedirs(cache_dir, exist_ok=True)

        # Auto-cleanup: remove PDFs older than 30 days
        now = time.time()
        for f in os.listdir(cache_dir):
            path = os.path.join(cache_dir, f)
            if os.path.isfile(path):
                file_age_days = (now - os.path.getmtime(path)) / 86400
                if file_age_days > 30:
                    os.remove(path)
                    print(f"🧹 Removed expired cached PDF: {f}")

        filename = f"{cache_dir}/nomina_{employee_id}_{period}.pdf"
        if os.path.exists(filename):
            print(f"📦 Serving cached PDF for {employee_id} / {period}")
            return send_file(filename, mimetype="application/pdf")

        # ----------------------------------------------------------
        # 2️⃣ Load payroll data or fallback to mock
        # ----------------------------------------------------------
        payroll_ref = (
            db.collection("NOMINAS")
            .where("employee_id", "==", employee_id)
            .where("periodo", "==", period)
        )
        docs = list(payroll_ref.stream())

        if docs:
            data = docs[0].to_dict()
        else:
            data = {
                "employee_id": employee_id,
                "employee_name": f"Empleado {employee_id}",
                "employee_role": "No especificado",
                "periodo": period,
                "salario_base": 950000,
                "bono_ventas": 50000,
                "bruto": 1000000,
                "seg_social": 40000,
                "irpf": 60000,
                "inseso": 30000,
                "otros": 0,
                "neto": 870000,
            }

        # ----------------------------------------------------------
        # 3️⃣ Generate PDF
        # ----------------------------------------------------------
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )
        styles = getSampleStyleSheet()
        elements = []

        # Header
        elements.append(Paragraph("<b>ATiempo - Sistema de Gestión de Nóminas</b>", styles["Title"]))
        elements.append(Spacer(1, 0.3 * cm))
        elements.append(Paragraph("<b>RECIBO DE NÓMINA</b>", styles["Heading2"]))
        elements.append(Spacer(1, 0.2 * cm))
        elements.append(Paragraph(f"<b>Empleado:</b> {data['employee_name']}", styles["Normal"]))
        elements.append(Paragraph(f"<b>Puesto:</b> {data['employee_role']}", styles["Normal"]))
        elements.append(Paragraph(f"<b>Periodo:</b> {data['periodo']}", styles["Normal"]))
        elements.append(Spacer(1, 0.5 * cm))

        # Salary Table
        table_data = [
            ["Concepto", "Monto (FCFA)"],
            ["Salario Base", f"{data['salario_base']:,}"],
            ["Bono Ventas", f"{data['bono_ventas']:,}"],
            ["Bruto", f"{data['bruto']:,}"],
        ]
        deductions_data = [
            ["Deducciones", "Monto (FCFA)"],
            ["Seg. Social", f"{data['seg_social']:,}"],
            ["IRPF", f"{data['irpf']:,}"],
            ["INSESO", f"{data['inseso']:,}"],
            ["Otros", f"{data['otros']:,}"],
        ]

        table1 = Table(table_data, colWidths=[8 * cm, 4 * cm])
        table2 = Table(deductions_data, colWidths=[8 * cm, 4 * cm])

        for t in (table1, table2):
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#004080")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                    ]
                )
            )

        elements.append(table1)
        elements.append(Spacer(1, 0.3 * cm))
        elements.append(table2)

        # Totals
        total_table = Table(
            [["<b>NETO A COBRAR</b>", f"<b>{data['neto']:,} FCFA</b>"]],
            colWidths=[8 * cm, 4 * cm],
        )
        total_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0b66ff")),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                ]
            )
        )
        elements.append(Spacer(1, 0.4 * cm))
        elements.append(total_table)

        # Footer
        elements.append(Spacer(1, 1 * cm))
        elements.append(Paragraph("<i>Generado automáticamente por ATiempo</i>", styles["Normal"]))

        # Build and cache
        doc.build(elements)
        buffer.seek(0)

        with open(filename, "wb") as f:
            f.write(buffer.getvalue())

        print(f"✅ Generated and cached PDF: {filename}")
        return send_file(
            buffer,
            as_attachment=False,
            download_name=f"nomina_{employee_id}_{period}.pdf",
            mimetype="application/pdf",
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"💥 Error generating payroll PDF: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


def animate_salary_calculation(employee_name, salary_data):
    """
    Enhanced animation for salary calculation with more visual elements
    """
    logging.info(f"\n🎯 CALCULANDO SALARIO PARA: {employee_name.upper()}")
    logging.info("═" * 60)
    logging.info(f"💰 Salario Base: FCFA {salary_data['base_salary']:,.0f}")
    
    time.sleep(0.3)  # Simulate processing time
    
    if salary_data['performance_bonus'] > 0:
        bonus_percentage = salary_data['performance_bonus']/salary_data['base_salary']*100
        logging.info(f"⭐ Bono por Rendimiento ({bonus_percentage:.1f}%): FCFA +{salary_data['performance_bonus']:,.0f}")
        time.sleep(0.2)
    
    if salary_data['loyalty_bonus'] > 0:
        logging.info(f"🏆 Bono por Antigüedad: FCFA +{salary_data['loyalty_bonus']:,.0f}")
        time.sleep(0.2)
    
    if salary_data['special_bonus'] > 0:
        logging.info(f"🎲 Bono Especial: FCFA +{salary_data['special_bonus']:,.0f}")
        time.sleep(0.2)
    
    logging.info("─" * 40)
    logging.info(f"📊 Total Bruto: FCFA {salary_data['total_salary']:,.0f}")
    time.sleep(0.3)
    
    # Simulate deduction calculations
    logging.info(f"🧾 Deducciones aplicadas...")
    time.sleep(0.4)
    
    logging.info("═" * 60)
    logging.info(f"🎉 SALARIO NETO FINAL: FCFA {salary_data['total_salary']:,.0f}")
    logging.info("⭐" * 25)


@app.route('/api/debug', methods=['GET'])
def debug_endpoint():
    """Debug endpoint to check if backend is working"""
    return jsonify({
        'status': 'success', 
        'message': 'Backend is working!',
        'endpoints': {
            'payroll_generate': '/api/payroll/generate (POST)',
            'payroll_pdf': '/generate-payroll-pdf (GET)',
            'debug': '/api/debug (GET)'
        }
    })




from io import BytesIO
from flask import send_file
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

@app.route("/api/payroll/report/<period>", methods=["GET"])
def generate_payroll_report(period):
    """
    Generates and returns a PDF payroll report for the given period.
    ✅ Resolves employee names from EMPLEADOS collection.
    ✅ Keeps employee_role exactly as stored in NOMINAS.
    """
    try:
        from io import BytesIO
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4

        # --- 1️⃣ Fetch payrolls for the given period ---
        payroll_ref = db.collection("NOMINAS").where("periodo", "==", period)
        docs = list(payroll_ref.stream())
        if not docs:
            return jsonify({
                "status": "error",
                "message": f"No se encontraron nóminas para el periodo {period}."
            }), 404

        # --- 2️⃣ Build a quick employee name map ---
        emp_ref = db.collection("EMPLEADOS").stream()
        employees = {}
        for e in emp_ref:
            d = e.to_dict() or {}
            employees[e.id] = {
                "nombre": (
                    d.get("nombre_completo")
                    or d.get("nombre")
                    or d.get("nombreEmpleado")
                    or d.get("nombres")
                    or f"Empleado {e.id}"
                ).strip()
            }

        # --- 3️⃣ Prepare the PDF ---
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        # Header
        p.setFont("Helvetica-Bold", 14)
        p.drawString(200, height - 50, f"REPORTE DE NÓMINAS - {period}")
        p.setFont("Helvetica", 11)
        p.drawString(50, height - 80, f"Total empleados: {len(docs)}")

        # Column headers
        y = height - 110
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, y, "Empleado")
        p.drawString(250, y, "Cargo")
        p.drawString(400, y, "Neto (FCFA)")
        y -= 15
        p.line(50, y, 550, y)
        y -= 10
        p.setFont("Helvetica", 10)

        # --- 4️⃣ Add rows ---
        for doc in docs:
            data = doc.to_dict()
            emp_id = str(data.get("employee_id", ""))
            fallback_name = data.get("employee_name", f"Empleado {emp_id}")

            # ✅ Only resolve the name from EMPLEADOS
            emp_info = employees.get(emp_id, {})
            name = emp_info.get("nombre", fallback_name)

            # ✅ Keep role exactly as stored in NOMINAS
            role = str(data.get("employee_role", "—"))
            neto = float(data.get("neto", 0))

            # New page if needed
            if y < 80:
                p.showPage()
                p.setFont("Helvetica", 10)
                y = height - 80

            # Draw row
            p.drawString(50, y, name[:28])
            p.drawString(250, y, role[:25])
            p.drawRightString(500, y, f"{neto:,.0f}")
            y -= 18

        # --- 5️⃣ Finalize ---
        p.showPage()
        p.save()
        buffer.seek(0)

        return send_file(
            buffer,
            as_attachment=False,
            download_name=f"reporte_nomina_{period}.pdf",
            mimetype="application/pdf"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

# ============================================================
# 💰 DATA MOCKERS
# ============================================================

MOCK_DEPARTMENTS = ["Recursos Humanos", "Finanzas", "Operaciones", "Marketing"]
MOCK_BUDGETS = {
    "Recursos Humanos": 15000000,
    "Finanzas": 20000000,
    "Operaciones": 30000000,
    "Marketing": 10000000
}
import uuid
import random
# Assume get_mock_id() is defined as:
def get_mock_id():
    return str(uuid.uuid4())

# Placeholder PDF URL (must be defined globally in app.py)
MOCK_PDF_URL = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

# NOTE: Department names are standardized to remove spaces to match the reliable frontend parameter.
MOCK_EXPENSES = [
    # =========================================================================
    # RECURSOS HUMANOS (RecursosHumanos)
    # =========================================================================
    # JAN 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-01-15", "amount": 250000, "category": "Salarios", "description": "Bonificación de inicio de año", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-01-20", "amount": 45000, "category": "Viajes", "description": "Viáticos para reclutamiento", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-01-30", "amount": 12000, "category": "Otros", "description": "Suscripción LinkedIn Premium", "receipt_url": MOCK_PDF_URL},
    # FEB 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-02-05", "amount": 15000, "category": "Materiales de Oficina", "description": "Compra de papelería", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-02-18", "amount": 80000, "category": "Servicios", "description": "Servicio de limpieza mensual", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-02-28", "amount": 10000, "category": "Otros", "description": "Membresía plataforma de cursos", "receipt_url": MOCK_PDF_URL},
    # MAR 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-03-10", "amount": 35000, "category": "Viajes", "description": "Transporte personal de RRHH", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-03-22", "amount": 20000, "category": "Materiales de Oficina", "description": "Tóner para impresora", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-03-31", "amount": 5000, "category": "Otros", "description": "Snacks para reuniones", "receipt_url": MOCK_PDF_URL},
    # APR 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-04-01", "amount": 200000, "category": "Salarios", "description": "Comisión por contratación", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-04-15", "amount": 15000, "category": "Materiales de Oficina", "description": "Carpetas de archivo", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-04-25", "amount": 120000, "category": "Servicios", "description": "Mantenimiento de extintores", "receipt_url": MOCK_PDF_URL},
    # MAY 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-05-10", "amount": 55000, "category": "Viajes", "description": "Reembolso de taxi", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-05-20", "amount": 90000, "category": "Servicios", "description": "Capacitación de personal", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-05-30", "amount": 8000, "category": "Otros", "description": "Agua potable para oficina", "receipt_url": MOCK_PDF_URL},
    # JUN 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-06-01", "amount": 15000, "category": "Materiales de Oficina", "description": "Resma de papel", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-06-15", "amount": 20000, "category": "Viajes", "description": "Boleto de autobús", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-06-30", "amount": 95000, "category": "Servicios", "description": "Gestoría de permisos", "receipt_url": MOCK_PDF_URL},
    # JUL 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-07-05", "amount": 10000, "category": "Materiales de Oficina", "description": "Compra de papelería", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-07-15", "amount": 85000, "category": "Viajes", "description": "Viáticos para feria laboral", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-07-30", "amount": 180000, "category": "Servicios", "description": "Consultoría externa", "receipt_url": MOCK_PDF_URL},
    # AUG 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-08-01", "amount": 25000, "category": "Otros", "description": "Licencia de software de gestión", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-08-10", "amount": 20000, "category": "Materiales de Oficina", "description": "Resma y tintas", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-08-25", "amount": 400000, "category": "Salarios", "description": "Bono por desempeño trimestral", "receipt_url": MOCK_PDF_URL},
    # SEP 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-09-15", "amount": 15000, "category": "Viajes", "description": "Transporte a capacitaciones", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-09-22", "amount": 5000, "category": "Otros", "description": "Botiquín de primeros auxilios", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-09-30", "amount": 60000, "category": "Servicios", "description": "Mantenimiento de seguridad", "receipt_url": MOCK_PDF_URL},
    # OCT 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-10-01", "amount": 10000, "category": "Materiales de Oficina", "description": "Suministros de aseo", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-10-10", "amount": 95000, "category": "Viajes", "description": "Viáticos para reclutamiento internacional", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-10-25", "amount": 150000, "category": "Salarios", "description": "Pago de horas extras", "receipt_url": MOCK_PDF_URL},
    # NOV 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-11-05", "amount": 12000, "category": "Otros", "description": "Regalos para empleados", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-11-18", "amount": 30000, "category": "Materiales de Oficina", "description": "Materiales para eventos", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-11-30", "amount": 75000, "category": "Servicios", "description": "Mantenimiento de aire acondicionado", "receipt_url": MOCK_PDF_URL},
    # DEC 2025
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-12-01", "amount": 300000, "category": "Salarios", "description": "Aguinaldo (13er mes)", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-12-10", "amount": 50000, "category": "Viajes", "description": "Cena de fin de año", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "RecursosHumanos", "date": "2025-12-20", "amount": 10000, "category": "Otros", "description": "Decoración navideña", "receipt_url": MOCK_PDF_URL},

    # =========================================================================
    # FINANZAS
    # =========================================================================
    # JAN 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-01-10", "amount": 500000, "category": "Servicios", "description": "Mantenimiento software contable", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-01-25", "amount": 30000, "category": "Materiales de Oficina", "description": "Archivadores y etiquetas", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-01-31", "amount": 150000, "category": "Salarios", "description": "Bono por cierre contable", "receipt_url": MOCK_PDF_URL},
    # FEB 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-02-01", "amount": 850000, "category": "Servicios", "description": "Licencia de Software Anual", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-02-15", "amount": 120000, "category": "Materiales de Oficina", "description": "Suministros de impresión", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-02-28", "amount": 5000, "category": "Otros", "description": "Café para la oficina", "receipt_url": MOCK_PDF_URL},
    # MAR 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-03-05", "amount": 75000, "category": "Servicios", "description": "Asesoría legal", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-03-20", "amount": 15000, "category": "Viajes", "description": "Transporte a reuniones", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-03-30", "amount": 250000, "category": "Salarios", "description": "Pago a consultor externo", "receipt_url": MOCK_PDF_URL},
    # APR 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-04-01", "amount": 10000, "category": "Materiales de Oficina", "description": "Bolígrafos y libretas", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-04-18", "amount": 400000, "category": "Servicios", "description": "Auditoría de Q1", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-04-30", "amount": 5000, "category": "Otros", "description": "Gastos bancarios", "receipt_url": MOCK_PDF_URL},
    # MAY 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-05-12", "amount": 180000, "category": "Salarios", "description": "Incentivo trimestral", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-05-25", "amount": 25000, "category": "Materiales de Oficina", "description": "Carpetas de informes", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-05-31", "amount": 100000, "category": "Servicios", "description": "Contratación temporal", "receipt_url": MOCK_PDF_URL},
    # JUN 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-06-05", "amount": 150000, "category": "Servicios", "description": "Renovación de póliza", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-06-20", "amount": 50000, "category": "Viajes", "description": "Viáticos para el director", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-06-30", "amount": 5000, "category": "Otros", "description": "Gastos de mensajería", "receipt_url": MOCK_PDF_URL},
    # JUL 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-07-05", "amount": 100000, "category": "Materiales de Oficina", "description": "Suministros de contabilidad", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-07-15", "amount": 25000, "category": "Viajes", "description": "Transporte de documentos", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-07-30", "amount": 50000, "category": "Servicios", "description": "Membresía de software de reporting", "receipt_url": MOCK_PDF_URL},
    # AUG 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-08-01", "amount": 5000, "category": "Otros", "description": "Comisiones bancarias", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-08-10", "amount": 35000, "category": "Materiales de Oficina", "description": "Tóner para impresoras", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-08-25", "amount": 200000, "category": "Servicios", "description": "Asesoría fiscal trimestral", "receipt_url": MOCK_PDF_URL},
    # SEP 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-09-15", "amount": 10000, "category": "Viajes", "description": "Gastos de mensajería", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-09-22", "amount": 50000, "category": "Materiales de Oficina", "description": "Libros de contabilidad", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-09-30", "amount": 100000, "category": "Servicios", "description": "Licencias de seguridad", "receipt_url": MOCK_PDF_URL},
    # OCT 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-10-05", "amount": 40000, "category": "Otros", "description": "Gastos notariales", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-10-18", "amount": 15000, "category": "Materiales de Oficina", "description": "Archivadores de documentos", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-10-25", "amount": 500000, "category": "Servicios", "description": "Auditoría de cierre de año", "receipt_url": MOCK_PDF_URL},
    # NOV 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-11-10", "amount": 12000, "category": "Viajes", "description": "Viáticos a reuniones de junta", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-11-20", "amount": 150000, "category": "Salarios", "description": "Bono por cumplimiento", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-11-30", "amount": 80000, "category": "Otros", "description": "Servicios de nube (storage)", "receipt_url": MOCK_PDF_URL},
    # DEC 2025
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-12-05", "amount": 15000, "category": "Materiales de Oficina", "description": "Papelería especial para informes", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-12-15", "amount": 300000, "category": "Servicios", "description": "Cena de agradecimiento a staff", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Finanzas", "date": "2025-12-24", "amount": 25000, "category": "Otros", "description": "Regalos corporativos", "receipt_url": MOCK_PDF_URL},

    # =========================================================================
    # OPERACIONES
    # =========================================================================
    # JAN 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-01-05", "amount": 1200000, "category": "Transporte", "description": "Mantenimiento preventivo furgoneta 01", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-01-20", "amount": 80000, "category": "Materiales de Oficina", "description": "Guantes y herramientas", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-01-30", "amount": 400000, "category": "Servicios", "description": "Contratista externo", "receipt_url": MOCK_PDF_URL},
    # FEB 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-02-10", "amount": 300000, "category": "Servicios", "description": "Inspección de seguridad", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-02-25", "amount": 65000, "category": "Otros", "description": "Seguro de equipos menores", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-02-28", "amount": 900000, "category": "Transporte", "description": "Combustible mensual", "receipt_url": MOCK_PDF_URL},
    # MAR 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-03-01", "amount": 500000, "category": "Transporte", "description": "Reparación menor de vehículo", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-03-15", "amount": 15000, "category": "Materiales de Oficina", "description": "Cintas de señalización", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-03-28", "amount": 150000, "category": "Servicios", "description": "Mantenimiento de maquinaria", "receipt_url": MOCK_PDF_URL},
    # APR 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-04-05", "amount": 600000, "category": "Transporte", "description": "Neumáticos nuevos", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-04-12", "amount": 250000, "category": "Servicios", "description": "Control de calidad", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-04-25", "amount": 30000, "category": "Materiales de Oficina", "description": "Lubricantes", "receipt_url": MOCK_PDF_URL},
    # MAY 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-05-10", "amount": 800000, "category": "Transporte", "description": "Alquiler de equipo", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-05-20", "amount": 10000, "category": "Otros", "description": "Sellos de seguridad", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-05-30", "amount": 100000, "category": "Servicios", "description": "Licencias de software de producción", "receipt_url": MOCK_PDF_URL},
    # JUN 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-06-15", "amount": 50000, "category": "Materiales de Oficina", "description": "Cajas y embalaje", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-06-20", "amount": 100000, "category": "Servicios", "description": "Revisión técnica vehicular", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-06-30", "amount": 15000, "category": "Otros", "description": "Peajes", "receipt_url": MOCK_PDF_URL},
    # JUL 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-07-01", "amount": 150000, "category": "Servicios", "description": "Reparación de equipos", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-07-15", "amount": 100000, "category": "Materiales de Oficina", "description": "Refacciones menores", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-07-30", "amount": 900000, "category": "Transporte", "description": "Alquiler de camión", "receipt_url": MOCK_PDF_URL},
    # AUG 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-08-05", "amount": 50000, "category": "Otros", "description": "Certificación de equipos", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-08-18", "amount": 450000, "category": "Transporte", "description": "Servicio de grúa", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-08-28", "amount": 20000, "category": "Materiales de Oficina", "description": "Equipo de protección personal", "receipt_url": MOCK_PDF_URL},
    # SEP 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-09-01", "amount": 350000, "category": "Servicios", "description": "Mantenimiento preventivo Q3", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-09-15", "amount": 120000, "category": "Transporte", "description": "Reparación de motor", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-09-30", "amount": 10000, "category": "Otros", "description": "Gastos de aduana", "receipt_url": MOCK_PDF_URL},
    # OCT 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-10-10", "amount": 50000, "category": "Materiales de Oficina", "description": "Filtros y aceites", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-10-20", "amount": 180000, "category": "Servicios", "description": "Inspección técnica", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-10-31", "amount": 50000, "category": "Otros", "description": "Permisos de circulación", "receipt_url": MOCK_PDF_URL},
    # NOV 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-11-05", "amount": 200000, "category": "Transporte", "description": "Alquiler de bodega", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-11-15", "amount": 15000, "category": "Materiales de Oficina", "description": "Etiquetas de envío", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-11-25", "amount": 70000, "category": "Servicios", "description": "Servicios de fumigación", "receipt_url": MOCK_PDF_URL},
    # DEC 2025
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-12-01", "amount": 100000, "category": "Servicios", "description": "Limpieza profunda", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-12-10", "amount": 25000, "category": "Materiales de Oficina", "description": "Inventario final", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Operaciones", "date": "2025-12-20", "amount": 500000, "category": "Transporte", "description": "Mantenimiento general de fin de año", "receipt_url": MOCK_PDF_URL},

    # =========================================================================
    # MARKETING
    # =========================================================================
    # JAN 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-01-01", "amount": 300000, "category": "Marketing", "description": "Publicidad en redes sociales", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-01-18", "amount": 45000, "category": "Viajes", "description": "Viáticos para sesión de fotos", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-01-30", "amount": 5000, "category": "Otros", "description": "Gastos de diseño gráfico", "receipt_url": MOCK_PDF_URL},
    # FEB 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-02-07", "amount": 180000, "category": "Marketing", "description": "Hosting web y dominio", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-02-25", "amount": 25000, "category": "Otros", "description": "Material de promoción", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-02-28", "amount": 50000, "category": "Viajes", "description": "Boleto de avión", "receipt_url": MOCK_PDF_URL},
    # MAR 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-03-05", "amount": 10000, "category": "Otros", "description": "Tarjetas de presentación", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-03-15", "amount": 30000, "category": "Viajes", "description": "Viáticos locales", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-03-25", "amount": 150000, "category": "Marketing", "description": "Campaña de Google Ads", "receipt_url": MOCK_PDF_URL},
    # APR 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-04-01", "amount": 200000, "category": "Marketing", "description": "Colaboración con influencer", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-04-10", "amount": 5000, "category": "Otros", "description": "Membresía de banco de imágenes", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-04-20", "amount": 25000, "category": "Viajes", "description": "Hotel para evento", "receipt_url": MOCK_PDF_URL},
    # MAY 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-05-15", "amount": 100000, "category": "Marketing", "description": "Desarrollo de landing page", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-05-22", "amount": 8000, "category": "Otros", "description": "Publicidad impresa", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-05-30", "amount": 15000, "category": "Viajes", "description": "Reembolso de peajes", "receipt_url": MOCK_PDF_URL},
    # JUN 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-06-05", "amount": 400000, "category": "Marketing", "description": "Campaña de lanzamiento de producto", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-06-15", "amount": 5000, "category": "Otros", "description": "Comisiones bancarias", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-06-25", "amount": 20000, "category": "Viajes", "description": "Almuerzo de trabajo", "receipt_url": MOCK_PDF_URL},
    # JUL 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-07-05", "amount": 50000, "category": "Viajes", "description": "Reunión con agencia", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-07-15", "amount": 250000, "category": "Marketing", "description": "Campaña de verano", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-07-30", "amount": 15000, "category": "Otros", "description": "Material impreso", "receipt_url": MOCK_PDF_URL},
    # AUG 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-08-01", "amount": 120000, "category": "Marketing", "description": "Diseño de material promocional", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-08-10", "amount": 10000, "category": "Otros", "description": "Suscripción a herramienta SEO", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-08-25", "amount": 40000, "category": "Viajes", "description": "Viáticos para evento", "receipt_url": MOCK_PDF_URL},
    # SEP 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-09-05", "amount": 350000, "category": "Marketing", "description": "Campaña de otoño", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-09-15", "amount": 5000, "category": "Otros", "description": "Gastos de fotografía", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-09-30", "amount": 25000, "category": "Viajes", "description": "Transporte a locación", "receipt_url": MOCK_PDF_URL},
    # OCT 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-10-10", "amount": 15000, "category": "Otros", "description": "Material de papelería", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-10-20", "amount": 180000, "category": "Marketing", "description": "Contratación de agencia digital", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-10-31", "amount": 30000, "category": "Viajes", "description": "Viáticos para cierre de Q4", "receipt_url": MOCK_PDF_URL},
    # NOV 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-11-05", "amount": 40000, "category": "Otros", "description": "Regalos para clientes", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-11-15", "amount": 200000, "category": "Marketing", "description": "Campaña Black Friday", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-11-25", "amount": 10000, "category": "Viajes", "description": "Transporte a imprenta", "receipt_url": MOCK_PDF_URL},
    # DEC 2025
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-12-01", "amount": 50000, "category": "Otros", "description": "Cena de equipo", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-12-10", "amount": 500000, "category": "Marketing", "description": "Campaña de Navidad", "receipt_url": MOCK_PDF_URL},
    {"id": get_mock_id(), "department": "Marketing", "date": "2025-12-20", "amount": 25000, "category": "Viajes", "description": "Viáticos para la directiva", "receipt_url": MOCK_PDF_URL},
]
import uuid

# ============================================================
# 💰 MOCK INCOME DATA (2025)
# ============================================================
MOCK_INCOME = [
    # --- ENERO ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-01-10", "amount": 3200000, "source": "Inversiones", "description": "Rendimientos financieros Q1"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-01-18", "amount": 900000, "source": "Servicios", "description": "Consultoría técnica inicial"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-01-24", "amount": 400000, "source": "Publicidad", "description": "Patrocinio corporativo enero"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-01-29", "amount": 800000, "source": "Capacitaciones", "description": "Reembolso de programa de formación"},

    # --- FEBRERO ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-02-07", "amount": 2800000, "source": "Ventas", "description": "Ingresos por productos financieros"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-02-16", "amount": 950000, "source": "Servicios", "description": "Auditorías de sistemas"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-02-22", "amount": 350000, "source": "Eventos", "description": "Ingresos por exposición comercial"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-02-26", "amount": 620000, "source": "Subvención estatal", "description": "Apoyo para desarrollo profesional"},

    # --- MARZO ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-03-12", "amount": 3400000, "source": "Ventas", "description": "Ingreso trimestral de clientes"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-03-18", "amount": 890000, "source": "Consultoría", "description": "Asesoría especializada Q1"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-03-25", "amount": 270000, "source": "Publicidad", "description": "Campañas digitales de marzo"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-03-30", "amount": 600000, "source": "Subvención estatal", "description": "Apoyo para programas internos"},

    # --- ABRIL ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-04-09", "amount": 4100000, "source": "Inversiones", "description": "Rendimientos de bonos Q2"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-04-15", "amount": 950000, "source": "Servicios", "description": "Proyectos de mantenimiento"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-04-27", "amount": 320000, "source": "Publicidad", "description": "Promociones institucionales"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-04-21", "amount": 700000, "source": "Consultoría interna", "description": "Servicios de evaluación de personal"},

    # --- MAYO ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-05-10", "amount": 3800000, "source": "Ventas", "description": "Comisiones por ventas Q2"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-05-20", "amount": 880000, "source": "Consultoría", "description": "Asistencia técnica regional"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-05-25", "amount": 450000, "source": "Eventos", "description": "Seminario de marketing internacional"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-05-30", "amount": 750000, "source": "Consultoría interna", "description": "Servicios de evaluación del personal"},

    # --- JUNIO ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-06-11", "amount": 3900000, "source": "Inversiones", "description": "Dividendos de portafolio"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-06-18", "amount": 970000, "source": "Servicios", "description": "Supervisión de proyectos"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-06-24", "amount": 280000, "source": "Publicidad", "description": "Publicidad digital de junio"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-06-25", "amount": 740000, "source": "Consultoría interna", "description": "Evaluación de desempeño"},

    # --- JULIO ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-07-01", "amount": 5000000, "source": "Ventas", "description": "Ingreso por ventas de Q2"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-07-15", "amount": 1000000, "source": "Servicios", "description": "Servicios de consultoría"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-07-20", "amount": 200000, "source": "Publicidad", "description": "Reembolso de patrocinio"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-07-27", "amount": 820000, "source": "Formación", "description": "Programas de liderazgo"},

    # --- AGOSTO ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-08-09", "amount": 4200000, "source": "Inversiones", "description": "Rendimientos financieros Q3"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-08-18", "amount": 1100000, "source": "Consultoría", "description": "Mantenimiento técnico preventivo"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-08-28", "amount": 350000, "source": "Eventos", "description": "Feria internacional africana"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-08-30", "amount": 780000, "source": "Consultoría", "description": "Evaluación psicolaboral anual"},

    # --- SEPTIEMBRE ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-09-12", "amount": 4400000, "source": "Ventas", "description": "Facturación trimestral Q3"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-09-19", "amount": 950000, "source": "Servicios", "description": "Revisión de contratos"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-09-25", "amount": 270000, "source": "Publicidad", "description": "Publicidad institucional"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-09-10", "amount": 500000, "source": "Proyecto especial", "description": "Fondo de bienestar institucional"},

    # --- OCTUBRE ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-10-05", "amount": 4700000, "source": "Inversiones", "description": "Ingresos por intereses"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-10-16", "amount": 1020000, "source": "Servicios", "description": "Supervisión técnica externa"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-10-23", "amount": 310000, "source": "Eventos", "description": "Conferencia de prensa continental"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-10-14", "amount": 650000, "source": "Consultoría interna", "description": "Evaluaciones de clima laboral"},

    # --- NOVIEMBRE ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-11-08", "amount": 4500000, "source": "Ventas", "description": "Ingresos por cierre de proyectos"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-11-14", "amount": 870000, "source": "Consultoría", "description": "Auditoría técnica intermedia"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-11-27", "amount": 290000, "source": "Publicidad", "description": "Campaña de fin de año"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-11-21", "amount": 720000, "source": "Proyecto interno", "description": "Actividades de bienestar del personal"},

    # --- DICIEMBRE ---
    {"id": str(uuid.uuid4()), "department": "Finanzas", "date": "2025-12-05", "amount": 5300000, "source": "Inversiones", "description": "Cierre financiero anual"},
    {"id": str(uuid.uuid4()), "department": "Operaciones", "date": "2025-12-18", "amount": 1200000, "source": "Servicios", "description": "Supervisión final de proyectos"},
    {"id": str(uuid.uuid4()), "department": "Marketing", "date": "2025-12-22", "amount": 400000, "source": "Eventos", "description": "Festival de clausura anual"},
    {"id": str(uuid.uuid4()), "department": "RecursosHumanos", "date": "2025-12-15", "amount": 950000, "source": "Iniciativas de desarrollo", "description": "Programas de retención de talento"}
]

# In app.py - Add this new route

@app.route('/api/accounting/generate-expense-pdf', methods=['GET'])
def generate_expense_pdf():
    """
    Generates a PDF expense receipt on the fly using query parameters.
    """
    try:
        # 1. Get data from query parameters
        expense_id = request.args.get('id', 'N/A')
        department = request.args.get('department', 'N/A')
        date_str = request.args.get('date', 'N/A')
        amount_str = request.args.get('amount', '0')
        category = request.args.get('category', 'N/A')
        description = request.args.get('description', 'Sin descripción')

        # 2. Format data for display
        try:
            amount = float(amount_str)
            amount_formatted = f"FCFA {amount:,.2f}"
        except ValueError:
            amount_formatted = "FCFA 0.00"

        # 3. HTML Template for the Receipt
        html_content = f"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Comprobante de Gasto</title>
            <style>
                body {{ font-family: sans-serif; margin: 40px; color: #333; }}
                .receipt-box {{ border: 2px solid #004080; padding: 25px; border-radius: 8px; width: 100%; max-width: 600px; margin: 0 auto; }}
                h1 {{ color: #004080; border-bottom: 2px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; text-align: center; }}
                .detail {{ margin-bottom: 10px; display: flex; justify-content: space-between; }}
                .detail strong {{ font-weight: 600; flex-basis: 40%; }}
                .detail span {{ text-align: right; flex-basis: 60%; }}
                .total {{ font-size: 1.2em; font-weight: bold; border-top: 2px solid #004080; padding-top: 10px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="receipt-box">
                <h1>COMPROBANTE DE GASTO (ATiempo)</h1>
                
                <div class="detail"><strong>Fecha del Gasto:</strong><span>{date_str}</span></div>
                <div class="detail"><strong>Departamento:</strong><span>{department}</span></div>
                <div class="detail"><strong>ID de Referencia:</strong><span>{expense_id}</span></div>
                
                <hr style="margin: 15px 0;">
                
                <div class="detail"><strong>Categoría:</strong><span>{category}</span></div>
                <div class="detail"><strong>Descripción:</strong><span>{description}</span></div>
                
                <div class="total detail"><strong>MONTO TOTAL:</strong><span style="color: #ef4444;">{amount_formatted}</span></div>
            </div>
            <p style="text-align:center; font-size:0.8em; color:#777; margin-top:30px;">Generado automáticamente el {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
        </body>
        </html>
        """

        # 4. Generate PDF using WeasyPrint
        pdf_bytes = HTML(string=html_content).write_pdf()
        
        # 5. Return the PDF
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'inline; filename="comprobante_{expense_id}.pdf"'
        
        return response

    except Exception as e:
        logging.error(f"Error generating expense PDF: {e}")
        # Return an error PDF or a JSON error
        return jsonify({'status': 'error', 'message': f'Error interno al generar PDF: {e}'}), 500

# ==========================================================
# 🏢 CONTABILIDAD API ENDPOINTS (Frontend Integration)
# ==========================================================
@app.route("/api/department/<string:department_name>/summary", methods=["GET"])
def department_summary(department_name):
    """
    Unified endpoint for department summary (Charts + KPIs).
    
    FIXED: Robustly checks the department name (space-removed key) against 
    MOCK_DEPARTMENTS and uses the correct mock data keys.
    """
    from urllib.parse import unquote
    import random

    # 1. Decode URL and remove spaces for robust matching (e.g., 'RecursosHumanos')
    requested_dep = unquote(department_name).replace(' ', '')

    # 2. Find the full department name from the mock list
    full_department_name = next((d for d in MOCK_DEPARTMENTS if d.replace(' ', '') == requested_dep), None)

    if not full_department_name:
        # NOTE: Your frontend is calling this route with the space-removed name (RecursosHumanos)
        # We must confirm it exists in the *full* list before proceeding.
        return jsonify({"error": f"Departamento '{department_name}' no encontrado."}), 404

    # 3. Define the keys needed for mock data lookup
    department_key = full_department_name      # Key with spaces (for MOCK_BUDGETS)
    department_filter_key = requested_dep      # Key without spaces (for MOCK_EXPENSES/INCOME)

    # 🔹 Basic totals
    monthly_budget = MOCK_BUDGETS.get(department_key, 0) 

    # 🔑 Filtering MOCK_EXPENSES/MOCK_INCOME using the space-removed key
    total_expenses = sum(
        e["amount"] for e in MOCK_EXPENSES if e["department"] == department_filter_key
    )
    total_income = sum(
        i["amount"] for i in MOCK_INCOME if i["department"] == department_filter_key
    )

    # 🔹 Extended mock dataset for visualization
    months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    # Use consistent seed for mock trends (ensures comparison works)
    random.seed(hash(department_key) % (2**32 - 1)) 
    income_trend = [random.randint(800000, 1300000) for _ in months]
    expenses_trend = [random.randint(600000, 1100000) for _ in months]
    budget_trend = [monthly_budget or 1500000] * 12

    # 🔹 Category breakdown (donut chart)
    # Use fixed numbers for chart consistency
    categories = {
        "Salarios": 480000,
        "Servicios": 230000,
        "Materiales": 120000,
        "Transporte": 80000,
        "Otros": 60000,
    }

    # 🔹 Comparative metrics (for the last month/period)
    current_income = income_trend[-1]
    previous_income = income_trend[-2] if len(income_trend) >= 2 else current_income 
    current_expenses = expenses_trend[-1]
    previous_expenses = expenses_trend[-2] if len(expenses_trend) >= 2 else current_expenses
    
    # Avoid division by zero in comparison calculations later in the frontend
    if previous_income == 0: previous_income = current_income or 1
    if previous_expenses == 0: previous_expenses = current_expenses or 1

    # 🔹 Construct final dataset
    data = {
        "months": months,
        "income": income_trend,
        "expenses": expenses_trend,
        "budget": budget_trend,
        "categories": categories,
        "monthly_budget": monthly_budget,
        "current_income": current_income,
        "previous_income": previous_income,
        "current_expenses": current_expenses,
        "previous_expenses": previous_expenses,
        "total_expenses": total_expenses,
        "annual_budget": sum(budget_trend),
        "expense_usage": round((total_expenses / (sum(budget_trend) or 1)) * 100, 2),
        "income_change": round(((current_income - previous_income) / previous_income) * 100, 2),
    }

    return jsonify(data), 200

@app.route('/api/upload-receipt', methods=['POST'])
def upload_receipt():
    """
    Handles file uploads through the backend to avoid CORS issues.
    Uploads the file to Firebase Storage and returns the download URL.
    """
    try:
        # Authentication check
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Authorization token is missing or invalid'}), 401
        
        token = auth_header.split('Bearer ')[1]
        decoded_token = verify_token_cached(token)
        # Check if the post request has the file part
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file part'}), 400
        
        file = request.files['file']
        department = request.form.get('department')
        
        # If user does not select file, browser also submit an empty part without filename
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No selected file'}), 400
        
        if file and allowed_file(file.filename):
            # Create a unique filename with timestamp and department
            timestamp = int(time.time() * 1000)
            filename = secure_filename(file.filename)
            safe_filename = f"{timestamp}_{filename}"
            
            # Create the file path
            file_path = f"facturas/{department}/{safe_filename}"
            
            # Upload to Firebase Storage
            bucket = storage.bucket()
            blob = bucket.blob(file_path)
            
            # Upload the file
            blob.upload_from_file(file, content_type=file.content_type)
            
            # Make the blob publicly readable
            blob.make_public()
            
            # Return the public URL
            return jsonify({
                'status': 'success', 
                'message': 'File uploaded successfully',
                'downloadURL': blob.public_url,
                'fileName': filename
            })
        
        return jsonify({'status': 'error', 'message': 'File type not allowed'}), 400
        
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'Invalid or expired token'}), 401
    except Exception as e:
        logging.error(f"Error uploading receipt: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

def allowed_file(filename):
    return '.' in filename and filename.lower().endswith('.pdf')

def secure_filename(filename):
    """Simple filename sanitization"""
    # Keep only alphanumeric, dots, underscores, and hyphens
    import re
    filename = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    # Remove any leading/trailing spaces or dots
    filename = filename.strip('. ')
    return filename

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in {'pdf'}

@app.route('/api/departments', methods=['GET'])
def get_departments():
    """
    Returns a list of all available departments.
    For now, uses a hardcoded list. In a real app, this would come from Firestore.
    """
    try:
        # Authentication check (assuming admin access)
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        auth.verify_id_token(token) 

        return jsonify({"status": "success", "departments": MOCK_DEPARTMENTS})
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/departments: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500

# =====================================================
# 📈 Unified Department Summary Endpoint (Charts + Totals)
# =====================================================


@app.route('/api/accounting/summary', methods=['GET'])
def get_accounting_summary():
    """
    Returns the budget, total expenses, and total income for a given department and period.
    Uses in-memory mock data.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        department = request.args.get('department')
        period = request.args.get('period')  # YYYY-MM

        if not department:
            return jsonify({'status': 'error', 'message': 'Department is required'}), 400

        allocated_budget = MOCK_BUDGETS.get(department, 0)

        # Filter expenses for the selected department and period
        dept_expenses = [
            exp for exp in MOCK_EXPENSES 
            if exp['department'] == department and (not period or exp['date'].startswith(period))
        ]
        total_expenses = sum(exp['amount'] for exp in dept_expenses)

        # Filter income for the selected department and period
        dept_income = [
            inc for inc in MOCK_INCOME 
            if inc['department'] == department and (not period or inc['date'].startswith(period))
        ]
        total_income = sum(inc['amount'] for inc in dept_income)

        net_balance = total_income - total_expenses

        return jsonify({
            "status": "success",
            "summary": {
                "allocated_budget": allocated_budget,
                "total_expenses": total_expenses,
                "total_income": total_income,
                "net_balance": net_balance
            },
            "expenses": dept_expenses,  # Added this to match frontend expectations
            "income": dept_income       # Added this to match frontend expectations
        })
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/accounting/summary: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500

# --- Create a new expense ---
@app.route('/api/accounting/expense', methods=['POST'])
def create_expense():
    """
    POST: Creates a new expense record.
    Uses in-memory mock data.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        data = request.get_json()
        department = data.get('department')
        date = data.get('date')
        amount = data.get('amount')
        category = data.get('category')
        description = data.get('description')
        receipt_url = data.get('receiptUrl')

        if not all([department, date, amount, category]):
            return jsonify({'status': 'error', 'message': 'Missing required expense data'}), 400
        
        new_expense = {
            "id": str(uuid.uuid4()),
            "department": department,
            "date": date,
            "amount": float(amount),
            "category": category,
            "description": description,
            "receiptUrl": receipt_url
        }
        MOCK_EXPENSES.append(new_expense)
        
        return jsonify({"status": "success", "message": "Expense added successfully", "expense": new_expense})

    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/accounting/expense: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500

# In app.py - REPLACE your existing @app.route('/api/accounting/expenses', methods=['GET'])
# with this complete, corrected function:

@app.route('/api/accounting/expenses', methods=['GET'])
def get_expenses():
    """
    GET: Fetches expense records for a given department and period.
    Uses in-memory mock data.
    
    CRITICAL FIX: Explicitly handles space encoding/decoding mismatch 
    between frontend query parameters and MOCK_EXPENSES.
    """
    from urllib.parse import unquote
    
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        # 1. Get the parameter (it is URL-decoded by Flask, but let's confirm validity)
        department = request.args.get('department')
        period = request.args.get('period')  # YYYY-MM
        
        # 2. Safety check against a truly empty parameter
        if not department:
            return jsonify({'status': 'error', 'message': 'Department is required'}), 400

        # 3. Create a clean, space-removed version for filtering the mock data.
        # This solves the conflict between 'Recursos Humanos' (mock) and 'Recursos%20Humanos' (URL).
        department_filter_key = department.replace(' ', '')
        
        # 4. Filter expenses for the selected department and period
        filtered_expenses = [
            exp for exp in MOCK_EXPENSES 
            # Match the space-removed incoming key against the space-removed mock data key
            if exp['department'].replace(' ', '') == department_filter_key and (not period or exp['date'].startswith(period))
        ]
        
        return jsonify({"status": "success", "expenses": filtered_expenses})

    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/accounting/expenses: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500
# --- Update an existing expense ---

@app.route('/api/accounting/expenses/<expense_id>', methods=['GET', 'PUT', 'DELETE'])
def expense_detail(expense_id):
    """
    GET: Fetches a specific expense by ID.
    PUT: Updates an existing expense.
    DELETE: Deletes an expense.
    Uses in-memory mock data.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        global MOCK_EXPENSES

        if request.method == 'GET':
            # Find the expense by ID
            for expense in MOCK_EXPENSES:
                if expense['id'] == expense_id:
                    return jsonify({"status": "success", "expense": expense})
            return jsonify({'status': 'error', 'message': 'Expense not found'}), 404

        elif request.method == 'PUT':
            data = request.get_json()
            # Find and update the expense
            for i, expense in enumerate(MOCK_EXPENSES):
                if expense['id'] == expense_id:
                    MOCK_EXPENSES[i] = {
                        **expense, 
                        "date": data.get('date', expense['date']),
                        "amount": float(data.get('amount', expense['amount'])),
                        "category": data.get('category', expense['category']),
                        "description": data.get('description', expense['description']),
                        "receiptUrl": data.get('receiptUrl', expense.get('receiptUrl'))
                    }
                    return jsonify({"status": "success", "message": "Expense updated successfully", "expense": MOCK_EXPENSES[i]})
            return jsonify({'status': 'error', 'message': 'Expense not found'}), 404

        elif request.method == 'DELETE':
            initial_len = len(MOCK_EXPENSES)
            MOCK_EXPENSES[:] = [exp for exp in MOCK_EXPENSES if exp['id'] != expense_id]
            if len(MOCK_EXPENSES) < initial_len:
                return jsonify({"status": "success", "message": "Expense deleted successfully"})
            return jsonify({'status': 'error', 'message': 'Expense not found'}), 404

    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/accounting/expenses/<id>: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500

# ============================================================
# 💰 GET INCOME DATA (plural) — used by frontend /incomes
# ============================================================
# ======================================================
@app.route("/api/accounting/generate-income-pdf", methods=["GET"])
def generate_income_pdf():
    """Genera un comprobante PDF de ingreso, similar al de gastos."""
    from weasyprint import HTML
    from flask import make_response, request

    # --- Parámetros desde la URL ---
    income_id = request.args.get("id", "N/A")
    department = request.args.get("department", "No especificado")
    date = request.args.get("date", "No especificado")
    amount = request.args.get("amount", "0")
    source = request.args.get("source", "No especificado")
    description = request.args.get("description", "Sin descripción")

    # --- Formato visual (igual que los gastos) ---
    html = f"""
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 40px;
                color: #222;
            }}
            h1 {{
                text-align: center;
                color: #004080;
                font-size: 22px;
                margin-bottom: 25px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            th, td {{
                padding: 10px 8px;
                border-bottom: 1px solid #ccc;
                text-align: left;
                font-size: 14px;
            }}
            th {{
                background-color: #004080;
                color: white;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            .amount {{
                font-size: 18px;
                font-weight: bold;
                color: #004080;
            }}
            .footer {{
                text-align: center;
                font-size: 12px;
                color: #555;
                margin-top: 40px;
            }}
            .logo {{
                text-align: center;
                margin-bottom: 20px;
            }}
            .logo img {{
                height: 70px;
            }}
        </style>
    </head>
    <body>
        <div class="logo">
            <img src="https://firebasestorage.googleapis.com/v0/b/trivial-guineologia.appspot.com/o/assets%2Fatiempo_logo.png?alt=media" alt="ATIEMPO Logo">
        </div>

        <h1>Comprobante de Ingreso</h1>

        <table>
            <tr><th>ID</th><td>{income_id}</td></tr>
            <tr><th>Departamento</th><td>{department}</td></tr>
            <tr><th>Fecha</th><td>{date}</td></tr>
            <tr><th>Monto</th><td class="amount">FCFA {amount}</td></tr>
            <tr><th>Fuente</th><td>{source}</td></tr>
            <tr><th>Descripción</th><td>{description}</td></tr>
        </table>

        <div class="footer">
            <p>Generado automáticamente por el sistema <strong>@TIEMPO</strong></p>
            <p>“La transparencia es la base de la gestión eficiente.”</p>
        </div>
    </body>
    </html>
    """

    try:
        pdf = HTML(string=html).write_pdf()
        response = make_response(pdf)
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = f"inline; filename=comprobante_ingreso_{income_id}.pdf"
        return response
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/accounting/<department>/incomes', methods=['GET'])
def get_incomes(department):
    try:
        period = request.args.get("period", "")
        logging.info(f"📥 [API] Fetching incomes for {department} | Period: {period or 'All'}")

        data = [i for i in MOCK_INCOME if i["department"] == department]
        if period:
            data = [i for i in data if i["date"].startswith(period)]

        return jsonify({"status": "success", "incomes": data}), 200
    except Exception as e:
        logging.error(f"❌ Error fetching incomes: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/accounting/income', methods=['GET', 'POST'])
def handle_income():
    """
    GET: Fetches income records for a given department and period.
    POST: Adds a new income record.
    Uses in-memory mock data.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        if request.method == 'GET':
            department = request.args.get('department')
            period = request.args.get('period') # YYYY-MM

            if not department:
                return jsonify({'status': 'error', 'message': 'Department is required'}), 400

            filtered_income = [
                inc for inc in MOCK_INCOME 
                if inc['department'] == department and (not period or inc['date'].startswith(period))
            ]
            return jsonify({"status": "success", "income": filtered_income})

        elif request.method == 'POST':
            data = request.get_json()
            department = data.get('department')
            date = data.get('date')
            amount = data.get('amount')
            source = data.get('source')
            description = data.get('description')

            if not all([department, date, amount, source, description]):
                return jsonify({'status': 'error', 'message': 'Missing data for income'}), 400
            
            new_income = {
                "id": str(uuid.uuid4()), # Generate a unique ID for the mock income
                "department": department,
                "date": date,
                "amount": float(amount),
                "source": source,
                "description": description
            }
            MOCK_INCOME.append(new_income) # Add to in-memory list
            return jsonify({"status": "success", "message": "Income added successfully", "income": new_income})
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/accounting/income: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500

@app.route('/api/accounting/income/<income_id>', methods=['PUT', 'DELETE'])
def manage_income(income_id):
    """
    PUT: Updates an existing income record.
    DELETE: Deletes an income record.
    Uses in-memory mock data.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        global MOCK_INCOME # Declare intent to modify global list

        if request.method == 'PUT':
            data = request.get_json()
            # Find and update the income
            for i, inc in enumerate(MOCK_INCOME):
                if inc['id'] == income_id:
                    MOCK_INCOME[i] = {**inc, **data, "id": income_id} # Update fields, keep ID
                    return jsonify({"status": "success", "message": "Income updated successfully", "income": MOCK_INCOME[i]})
            return jsonify({'status': 'error', 'message': 'Income not found'}), 404

        elif request.method == 'DELETE':
            initial_len = len(MOCK_INCOME)
            MOCK_INCOME[:] = [inc for inc in MOCK_INCOME if inc['id'] != income_id] # Filter out the deleted one
            if len(MOCK_INCOME) < initial_len:
                return jsonify({"status": "success", "message": "Income deleted successfully"})
            return jsonify({'status': 'error', 'message': 'Income not found'}), 404
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/accounting/income/<id>: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500

@app.route('/api/accounting/budget', methods=['GET', 'PUT'])
def handle_budget():
    """
    GET: Fetches the budget for a given department.
    PUT: Updates the budget for a given department.
    Uses in-memory mock data.
    """
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'status': 'error', 'message': 'Falta o es inválido el token'}), 401
        token = auth_header.split('Bearer ')[1]
        verify_token_cached(token)
        department = request.args.get('department')
        if not department:
            return jsonify({'status': 'error', 'message': 'Department is required'}), 400

        if request.method == 'GET':
            budget = MOCK_BUDGETS.get(department, 0)
            return jsonify({"status": "success", "budget": budget})

        elif request.method == 'PUT':
            data = request.get_json()
            new_amount = data.get('amount')
            if new_amount is None or not isinstance(new_amount, (int, float)) or new_amount < 0:
                return jsonify({'status': 'error', 'message': 'Invalid budget amount'}), 400
            
            MOCK_BUDGETS[department] = float(new_amount)
            return jsonify({"status": "success", "message": "Budget updated successfully", "new_budget": MOCK_BUDGETS[department]})
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'El token es inválido o ha expirado'}), 401
    except Exception as e:
        logging.error(f"Error en /api/accounting/budget: {e}")
        return jsonify({'status': 'error', 'message': 'Error interno del servidor'}), 500


# ---- Compatibility alias + clearer auth debugging ----
from flask import redirect, request
import urllib.parse as _urlparse
from firebase_admin import auth as _fauth

# [REPLACE THE EXISTING summary_alias FUNCTION (around line 2097)]

@app.route('/api/department/<department>/summary', methods=['GET'])
def summary_alias(department):
    """
    FIXED: Redirects the space-removed department name (RecursosHumanos) 
    to the canonical summary endpoint, ensuring the full department name 
    ('Recursos Humanos') is used in the query string.
    """
    
    # 1. Find the full department name corresponding to the URL part (e.g., 'RecursosHumanos')
    full_name = next((d for d in MOCK_DEPARTMENTS if d.replace(' ', '') == department), department)
    
    # 2. Reconstruct the redirect URL using the full name
    qs = request.query_string.decode()  # keep any ?period=...
    sep = '&' if qs else ''
    # Target canonical route with the FULL department name
    target = f"/api/accounting/summary?department={_urlparse.quote(full_name)}{sep}{qs}"
    
    return redirect(target, code=307)  # preserve method


# ==========================================
#  Serve backend_config.json to Electron UI
# ==========================================
from flask import send_from_directory

@app.route('/backend_config.json')
def serve_backend_config():
    """Serve backend_config.json to Electron frontend."""
    import os
    config_path = os.path.join(os.path.dirname(__file__), 'backend_config.json')
    if os.path.exists(config_path):
        return send_from_directory(os.path.dirname(config_path), 'backend_config.json')
    return {"error": "backend_config.json not found"}, 404
# ==========================================================
# 🚀 ENTRY POINT (Flask + Electron integration fix)
# ==========================================================
import socket, json, time
from pathlib import Path

if __name__ == "__main__":
    host = "127.0.0.1"
    port = 52000  # fixed for dev mode

    # Write config once
    config = {"host": host, "port": port, "url": f"http://{host}:{port}"}
    config_path = Path(__file__).resolve().parent / "backend_config.json"
    config_path.write_text(json.dumps(config))
    print(f"✅ backend_config.json written (fixed dev mode) → {config}")

    app.run(host=host, port=port, debug=False, use_reloader=False)

