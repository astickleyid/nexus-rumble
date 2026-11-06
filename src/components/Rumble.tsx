import { useEffect, useRef, useState, type RefObject } from "react";
import { Droplets, Flame, Leaf, Volume2, VolumeX, Zap } from "lucide-react";
import { loadArt, type Art } from "@/game/art";
import { isMuted, setMuted, sfx, unlockAudio } from "@/game/audio";
import {
  applyBuild,
  buildOf,
  claimFighter,
  clearCareer,
  enterCircuit,
  loadCareer,
  nextUnlock,
  progress,
  recordMatch,
  skillsFor,
  spend,
  unspent,
  xpFor,
  type Build,
  type Career,
} from "@/game/career";
import { advance, drawCircuit, foeOf, mapOf, type Circuit } from "@/game/circuit";
import { createCamera, render, updateCamera, type Camera } from "@/game/draw";
import { P2PRoom } from "@/lib/multiplayer";
import { BEAST_MAP, BEASTS, matchupLine, type BeastId } from "@/game/roster";
import { EMPTY_PAD, MatchSim, type Pad } from "@/game/sim";
import { STAGE_MAP, STAGES, type StageId } from "@/game/stages";

type Screen = "hatch" | "den" | "bracket" | "online" | "fight";
type Stakes = "spar" | "semi" | "final" | "online";
type Hello = {
  t: "hello";
  host: boolean;
  name: string;
  beast: BeastId;
  build: Build & { level: number };
  stageId: StageId;
};
type NetMatch = {
  room: P2PRoom;
  role: "host" | "guest";
  rivalBeast: BeastId;
  rivalBuild: Build & { level: number };
  rivalName: string;
  stageId: StageId;
};

const ICONS = { spark: Zap, blaze: Flame, tide: Droplets, thorn: Leaf };
const PAD_KEYS = ["left", "right", "jump", "block", "light", "heavy", "special", "burst"] as const;

function packPad(pad: Pad) {
  let n = 0;
  PAD_KEYS.forEach((k, i) => {
    if (pad[k]) n |= 1 << i;
  });
  return n;
}

function unpackPad(n: number): Pad {
  const pad = blankPad();
  PAD_KEYS.forEach((k, i) => {
    pad[k] = (n & (1 << i)) !== 0;
  });
  return pad;
}

function blankPad(): Pad {
  return { ...EMPTY_PAD };
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export function Rumble() {
  const [screen, setScreen] = useState<Screen>("hatch");
  const [career, setCareer] = useState<Career | null>(null);
  const [art, setArt] = useState<Art | null>(null);
  const [muted, setMute] = useState(false);
  const [bout, setBout] = useState(0);
  const [circuit, setCircuit] = useState<Circuit | null>(null);
  const [stakes, setStakes] = useState<Stakes>("spar");
  const [rival, setRival] = useState<BeastId>("thornox");
  const [stageId, setStageId] = useState<StageId>("spire");
  const [net, setNet] = useState<NetMatch | null>(null);
  const netHandler = useRef<(from: string, data: unknown) => void>(() => {});

  useEffect(() => {
    void loadArt().then(setArt).catch(() => setArt(null));
    const saved = loadCareer();
    setCareer(saved);
    setScreen(saved ? "den" : "hatch");
  }, []);

  const you = career?.beast ?? "voltusk";
  const foe = net ? net.rivalBeast : circuit && (stakes === "semi" || stakes === "final") ? foeOf(circuit) : rival;
  const ring = net ? net.stageId : circuit && (stakes === "semi" || stakes === "final") ? mapOf(circuit) : stageId;

  function startFight(next: Stakes, foeId: BeastId, ringId: StageId) {
    unlockAudio();
    sfx.fight();
    setStakes(next);
    setRival(foeId);
    setStageId(ringId);
    setBout((n) => n + 1);
    setScreen("fight");
  }

  return (
    <div className="game-root text-fg">
      {screen !== "fight" ? (
        <div className="menu-scroll">
          {screen === "hatch" || !career ? (
            <Hatch
              onClaim={(name, beast) => {
                setCareer(claimFighter(name, beast));
                setScreen("den");
              }}
            />
          ) : screen === "online" ? (
            <Online
              career={career}
              handlerRef={netHandler}
              onBack={() => setScreen("den")}
              onMatch={(match) => {
                setNet(match);
                startFight("online", match.rivalBeast, match.stageId);
              }}
            />
          ) : screen === "bracket" && circuit ? (
            <Bracket
              circuit={circuit}
              onBack={() => setScreen("den")}
              onFight={() => startFight(circuit.round === "final" ? "final" : "semi", foeOf(circuit), mapOf(circuit))}
              onNew={() => {
                unlockAudio();
                sfx.ui();
                setCareer(enterCircuit(career));
                setCircuit(drawCircuit(you));
              }}
            />
          ) : (
            <Den
              career={career}
              ready={art !== null}
              onSpend={(stat) => {
                const next = spend(career, stat);
                if (next) setCareer(next);
              }}
              onTrain={() => {
                const pool = BEASTS.map((b) => b.id).filter((id) => id !== you);
                const foeId = pool[Math.floor(Math.random() * pool.length)] ?? "thornox";
                const ringId = STAGES[Math.floor(Math.random() * STAGES.length)]?.id ?? "spire";
                setNet(null);
                startFight("spar", foeId, ringId);
              }}
              onCircuit={() => {
                unlockAudio();
                sfx.ui();
                setNet(null);
                setCareer(enterCircuit(career));
                setCircuit(drawCircuit(you));
                setScreen("bracket");
              }}
              onOnline={() => {
                unlockAudio();
                sfx.ui();
                setScreen("online");
              }}
              onRelease={() => {
                clearCareer();
                setCareer(null);
                setCircuit(null);
                setScreen("hatch");
              }}
            />
          )}
        </div>
      ) : career ? (
        <Fight
          key={bout}
          you={you}
          youName={career.name}
          rival={foe}
          rivalName={net?.rivalName ?? "CPU"}
          stageId={ring}
          art={art}
          muted={muted}
          stakes={stakes}
          youSlot={net?.role === "guest" ? 1 : 0}
          build={career}
          rivalBuild={net?.rivalBuild}
          skills={skillsFor(progress(career.xp).level)}
          link={net}
          netHandler={netHandler}
          onMute={() => {
            const next = !muted;
            setMute(next);
            setMuted(next);
          }}
          onRecord={(result) => {
            const kind = stakes === "online" ? "online" : stakes === "spar" ? "spar" : stakes === "final" && result === "win" ? "title" : "circuit";
            setCareer(recordMatch(career, kind, result === "win"));
          }}
          onDone={(won) => {
            if (stakes === "semi" || stakes === "final") {
              setCircuit((c) => (c ? advance(c, won) : c));
              setScreen("bracket");
            } else {
              net?.room.close();
              setNet(null);
              setScreen("den");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function Hatch({ onClaim }: { onClaim: (name: string, beast: BeastId) => void }) {
  const [name, setName] = useState("");
  const [beast, setBeast] = useState<BeastId>("voltusk");
  const picked = BEAST_MAP[beast];
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-6">
      <p className="font-display text-center text-sm tracking-[0.35em] text-primary">YOUR FIGHTER</p>
      <h1 className="font-display text-center text-4xl leading-none font-bold sm:text-6xl">
        NEXUS
        <span className="block text-accent">RUMBLE</span>
      </h1>
      <p className="text-center text-sm text-muted">Pick the beast you keep. Levels unlock the rest of the kit. The record stays.</p>
      <label className="flex flex-col gap-1 text-sm">
        Your name
        <input
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rookie"
          className="min-h-12 border border-border bg-surface px-3 text-base text-fg"
        />
      </label>
      <Picker label="Beast" selected={beast} tone="you" onPick={setBeast} />
      <ul className="grid gap-2">
        {[picked.light, picked.heavy, { tag: picked.shot.tag, name: picked.shot.name, note: picked.shot.note }].map((m) => (
          <li key={m.name} className="flex items-baseline justify-between gap-3 border border-border px-3 py-2">
            <span className="font-display text-sm text-primary">{m.tag}</span>
            <span className="font-display flex-1 text-sm">{m.name}</span>
            <span className="text-right text-xs text-muted">{m.note}</span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onClaim(name, beast)} className="font-display min-h-12 bg-primary text-lg font-semibold text-bg">
        This is my fighter
      </button>
    </div>
  );
}

function Den({
  career,
  ready,
  onSpend,
  onTrain,
  onCircuit,
  onOnline,
  onRelease,
}: {
  career: Career;
  ready: boolean;
  onSpend: (stat: "power" | "speed" | "bulk") => void;
  onTrain: () => void;
  onCircuit: () => void;
  onOnline: () => void;
  onRelease: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const beast = BEAST_MAP[career.beast];
  const prog = progress(career.xp);
  const skills = skillsFor(prog.level);
  const points = unspent(career);
  const hint = nextUnlock(prog.level);
  const stats = [
    ["power", "Power", career.power],
    ["speed", "Speed", career.speed],
    ["bulk", "Bulk", career.bulk],
  ] as const;
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-5">
      <div className="flex items-center gap-3">
        <img src={`/sprites/${beast.id}/frame-1.png`} alt="" className="h-24 w-24 object-contain" />
        <div>
          <p className="font-display text-xs tracking-[0.2em] text-primary">{career.name}</p>
          <h2 className="font-display text-3xl">{beast.name}</h2>
          <p className="text-sm text-muted">
            Level {prog.level} · {beast.elementLabel}
          </p>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>XP</span>
          <span>
            {prog.into}/{prog.need}
          </span>
        </div>
        <div className="h-2 bg-border">
          <div className="h-full bg-primary" style={{ width: `${Math.min(100, (prog.into / prog.need) * 100)}%` }} />
        </div>
      </div>
      <p className="text-sm text-muted">
        {career.wins}-{career.losses} all-time · {career.titles} titles in {career.entered} circuits · streak {career.streak} (best {career.bestStreak})
      </p>
      <p className="text-sm text-muted">
        Online {career.onlineWins}-{career.onlineLosses}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(([key, label, value]) => (
          <button key={key} type="button" onClick={() => onSpend(key)} className="min-h-16 border border-border px-2 py-2 text-left">
            <span className="font-display block text-sm">{label}</span>
            <span className="text-xs text-muted">
              {value}/5{points > 0 && value < 5 ? " · spend" : ""}
            </span>
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{points > 0 ? `${points} point${points === 1 ? "" : "s"} to spend.` : "Win fights to earn a point."}</p>
      <p className="text-sm">
        Light is in.{skills.heavy ? " Heavy is in." : " Heavy is locked."}
        {skills.special ? " Special is in." : " Special is locked."}
        {skills.burst ? " Digivolve is in." : " Digivolve is locked."}
      </p>
      {hint ? <p className="text-sm text-gold">{hint}</p> : null}
      <button type="button" disabled={!ready} onClick={onTrain} className="font-display min-h-12 bg-primary font-semibold text-bg disabled:opacity-50">
        {ready ? "Train" : "Loading beasts…"}
      </button>
      <button type="button" disabled={!ready} onClick={onCircuit} className="font-display min-h-12 bg-accent font-semibold text-bg disabled:opacity-50">
        CPU circuit
      </button>
      <button type="button" onClick={onOnline} className="font-display min-h-12 border border-gold font-semibold text-gold">
        Online tournament
      </button>
      <button type="button" onClick={() => (armed ? onRelease() : setArmed(true))} className="min-h-11 text-sm text-muted">
        {armed ? "Release this fighter for good" : "Release fighter"}
      </button>
    </div>
  );
}

function Online({
  career,
  handlerRef,
  onBack,
  onMatch,
}: {
  career: Career;
  handlerRef: RefObject<(from: string, data: unknown) => void>;
  onBack: () => void;
  onMatch: (match: NetMatch) => void;
}) {
  const [code, setCode] = useState("");
  const [hosting, setHosting] = useState<string | null>(null);
  const [status, setStatus] = useState("Share a code, or join one.");
  const roomRef = useRef<P2PRoom | null>(null);
  const started = useRef(false);

  useEffect(() => {
    return () => {
      if (!started.current) roomRef.current?.close();
    };
  }, []);

  function helloFrom(role: "host" | "guest", stage: StageId): Hello {
    return { t: "hello", host: role === "host", name: career.name, beast: career.beast, build: buildOf(career), stageId: stage };
  }

  function open(role: "host" | "guest", roomId: string) {
    roomRef.current?.close();
    started.current = false;
    const selfId = crypto.randomUUID();
    const stage = STAGES[Math.floor(Math.random() * STAGES.length)]?.id ?? "spire";
    const mine = helloFrom(role, stage);
    setStatus(role === "host" ? "Waiting for a rival." : "Joining.");
    const room = new P2PRoom({
      room: roomId,
      selfId,
      name: career.name,
      onPeersChanged: (peers) => {
        const live = peers.find((p) => p.connectionState === "connected");
        if (live) room.send(mine, live.id);
      },
      onMessage: (from, data) => {
        handlerRef.current(from, data);
        const msg = data as Partial<Hello>;
        if (msg?.t !== "hello" || started.current) return;
        if (role === "host" && msg.host) return;
        if (role === "guest" && !msg.host) return;
        if (!msg.beast || !BEAST_MAP[msg.beast] || !msg.build) return;
        started.current = true;
        onMatch({
          room,
          role,
          rivalBeast: msg.beast,
          rivalBuild: msg.build,
          rivalName: (msg.name || "Rival").slice(0, 16),
          stageId: role === "host" ? stage : msg.stageId && STAGE_MAP[msg.stageId] ? msg.stageId : stage,
        });
      },
    });
    roomRef.current = room;
    void room.join().catch(() => setStatus("Could not reach the ring. Try again."));
  }

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="min-h-11 px-2 text-sm text-muted">
          Den
        </button>
        <h2 className="font-display text-xl">Tournament</h2>
        <span className="w-12" />
      </div>
      <p className="text-sm text-muted">Host a code. A real person joins from their own screen. The winner and loser both keep the result.</p>
      {hosting ? <p className="font-display text-center text-5xl tracking-[0.3em]">{hosting}</p> : null}
      <p className="text-center text-sm text-muted">{status}</p>
      <button
        type="button"
        className="font-display min-h-12 bg-primary font-semibold text-bg"
        onClick={() => {
          const next = roomCode();
          setHosting(next);
          setCode(next);
          open("host", next);
        }}
      >
        Host a ring
      </button>
      <label className="flex flex-col gap-1 text-sm">
        Join code
        <input
          value={hosting ? "" : code}
          maxLength={4}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD"
          className="min-h-12 border border-border bg-surface px-3 text-center font-display text-2xl tracking-[0.3em] text-fg"
        />
      </label>
      <button
        type="button"
        disabled={code.trim().length < 4}
        className="font-display min-h-12 border border-border font-semibold disabled:opacity-40"
        onClick={() => {
          setHosting(null);
          open("guest", code.trim().toUpperCase());
        }}
      >
        Join
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
          Den
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

function gateSkills(pad: Pad, skills: { heavy: boolean; special: boolean; burst: boolean }): Pad {
  return {
    ...pad,
    heavy: pad.heavy && skills.heavy,
    special: pad.special && skills.special,
    burst: pad.burst && skills.burst,
  };
}

function gatePad(pad: Pad, level: number): Pad {
  const lv = Number.isFinite(level) ? Math.max(1, Math.min(20, Math.round(level))) : 1;
  return gateSkills(pad, skillsFor(lv));
}

function resultCopy(stakes: Stakes, won: boolean): [string, string] {
  if (stakes === "online") return won ? ["MATCH WON", "Rival down"] : ["MATCH LOST", "They take it"];
  if (stakes === "spar") return won ? ["SPARRING WIN", "XP banked"] : ["SPARRING LOSS", "Still training"];
  if (stakes === "final") return won ? ["CIRCUIT CLEARED", "Champion"] : ["ELIMINATED", "Out of the circuit"];
  return won ? ["SEMI CLEARED", "You advance"] : ["ELIMINATED", "Out of the circuit"];
}

function Fight({
  you,
  youName,
  rival,
  rivalName,
  stageId,
  art,
  muted,
  stakes,
  youSlot,
  build,
  rivalBuild,
  skills,
  link,
  netHandler,
  onMute,
  onRecord,
  onDone,
}: {
  you: BeastId;
  youName: string;
  rival: BeastId;
  rivalName: string;
  stageId: StageId;
  art: Art | null;
  muted: boolean;
  stakes: Stakes;
  youSlot: 0 | 1;
  build: Pick<Career, "power" | "speed" | "bulk">;
  rivalBuild?: (Build & { level: number }) | null;
  skills: ReturnType<typeof skillsFor>;
  link: NetMatch | null;
  netHandler: RefObject<(from: string, data: unknown) => void>;
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
  const skillsRef = useRef(skills);
  const buildRef = useRef(build);
  const rivalBuildRef = useRef(rivalBuild);
  const linkRef = useRef(link);
  const youSlotRef = useRef(youSlot);
  const remotePadRef = useRef(blankPad());
  skillsRef.current = skills;
  buildRef.current = build;
  rivalBuildRef.current = rivalBuild;
  linkRef.current = link;
  youSlotRef.current = youSlot;
  const [phase, setPhase] = useState<MatchSim["phase"]>("intro");
  const [score, setScore] = useState<[number, number]>([3, 3]);
  const [victor, setVictor] = useState<0 | 1 | null>(null);
  const [touchUi, setTouchUi] = useState(false);
  const [shake, setShake] = useState(true);
  const [linkLost, setLinkLost] = useState(false);
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
    const sim = new MatchSim(you, rival, stageId, { online: !!linkRef.current });
    sim.p[0].beast = applyBuild(you, buildRef.current);
    const rivalStats = rivalBuildRef.current;
    if (rivalStats) sim.p[1].beast = applyBuild(rival, rivalStats);
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

    let heard = performance.now();
    let dropped = false;
    netHandler.current = (_from, data) => {
      const msg = data as { t?: string; p?: number; s?: ReturnType<MatchSim["snapshot"]> };
      if (!msg || typeof msg !== "object") return;
      if (msg.t === "pad" && typeof msg.p === "number") {
        remotePadRef.current = unpackPad(msg.p);
        heard = performance.now();
      } else if (msg.t === "snap" && msg.s && Array.isArray(msg.s.p)) {
        sim.adopt(msg.s);
        heard = performance.now();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      const local = gateSkills(combine(keyRef.current, touchRef.current), skillsRef.current);
      const live = linkRef.current;
      let guard = 0;
      if (live?.role === "guest") {
        live.room.broadcast({ t: "pad", p: packPad(local) });
        for (const f of sim.p) f.anim += dt;
      } else {
        const remote = live?.role === "host" ? gatePad(remotePadRef.current, live.rivalBuild.level) : undefined;
        while (acc >= 1 / 60 && guard++ < 4) {
          sim.step(1 / 60, local, remote);
          acc -= 1 / 60;
        }
        sim.trauma = Math.max(0, sim.trauma - dt * 1.7);
        if (live?.role === "host") live.room.broadcast({ t: "snap", s: sim.snapshot() });
      }
      if (live && !dropped) {
        const connected = live.room.peerList().some((p) => p.connectionState === "connected");
        const quiet = now - heard > 8000;
        if ((live.role === "guest" && quiet) || (live.role === "host" && !connected && quiet)) {
          dropped = true;
          setLinkLost(true);
        }
      }
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
          recordRef.current(sim.winner === youSlotRef.current ? "win" : "loss");
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
      netHandler.current = () => {};
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      delete debug.__rumbleDebug;
    };
    // shake is read each frame via closure; restarting the loop on toggle is fine
  }, [art, you, rival, stageId, shake, netHandler]);

  function paintHud(sim: MatchSim) {
    const secs = Math.ceil(sim.time);
    if (timeRef.current) timeRef.current.textContent = String(secs).padStart(2, "0");
    if (bannerRef.current) {
      const banner = sim.phase === "match" && sim.winner !== null ? (sim.winner === youSlot ? "YOU WIN" : "YOU LOSE") : sim.banner;
      bannerRef.current.textContent = banner;
      bannerRef.current.style.opacity = banner ? "1" : "0";
    }
    if (calloutRef.current) {
      calloutRef.current.textContent = sim.calloutT > 0 ? sim.callout : "";
    }
    const slots = [youSlot, youSlot === 0 ? 1 : 0] as const;
    slots.forEach((slot, i) => {
      const f = sim.p[slot];
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
    const me = sim.p[youSlot];
    evolveRef.current?.classList.toggle("is-ready", !!me && skills.burst && me.meter >= 100 && me.burst <= 0);
  }

  const youBeast = BEASTS.find((b) => b.id === you)!;
  const rivalBeast = BEASTS.find((b) => b.id === rival)!;
  const foeSlot = youSlot === 0 ? 1 : 0;
  const won = victor === youSlot;
  const stakeLabel = stakes === "final" ? "FINAL" : stakes === "semi" ? "SEMI" : stakes === "online" ? "ONLINE" : "TRAIN";
  const [kicker, headline] = resultCopy(stakes, won);
  const xpKind = stakes === "online" ? "online" : stakes === "spar" ? "spar" : stakes === "final" && won ? "title" : "circuit";

  return (
    <div ref={wrapRef} className="fight-layer relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0">
        <div className="flex items-start justify-between gap-3 px-3 pt-3">
          <Bar name={youBeast.name} tag={youName} tone="you" stocks={score[youSlot]} pctRef={hpRefs[0]} meterRef={meterRefs[0]} trackRef={meterTrack[0]} />
          <div className="flex flex-col items-center pt-1">
            <span className="font-display text-[10px] tracking-[0.22em] text-gold">{stakeLabel}</span>
            <span className="text-[10px] tracking-wide text-muted">{STAGE_MAP[stageId].name}</span>
            <span ref={timeRef} className="font-display text-2xl tracking-widest text-fg">
              99
            </span>
          </div>
          <Bar name={rivalBeast.name} tag={rivalName} tone="rival" stocks={score[foeSlot]} pctRef={hpRefs[1]} meterRef={meterRefs[1]} trackRef={meterTrack[1]} />
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
          {youBeast.light.tag} J · {skills.heavy ? youBeast.heavy.tag : "Heavy locked"} K · {skills.special ? youBeast.shot.tag : "Special locked"} L · W jump · S shield · {skills.burst ? "E digivolve" : "E locked"}
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
            <Act label={youBeast.heavy.tag} sub={skills.heavy ? undefined : "lv 2"} kind="heavy" locked={!skills.heavy} on={(d) => setButton("heavy", d)} />
            <Act label={youBeast.shot.tag} sub={skills.special ? undefined : "lv 4"} kind="bolt" locked={!skills.special} on={(d) => setButton("special", d)} />
            <Act label="Jump" kind="jump" on={(d) => setButton("jump", d)} />
            <Act label="Evolve" sub={skills.burst ? undefined : "lv 6"} kind="evolve" locked={!skills.burst} buttonRef={evolveRef} on={(d) => setButton("burst", d)} />
          </div>
        </div>
      )}

      {linkLost && phase !== "match" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 px-4">
          <div className="w-full max-w-sm border border-border bg-surface p-6 text-center">
            <p className="font-display text-sm tracking-[0.28em] text-accent">LINK DROPPED</p>
            <h2 className="font-display mt-2 text-4xl">Rival gone</h2>
            <p className="mt-2 text-sm text-muted">This one counts as a loss.</p>
            <button
              type="button"
              className="font-display mt-5 min-h-12 w-full bg-primary font-semibold text-bg"
              onClick={() => {
                if (!recorded.current) {
                  recorded.current = true;
                  onRecord("loss");
                }
                onDone(false);
              }}
            >
              Den
            </button>
          </div>
        </div>
      )}

      {phase === "match" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 px-4">
          <div className="w-full max-w-sm border border-border bg-surface p-6 text-center">
            <p className="font-display text-sm tracking-[0.28em] text-primary">{kicker}</p>
            <h2 className="font-display mt-2 text-4xl">{headline}</h2>
            <p className="mt-2 text-sm text-muted">
              Stocks {score[youSlot]} – {score[foeSlot]} · +{xpFor(xpKind, won)} XP
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className="font-display min-h-12 bg-primary font-semibold text-bg" onClick={() => onDone(won)}>
                {stakes === "semi" || stakes === "final" ? "Bracket" : "Den"}
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
  pctRef: RefObject<HTMLSpanElement | null>;
  meterRef: RefObject<HTMLSpanElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
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
  locked,
}: {
  label: string;
  sub?: string;
  kind: string;
  on: (down: boolean) => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  locked?: boolean;
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
      disabled={locked}
      className={`act act-${kind} ${down ? "is-down" : ""} ${locked ? "is-locked" : ""}`}
      aria-label={locked ? `${label}, locked` : sub ? `${label}, ${sub}` : label}
      aria-pressed={down}
      onPointerDown={(e) => {
        if (locked || e.button !== 0) return;
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
