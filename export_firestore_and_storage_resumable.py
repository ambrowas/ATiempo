import firebase_admin
from firebase_admin import credentials, firestore, storage
import json, os, datetime, sys
from google.cloud.firestore_v1 import DocumentReference
from google.api_core import exceptions
from tqdm import tqdm  # pip install tqdm

# ========= CONFIG =========
SERVICE_ACCOUNT_PATH = "/Users/eleela/Documents/ATIEMPO-Final/atiempo-9f08a-firebase-adminsdk-fbsvc-e5a274b0b2.json"
PROJECT_ID = "atiempo-9f08a"
OUTPUT_DIR = "firestore_full_export"
# ==========================

# Initialize Firebase Admin SDK
cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred, {
    "projectId": PROJECT_ID,
    "storageBucket": f"{PROJECT_ID}.firebasestorage.app"
})


db = firestore.client()
bucket = storage.bucket()
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------- JSON SERIALIZER ----------
def convert_for_json(obj):
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    if isinstance(obj, DocumentReference):
        return obj.path
    return str(obj)

# ---------- LOGGER ----------
LOG_FILE = os.path.join(OUTPUT_DIR, "export_log.txt")

def log(msg):
    print(msg)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{datetime.datetime.now().isoformat()} - {msg}\n")

# ---------- RECURSIVE FIRESTORE EXPORT ----------
def export_document_recursive(doc_ref):
    """Recursively export a document and all subcollections."""
    try:
        doc = doc_ref.get()
        doc_data = doc.to_dict() or {}
        subcollections = doc_ref.collections()
        for subcol in subcollections:
            subcol_data = {}
            for subdoc in subcol.stream():
                subcol_data[subdoc.id] = export_document_recursive(subdoc.reference)
            doc_data[subcol.id] = subcol_data
        return doc_data
    except exceptions.NotFound:
        return {}

def export_collection_recursive(col_ref):
    """Export all documents (and nested subcollections) in a collection."""
    log(f"📦 Exporting collection: {col_ref.id}")
    collection_data = {}
    docs = list(col_ref.stream())
    for doc in tqdm(docs, desc=f"Exporting {col_ref.id}", unit="doc"):
        collection_data[doc.id] = export_document_recursive(doc.reference)
    return collection_data

def export_all_collections():
    log("🚀 Starting full Firestore export (recursive)...")
    collections = db.collections()
    for collection in collections:
        data = export_collection_recursive(collection)
        out_path = os.path.join(OUTPUT_DIR, f"{collection.id}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=convert_for_json)
        log(f"✅ Saved {collection.id}.json ({len(data)} top-level docs)")
    log("🎯 Firestore export complete!")

# ---------- FIREBASE STORAGE EXPORT ----------
def export_storage():
    log("🗂️ Exporting Firebase Storage files...")
    storage_dir = os.path.join(OUTPUT_DIR, "storage_files")
    os.makedirs(storage_dir, exist_ok=True)

    blobs = list(bucket.list_blobs())
    index_path = os.path.join(storage_dir, "storage_index.json")
    file_index = []

    # Load existing index if resuming
    if os.path.exists(index_path):
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                file_index = json.load(f)
        except Exception:
            file_index = []

    downloaded_files = {item["name"] for item in file_index}

    for blob in tqdm(blobs, desc="Downloading files", unit="file"):
        if blob.name in downloaded_files:
            continue  # Skip already downloaded files
        blob_filename = blob.name.replace("/", "_")
        blob_path = os.path.join(storage_dir, blob_filename)

        try:
            os.makedirs(os.path.dirname(blob_path), exist_ok=True)
            blob.download_to_filename(blob_path)
            entry = {
                "name": blob.name,
                "path": blob_path,
                "content_type": blob.content_type,
                "size_bytes": blob.size,
                "updated": blob.updated.isoformat() if blob.updated else None
            }
            file_index.append(entry)
            log(f"📁 Downloaded: {blob.name}")
        except Exception as e:
            log(f"⚠️ Failed to download {blob.name}: {e}")

        # Update index incrementally
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(file_index, f, indent=2, ensure_ascii=False, default=convert_for_json)

    log(f"✅ Storage export complete! {len(file_index)} total files downloaded.")

# ---------- RUN ----------
if __name__ == "__main__":
    try:
      
        export_storage()
        log("🏁 Full export completed successfully.")
    except KeyboardInterrupt:
        log("🛑 Export interrupted by user. Partial data saved.")
        sys.exit(1)
    except Exception as e:
        log(f"❌ Error: {e}")
        sys.exit(1)
