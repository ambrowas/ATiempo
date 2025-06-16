# ATIEMPO

This project includes an Electron front-end and a small Flask server used to handle employee records. Before running the Python backend, install its dependencies.

## Python backend setup

1. Create a virtual environment (optional but recommended)::

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install required packages:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:

   ```bash
   python app.py
   ```

The Electron application can then communicate with the server on `http://localhost:5000`.
