// src/data/lottieLoader.ts
import lottie from "lottie-web";

let qrAnimation: any = null;
let hourglassAnimation: any = null;
let preloaded = false;

// ✅ Attach runtime globally (needed for Electron)
if (typeof window !== "undefined" && !(window as any).lottie) {
  (window as any).lottie = lottie;
  console.log("✅ lottie-web runtime attached to window");
}

// ✅ Load QR animation dynamically
export async function getQrAnimation() {
  if (!qrAnimation) {
    const module = await import("./qr.json");
    qrAnimation = module.default || module;
  }
  return qrAnimation;
}

// ✅ Load Hourglass animation dynamically
export async function getHourglassAnimation() {
  if (!hourglassAnimation) {
    const module = await import("./hourglassLottie.json"); // ← now JSON
    hourglassAnimation = module.default || module;
  }
  return hourglassAnimation;
}

// ✅ Preload all animations (optional but useful)
export async function preloadAllLotties() {
  if (preloaded) return;
  preloaded = true;
  try {
    await Promise.all([getQrAnimation(), getHourglassAnimation()]);
    console.log("✅ All Lottie animations preloaded successfully");
  } catch (err) {
    console.error("❌ Error preloading Lottie animations:", err);
  }
}
