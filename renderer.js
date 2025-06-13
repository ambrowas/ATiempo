// renderer.js

const form = document.getElementById('employeeForm');
const qrDisplay = document.getElementById('qr');
const submitButton = document.querySelector('button[type="submit"][form="employeeForm"]');
const scannerInput = document.getElementById('scannerInput');
let scannedCode = '';

// Scanner input focus logic (applies to both panelprincipal.html and registro.html)
window.addEventListener('load', () => {
  // Ensure scannerInput exists before trying to focus
  if (scannerInput) {
    scannerInput.focus();

    setInterval(() => {
      const activeTag = document.activeElement.tagName.toLowerCase();
      const isTypingInField = ['input', 'textarea', 'select'].includes(activeTag);
      if (!isTypingInField) {
        scannerInput.focus();
      }
    }, 1000);
  }

  // Event listener for the "Registrar Nuevo Empleado" button in panelprincipal.html
  const registerButton = document.getElementById('registerButton');
  if (registerButton) {
    registerButton.addEventListener('click', openRegistrationWindow);
  }
});


// Handle barcode scan (applies to both panelprincipal.html and registro.html)
scannerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const rawPayload = scannedCode.trim();
    console.log('📥 Raw scan (renderer):', rawPayload);

    const cleaned = rawPayload
      .replace(/Shift/g, '')
      .replace(/[^\x20-\x7E]+/g, '')
      .trim();
    console.log('🧼 Cleaned scan (renderer):', cleaned);

    let employeeId = null;
    const idMatch = cleaned.match(/@id@'?([A-Za-z0-9]+?)(?=@|\|)/);
    if (idMatch && idMatch[1]) {
      employeeId = idMatch[1];
    }

    if (employeeId) {
      logScanToServer(employeeId);
    } else {
      showToast('❌ Formato de código inválido', 'error');
    }
    scannedCode = '';
  } else {
    scannedCode += e.key;
  }
});

// Handle form submission for creating a new employee (primarily for registro.html)
if (form) { // Check if form exists on the current page
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitButton.disabled = true;
    submitButton.textContent = 'Procesando...';

    const formData = {
      nombre: document.getElementById('nombre').value,
      numero_empleado: document.getElementById('numEmpleado').value,
      fecha_nacimiento: document.getElementById('fechaNacimiento').value,
      puesto: document.getElementById('puesto').value,
      departamento: document.getElementById('departamento').value,
      telefono: document.getElementById('telefono').value,
      email: document.getElementById('email').value,
      direccion: document.getElementById('direccion').value,
      sexo: document.getElementById('sexo').value,
      fecha_incorporacion: document.getElementById('fechaIncorporacion').value,
      contacto_emergencia: document.getElementById('contactoEmergencia').value,
      telefono_emergencia: document.getElementById('numContactoEmergencia').value,
      url_foto: document.getElementById('foto').value || "https://example.com/default-avatar.jpg"
    };

    const employeeId = `${formData.numero_empleado}_${formData.nombre.replace(/\s+/g, '_').toLowerCase()}`;

    let qrImageBase64 = '';
    const canvas = document.createElement('canvas');

    try {
      const qrPayload = `@id@${employeeId}@`;
      await new Promise((resolve, reject) => {
        QRCode.toCanvas(canvas, qrPayload, (error) => {
          if (error) {
            console.error('Error generating QR:', error);
            reject(error);
          } else {
            qrImageBase64 = canvas.toDataURL('image/png');
            qrDisplay.innerHTML = '';
            qrDisplay.appendChild(canvas);
            resolve();
          }
        });
      });
    } catch (qrError) {
      showToast('Error al generar el código QR.', 'error');
      submitButton.disabled = false;
      submitButton.textContent = 'Crear y Generar QR';
      return;
    }

    try {
      const response = await fetch(`${window.network.getServerUrl()}/create-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          datos_personales: formData,
          qr_code: qrImageBase64
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);
        showToast("Error del servidor: " + errorText, 'error');
        return;
      }

      const result = await response.json();

      if (result.status === 'success') {
        console.log("Empleado creado correctamente:", result);
        showToast("✅ Empleado creado correctamente.", 'success');
        form.reset();
        qrDisplay.innerHTML = '';
        const successMessageDiv = document.getElementById('success-message');
        if (successMessageDiv) {
            successMessageDiv.style.display = 'block';
            setTimeout(() => { successMessageDiv.style.display = 'none'; }, 5000);
        }
      } else {
        console.warn("Failed to save employee:", result);
        showToast(result.message || 'Error al guardar el empleado', 'warn');
      }

    } catch (error) {
      console.error("Network error:", error);
      showToast("Error al conectar con el servidor.", 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Crear y Generar QR';
    }
  });
} // End if (form)


// Unified function to display toast messages
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.padding = '16px 24px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '16px';
  toast.style.zIndex = 9999;
  toast.style.backgroundColor = type === 'error' ? '#d9534f'
                        : type === 'warn' ? '#f0ad4e'
                        : '#5cb85c';
  toast.style.color = 'white';
  toast.style.boxShadow = '0 0 10px rgba0,0,0,0.3)';
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 3000);
}

// Unified function to log scan to backend
async function logScanToServer(employeeId) {
  const now = new Date();
  const timestamp = now.toISOString();

  try {
    const response = await fetch(`${window.network.getServerUrl()}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, timestamp })
    });

    const result = await response.json();

    if (result.status === 'success') {
      const logDetails = result.message || `Escaneo registrado: ${employeeId}`;
      showToast(logDetails, 'success');
      console.log('Scan recorded:', result);
      const scanResultDiv = document.getElementById('scan-result');
      if (scanResultDiv) {
          scanResultDiv.innerText = `✅ Registro exitoso para ${employeeId} a las ${result.timestamp}`;
      }
    } else {
      showToast(result.message || 'Error al registrar el escaneo', 'warn');
      const scanResultDiv = document.getElementById('scan-result');
      if (scanResultDiv) {
          scanResultDiv.innerText = `❌ Error al registrar el escaneo`;
      }
    }
  } catch (err) {
    console.error('Error sending scan:', err);
    showToast('Error de red al registrar escaneo', 'error');
    const scanResultDiv = document.getElementById('scan-result');
    if (scanResultDiv) {
        scanResultDiv.innerText = `❌ Error de red al registrar el escaneo`;
    }
  }
}

// Function to open new registration window (called from panelprincipal.html)
function openRegistrationWindow() {
  window.open('registro.html', '_blank', 'width=1200,height=800');
}