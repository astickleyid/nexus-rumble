let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;

function ensure() {
  if (ctx) return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC({ latencyHint: "interactive" });
  master = ctx.createGain();
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  master.gain.value = muted ? 0 : 0.85;
  sfxBus.connect(master);
  master.connect(ctx.destination);
  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

export function unlockAudio() {
  ensure();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean) {
  muted = next;
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.85, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

function envGain(duration: number, peak: number) {
  if (!ctx || !sfxBus) return null;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.connect(sfxBus);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  return g;
}

function tone(freq: number, duration: number, type: OscillatorType, peak: number, slide = 1) {
  if (!ctx || muted) return;
  ensure();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = envGain(duration, peak);
  if (!g) return;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), ctx.currentTime + duration);
  osc.connect(g);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function burstNoise(duration: number, peak: number, rate = 1) {
  if (!ctx || !noise || !sfxBus || muted) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = rate;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900 * rate;
  filter.Q.value = 0.7;
  const g = envGain(duration, peak);
  if (!g) return;
  src.connect(filter);
  filter.connect(g);
  src.start();
  src.stop(ctx.currentTime + duration);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}

const vary = () => 0.94 + Math.random() * 0.12;

export const sfx = {
  swing() {
    burstNoise(0.09, 0.18, 1.6 * vary());
    tone(220, 0.07, "square", 0.04, 1.4);
  },
  heavy() {
    burstNoise(0.14, 0.28, 0.8 * vary());
    tone(140, 0.12, "sawtooth", 0.06, 0.6);
  },
  hit() {
    burstNoise(0.12, 0.45, 1.1 * vary());
    tone(90, 0.14, "sine", 0.22, 0.5);
  },
  crush() {
    burstNoise(0.18, 0.55, 0.55);
    tone(70, 0.22, "sine", 0.3, 0.4);
    tone(180, 0.1, "triangle", 0.08, 1.5);
  },
  block() {
    tone(520, 0.07, "square", 0.06, 1.8);
    burstNoise(0.06, 0.12, 2.2);
  },
  shot() {
    tone(360, 0.16, "sawtooth", 0.07, 1.8);
    tone(180, 0.18, "triangle", 0.05, 1.2);
  },
  burst() {
    tone(220, 0.28, "sawtooth", 0.08, 2);
    tone(330, 0.32, "triangle", 0.07, 1.5);
    tone(440, 0.36, "sine", 0.06, 1.2);
  },
  ko() {
    tone(196, 0.45, "sawtooth", 0.1, 0.35);
    tone(98, 0.5, "sine", 0.18, 0.4);
  },
  land() {
    burstNoise(0.08, 0.12, 0.7);
  },
  ui() {
    tone(660, 0.06, "square", 0.04, 1.4);
  },
  fight() {
    tone(440, 0.12, "square", 0.06, 1.5);
    tone(660, 0.16, "square", 0.05, 1.2);
  },
};
