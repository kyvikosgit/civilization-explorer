// 나다르 사진관 폰 ↔ 벽의 액자 화면 — Supabase 실시간 방송(채널만 쓰고 표·저장소는 안 쓴다: 사진은 서버에 남지 않는다)
// 키는 앱에 이미 들어 있는 공개(publishable) 키. 비밀 키는 여기에 두지 않는다
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';

const URL_ = 'https://bttjtkhfyzapcsqocick.supabase.co';
const KEY = 'sb_publishable_0IErNY9FrSeZurr0goY5aA_FG3qftYs';
let sb = null;
const client = () => (sb ||= createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } }));

// room = 액자 하나(여러 대를 달면 액자마다 다른 이름). 주소 ?room= 으로 바꾼다
export const room = () => new URLSearchParams(location.search).get('room') || 'c4';

// 큰 사진(원본 크기 JPEG)은 한 메시지 한도를 넘으므로 조각으로 나눠 보내고 받는 쪽에서 다시 합친다 — 서버에는 여전히 남기지 않는다
const CHUNK = 120000;
export function joinRoom(handlers = {}) {
  const ch = client().channel('m100-nadar-' + room(), { config: { broadcast: { self: false, ack: true } } });
  const parts = new Map();   // 조각 모음: key → { n, got, arr }
  const deliver = (fn, payload) => {
    const b = payload?._big; if (!b) return fn(payload);
    let e = parts.get(b.key); if (!e) { e = { n: b.n, got: 0, arr: new Array(b.n) }; parts.set(b.key, e); if (parts.size > 20) parts.delete(parts.keys().next().value); }
    if (e.arr[b.i] == null) { e.arr[b.i] = payload._c; e.got++; }
    if (e.got === e.n) { parts.delete(b.key); const { _big, _c, ...rest } = payload; fn({ ...rest, [b.field]: e.arr.join('') }); }
  };
  for (const [ev, fn] of Object.entries(handlers)) ch.on('broadcast', { event: ev }, ({ payload }) => deliver(fn, payload));
  const ready = new Promise((res, rej) => {
    ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(ch); else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') rej(new Error(s)); });
  });
  const send = async (event, payload) => { await ready; return ch.send({ type: 'broadcast', event, payload }); };
  // sendBig: payload[field](긴 문자열)를 조각으로. 모든 조각이 'ok' 면 'ok'
  const sendBig = async (event, payload, field) => {
    const str = String(payload[field] || ''); if (str.length <= CHUNK) return send(event, payload);
    const n = Math.ceil(str.length / CHUNK), key = Math.random().toString(36).slice(2, 10); const { [field]: _, ...meta } = payload; let ok = 'ok';
    for (let i = 0; i < n; i++) { const r = await send(event, { ...meta, _big: { key, i, n, field }, _c: str.slice(i * CHUNK, (i + 1) * CHUNK) }); if (r !== 'ok') ok = r; }
    return ok;
  };
  return { ch, ready, send, sendBig };
}
