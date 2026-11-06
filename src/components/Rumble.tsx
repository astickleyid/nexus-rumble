import { useEffect, useRef, useState } from "react";
import { Droplets, Flame, Leaf, Volume2, VolumeX, Zap } from "lucide-react";
import { loadArt, type Art } from "@/game/art";
import { isMuted, setMuted, sfx, unlockAudio } from "@/game/audio";
import { advance, drawCircuit, foeOf, mapOf, type Circuit } from "@/game/circuit";
import { createCamera, render, updateCamera, type Camera } from "@/game/draw";
import { BEAST_MAP, BEASTS, matchupLine, type BeastId } from "@/game/roster";
import { EMPTY_PAD, MatchSim, type Pad } from "@/game/sim";
import { STAGE_MAP, type StageId } from "@/game/stages";

type Save = { wins: number; losses: number; titles: number; by: Partial<Record<BeastId, number>> };
type Screen = "title" | "roster" | "bracket" | "fight";

const SAVE_KEY = "nexus-rumble-v1";
const ICONS = { spark: Zap, blaze: Flame, tide: Droplets, thorn: Leaf };

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { wins: 0, losses: 0, titles: 0, by: {} };
    const parsed = JSON.parse(raw) as Save;
    return { wins: parsed.wins || 0, losses: parsed.losses || 0, titles: parsed.titles || 0, by: parsed.by || {} };
  } catch {
    return { wins: 0, losses: 0, titles: 0, by: {} };
  }
}

function writeSave(result: "win" | "loss", id: BeastId, title = false) {
  const save = loadSave();
  if (result === "win") {
    save.wins += 1;
    save.by[id] = (save.by[id] || 0) + 1;
    if (title) save.titles += 1;
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
  const [art, setArt] = useState<Art | null>(null);
  const [save, setSave] = useState<Save>({ wins: 0, losses: 0, titles: 0, by: {} });
  const [muted, setMute] = useState(false);
  const [bout, setBout] = useState(0);
  const [circuit, setCircuit] = useState<Circuit | null>(null);

  useEffect(() => {
    void loadArt().then(setArt).catch(() => setArt(null));
    setSave(loadSave());
  }, []);

  function enter() {
    unlockAudio();
    sfx.ui();
    setScreen("roster");
  }

  const foe = circuit ? foeOf(circuit) : "thornox";

  return (
    <div className="game-root text-fg">
      {screen !== "fight" ? (
        <div className="menu-scroll">
          {screen === "title" ? (
            <Title save={save} onEnter={enter} />
          ) : screen === "roster" ? (
            <Roster
              you={you}
              ready={art !== null}
              onYou={(id) => {
                unlockAudio();
                sfx.ui();
                setYou(id);
              }}
              onBack={() => setScreen("title")}
              onDraw={() => {
                unlockAudio();
                sfx.ui();
                setCircuit(drawCircuit(you));
                setScreen("bracket");
              }}
            />
          ) : circuit ? (
            <Bracket
              circuit={circuit}
              onBack={() => setScreen("roster")}
              onFight={() => {
                unlockAudio();
                sfx.fight();
                setBout((n) => n + 1);
                setScreen("fight");
              }}
              onNew={() => {
                unlockAudio();
                sfx.ui();
                setCircuit(drawCircuit(you));
              }}
            />
          ) : null}
        </div>
      ) : (
        <Fight
          key={bout}
          you={you}
          rival={foe}
          stageId={circuit ? mapOf(circuit) : "spire"}
          art={art}
          muted={muted}
          stakes={circuit?.round === "final" ? "final" : "semi"}
          onMute={() => {
            const next = !muted;
            setMute(next);
            setMuted(next);
          }}
          onRecord={(result) => setSave(writeSave(result, you, result === "win" && circuit?.round === "final"))}
          onDone={(won) => {
            setCircuit((c) => (c ? advance(c, won) : c));
            setScreen("bracket");
          }}
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
      <p className="max-w-md text-base text-muted">Eight beasts. Four rings. Win the semi, then the final.</p>
      <div className="grid w-full grid-cols-4 gap-2">
        {BEASTS.map((b) => (
          <img key={b.id} src={`/sprites/${b.id}/frame-1.png`} alt={b.name} className="h-24 w-full object-contain sm:h-36" />
        ))}
      </div>
      <button type="button" onClick={onEnter} className="font-display min-h-12 bg-primary px-8 text-lg font-semibold tracking-wide text-bg">
        Enter the circuit
      </button>
      <p className="text-sm text-muted">
        {played > 0 ? `${save.titles} titles · ${save.wins} wins · ${save.losses} losses` : "Pick one beast. Three others draw into your bracket."}
      </p>
    </div>
  );
}

function Roster({
  you,
  ready,
  onYou,
  onBack,
  onDraw,
}: {
  you: BeastId;
  ready: boolean;
  onYou: (id: BeastId) => void;
  onBack: () => void;
  onDraw: () => void;
}) {
  const beast = BEAST_MAP[you];
  const moves = [beast.light, beast.heavy, { name: beast.shot.name, tag: beast.shot.tag, note: beast.shot.note }];
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm text-muted">
          Back
        </button>
        <h2 className="font-display text-xl tracking-wide">Your beast</h2>
        <span className="w-12" />
      </div>
      <Picker label="You" selected={you} tone="you" onPick={onYou} />
      <ul className="grid gap-2">
        {moves.map((m) => (
          <li key={m.name} className="flex items-baseline justify-between gap-3 border border-border px-3 py-2">
            <span className="font-display text-sm tracking-wide text-primary">{m.tag}</span>
            <span className="font-display flex-1 text-sm">{m.name}</span>
            <span className="text-right text-xs text-muted">{m.note}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!ready}
        onClick={onDraw}
        className="font-display min-h-12 bg-accent text-lg font-semibold tracking-wide text-bg disabled:opacity-50"
      >
        {ready ? "Draw the bracket" : "Loading beasts…"}
      </button>
    </div>
  );
}

function Bracket({
  circuit,
  onBack,
  onFight,
  onNew,
}: {
  circuit: Circuit;
  onBack: () => void;
  onFight: () => void;
  onNew: () => void;
}) {
  const live = circuit.round === "semi" || circuit.round === "final";
  const foe = foeOf(circuit);
  const youWonSemi = circuit.round === "final" || circuit.round === "champion" || circuit.fell === "final";
  const youLost = circuit.round === "out";
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm text-muted">
          Roster
        </button>
        <h2 className="font-display text-xl tracking-wide">Circuit</h2>
        <span className="w-12" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="border border-border p-3">
          <p className="font-display mb-2 text-xs tracking-[0.2em] text-primary">YOUR SEMI</p>
          <Slot id={circuit.you} mark={circuit.fell === "semi" ? "out" : youWonSemi ? "win" : "live"} />
          <Slot id={circuit.semiRival} mark={circuit.fell === "semi" ? "win" : youWonSemi ? "out" : "live"} />
        </section>
        <section className="border border-border p-3">
          <p className="font-display mb-2 text-xs tracking-[0.2em] text-muted">OTHER SEMI</p>
          <Slot id={circuit.other[0]} mark={circuit.otherWinner === circuit.other[0] ? "win" : "out"} />
          <Slot id={circuit.other[1]} mark={circuit.otherWinner === circuit.other[1] ? "win" : "out"} />
          <p className="mt-2 text-xs text-muted">{circuit.otherLine}</p>
        </section>
      </div>
      <section className="border border-gold p-3">
        <p className="font-display mb-2 text-xs tracking-[0.2em] text-gold">FINAL</p>
        {circuit.round === "semi" ? (
          <p className="text-sm text-muted">Winner of your semi meets {BEAST_MAP[circuit.otherWinner].name}.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Slot id={circuit.you} mark={circuit.round === "champion" ? "win" : circuit.round === "out" && youWonSemi ? "out" : "live"} />
            <Slot id={circuit.otherWinner} mark={circuit.round === "champion" ? "out" : circuit.round === "out" && youWonSemi ? "win" : "live"} />
          </div>
        )}
      </section>
      {circuit.round === "champion" ? (
        <>
          <h3 className="font-display text-center text-3xl text-gold">Champion</h3>
          <p className="text-center text-sm text-muted">{BEAST_MAP[circuit.you].name} clears the circuit.</p>
        </>
      ) : null}
      {youLost ? <p className="text-center text-sm text-accent">Eliminated.</p> : null}
      {live ? (
        <button type="button" onClick={onFight} className="font-display min-h-12 bg-accent text-lg font-semibold text-bg">
          {circuit.round === "final" ? `Final vs ${BEAST_MAP[foe].name}` : `Semi vs ${BEAST_MAP[foe].name}`}
        </button>
      ) : (
        <button type="button" onClick={onNew} className="font-display min-h-12 bg-primary text-lg font-semibold text-bg">
          New circuit
        </button>
      )}
      {live ? <p className="text-center text-xs text-muted">{matchupLine(circuit.you, foe)}</p> : null}
      <p className="text-center text-sm text-muted">
        {STAGE_MAP[circuit.round === "final" || circuit.round === "champion" || circuit.fell === "final" ? circuit.maps.final : circuit.maps.semi].name}
        {" · "}
        {STAGE_MAP[circuit.round === "final" || circuit.round === "champion" || circuit.fell === "final" ? circuit.maps.final : circuit.maps.semi].blurb}
      </p>
    </div>
  );
}

function Slot({ id, mark }: { id: BeastId; mark: "live" | "win" | "out" }) {
  const b = BEAST_MAP[id];
  const border = mark === "win" ? "border-gold" : mark === "live" ? "border-primary" : "border-border";
  return (
    <div className={`mb-2 flex items-center gap-2 border px-2 py-1.5 ${border} ${mark === "out" ? "opacity-45" : ""}`}>
      <img src={`/sprites/${id}/frame-1.png`} alt="" className="h-10 w-10 object-contain" />
      <span className="font-display text-sm">{b.name}</span>
      <span className="ml-auto text-xs tracking-wide text-muted">{mark === "win" ? "W" : mark === "out" ? "out" : "next"}</span>
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
      <div className="grid grid-cols-4 gap-2">
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
              <img src={`/sprites/${b.id}/frame-1.png`} alt="" className={`h-16 object-contain sm:h-24 ${flip ? "face-left" : ""} ${on ? "scale-110" : ""}`} />
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
  stageId,
  art,
  muted,
  stakes,
  onMute,
  onRecord,
  onDone,
}: {
  you: BeastId;
  rival: BeastId;
  stageId: StageId;
  art: Art | null;
  muted: boolean;
  stakes: "semi" | "final";
  onMute: () => void;
  onRecord: (result: "win" | "loss") => void;
  onDone: (won: boolean) => void;
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
    const sim = new MatchSim(you, rival, stageId);
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
  }, [art, you, rival, stageId, shake]);

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
        const span = { l: Math.min(...sim.stage.solids.map((s) => s.l)), r: Math.max(...sim.stage.solids.map((s) => s.r)) };
        const off = f.respawn <= 0 && (f.x < span.l || f.x > span.r || f.y < -30);
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
          <div className="flex flex-col items-center pt-1">
            <span className="font-display text-[10px] tracking-[0.22em] text-gold">{stakes === "final" ? "FINAL" : "SEMI"}</span>
            <span className="text-[10px] tracking-wide text-muted">{STAGE_MAP[stageId].name}</span>
            <span ref={timeRef} className="font-display text-2xl tracking-widest text-fg">
              99
            </span>
          </div>
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
          {youBeast.light.tag} J · {youBeast.heavy.tag} K · {youBeast.shot.tag} L · W jump · S shield · E digivolve
        </p>
      )}

      {touchUi && art && (
        <div className="touch-dock">
          <div className="move-col">
            <Stick onChange={setStick} />
            <Act label="Shield" sub="hold · drop" kind="shield" on={(d) => setButton("block", d)} />
          </div>
          <div className="action-pad" role="group" aria-label="Attacks">
            <Act label={youBeast.light.tag} kind="light" on={(d) => setButton("light", d)} />
            <Act label={youBeast.heavy.tag} kind="heavy" on={(d) => setButton("heavy", d)} />
            <Act label={youBeast.shot.tag} kind="bolt" on={(d) => setButton("special", d)} />
            <Act label="Jump" kind="jump" on={(d) => setButton("jump", d)} />
            <Act label="Evolve" kind="evolve" buttonRef={evolveRef} on={(d) => setButton("burst", d)} />
          </div>
        </div>
      )}

      {phase === "match" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 px-4">
          <div className="w-full max-w-sm border border-border bg-surface p-6 text-center">
            <p className="font-display text-sm tracking-[0.28em] text-primary">
              {won ? (stakes === "final" ? "CIRCUIT CLEARED" : "SEMI CLEARED") : "ELIMINATED"}
            </p>
            <h2 className="font-display mt-2 text-4xl">{won ? (stakes === "final" ? "Champion" : "You advance") : "Out of the circuit"}</h2>
            <p className="mt-2 text-sm text-muted">Stocks {score[0]} – {score[1]}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className="font-display min-h-12 bg-primary font-semibold text-bg" onClick={() => onDone(won)}>
                Bracket
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
