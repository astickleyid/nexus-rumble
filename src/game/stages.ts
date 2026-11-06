export type StageId = "spire" | "rift" | "shelf" | "canopy";

export type Stage = {
  id: StageId;
  name: string;
  blurb: string;
  worldW: number;
  spawn: [number, number];
  solids: { l: number; r: number }[];
  plats: { l: number; r: number; y: number }[];
  blast: { l: number; r: number; b: number; t: number };
  sky: [string, string];
  slab: string;
  lip: string;
  mote: string;
  pit: string;
};

export const STAGES: Stage[] = [
  {
    id: "spire",
    name: "Nexus Spire",
    blurb: "Wide ring. Platforms stacked in the middle.",
    worldW: 2700,
    spawn: [820, 1880],
    solids: [{ l: 320, r: 2380 }],
    plats: [
      { l: 500, r: 900, y: 155 },
      { l: 1800, r: 2200, y: 155 },
      { l: 960, r: 1280, y: 240 },
      { l: 1420, r: 1740, y: 240 },
      { l: 1140, r: 1560, y: 385 },
    ],
    blast: { l: -560, r: 3260, b: -740, t: 1860 },
    sky: ["#050712", "#10182e"],
    slab: "#141c34",
    lip: "#ff6a2a",
    mote: "#2ee6ff",
    pit: "rgba(255,50,20,0.22)",
  },
  {
    id: "rift",
    name: "Cinder Rift",
    blurb: "Short ring. The sides kill early.",
    worldW: 2500,
    spawn: [980, 1680],
    solids: [{ l: 700, r: 1960 }],
    plats: [
      { l: 860, r: 1180, y: 190 },
      { l: 1480, r: 1800, y: 190 },
      { l: 1120, r: 1540, y: 360 },
    ],
    blast: { l: -80, r: 2740, b: -560, t: 1600 },
    sky: ["#140604", "#2a100c"],
    slab: "#24140e",
    lip: "#ff5a1f",
    mote: "#ffb15a",
    pit: "rgba(255,70,20,0.4)",
  },
  {
    id: "shelf",
    name: "Tide Shelf",
    blurb: "Long and low. You have to chase.",
    worldW: 3200,
    spawn: [620, 2360],
    solids: [{ l: 160, r: 2840 }],
    plats: [
      { l: 340, r: 820, y: 210 },
      { l: 2180, r: 2660, y: 210 },
      { l: 1280, r: 1720, y: 150 },
    ],
    blast: { l: -780, r: 3780, b: -820, t: 1900 },
    sky: ["#03141a", "#082833"],
    slab: "#0d2430",
    lip: "#5dffe8",
    mote: "#7af0ff",
    pit: "rgba(40,140,180,0.28)",
  },
  {
    id: "canopy",
    name: "Thorn Canopy",
    blurb: "Two islands. Miss the bridge and you fall.",
    worldW: 2800,
    spawn: [680, 2080],
    solids: [
      { l: 260, r: 1120 },
      { l: 1640, r: 2500 },
    ],
    plats: [
      { l: 960, r: 1340, y: 180 },
      { l: 1420, r: 1800, y: 180 },
      { l: 1100, r: 1660, y: 340 },
    ],
    blast: { l: -480, r: 3240, b: -700, t: 1800 },
    sky: ["#071108", "#122016"],
    slab: "#142216",
    lip: "#b6f25c",
    mote: "#9dff6a",
    pit: "rgba(20,40,16,0.2)",
  },
];

export const STAGE_MAP: Record<StageId, Stage> = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, Stage>;

export function stageSpan(stage: Stage) {
  return {
    l: Math.min(...stage.solids.map((s) => s.l)),
    r: Math.max(...stage.solids.map((s) => s.r)),
  };
}

export function pickMaps(): { semi: StageId; final: StageId } {
  const ids = STAGES.map((s) => s.id);
  const semi = ids[Math.floor(Math.random() * ids.length)] ?? "spire";
  const rest = ids.filter((id) => id !== semi);
  const final = rest[Math.floor(Math.random() * rest.length)] ?? "rift";
  return { semi, final };
}
