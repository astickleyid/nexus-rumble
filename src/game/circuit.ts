import { advantage, BEAST_MAP, BEASTS, type BeastId } from "@/game/roster";
import { pickMaps, type StageId } from "@/game/stages";

export type Round = "semi" | "final" | "champion" | "out";

export type Circuit = {
  you: BeastId;
  semiRival: BeastId;
  other: [BeastId, BeastId];
  otherWinner: BeastId;
  otherLine: string;
  round: Round;
  fell: "semi" | "final" | null;
  maps: { semi: StageId; final: StageId };
};

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}

function otherResult(a: BeastId, b: BeastId): { winner: BeastId; line: string } {
  const A = BEAST_MAP[a];
  const B = BEAST_MAP[b];
  const edge = advantage(A.element, B.element);
  if (edge > 0) return { winner: a, line: `${A.elementLabel} beats ${B.elementLabel}.` };
  if (edge < 0) return { winner: b, line: `${B.elementLabel} beats ${A.elementLabel}.` };
  const winner = A.hp >= B.hp ? a : b;
  const name = BEAST_MAP[winner].name;
  return { winner, line: `${name} outlasts an even match.` };
}

export function drawCircuit(you: BeastId): Circuit {
  const rest = shuffle(BEASTS.map((b) => b.id).filter((id) => id !== you));
  const semiRival = rest[0] ?? "thornox";
  const other: [BeastId, BeastId] = [rest[1] ?? "pyrelon", rest[2] ?? "aqualith"];
  const decided = otherResult(other[0], other[1]);
  return {
    you,
    semiRival,
    other,
    otherWinner: decided.winner,
    otherLine: decided.line,
    round: "semi",
    fell: null,
    maps: pickMaps(),
  };
}

export function mapOf(c: Circuit): StageId {
  if (c.round === "final" || c.round === "champion" || c.fell === "final") return c.maps.final;
  return c.maps.semi;
}

export function foeOf(c: Circuit): BeastId {
  return c.round === "final" || c.round === "champion" ? c.otherWinner : c.semiRival;
}

export function advance(c: Circuit, won: boolean): Circuit {
  if (c.round === "semi") return { ...c, round: won ? "final" : "out", fell: won ? null : "semi" };
  if (c.round === "final") return { ...c, round: won ? "champion" : "out", fell: won ? null : "final" };
  return c;
}
