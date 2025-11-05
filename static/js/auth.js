// static/js/auth.js
const firebaseConfig = {
  apiKey: "AIzaSyBTehSBePV6bjKkI_htP6NsU4agckkSOrE",
  authDomain: "atiempo-9f08a.firebaseapp.com",
  projectId: "atiempo-9f08a",
  storageBucket: "atiempo-9f08a.appspot.com",
  messagingSenderId: "221735208077",
  appId: "1:221735208077:web:28a3134fa23bd407a20ec4"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// 🔄 Automatically restore session or redirect
auth.onAuthStateChanged(user => {
  if (!user) {
    console.warn("⚠️ No session found, redirecting to login...");
    window.location.href = "/login";
  } else {
    console.log("✅ Sesión activa:", user.email);
    window.currentUser = user;
    user.getIdToken().then(token => {
      window.firebaseIdToken = token;
      console.log("🔑 Token actualizado.");
    });
  }
});

// 🚪 Cerrar sesión global
function logout() {
  auth.signOut().then(() => {
    localStorage.clear();
    window.location.href = "/login";
  });
}
