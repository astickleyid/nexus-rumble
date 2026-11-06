import { BEAST_MAP, type Beast, type BeastId } from "@/game/roster";

export type Build = { power: number; speed: number; bulk: number };

export type Career = {
  name: string;
  beast: BeastId;
  xp: number;
  power: number;
  speed: number;
  bulk: number;
  wins: number;
  losses: number;
  titles: number;
  entered: number;
  streak: number;
  bestStreak: number;
  onlineWins: number;
  onlineLosses: number;
};

const KEY = "nexus-career-v1";

export const EMPTY_BUILD: Build = { power: 0, speed: 0, bulk: 0 };

export function loadCareer(): Career | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Career;
    if (!c?.beast || !BEAST_MAP[c.beast]) return null;
    return {
      name: (c.name || "Rookie").slice(0, 16),
      beast: c.beast,
      xp: c.xp || 0,
      power: c.power || 0,
      speed: c.speed || 0,
      bulk: c.bulk || 0,
      wins: c.wins || 0,
      losses: c.losses || 0,
      titles: c.titles || 0,
      entered: c.entered || 0,
      streak: c.streak || 0,
      bestStreak: c.bestStreak || 0,
      onlineWins: c.onlineWins || 0,
      onlineLosses: c.onlineLosses || 0,
    };
  } catch {
    return null;
  }
}

export function saveCareer(c: Career) {
  localStorage.setItem(KEY, JSON.stringify(c));
  return c;
}

export function clearCareer() {
  localStorage.removeItem(KEY);
}

export function claimFighter(name: string, beast: BeastId): Career {
  const career: Career = {
    name: (name.trim() || "Rookie").slice(0, 16),
    beast,
    xp: 0,
    power: 0,
    speed: 0,
    bulk: 0,
    wins: 0,
    losses: 0,
    titles: 0,
    entered: 0,
    streak: 0,
    bestStreak: 0,
    onlineWins: 0,
    onlineLosses: 0,
  };
  return saveCareer(career);
}

export function progress(xp: number) {
  let level = 1;
  let need = 50;
  let left = xp;
  while (left >= need && level < 20) {
    left -= need;
    level += 1;
    need = 40 + level * 25;
  }
  return { level, into: left, need, bank: Math.max(0, level - 1) };
}

export function unspent(c: Career) {
  return Math.max(0, progress(c.xp).bank - c.power - c.speed - c.bulk);
}

export function skillsFor(level: number) {
  return {
    light: true,
    heavy: level >= 2,
    special: level >= 4,
    burst: level >= 6,
  };
}

export function nextUnlock(level: number): string | null {
  if (level < 2) return "Heavy unlocks at level 2.";
  if (level < 4) return "Special unlocks at level 4.";
  if (level < 6) return "Digivolve unlocks at level 6.";
  return null;
}

export function spend(c: Career, stat: keyof Build): Career | null {
  if (unspent(c) <= 0) return null;
  if (c[stat] >= 5) return null;
  return saveCareer({ ...c, [stat]: c[stat] + 1 });
}

export function enterCircuit(c: Career) {
  return saveCareer({ ...c, entered: c.entered + 1 });
}

type Kind = "spar" | "circuit" | "title" | "online";

export function xpFor(kind: Kind, won: boolean) {
  if (won) {
    if (kind === "online") return 70;
    if (kind === "title") return 160;
    if (kind === "spar") return 40;
    return 55;
  }
  if (kind === "online") return 25;
  if (kind === "spar") return 18;
  return 22;
}

export function recordMatch(c: Career, kind: Kind, won: boolean): Career {
  const xp = xpFor(kind, won);
  const streak = won ? c.streak + 1 : 0;
  return saveCareer({
    ...c,
    xp: c.xp + xp,
    wins: won ? c.wins + 1 : c.wins,
    losses: won ? c.losses : c.losses + 1,
    titles: won && kind === "title" ? c.titles + 1 : c.titles,
    streak,
    bestStreak: Math.max(c.bestStreak, streak),
    onlineWins: kind === "online" && won ? c.onlineWins + 1 : c.onlineWins,
    onlineLosses: kind === "online" && !won ? c.onlineLosses + 1 : c.onlineLosses,
  });
}

function clampStat(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

export function applyBuild(id: BeastId, c: Pick<Career, "power" | "speed" | "bulk">): Beast {
  const base = BEAST_MAP[id];
  const beast: Beast = {
    ...base,
    light: { ...base.light },
    heavy: { ...base.heavy },
    shot: { ...base.shot },
  };
  const power = clampStat(c.power);
  const speed = clampStat(c.speed);
  const bulk = clampStat(c.bulk);
  const dmg = 1 + power * 0.08;
  const kb = 1 + power * 0.04;
  beast.speed = Math.round(base.speed * (1 + speed * 0.06));
  beast.jump = Math.round(base.jump * (1 + speed * 0.03));
  beast.weight = Math.max(0.55, base.weight * (1 - bulk * 0.07));
  for (const key of ["light", "heavy"] as const) {
    beast[key].damage = Math.round(base[key].damage * dmg);
    beast[key].kb = Math.round(base[key].kb * kb);
  }
  beast.shot.damage = Math.round(base.shot.damage * dmg);
  beast.shot.kb = Math.round(base.shot.kb * kb);
  return beast;
}

export function buildOf(c: Career): Build & { level: number } {
  return { power: c.power, speed: c.speed, bulk: c.bulk, level: progress(c.xp).level };
}
