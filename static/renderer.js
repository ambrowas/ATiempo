// // =======================================================
// renderer.js — Unified Firebase Auth + Electron Session
// =======================================================

// --- 1. Force Secure Context for Electron localhost ---
if (window.location.protocol === "http:" && window.location.hostname.match(/(localhost|127\.0\.0\.1|10\.)/)) {
  console.log("🔒 Forcing secure context override for Electron (localhost detected)");
  try {
    Object.defineProperty(window, "isSecureContext", { value: true });
  } catch (err) {
    console.warn("⚠️ Could not override isSecureContext:", err);
  }
}

// --- 2. Firebase Initialization (Reuse existing app) ---
const auth = firebase.auth();

// --- 3. Confirm IndexedDB availability ---
if (!window.indexedDB) console.warn("⚠️ IndexedDB unavailable — persistence will fail.");
else console.log("💾 IndexedDB available — persistence should work.");

// --- 4. Enable Local Persistence ---
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => console.log("✅ Firebase persistence set to LOCAL (disk)"))
  .catch((err) => console.error("❌ setPersistence failed:", err));

// --- 5. Hybrid Local Token Backup (Electron fallback, ID token only) ---
const backupSession = localStorage.getItem("atiempo_session_backup");
if (backupSession) {
  try {
    const data = JSON.parse(backupSession);
    console.log(`🔁 Attempting hybrid rehydration for ${data.email}`);

    // Try to silently rehydrate if user already exists
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn("⚠️ No Firebase session found — manual login required.");
      } else {
        const freshToken = await user.getIdToken(true);
        localStorage.setItem("atiempo_id_token", freshToken);
        console.log("✅ Refreshed Firebase ID token for rehydration");
      }
    });
  } catch (e) {
    console.warn("⚠️ Failed to parse session backup:", e);
  }
}

// --- 6. DOM References ---
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const scannerInput = document.getElementById("scannerInput");
const scanResult = document.getElementById("scan-result");
const successSound = document.getElementById("successSound");

// --- 7. Monitor Auth State (single handler) ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("✅ Sesión restaurada:", user.email);
    try {
      const token = await user.getIdToken(true);
      localStorage.setItem("atiempo_id_token", token);
      localStorage.setItem("atiempo_last_user", user.email);
      localStorage.setItem("atiempo_session_backup", JSON.stringify({
        email: user.email,
        uid: user.uid,
        token,
        timestamp: Date.now(),
      }));
      hideLoader(); // ✅ Hide Lottie once authenticated
    } catch (e) {
      console.warn("⚠️ Token refresh failed:", e.message);
    }
    if (loginModal) loginModal.style.display = "none";
    scannerInput?.focus();
  } else {
    console.warn("⚠️ No active session — showing login modal.");
    localStorage.removeItem("atiempo_session_backup");
    if (loginModal) loginModal.style.display = "block";
    showLoader(); // 🌀 show loader while waiting or reauth
  }
});

// --- 8. Login Form ---
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem("atiempo_id_token", token);
      localStorage.setItem("atiempo_last_user", email);
      localStorage.setItem("atiempo_session_backup", JSON.stringify({
        email: cred.user.email,
        uid: cred.user.uid,
        token,
        timestamp: Date.now(),
      }));
      showToast("Inicio de sesión exitoso", "success");
      if (loginModal) loginModal.style.display = "none";
      hideLoader();
      scannerInput?.focus();
    } catch (err) {
      console.error("❌ Login error:", err);
      showToast("Error de inicio de sesión: " + err.message, "error");
    }
  });
}

// --- 9. Logout Helper ---
async function logoutUser() {
  await auth.signOut();
  ["atiempo_session_backup", "atiempo_id_token", "atiempo_last_user"].forEach(k => localStorage.removeItem(k));
  showToast("Sesión cerrada", "info");
  showLoader();
  if (loginModal) loginModal.style.display = "block";
}

// --- 10. Toast Utility ---
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === "error" ? "#dc3545" : type === "success" ? "#28a745" : "#007bff"};
    color: white; padding: 12px 20px;
    border-radius: 6px; font-weight: bold; z-index: 3000;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- 11. Loader (Lottie visual) ---
function showLoader() {
  const el = document.getElementById("firebaseLoader");
  if (el) el.style.display = "flex";
}
function hideLoader() {
  const el = document.getElementById("firebaseLoader");
  if (el) el.style.display = "none";
}

// --- 12. Scanner Input ---
let buffer = "";
if (scannerInput) {
  scannerInput.addEventListener("input", (e) => {
    buffer = e.target.value.trim();
    if (buffer.endsWith("\n") || buffer.endsWith("\r")) {
      processScan(buffer.trim());
      e.target.value = "";
      buffer = "";
    }
  });
}
document.addEventListener("click", () => {
  if (!loginModal || loginModal.style.display === "none") scannerInput?.focus();
});

// --- 13. Process QR Scan ---
async function processScan(code) {
  if (!code) return;
  console.log("🔍 Scanned:", code);
  scanResult.textContent = `Procesando ${code}...`;
  const user = auth.currentUser;
  if (!user) {
    showToast("Debes iniciar sesión primero", "error");
    loginModal.style.display = "block";
    return;
  }
  try {
    const token = await user.getIdToken();
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.status === "success") {
      scanResult.textContent = `✅ ${data.message}`;
      successSound.play();
      showToast("Registro exitoso", "success");
    } else {
      scanResult.textContent = `⚠️ ${data.message}`;
      showToast(data.message, "error");
    }
  } catch (err) {
    console.error("❌ Scan error:", err);
    showToast("Error al registrar asistencia", "error");
  }
}

// --- 14. Proverb Loader (6-Hour Auto Refresh + Manual Refresh) ---
async function loadRefran(forceRefresh = false) {
  const refranDisplay = document.getElementById("refran-display");
  if (!refranDisplay) return;

  const saved = localStorage.getItem("atiempo_refran");
  const lastUpdate = parseInt(localStorage.getItem("atiempo_refran_timestamp") || "0", 10);
  const sixHours = 6 * 60 * 60 * 1000;

  if (!forceRefresh && saved && Date.now() - lastUpdate < sixHours) {
    refranDisplay.firstChild.textContent = `"${saved}"`;
    console.log("🪶 Using cached proverb:", saved);
    return;
  }

  try {
    const response = await fetch(`${window.location.origin}/static/refranes.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const data = await response.json();
    const refranes = data.refranes_espanoles || data.proverbios || [];
    if (refranes.length === 0) throw new Error("No refranes found");

    const random = Math.floor(Math.random() * refranes.length);
    const proverb = refranes[random].refran || refranes[random];
    refranDisplay.firstChild.textContent = `"${proverb}"`;
    localStorage.setItem("atiempo_refran", proverb);
    localStorage.setItem("atiempo_refran_timestamp", Date.now().toString());
    console.log("🪶 Loaded new proverb:", proverb);
  } catch (err) {
    console.warn("⚠️ Could not load proverb:", err);
    refranDisplay.firstChild.textContent = `"El trabajo constante vence al talento ocioso."`;
  }
}

// --- 15. Footer Initialization ---
function initRefranFooter() {
  const refranDisplay = document.getElementById("refran-display");
  if (!refranDisplay) {
    console.warn("⚠️ Footer not found yet, retrying...");
    setTimeout(initRefranFooter, 300);
    return;
  }
  if (!document.getElementById("refran-refresh-btn")) {
    const refreshBtn = document.createElement("button");
    refreshBtn.id = "refran-refresh-btn";
    refreshBtn.textContent = "🔄";
    refreshBtn.title = "Actualizar refrán";
    refreshBtn.style.cssText = `
      margin-left: 10px;
      background: none;
      border: none;
      color: #fff;
      font-size: 1.1em;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    refreshBtn.onmouseenter = () => (refreshBtn.style.transform = "rotate(45deg)");
    refreshBtn.onmouseleave = () => (refreshBtn.style.transform = "rotate(0deg)");
    refreshBtn.onclick = () => loadRefran(true);
    refranDisplay.appendChild(refreshBtn);
  }
  const saved = localStorage.getItem("atiempo_refran");
  if (saved) {
    refranDisplay.firstChild.textContent = `"${saved}"`;
    console.log("🪶 Restored saved proverb:", saved);
  } else {
    refranDisplay.firstChild.textContent = `"Por Una Guinea Mejor."`;
  }
  setInterval(() => loadRefran(true), 6 * 60 * 60 * 1000);
  loadRefran();
}

// --- 16. On Load ---
window.addEventListener("load", () => {
  scannerInput?.focus();
  initRefranFooter();
  console.log("🟢 App ready — Electron persistent session active");
});

// --- 17. Header Login Button Sync ---
const authBtn = document.getElementById("authBtn");
const welcomeMsg = document.getElementById("welcomeMsg");
if (authBtn) {
  authBtn.addEventListener("click", () => {
    if (loginModal && loginModal.style.display !== "block") {
      loginModal.style.display = "block";
      showLoader();
    }
  });
}
auth.onAuthStateChanged((user) => {
  if (user) {
    if (authBtn) {
      authBtn.textContent = "🔓 CERRAR SESIÓN";
      authBtn.onclick = logoutUser;
    }
    if (welcomeMsg) welcomeMsg.textContent = `Bienvenido, ${user.email}`;
  } else {
    if (authBtn) {
      authBtn.textContent = "🔐 INICIAR SESION";
      authBtn.onclick = () => {
        if (loginModal) loginModal.style.display = "block";
        showLoader();
      };
    }
    if (welcomeMsg) welcomeMsg.textContent = "";
  }
});
