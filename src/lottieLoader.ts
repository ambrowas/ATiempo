let qrAnimation: any = null;
let hourglassAnimation: any = null;

// ✅ Lazy load and cache animations (only loaded once)
export async function getQrAnimation() {
  if (!qrAnimation) {
    const module = await import("./qr.json");
    qrAnimation = module.default || module;
  }
  return qrAnimation;
}

export async function getHourglassAnimation() {
  if (!hourglassAnimation) {
    const module = await import("./hourglassLottie.json");
    hourglassAnimation = module.default || module;
  }
  return hourglassAnimation;
}
