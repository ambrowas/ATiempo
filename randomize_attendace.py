#!/usr/bin/env python3
import json
import os
import random
from datetime import datetime, time

# CONFIG
INPUT_PATH = "public/attendance_2025.json"
OUTPUT_PATH = "public/attendance_2025.json"  # change to ..._synthetic.json if you want to keep original

YEAR_KEY = "2025"

# Probabilities (must sum ~1)
P_NORMAL = 0.65          # día normal
P_LATE = 0.12            # llega tarde
P_EARLY = 0.10           # salida anticipada
P_ABSENT = 0.05          # ausencia
P_MISSION = 0.04         # comisión/visita
P_REMOTE = 0.04          # teletrabajo

# Helpers -----------------------------------------------------------

def is_friday(date_str: str, year: int, month_num: int, day: int) -> bool:
    """
    Our records only store the day number; we need to know if that day is Friday.
    We'll try to build a date and check weekday.
    """
    try:
        dt = datetime(year, month_num, day)
        return dt.weekday() == 4  # Monday=0 ... Friday=4
    except ValueError:
        return False

def pick_late_time():
    # 09:05–09:35
    minute = random.choice([5, 10, 12, 15, 20, 25, 30, 35])
    return time(9, minute).strftime("%H:%M:%S")

def pick_early_leave(is_friday: bool):
    # normal day → 15:00–16:30
    if is_friday:
        # if it is already 14:00, make it earlier, like 12:30–13:30
        hour = 12
        minute = random.choice([30, 45, 50, 55])
        return time(hour, minute).strftime("%H:%M:%S")
    else:
        hour = random.choice([15, 16])
        minute = random.choice([0, 15, 30, 45])
        return time(hour, minute).strftime("%H:%M:%S")

def base_entry_time():
    return "09:00:00"

def base_exit_time(is_friday: bool):
    return "14:00:00" if is_friday else "17:00:00"

# Month name → number (your JSON is in Spanish)
MONTHS_ES = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}

def main():
    if not os.path.exists(INPUT_PATH):
        print(f"❌ No se encontró {INPUT_PATH}")
        return

    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # data structure: { "Empleado": { "2025": { "enero": [ {...}, ...], ... } }, ... }
    for employee_name, years in data.items():
        year_block = years.get(YEAR_KEY)
        if not year_block:
            continue

        for month_name, records in year_block.items():
            month_num = MONTHS_ES.get(month_name.lower())
            if not month_num:
                continue

            for rec in records:
                day = rec.get("day")
                if not day:
                    continue

                # Detect if this date is Friday
                friday = is_friday("dummy", int(YEAR_KEY), month_num, int(day))

                # Roll a random behavior
                r = random.random()

                # ABSENCE ------------------------------------------------
                if r < P_ABSENT:
                    rec["hora_entrada"] = None
                    rec["hora_salida"] = None
                    rec["observaciones"] = "Ausencia Injustificada"
                    rec["explicacion"] = ""
                    continue

                # MISSION / VISIT ----------------------------------------
                if r < P_ABSENT + P_MISSION:
                    rec["hora_entrada"] = f"2025-{month_num:02d}-{day:02d}T09:00:00"
                    rec["hora_salida"] = f"2025-{month_num:02d}-{day:02d}T{base_exit_time(friday)}"
                    rec["observaciones"] = "Comisión de servicio"
                    rec["explicacion"] = "Visita/gestión fuera de oficina."
                    continue

                # REMOTE -------------------------------------------------
                if r < P_ABSENT + P_MISSION + P_REMOTE:
                    rec["hora_entrada"] = f"2025-{month_num:02d}-{day:02d}T09:00:00"
                    rec["hora_salida"] = f"2025-{month_num:02d}-{day:02d}T{base_exit_time(friday)}"
                    rec["observaciones"] = "Teletrabajo"
                    rec["explicacion"] = "Actividad remota autorizada."
                    continue

                # LATE ---------------------------------------------------
                if r < P_ABSENT + P_MISSION + P_REMOTE + P_LATE:
                    late_time = pick_late_time()
                    rec["hora_entrada"] = f"2025-{month_num:02d}-{day:02d}T{late_time}"
                    rec["hora_salida"] = f"2025-{month_num:02d}-{day:02d}T{base_exit_time(friday)}"
                    rec["observaciones"] = "Tarde"
                    rec["explicacion"] = "Retraso leve."
                    continue

                # EARLY LEAVE --------------------------------------------
                if r < P_ABSENT + P_MISSION + P_REMOTE + P_LATE + P_EARLY:
                    early = pick_early_leave(friday)
                    rec["hora_entrada"] = f"2025-{month_num:02d}-{day:02d}T09:00:00"
                    rec["hora_salida"] = f"2025-{month_num:02d}-{day:02d}T{early}"
                    rec["observaciones"] = "Incompleto"
                    rec["explicacion"] = "Salida anticipada."
                    continue

                # NORMAL -------------------------------------------------
                rec["hora_entrada"] = f"2025-{month_num:02d}-{day:02d}T09:00:00"
                rec["hora_salida"] = f"2025-{month_num:02d}-{day:02d}T{base_exit_time(friday)}"
                if rec.get("observaciones") in (None, "", "Completo", "Incompleto", "Tarde", "Ausencia Injustificada"):
                    rec["observaciones"] = "Completo"
                if rec.get("explicacion") is None:
                    rec["explicacion"] = ""

    # Write back
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ Archivo de asistencia actualizado: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
