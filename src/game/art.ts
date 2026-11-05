import type { BeastId } from "@/game/roster";

export type Frame = {
  img: HTMLImageElement;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type Art = {
  beasts: Record<BeastId, Frame[]>;
  impact: Frame[];
  bolt: Frame[];
};

const IDS: BeastId[] = ["voltusk", "pyrelon", "aqualith", "thornox"];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(src));
    img.src = src;
  });
}

function measure(img: HTMLImageElement): Frame {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  if (!g) return { img, minX: 0, maxX: img.width - 1, minY: 0, maxY: img.height - 1 };
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, img.width, img.height).data;
  let minX = img.width;
  let maxX = 0;
  let minY = img.height;
  let maxY = 0;
  let any = false;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (data[(y * img.width + x) * 4 + 3] > 24) {
        any = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!any) return { img, minX: 0, maxX: img.width - 1, minY: 0, maxY: img.height - 1 };
  return { img, minX, maxX, minY, maxY };
}

async function loadSet(base: string, count = 4): Promise<Frame[]> {
  const imgs = await Promise.all(
    Array.from({ length: count }, (_, i) => loadImage(`${base}/frame-${i + 1}.png`)),
  );
  return imgs.map(measure);
}

let pending: Promise<Art> | null = null;

export function loadArt(): Promise<Art> {
  if (!pending) {
    pending = (async () => {
      const [impact, bolt, ...beasts] = await Promise.all([
        loadSet("/sprites/impact"),
        loadSet("/sprites/bolt"),
        ...IDS.map((id) => loadSet(`/sprites/${id}`)),
      ]);
      const map = {} as Record<BeastId, Frame[]>;
      IDS.forEach((id, i) => {
        map[id] = beasts[i]!;
      });
      return { beasts: map, impact, bolt };
    })();
  }
  return pending;
}
