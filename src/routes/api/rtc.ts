import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

type SignalBody = {
  op?: string;
  room?: string;
  peer?: string;
  from?: string;
  to?: string;
  kind?: string;
  payload?: unknown;
};

const ROOM = /^[A-Za-z0-9]{2,12}$/;
const PEER = /^[A-Za-z0-9_-]{4,80}$/;

function cleanRoom(value: string | null | undefined) {
  const room = (value ?? "").trim();
  return ROOM.test(room) ? room : null;
}

function cleanPeer(value: string | null | undefined) {
  const peer = (value ?? "").trim();
  return PEER.test(peer) ? peer : null;
}

export const Route = createFileRoute("/api/rtc")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const room = cleanRoom(url.searchParams.get("room"));
        const peer = cleanPeer(url.searchParams.get("peer"));
        if (!room || !peer) return Response.json({ error: "bad room" }, { status: 400 });
        const name = (url.searchParams.get("name") ?? "").slice(0, 16);
        const since = Number(url.searchParams.get("since") ?? 0) || 0;
        const now = Date.now();
        const sql = await getSql();
        await sql`insert into rtc_peers (room, id, name, seen) values (${room}, ${peer}, ${name}, ${now})
          on conflict (room, id) do update set name = ${name}, seen = ${now}`;
        await sql`delete from rtc_peers where room = ${room} and seen < ${now - 25000}`;
        const peers = await sql<{ id: string; name: string }>`select id, name from rtc_peers where room = ${room}`;
        const signals = await sql<{ id: number | string; from_id: string; kind: string; payload: string }>`
          select id, from_id, kind, payload from rtc_signals
          where room = ${room} and id > ${since} and to_id = ${peer}
          order by id asc
          limit 80`;
        return Response.json({
          peers,
          signals: signals.map((row) => ({
            id: Number(row.id),
            from: row.from_id,
            kind: row.kind,
            payload: JSON.parse(row.payload) as unknown,
          })),
        });
      },
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as SignalBody | null;
        const room = cleanRoom(body?.room);
        if (!room || !body) return Response.json({ error: "bad room" }, { status: 400 });
        const sql = await getSql();
        if (body.op === "leave") {
          const peer = cleanPeer(body.peer);
          if (!peer) return Response.json({ error: "bad peer" }, { status: 400 });
          await sql`delete from rtc_peers where room = ${room} and id = ${peer}`;
          return Response.json({ ok: true });
        }
        if (body.op === "signal") {
          const from = cleanPeer(body.from);
          const to = cleanPeer(body.to);
          const kind = body.kind;
          if (!from || !to || (kind !== "offer" && kind !== "answer" && kind !== "ice")) {
            return Response.json({ error: "bad signal" }, { status: 400 });
          }
          await sql`insert into rtc_signals (room, from_id, to_id, kind, payload)
            values (${room}, ${from}, ${to}, ${kind}, ${JSON.stringify(body.payload ?? null)})`;
          return Response.json({ ok: true });
        }
        return Response.json({ error: "bad op" }, { status: 400 });
      },
    },
  },
});
