create table if not exists rtc_peers (
  room text not null,
  id text not null,
  name text not null default '',
  seen bigint not null,
  primary key (room, id)
);

create table if not exists rtc_signals (
  id bigserial primary key,
  room text not null,
  from_id text not null,
  to_id text not null,
  kind text not null,
  payload text not null
);

create index if not exists rtc_signals_room_idx on rtc_signals (room, id);
