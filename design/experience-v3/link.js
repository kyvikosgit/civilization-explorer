// 나다르 사진관 폰 ↔ 벽의 액자 화면 — Supabase 실시간 방송(채널만 쓰고 표·저장소는 안 쓴다: 사진은 서버에 남지 않는다)
// 키는 앱에 이미 들어 있는 공개(publishable) 키. 비밀 키는 여기에 두지 않는다
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';

const URL_ = 'https://bttjtkhfyzapcsqocick.supabase.co';
const KEY = 'sb_publishable_0IErNY9FrSeZurr0goY5aA_FG3qftYs';
let sb = null;
const client = () => (sb ||= createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } }));

// room = 액자 하나(여러 대를 달면 액자마다 다른 이름). 주소 ?room= 으로 바꾼다
export const room = () => new URLSearchParams(location.search).get('room') || 'c4';

export function joinRoom(handlers = {}) {
  const ch = client().channel('m100-nadar-' + room(), { config: { broadcast: { self: false, ack: true } } });
  for (const [ev, fn] of Object.entries(handlers)) ch.on('broadcast', { event: ev }, ({ payload }) => fn(payload));
  const ready = new Promise((res, rej) => {
    ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(ch); else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') rej(new Error(s)); });
  });
  return { ch, ready, send: async (event, payload) => { await ready; return ch.send({ type: 'broadcast', event, payload }); } };
}
