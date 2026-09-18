// A short, quiet "no" tone for a rejected entry, generated with the Web
// Audio API instead of a base64 WAV in the page. Silent where audio is
// unavailable or blocked; the red flash and the live-region text carry the
// same message for players with sound off.

let context = null;

const getContext = () => {
  if (context) return context;
  const w = /** @type {any} */ (typeof window !== 'undefined' ? window : null);
  const Ctor = w && (w.AudioContext || w.webkitAudioContext);
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
};

export function playErrorTone() {
  const ctx = getContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  } catch {
    // Audio is a courtesy, never a requirement.
  }
}
