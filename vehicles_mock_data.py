import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize Firebase (replace with your credentials)
cred = credentials.Certificate("atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Complete Mock Data for 5 Vehicles
vehicles = [
    {
        "datos_basicos": {
            "foto": "https://example.com/ford_f150.jpg",
            "tipo": "Pickup",
            "modelo": "F-150 XLT",
            "año": 2021,
            "color": "Azul",
            "vin": "1FTFW1E5XMKE12345",
            "seguro": {
                "compania": "Seguros Atlas",
                "poliza": "ATX-2021-5678",
                "vencimiento": "2025-12-31"
            },
            "matricula": "ABC-1234"
        },
        "datos_mantenimiento": {
            "año_compra": 2021,
            "historial_incidentes": [
                "Cambio de aceite (05/2023)",
                "Rotación de llantas (11/2023)"
            ],
            "proximo_mantenimiento": "2024-08-15",
            "kilometraje_actual": 45000
        },
        "datos_uso": {
            "semana_25_2024": {
                "consumo_gasolina": [25, 28, 30, 22, 26],
                "km_por_litro": 8.5,
                "conductores": [
                    {"nombre": "Juan Pérez", "entrada": "08:00", "salida": "17:00"}
                ],
                "ubicacion_actual": {"lat": 19.4326, "lng": -99.1332}
            }
        }
    },
    {
        "datos_basicos": {
            "foto": "https://example.com/toyota_corolla.jpg",
            "tipo": "Sedán",
            "modelo": "Corolla LE",
            "año": 2022,
            "color": "Blanco",
            "vin": "JT2BF22K2W0123456",
            "seguro": {
                "compania": "AXA Seguros",
                "poliza": "AXA-2022-8910",
                "vencimiento": "2025-10-15"
            },
            "matricula": "XYZ-5678"
        },
        "datos_mantenimiento": {
            "año_compra": 2022,
            "historial_incidentes": [
                "Alineación (03/2024)",
                "Frenos revisados (01/2024)"
            ],
            "proximo_mantenimiento": "2024-09-20",
            "kilometraje_actual": 22000
        },
        "datos_uso": {
            "semana_25_2024": {
                "consumo_gasolina": [18, 20, 19, 17, 21],
                "km_por_litro": 14.2,
                "conductores": [
                    {"nombre": "María López", "entrada": "07:30", "salida": "16:30"}
                ],
                "ubicacion_actual": {"lat": 20.6736, "lng": -103.344}
            }
        }
    },
    {
        "datos_basicos": {
            "foto": "https://example.com/sprinter.jpg",
            "tipo": "Furgoneta",
            "modelo": "Sprinter 2500",
            "año": 2020,
            "color": "Gris",
            "vin": "WDG3J4JB0LJ123456",
            "seguro": {
                "compania": "GNP Seguros",
                "poliza": "GNP-2020-1122",
                "vencimiento": "2024-11-30"
            },
            "matricula": "DEF-9012"
        },
        "datos_mantenimiento": {
            "año_compra": 2020,
            "historial_incidentes": [
                "Transmisión reparada (09/2023)",
                "Batería reemplazada (12/2023)"
            ],
            "proximo_mantenimiento": "2024-07-10",
            "kilometraje_actual": 89000
        },
        "datos_uso": {
            "semana_25_2024": {
                "consumo_gasolina": [35, 38, 40, 37, 39],
                "km_por_litro": 6.8,
                "conductores": [
                    {"nombre": "Carlos Ruiz", "entrada": "06:00", "salida": "15:00"}
                ],
                "ubicacion_actual": {"lat": 25.6866, "lng": -100.3161}
            }
        }
    },
    {
        "datos_basicos": {
            "foto": "https://example.com/tahoe.jpg",
            "tipo": "SUV",
            "modelo": "Tahoe Premier",
            "año": 2023,
            "color": "Negro",
            "vin": "1GNSKJKC8MR123456",
            "seguro": {
                "compania": "Qualitas",
                "poliza": "QLT-2023-3344",
                "vencimiento": "2026-01-15"
            },
            "matricula": "GHI-3456"
        },
        "datos_mantenimiento": {
            "año_compra": 2023,
            "historial_incidentes": [
                "Primer mantenimiento (05/2024)"
            ],
            "proximo_mantenimiento": "2024-10-05",
            "kilometraje_actual": 12000
        },
        "datos_uso": {
            "semana_25_2024": {
                "consumo_gasolina": [30, 32, 28, 31, 29],
                "km_por_litro": 9.1,
                "conductores": [
                    {"nombre": "Ana Mendoza", "entrada": "09:00", "salida": "18:00"}
                ],
                "ubicacion_actual": {"lat": 21.1619, "lng": -86.8515}
            }
        }
    },
    {
        "datos_basicos": {
            "foto": "https://example.com/isuzu_npr.jpg",
            "tipo": "Camión de carga",
            "modelo": "NPR-HD",
            "año": 2019,
            "color": "Rojo",
            "vin": "JALC4W34590123456",
            "seguro": {
                "compania": "Mapfre",
                "poliza": "MAP-2019-7788",
                "vencimiento": "2024-09-30"
            },
            "matricula": "JKL-7890"
        },
        "datos_mantenimiento": {
            "año_compra": 2019,
            "historial_incidentes": [
                "Motor revisado (07/2023)",
                "Neumáticos nuevos (02/2024)"
            ],
            "proximo_mantenimiento": "2024-08-30",
            "kilometraje_actual": 125000
        },
        "datos_uso": {
            "semana_25_2024": {
                "consumo_gasolina": [45, 50, 48, 47, 49],
                "km_por_litro": 5.5,
                "conductores": [
                    {"nombre": "Luis García", "entrada": "05:30", "salida": "14:30"}
                ],
                "ubicacion_actual": {"lat": 19.0414, "lng": -98.2063}
            }
        }
    }
]

def populate_vehicles():
    for vehicle in vehicles:
        try:
            # Add main vehicle document
            vehicle_ref = db.collection("VEHICULOS").document()
            vehicle_ref.set(vehicle["datos_basicos"])
            
            # Add maintenance subcollection
            maintenance_ref = vehicle_ref.collection("datos_mantenimiento").document("registro_principal")
            maintenance_ref.set(vehicle["datos_mantenimiento"])
            
            # Add usage subcollection
            usage_ref = vehicle_ref.collection("datos_uso").document("semana_25_2024")
            usage_ref.set(vehicle["datos_uso"]["semana_25_2024"])
            
            print(f"Successfully added {vehicle['datos_basicos']['modelo']} (ID: {vehicle_ref.id})")
            
        except Exception as e:
            print(f"Error adding {vehicle['datos_basicos']['modelo']}: {str(e)}")

if __name__ == "__main__":
    print("Starting database population...")
    populate_vehicles()
    print("All vehicles added successfully!")