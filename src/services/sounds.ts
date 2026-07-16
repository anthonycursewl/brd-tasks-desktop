let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.08) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

export function playOpen() {
  playTone(523, 0.15, "sine", 0.06);
  setTimeout(() => playTone(659, 0.2, "sine", 0.05), 100);
}

export function playComplete() {
  playTone(880, 0.1, "sine", 0.07);
  setTimeout(() => playTone(1108, 0.25, "sine", 0.06), 80);
}

export function playExpire() {
  playTone(440, 0.2, "triangle", 0.05);
  setTimeout(() => playTone(349, 0.3, "triangle", 0.04), 150);
}
