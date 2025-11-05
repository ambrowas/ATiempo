// =======================================================
//  globalAuth.js — Universal Firebase Auth Across All Pages
// =======================================================

(function () {
  // ✅ Prevent duplicate initialization
  if (window.__atiempoAuthLoaded) {
    console.log("ℹ️ globalAuth.js already loaded — skipping duplicate init.");
    return;
  }
  window.__atiempoAuthLoaded = true;

  // --- Wait until Firebase library is available ---
  function waitForFirebase(callback, retries = 15) {
    if (window.firebase && firebase.apps) return callback();
    if (retries === 0) return console.error("❌ Firebase failed to load after retries.");
    setTimeout(() => waitForFirebase(callback, retries - 1), 250);
  }

  waitForFirebase(() => {
    console.log("✅ Firebase detected. Proceeding with auth init...");

    // --- Initialize Firebase once ---
    if (!firebase.apps.length) {
      const firebaseConfig = {
        apiKey: "AIzaSyBTehSBePV6bjKkI_htP6NsU4agckkSOrE",
        authDomain: "atiempo-9f08a.firebaseapp.com",
        projectId: "atiempo-9f08a",
        storageBucket: "atiempo-9f08a.appspot.com",
        messagingSenderId: "221735208077",
        appId: "1:221735208077:web:28a3134fa23bd407a20ec4"
      };
      firebase.initializeApp(firebaseConfig);
      console.log("🔥 Firebase initialized globally.");
    }

    const auth = firebase.auth();

    // --- Set persistent session ---
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => console.log("✅ Firebase persistence set to LOCAL (shared across pages)"))
      .catch(err => console.warn("⚠️ Persistence setup error:", err.message));

    const authBtn = document.getElementById("authBtn");
    const welcomeMsg = document.getElementById("welcomeMsg");

    function updateHeader(email) {
      if (welcomeMsg) welcomeMsg.textContent = email ? `Bienvenido, ${email}` : "";
      if (authBtn) {
        if (email) {
          authBtn.textContent = "🔓 CERRAR SESIÓN";
          authBtn.onclick = async () => {
            await auth.signOut();
            localStorage.clear();
            window.currentUser = null;
            window.location.href = "/login";
          };
        } else {
          authBtn.textContent = "🔐 INICIAR SESION";
          authBtn.onclick = () => window.location.href = "/login";
        }
      }
    }

    // --- Handle user state changes ---
    auth.onAuthStateChanged(async (user) => {
      console.log("🧭 Auth state:", user ? user.email : "none");

      if (user) {
        const token = await user.getIdToken();
        const email = user.email;

        // Save locally
        localStorage.setItem("atiempo_last_user", email);
        localStorage.setItem("atiempo_id_token", token);

        // ✅ Make user globally available
        window.currentUser = {
          email,
          uid: user.uid,
          token,
          refreshToken: user.refreshToken,
        };

        updateHeader(email);
      } else {
        window.currentUser = null;
        updateHeader(null);
      }
    });

    // --- Token auto-refresh every 30 minutes ---
    setInterval(async () => {
      if (auth.currentUser) {
        try {
          const newToken = await auth.currentUser.getIdToken(true);
          localStorage.setItem("atiempo_id_token", newToken);
          window.currentUser.token = newToken;
          console.log("🔄 Token refreshed at", new Date().toLocaleTimeString());
        } catch (err) {
          console.warn("⚠️ Token refresh failed:", err.message);
        }
      }
    }, 30 * 60 * 1000);

    // --- Fallback: load cached user if Firebase hasn't resolved yet ---
    window.addEventListener("load", () => {
      const email = localStorage.getItem("atiempo_last_user");
      const token = localStorage.getItem("atiempo_id_token");
      if (email && !window.currentUser) {
        window.currentUser = { email, token };
        updateHeader(email);
      }
    });
  });
})();
