import { useEffect, useRef, useState } from "react";
import { Droplets, Flame, Leaf, Volume2, VolumeX, Zap } from "lucide-react";
import { loadArt, type Art } from "@/game/art";
import { isMuted, setMuted, sfx, unlockAudio } from "@/game/audio";
import { createCamera, render, updateCamera, type Camera } from "@/game/draw";
import { BEASTS, counterTo, matchupLine, type BeastId } from "@/game/roster";
import { EMPTY_PAD, MatchSim, STAGE, type Pad } from "@/game/sim";

type Save = { wins: number; losses: number; by: Partial<Record<BeastId, number>> };
type Screen = "title" | "select" | "fight";

const SAVE_KEY = "nexus-rumble-v1";
const ICONS = { spark: Zap, blaze: Flame, tide: Droplets, thorn: Leaf };

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { wins: 0, losses: 0, by: {} };
    const parsed = JSON.parse(raw) as Save;
    return { wins: parsed.wins || 0, losses: parsed.losses || 0, by: parsed.by || {} };
  } catch {
    return { wins: 0, losses: 0, by: {} };
  }
}

function writeSave(result: "win" | "loss", id: BeastId) {
  const save = loadSave();
  if (result === "win") {
    save.wins += 1;
    save.by[id] = (save.by[id] || 0) + 1;
  } else save.losses += 1;
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  return save;
}

function blankPad(): Pad {
  return { ...EMPTY_PAD };
}

export function Rumble() {
  const [screen, setScreen] = useState<Screen>("title");
  const [you, setYou] = useState<BeastId>("voltusk");
  const [rival, setRival] = useState<BeastId>("thornox");
  const [art, setArt] = useState<Art | null>(null);
  const [save, setSave] = useState<Save>({ wins: 0, losses: 0, by: {} });
  const [muted, setMute] = useState(false);
  const [bout, setBout] = useState(0);

  useEffect(() => {
    void loadArt().then(setArt).catch(() => setArt(null));
    setSave(loadSave());
  }, []);

  function enter() {
    unlockAudio();
    sfx.ui();
    setScreen("select");
  }

  return (
    <div className="game-root text-fg">
      {screen !== "fight" ? (
        <div className="menu-scroll">
          {screen === "title" ? (
            <Title save={save} onEnter={enter} />
          ) : (
            <Select
              you={you}
              rival={rival}
              ready={art !== null}
              onYou={(id) => {
                unlockAudio();
                sfx.ui();
                setYou(id);
                setRival(counterTo(id));
              }}
              onRival={(id) => {
                unlockAudio();
                sfx.ui();
                setRival(id);
              }}
              onBack={() => setScreen("title")}
              onFight={() => {
                unlockAudio();
                sfx.fight();
                setBout((n) => n + 1);
                setScreen("fight");
              }}
            />
          )}
        </div>
      ) : (
        <Fight
          key={bout}
          you={you}
          rival={rival}
          art={art}
          muted={muted}
          onMute={() => {
            const next = !muted;
            setMute(next);
            setMuted(next);
          }}
          onExit={() => setScreen("select")}
          onRecord={(result) => setSave(writeSave(result, you))}
        />
      )}
    </div>
  );
}

function Title({ save, onEnter }: { save: Save; onEnter: () => void }) {
  const played = save.wins + save.losses;
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <p className="font-display text-sm tracking-[0.35em] text-primary">CIRCUIT 04</p>
      <h1 className="font-display text-5xl leading-none font-bold tracking-wide sm:text-7xl">
        NEXUS
        <span className="block text-accent">RUMBLE</span>
      </h1>
      <p className="max-w-md text-base text-muted">Platform brawl. Jump, launch, and knock them off the ring. Three stocks.</p>
      <div className="grid w-full grid-cols-4 gap-2">
        {BEASTS.map((b) => (
          <img key={b.id} src={`/sprites/${b.id}/frame-1.png`} alt={b.name} className="h-24 w-full object-contain sm:h-36" />
        ))}
      </div>
      <button type="button" onClick={onEnter} className="font-display min-h-12 bg-primary px-8 text-lg font-semibold tracking-wide text-bg">
        Enter the ring
      </button>
      <p className="text-sm text-muted">{played > 0 ? `${save.wins} wins · ${save.losses} losses` : "Four beasts. One ring. You and a rival CPU."}</p>
    </div>
  );
}

function Select({
  you,
  rival,
  ready,
  onYou,
  onRival,
  onBack,
  onFight,
}: {
  you: BeastId;
  rival: BeastId;
  ready: boolean;
  onYou: (id: BeastId) => void;
  onRival: (id: BeastId) => void;
  onBack: () => void;
  onFight: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm text-muted">
          Back
        </button>
        <h2 className="font-display text-xl tracking-wide">Choose your beast</h2>
        <span className="w-12" />
      </div>
      <Picker label="You" selected={you} tone="you" onPick={onYou} />
      <Picker label="Rival CPU" selected={rival} tone="rival" flip onPick={onRival} />
      <p className="text-center text-sm text-muted">{matchupLine(you, rival)}</p>
      <button
        type="button"
        disabled={!ready}
        onClick={onFight}
        className="font-display min-h-12 bg-accent text-lg font-semibold tracking-wide text-bg disabled:opacity-50"
      >
        {ready ? "Fight" : "Loading beasts…"}
      </button>
    </div>
  );
}

function Picker({
  label,
  selected,
  tone,
  flip,
  onPick,
}: {
  label: string;
  selected: BeastId;
  tone: "you" | "rival";
  flip?: boolean;
  onPick: (id: BeastId) => void;
}) {
  return (
    <section>
      <h3 className={`font-display mb-2 text-sm tracking-[0.2em] ${tone === "you" ? "text-primary" : "text-accent"}`}>{label}</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BEASTS.map((b) => {
          const on = b.id === selected;
          const Icon = ICONS[b.element];
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onPick(b.id)}
              className={`flex min-h-11 flex-col items-center gap-1 px-2 py-2 ${on ? "opacity-100" : "opacity-55"}`}
            >
              <img src={`/sprites/${b.id}/frame-1.png`} alt="" className={`h-24 object-contain ${flip ? "face-left" : ""} ${on ? "scale-110" : ""}`} />
              <span className={`font-display text-sm ${on ? (tone === "you" ? "text-primary" : "text-accent") : "text-fg"}`}>{b.name}</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                <Icon className="size-3.5" aria-hidden="true" />
                {b.elementLabel}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Fight({
  you,
  rival,
  art,
  muted,
  onMute,
  onExit,
  onRecord,
}: {
  you: BeastId;
  rival: BeastId;
  art: Art | null;
  muted: boolean;
  onMute: () => void;
  onExit: () => void;
  onRecord: (result: "win" | "loss") => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<MatchSim | null>(null);
  const camRef = useRef<Camera>(createCamera());
  const keyRef = useRef(blankPad());
  const touchRef = useRef(blankPad());
  const buttonRef = useRef(blankPad());
  const stickRef = useRef({ left: false, right: false, jump: false, block: false });
  const evolveRef = useRef<HTMLButtonElement>(null);
  const recorded = useRef(false);
  const recordRef = useRef(onRecord);
  recordRef.current = onRecord;
  const [phase, setPhase] = useState<MatchSim["phase"]>("intro");
  const [score, setScore] = useState<[number, number]>([3, 3]);
  const [victor, setVictor] = useState<0 | 1 | null>(null);
  const [touchUi, setTouchUi] = useState(false);
  const [shake, setShake] = useState(true);
  const bannerRef = useRef<HTMLDivElement>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const hpRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const meterRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)];
  const meterTrack = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setShake(false);
    const query = () => setTouchUi(window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 960);
    query();
    window.addEventListener("resize", query);
    return () => window.removeEventListener("resize", query);
  }, []);

  useEffect(() => {
    if (!art) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sim = new MatchSim(you, rival);
    simRef.current = sim;
    const cam = camRef.current;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let prevPhase = sim.phase;
    let prevScore = "0-0";

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const codes: Record<keyof Pad, string[]> = {
      left: ["KeyA", "ArrowLeft"],
      right: ["KeyD", "ArrowRight"],
      jump: ["KeyW", "ArrowUp", "Space"],
      block: ["KeyS", "ArrowDown", "ShiftLeft", "ShiftRight"],
      light: ["KeyJ", "KeyZ"],
      heavy: ["KeyK", "KeyX"],
      special: ["KeyL", "KeyC"],
      burst: ["KeyE", "KeyV"],
    };
    const held = new Set<string>();
    const syncKeys = () => {
      const pad = keyRef.current;
      (Object.keys(codes) as (keyof Pad)[]).forEach((k) => {
        pad[k] = codes[k].some((c) => held.has(c));
      });
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (codes.left.concat(codes.right, codes.jump, codes.block, codes.light, codes.heavy, codes.special, codes.burst).includes(e.code)) {
        e.preventDefault();
      }
      held.add(e.code);
      syncKeys();
      unlockAudio();
    };
    const onUp = (e: KeyboardEvent) => {
      held.delete(e.code);
      syncKeys();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      const pad = combine(keyRef.current, touchRef.current);
      let guard = 0;
      while (acc >= 1 / 60 && guard++ < 4) {
        sim.step(1 / 60, pad);
        acc -= 1 / 60;
      }
      sim.trauma = Math.max(0, sim.trauma - dt * 1.7);
      const rect = wrap.getBoundingClientRect();
      const compact = rect.height < 760;
      updateCamera(cam, sim, rect.width, rect.height, dt);
      render(ctx, sim, art, cam, canvas.width, canvas.height, compact, shake);
      paintHud(sim);
      const sig = `${sim.score[0]}-${sim.score[1]}`;
      if (sim.phase !== prevPhase || sig !== prevScore) {
        prevPhase = sim.phase;
        prevScore = sig;
        setPhase(sim.phase);
        setScore([sim.score[0], sim.score[1]]);
        setVictor(sim.winner);
        if (sim.phase === "match" && !recorded.current) {
          recorded.current = true;
          recordRef.current(sim.winner === 0 ? "win" : "loss");
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const debug = window as unknown as {
      __rumbleDebug?: () => {
        phase: string;
        x: number;
        y: number;
        facing: number;
        action: string;
        dmg: number[];
        stocks: number[];
        jumps: number;
        items: number;
        viewW: number;
        lastFall: { who: number; dmg: number; x: number; y: number } | null;
      };
    };
    debug.__rumbleDebug = () => ({
      phase: sim.phase,
      x: sim.p[0].x,
      y: sim.p[0].y,
      facing: sim.p[0].facing,
      action: sim.p[0].action,
      dmg: [sim.p[0].dmg, sim.p[1].dmg],
      stocks: [sim.p[0].stocks, sim.p[1].stocks],
      jumps: sim.p[0].jumps,
      items: sim.items.length,
      viewW: cam.viewW,
      lastFall: sim.lastFall,
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      delete debug.__rumbleDebug;
    };
    // shake is read each frame via closure; restarting the loop on toggle is fine
  }, [art, you, rival, shake]);

  function paintHud(sim: MatchSim) {
    const secs = Math.ceil(sim.time);
    if (timeRef.current) timeRef.current.textContent = String(secs).padStart(2, "0");
    if (bannerRef.current) {
      bannerRef.current.textContent = sim.banner;
      bannerRef.current.style.opacity = sim.banner ? "1" : "0";
    }
    if (calloutRef.current) {
      calloutRef.current.textContent = sim.calloutT > 0 ? sim.callout : "";
    }
    sim.p.forEach((f, i) => {
      const meter = f.meter / 100;
      const pct = Math.round(f.dmg);
      if (hpRefs[i].current) {
        hpRefs[i].current.textContent = `${pct}%`;
        const off = f.respawn <= 0 && (f.x < STAGE.l || f.x > STAGE.r || f.y < -30);
        hpRefs[i].current.style.color = off || pct > 100 ? "#ff6a2a" : pct > 50 ? "#ffd56a" : "#e8f4ff";
      }
      if (meterRefs[i].current) meterRefs[i].current.style.transform = `scaleX(${meter})`;
      meterTrack[i].current?.classList.toggle("is-ready", f.meter >= 100 && f.burst <= 0);
    });
    const you = sim.p[0];
    evolveRef.current?.classList.toggle("is-ready", !!you && you.meter >= 100 && you.burst <= 0);
  }

  const youBeast = BEASTS.find((b) => b.id === you)!;
  const rivalBeast = BEASTS.find((b) => b.id === rival)!;
  const won = victor === 0;

  return (
    <div ref={wrapRef} className="fight-layer relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0">
        <div className="flex items-start justify-between gap-3 px-3 pt-3">
          <Bar name={youBeast.name} tag="YOU" tone="you" stocks={score[0]} pctRef={hpRefs[0]} meterRef={meterRefs[0]} trackRef={meterTrack[0]} />
          <span ref={timeRef} className="font-display pt-1 text-2xl tracking-widest text-fg">
            99
          </span>
          <Bar name={rivalBeast.name} tag="CPU" tone="rival" stocks={score[1]} pctRef={hpRefs[1]} meterRef={meterRefs[1]} trackRef={meterTrack[1]} />
        </div>
        <div ref={bannerRef} className="font-display absolute inset-x-0 top-[30%] text-center text-5xl tracking-[0.18em] text-fg sm:text-6xl" />
        <div ref={calloutRef} className="font-display absolute inset-x-0 top-[42%] text-center text-xl tracking-[0.22em] text-gold" />
      </div>

      <div className="absolute left-1/2 top-[5.4rem] z-10 flex -translate-x-1/2 gap-2">
        <button type="button" onClick={onMute} className="icon-btn" aria-label={muted ? "Unmute" : "Mute"}>
          {muted || isMuted() ? <VolumeX className="mx-auto size-4" /> : <Volume2 className="mx-auto size-4" />}
        </button>
        <button
          type="button"
          onClick={() => setShake((v) => !v)}
          className="icon-btn px-2"
          aria-pressed={shake}
          aria-label={shake ? "Turn screen shake off" : "Turn screen shake on"}
        >
          {shake ? "FX" : "FX off"}
        </button>
      </div>

      {!touchUi && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 text-center text-xs text-muted md:block">
          A D run · W jump (again in the air) · J light · K launch · L bolt · S shield / fast-fall · E digivolve
        </p>
      )}

      {touchUi && art && (
        <div className="touch-dock">
          <div className="move-col">
            <Stick onChange={setStick} />
            <Act label="Shield" sub="hold · drop" kind="shield" on={(d) => setButton("block", d)} />
          </div>
          <div className="action-pad" role="group" aria-label="Attacks">
            <Act label="Hit" sub="light" kind="light" on={(d) => setButton("light", d)} />
            <Act label="Launch" sub="heavy" kind="heavy" on={(d) => setButton("heavy", d)} />
            <Act label="Bolt" kind="bolt" on={(d) => setButton("special", d)} />
            <Act label="Jump" kind="jump" on={(d) => setButton("jump", d)} />
            <Act label="Evolve" kind="evolve" buttonRef={evolveRef} on={(d) => setButton("burst", d)} />
          </div>
        </div>
      )}

      {phase === "match" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 px-4">
          <div className="w-full max-w-sm border border-border bg-surface p-6 text-center">
            <p className="font-display text-sm tracking-[0.28em] text-primary">{won ? "RING CLEARED" : "RING LOST"}</p>
            <h2 className="font-display mt-2 text-4xl">{won ? "You win" : "Rival wins"}</h2>
            <p className="mt-2 text-sm text-muted">Stocks {score[0]} – {score[1]}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                className="font-display min-h-12 bg-primary font-semibold text-bg"
                onClick={() => {
                  recorded.current = false;
                  simRef.current?.rematch();
                  setPhase("intro");
                  setScore([3, 3]);
                  setVictor(null);
                  sfx.ui();
                }}
              >
                Rematch
              </button>
              <button type="button" className="min-h-12 border border-border text-fg" onClick={onExit}>
                Switch beasts
              </button>
            </div>
          </div>
        </div>
      )}

      {!art && <p className="absolute inset-0 flex items-center justify-center text-muted">Waking the ring…</p>}
    </div>
  );

  function publishTouch() {
    const s = stickRef.current;
    const b = buttonRef.current;
    const t = touchRef.current;
    t.left = s.left && !s.right;
    t.right = s.right && !s.left;
    t.jump = s.jump || b.jump;
    t.block = s.block || b.block;
    t.light = b.light;
    t.heavy = b.heavy;
    t.special = b.special;
    t.burst = b.burst;
  }

  function setStick(v: { left: boolean; right: boolean; jump: boolean; block: boolean }) {
    stickRef.current = v;
    publishTouch();
    if (v.left || v.right || v.jump || v.block) unlockAudio();
  }

  function setButton(key: keyof Pad, down: boolean) {
    buttonRef.current[key] = down;
    publishTouch();
    if (down) unlockAudio();
  }
}

function combine(a: Pad, b: Pad): Pad {
  return {
    left: a.left || b.left,
    right: a.right || b.right,
    jump: a.jump || b.jump,
    block: a.block || b.block,
    light: a.light || b.light,
    heavy: a.heavy || b.heavy,
    special: a.special || b.special,
    burst: a.burst || b.burst,
  };
}

function Bar({
  name,
  tag,
  tone,
  stocks,
  pctRef,
  meterRef,
  trackRef,
}: {
  name: string;
  tag: string;
  tone: "you" | "rival";
  stocks: number;
  pctRef: React.RefObject<HTMLSpanElement | null>;
  meterRef: React.RefObject<HTMLSpanElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
}) {
  const rival = tone === "rival";
  return (
    <div className={`w-[38%] ${rival ? "text-right" : "text-left"}`}>
      <div className={`mb-1 flex items-center gap-2 ${rival ? "flex-row-reverse" : ""}`}>
        <span className={`font-display text-xs tracking-[0.18em] ${rival ? "text-accent" : "text-primary"}`}>{tag}</span>
        <span className="font-display truncate text-sm sm:text-base">{name}</span>
        <span className={`flex gap-1 ${rival ? "mr-auto" : "ml-auto"}`}>
          {[0, 1, 2].map((i) => (
            <i key={i} className={`inline-block size-2.5 rounded-full ${stocks > i ? (rival ? "bg-accent" : "bg-primary") : "bg-border"}`} />
          ))}
        </span>
      </div>
      <span ref={pctRef} className="font-display text-3xl leading-none">
        0%
      </span>
      <div ref={trackRef} className={`meter mt-1 ${rival ? "rival" : ""}`}>
        <span ref={meterRef} />
      </div>
    </div>
  );
}

function Act({
  label,
  sub,
  kind,
  on,
  buttonRef,
}: {
  label: string;
  sub?: string;
  kind: string;
  on: (down: boolean) => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const [down, setDown] = useState(false);
  const release = () => {
    setDown(false);
    on(false);
  };
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`act act-${kind} ${down ? "is-down" : ""}`}
      aria-label={sub ? `${label}, ${sub}` : label}
      aria-pressed={down}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDown(true);
        on(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span>{label}</span>
      {sub ? <span className="act-sub">{sub}</span> : null}
    </button>
  );
}

function Stick({ onChange }: { onChange: (v: { left: boolean; right: boolean; jump: boolean; block: boolean }) => void }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [hot, setHot] = useState(false);
  const idle = { left: false, right: false, jump: false, block: false };

  const read = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return idle;
    const r = el.getBoundingClientRect();
    const max = r.width * 0.34;
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const mag = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(max, mag);
    dx = (dx / mag) * clamped;
    dy = (dy / mag) * clamped;
    setKnob({ x: dx, y: dy });
    const nx = dx / max;
    const ny = dy / max;
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    return {
      left: nx < -0.28 && ax >= ay * 0.62,
      right: nx > 0.28 && ax >= ay * 0.62,
      jump: ny < -0.56 && ay > ax * 0.75,
      block: ny > 0.5 && ay > ax,
    };
  };

  const end = () => {
    setKnob({ x: 0, y: 0 });
    setHot(false);
    onChange(idle);
  };

  return (
    <div
      ref={baseRef}
      className={`stick ${hot ? "is-hot" : ""}`}
      role="group"
      aria-label="Move. Slide to run, up to jump, down to shield."
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setHot(true);
        onChange(read(e.clientX, e.clientY));
      }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        onChange(read(e.clientX, e.clientY));
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="stick-cross" />
      <div className="stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}>
        MOVE
      </div>
    </div>
  );
}
