import logging
import os
from datetime import datetime
from urllib.parse import quote_plus # To properly encode URL parameters

import firebase_admin
from firebase_admin import credentials, firestore

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def generate_mock_employee_payroll():
    """
    Generates mock payroll data for January-June 2025 for each employee
    and stores it in a 'datos_nomina' subcollection in Firestore.

    This script now generates URLs to your Flask backend's dynamic payroll PDF
    endpoint, rather than storing raw HTML content in Firestore.
    """
    
    # Get a reference to your Firestore database
    db = firestore.client()

    logging.info("\nStarting mock payroll data generation...")

    # Get all employee documents from the 'EMPLEADOS' collection
    employees_ref = db.collection('EMPLEADOS')
    all_employees = employees_ref.stream() # `stream()` gets all documents in the collection

    employees_processed_count = 0

    # Define Spanish month names for consistency with your Firestore structure
    spanish_month_names = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ]

    for employee_doc in all_employees:
        employee_id = employee_doc.id
        employees_processed_count += 1
        logging.info(f"\nProcessing employee ID: {employee_id}")

        # Try to retrieve the employee's personal data from 'datos_biometricos/info' subcollection
        employee_details_ref = employees_ref.document(employee_id).collection('datos_biometricos').document('info')
        employee_details_doc = employee_details_ref.get()

        employee_personal_info = {}
        if employee_details_doc.exists:
            employee_personal_info = employee_details_doc.to_dict()
        else:
            logging.warning(f"  WARNING: No 'datos_biometricos/info' found for employee '{employee_id}'. Skipping payroll generation for this employee.")
            continue # Move to the next employee if no personal data is found

        # Extract relevant personal data for the payroll slip
        # Use .get() with a default value to prevent KeyError if field is missing
        employee_name = employee_personal_info.get('nombre_completo', 'Empleado Desconocido')
        
        # Generate payroll for January (1) through June (6) of 2025
        for month_num in range(1, 7):
            month_english = datetime(2025, month_num, 1).strftime('%B') # For display in period
            month_spanish = spanish_month_names[month_num - 1] # For potential Firestore collection names

            year = 2025
            
            # Create a unique document ID for each month's payroll (YYYY-MM format)
            payroll_doc_id = f"{year}-{month_num:02d}"

            # --- Create Mock Payroll Data ---
            # You can make this mock data more dynamic or sophisticated!
            gross_pay = 355500.00 # Example fixed gross pay
            
            # Mock deduction calculations (adjust as needed for realism)
            seguridad_social = round(gross_pay * 0.08, 2) # Example 8%
            iprf = round(gross_pay * 0.05, 2) # Example 5%
            pdge = round(gross_pay * 0.01, 2) # Example 1%
            otros = round(gross_pay * 0.02, 2) # Example 2%

            
            net_pay = round(gross_pay - total_deductions, 2)

            # Construct the URL to the Flask backend's dynamic payroll PDF generator
            # Ensure all parameters are URL-encoded
            payroll_url = (
                f"http://localhost:5001/generate-payroll-pdf-mock?"
                f"period={quote_plus(f'{month_english} 1-15, {year}')}&" # Example period
                f"pay_date={quote_plus(f'{year}-{month_num:02d}-15')}&" # Example pay date
                f"salario_bruto={quote_plus(str(gross_pay))}&"
                f"seguridad_social={quote_plus(str(seguridad_social))}&"
                f"iprf={quote_plus(str(iprf))}&"
                f"pdge={quote_plus(str(pdge))}&"
                f"otros={quote_plus(str(otros))}&"
                f"salario_neto={quote_plus(str(net_pay))}&"
                f"employee_name={quote_plus(employee_name)}"
            )

            mock_payroll_document_data = {
                "periodo": f"{month_english} 1-15, {year}", # Consistent with frontend display
                "fecha_pago": f"{year}-{month_num:02d}-15", # Consistent with frontend display
                "salario_bruto": f"{gross_pay:.2f}", # Store as string with 2 decimal places
                "deducciones": {
                    "seguridad_social": f"{seguridad_social:.2f}",
                    "iprf": f"{iprf:.2f}",
                    "pdge": f"{pdge:.2f}",
                    "otros": f"{otros:.2f}"
                },
                "salario_neto": f"{net_pay:.2f}", # Store as string with 2 decimal places
                "url": payroll_url, # URL to the dynamically generated HTML/PDF
                "date_generated": firestore.SERVER_TIMESTAMP, # Timestamp from Firestore server
                "employee_id": employee_id, # Redundant but useful for direct queries
                "employee_name": employee_name # Redundant but useful for direct queries
            }

            # Set the document in the 'datos_nomina' subcollection for the current employee
            try:
                db.collection('EMPLEADOS').document(employee_id).collection('datos_nomina').document(payroll_doc_id).set(mock_payroll_document_data)
                logging.info(f"  - Successfully created mock payroll for {month_english} {year} (ID: {payroll_doc_id})")
            except Exception as e:
                logging.error(f"  - ERROR creating payroll for {month_english} {year} for employee '{employee_id}': {e}")

    if employees_processed_count == 0:
        logging.warning("\nNo employees found in the 'EMPLEADOS' collection. Please ensure your collection is populated.")
    else:
        logging.info(f"\nMock payroll data generation complete for {employees_processed_count} employees.")

# --- How to Run This Function ---
if __name__ == "__main__":
    # IMPORTANT: Replace this with the actual path to your service account key file!
    SERVICE_ACCOUNT_KEY_PATH = "/Users/eleela/Documents/ATIEMPO-Final/atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json"

    # Initialize the Firebase Admin SDK
    try:
        cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)
        if not firebase_admin._apps: # Check if app is already initialized
            firebase_admin.initialize_app(cred, {'storageBucket': 'atiempo-9f08a.appspot.com'})
        logging.info("Firebase Admin SDK initialized successfully!")
    except FileNotFoundError:
        logging.error(f"ERROR: Service account key file not found at '{SERVICE_ACCOUNT_KEY_PATH}'.")
        logging.error("Please ensure the path is correct and the file exists.")
        exit()
    except Exception as e:
        logging.error(f"ERROR: Could not initialize Firebase Admin SDK: {e}")
        exit()

    # Call the function to generate the mock data
    generate_mock_employee_payroll()

