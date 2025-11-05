import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import random
from faker import Faker

# Initialize Firebase
cred = credentials.Certificate("atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Initialize Faker for realistic mock data
fake = Faker('es_ES')

def generate_mock_hr_data(employee_id):
    """
    Generates realistic mock HR data for an employee
    """
    # Base employment dates (random within reasonable ranges)
    hire_date = fake.date_between(start_date='-5y', end_date='-1y')
    contract_end_date = fake.date_between(start_date=hire_date, end_date='+2y') if random.random() > 0.7 else None
    
    # Salary information
    base_salary = round(random.uniform(15000, 60000), 2)
    salary_frequency = random.choice(['mensual', 'quincenal', 'semanal'])
    
    # Benefits
    benefits = []
    if random.random() > 0.3:
        benefits.append('seguro_medico')
    if random.random() > 0.5:
        benefits.append('vales_despensa')
    if random.random() > 0.7:
        benefits.append('bonos_rendimiento')
    
    # Performance reviews
    reviews = []
    for i in range(random.randint(1, 3)):
        review_date = fake.date_between(start_date=hire_date)
        reviews.append({
            'fecha': review_date.strftime('%Y-%m-%d'),
            'calificacion': random.randint(1, 5),
            'comentarios': fake.paragraph(nb_sentences=2),
            'evaluador': fake.name()
        })
    
    # Training records
    trainings = []
    for i in range(random.randint(0, 4)):
        trainings.append({
            'nombre': fake.catch_phrase(),
            'fecha': fake.date_between(start_date=hire_date).strftime('%Y-%m-%d'),
            'duracion_horas': random.randint(2, 40),
            'completado': random.random() > 0.2,
            'certificado_url': fake.url() if random.random() > 0.5 else None
        })
    
    # Create the HR data structure
    hr_data = {
        'informacion_contrato': {
            'tipo_contrato': random.choice(['indefinido', 'temporal', 'prueba', 'proyecto']),
            'fecha_inicio': hire_date.strftime('%Y-%m-%d'),
            'fecha_fin': contract_end_date.strftime('%Y-%m-%d') if contract_end_date else None,
            'departamento': fake.job().split('/')[0],
            'puesto': fake.job(),
            'jefe_directo': fake.name(),
            'horario': f"{random.randint(7,9)}:00 - {random.randint(16,19)}:00",
            'turno': random.choice(['matutino', 'vespertino', 'nocturno', 'mixto'])
        },
        'compensacion': {
            'salario_base': base_salary,
            'moneda': 'MXN',
            'frecuencia_pago': salary_frequency,
            'ultimo_aumento': fake.date_between(start_date=hire_date).strftime('%Y-%m-%d'),
            'porcentaje_aumento': round(random.uniform(0, 15), 2) if random.random() > 0.5 else 0,
            'beneficios': benefits,
            'cuenta_bancaria': {
                'banco': fake.company(),
                'clabe': fake.bban(),
                'tipo_cuenta': random.choice(['nómina', 'ahorros', 'cheques'])
            }
        },
        'desempeno': {
            'revisiones': reviews,
            'promedio_calificacion': round(sum(r['calificacion'] for r in reviews)/len(reviews), 2) if reviews else None,
            'metas': [fake.sentence() for _ in range(random.randint(1, 3))]
        },
        'capacitacion': {
            'cursos': trainings,
            'horas_totales': sum(t['duracion_horas'] for t in trainings),
            'requiere_capacitacion': random.random() > 0.7
        },
        'incidencias': {
            'amonestaciones': random.randint(0, 2),
            'permisos_sin_goce': random.randint(0, 3),
            'retardos_ultimo_mes': random.randint(0, 5),
            'faltas_ultimo_mes': random.randint(0, 2)
        },
        'estatus': random.choice(['activo', 'licencia', 'baja_temporal', 'renuncia_proceso']),
        'ultima_actualizacion': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    return hr_data

def create_hr_collection_for_all_employees():
    """
    Creates datos_rrhh collection for all employees and populates with mock data
    """
    employees_ref = db.collection("EMPLEADOS").stream()
    
    for employee in employees_ref:
        employee_id = employee.id
        hr_ref = db.collection("EMPLEADOS").document(employee_id).collection("datos_rrhh").document("informacion")
        
        # Skip if HR data already exists
        if hr_ref.get().exists:
            print(f"ℹ️ HR data already exists for employee {employee_id}, skipping...")
            continue
        
        # Generate and set mock HR data
        hr_data = generate_mock_hr_data(employee_id)
        hr_ref.set(hr_data)
        
        print(f"✅ Generated HR data for employee {employee_id}")

if __name__ == "__main__":
    print("🚀 Starting HR data generation for all employees...")
    create_hr_collection_for_all_employees()
    print("🎉 HR data generation completed successfully!")