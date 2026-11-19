// 나다르 사진관 촬영기(폰) 카메라 화면 → 태블릿 실시간 미리보기(WebRTC)
// 영상은 폰 ↔ 태블릿 직접(같은 와이파이면 기기끼리) — 서버는 연결 신호(SDP · ICE)만 Supabase 실시간 방송으로 주고받는다. 영상은 서버를 거치지 않고 남지도 않는다
// 채널 이름에 촬영기 키의 해시를 넣어 키를 아는 화면만 붙는다. 양쪽 화면에 '키 표식'(해시 앞 4자리)을 띄워 같은 키인지 눈으로 맞춰 볼 수 있다
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';

const sb = createClient('https://bttjtkhfyzapcsqocick.supabase.co', 'sb_publishable_0IErNY9FrSeZurr0goY5aA_FG3qftYs', { auth: { persistSession: false, autoRefreshToken: false } });
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const room = () => new URLSearchParams(location.search).get('room') || 'c4';
async function chanName(key) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('m100-live:' + (key || '')));
  const hex = [...new Uint8Array(b)].slice(0, 6).map((x) => x.toString(16).padStart(2, '0')).join('');
  return { name: 'm100-nadar-live-' + room() + '-' + hex, tag: hex.slice(0, 4) };
}
function join(name, onSub) {
  const ch = sb.channel(name, { config: { broadcast: { self: false } } });
  const ready = new Promise((res, rej) => ch.subscribe((s) => { onSub?.(s); if (s === 'SUBSCRIBED') res(); else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') rej(new Error(s)); }));
  return { ch, ready, send: async (event, payload) => { await ready; return ch.send({ type: 'broadcast', event, payload }); } };
}
// 후보 종류 세기: host(같은 망 직접) · srflx(공유기 밖 주소) · relay
const candType = (c) => (/ typ (\w+)/.exec(c?.candidate || '') || [])[1] || '?';
const tally = (o, t) => { o[t] = (o[t] || 0) + 1; };
async function addCand(pc, q, c) { if (pc.remoteDescription) { try { await pc.addIceCandidate(c); } catch {} } else q.push(c); }
async function flushCand(pc, q) { while (q.length) { try { await pc.addIceCandidate(q.shift()); } catch {} } }
const fmtC = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음';

// ── 보내는 쪽(촬영기 폰). getStream: 지금 카메라 스트림, getMeta: 보는 쪽에 같이 줄 값(줌 배율 등), onDebug(글): 연결 상황 한 줄
export async function liveSender(getStream, key, getMeta = () => ({}), onDebug = () => {}) {
  const { name, tag } = await chanName(key);
  const D = { sub: '접속 중', peers: new Map() };   // 보는 화면 id → { pc, step, lc, rc }
  const say = () => {
    const ps = [...D.peers.values()];
    const head = `미리보기 · 방 ${room()} · 키 ${tag} · 신호 ${D.sub}`;
    if (!ps.length) return onDebug(head + ' · 태블릿 없음', false);
    const ok = ps.filter((p) => p.pc.connectionState === 'connected').length;
    onDebug(head + ` · 태블릿 ${ps.length}대 ` + ps.map((p) => `[${p.step} · ICE ${p.pc.iceConnectionState} · 내 후보 ${fmtC(p.lc)} · 상대 ${fmtC(p.rc)}]`).join(' '), ok === ps.length);
  };
  const L = join(name, (s) => { D.sub = s === 'SUBSCRIBED' ? '접속됨' : s; say(); });
  const close = (vid) => { try { D.peers.get(vid)?.pc.close(); } catch {} D.peers.delete(vid); say(); };
  async function connect(vid) {
    const cur = D.peers.get(vid);
    if (cur && Date.now() - cur.at < 8000 && !['failed', 'closed', 'disconnected'].includes(cur.pc.connectionState)) return;   // 이미 잇는 중 — 중복 부름 무시
    close(vid);
    const st = getStream(); const tr = st?.getVideoTracks()[0];
    if (!tr) { onDebug(`미리보기 · 태블릿이 불렀지만 카메라가 아직 안 켜짐`, false); return; }
    const pc = new RTCPeerConnection({ iceServers: ICE }); const P = { pc, step: '부름 받음', lc: {}, rc: {}, q: [], at: Date.now(), sid: Math.random().toString(36).slice(2, 10) }; D.peers.set(vid, P);
    const sender = pc.addTrack(tr, st);
    pc.onicecandidate = (e) => { if (e.candidate) { tally(P.lc, candType(e.candidate)); L.send('ice', { vid, sid: P.sid, from: 's', c: e.candidate.toJSON() }); say(); } };
    pc.oniceconnectionstatechange = say;
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState; P.step = s === 'connected' ? '연결됨' : s === 'failed' ? '실패' : P.step; say();
      if (s === 'closed') close(vid);
    };
    await pc.setLocalDescription(await pc.createOffer());
    // 원본은 최대 4032px — 미리보기는 긴 변 1280px 정도로 줄여 보낸다(촬영 화질과 무관)
    try {
      const s = tr.getSettings(), long = Math.max(s.width || 1280, s.height || 720);
      const p = sender.getParameters(); p.encodings = p.encodings?.length ? p.encodings : [{}];
      p.encodings[0].scaleResolutionDownBy = Math.max(1, long / 1280); p.encodings[0].maxBitrate = 3_000_000; p.degradationPreference = 'maintain-resolution';
      await sender.setParameters(p);
    } catch {}
    P.step = '제안 보냄'; say();
    L.send('offer', { vid, sid: P.sid, sdp: pc.localDescription.toJSON(), meta: getMeta(), tag });
  }
  L.ch.on('broadcast', { event: 'hello' }, ({ payload }) => connect(payload.vid));
  L.ch.on('broadcast', { event: 'answer' }, async ({ payload }) => { const P = D.peers.get(payload.vid); if (P && P.sid === payload.sid && !P.pc.currentRemoteDescription) try { await P.pc.setRemoteDescription(payload.sdp); await flushCand(P.pc, P.q); P.step = '응답 받음 · 영상 길 찾는 중'; say(); } catch (e) { P.step = '응답 오류'; say(); } });
  L.ch.on('broadcast', { event: 'ice' }, async ({ payload }) => { if (payload.from !== 'v') return; const P = D.peers.get(payload.vid); if (P && P.sid === payload.sid) { tally(P.rc, candType(payload.c)); await addCand(P.pc, P.q, payload.c); say(); } });
  say();
  await L.ready; L.send('up', {});   // 먼저 열려 있던 화면이 다시 붙도록
  setInterval(say, 2000);
  return {
    // 카메라를 다시 켜면 트랙만 바꿔 끼움
    restream() { const tr = getStream()?.getVideoTracks()[0]; for (const { pc } of D.peers.values()) pc.getSenders().forEach((s) => s.track?.kind === 'video' && tr && s.replaceTrack(tr).catch(() => {})); },
    meta() { L.send('meta', getMeta()); },
    count: () => D.peers.size,
    tag,
  };
}

// ── 보는 쪽(태블릿). onStream(stream), onMeta(meta), onState('connecting'|'connected'|'lost'), onDebug(단계 글, 자세한 글)
export async function liveViewer(key, { onStream, onMeta, onState, onDebug = () => {} }) {
  const { name, tag } = await chanName(key);
  const vid = Math.random().toString(36).slice(2, 10);
  let pc = null, q = [], sid = '', offerAt = 0, helloN = 0, lc = {}, rc = {}, step = '신호 서버 접속 중', failN = 0;
  const say = () => {
    const ice = pc ? pc.iceConnectionState : '-';
    onDebug(step, `방 ${room()} · 키 ${tag} · 부른 횟수 ${helloN} · ICE ${ice} · 내 후보 ${fmtC(lc)} · 촬영기 후보 ${fmtC(rc)}`);
  };
  const L = join(name, (s) => { if (s !== 'SUBSCRIBED') { step = '신호 서버 ' + s; say(); } });
  L.ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
    if (payload.vid !== vid) return;
    offerAt = Date.now(); lc = {}; rc = {}; sid = payload.sid; q = [];
    try { pc?.close(); } catch {}
    pc = new RTCPeerConnection({ iceServers: ICE });
    const mySid = sid, mine = pc;   // 이 제안에 대한 연결 — 그 사이 새 제안이 오면 이 연결의 일은 모두 버린다
    mine.ontrack = (e) => { if (mine === pc) onStream(e.streams[0] || new MediaStream([e.track])); };
    mine.onicecandidate = (e) => { if (e.candidate && mine === pc) { tally(lc, candType(e.candidate)); L.send('ice', { vid, sid: mySid, from: 'v', c: e.candidate.toJSON() }); say(); } };
    mine.oniceconnectionstatechange = () => { if (mine === pc) say(); };
    mine.onconnectionstatechange = () => {
      if (mine !== pc) return;
      const s = mine.connectionState;
      if (s === 'connected') { step = '연결됨'; failN = 0; onState('connected'); }
      else if (s === 'failed') { failN++; step = '영상 길을 못 찾음 — 폰과 태블릿이 같은 와이파이인지, 와이파이가 기기끼리 통신을 막지 않는지 확인'; onState('lost'); }
      else if (s === 'disconnected' || s === 'closed') { step = '끊김 · 다시 연결 중'; onState('lost'); }
      say();
    };
    if (payload.meta) onMeta(payload.meta);
    step = '촬영기 찾음 · 영상 길 찾는 중'; say();
    try {
      await mine.setRemoteDescription(payload.sdp);
      if (mine === pc) await flushCand(mine, q);
      // 처음부터 높은 비트레이트로 시작(기본은 낮게 시작해 15초쯤 걸려 화질이 오름)
      const ans = await mine.createAnswer();
      ans.sdp = ans.sdp.replace(/(a=fmtp:\d+ [^\r\n]*)/g, '$1;x-google-start-bitrate=2500;x-google-min-bitrate=800');
      await mine.setLocalDescription(ans);
    } catch (e) { if (mine === pc) { step = '연결 준비 오류: ' + e.message; say(); } return; }
    if (mine !== pc) return;
    L.send('answer', { vid, sid: mySid, sdp: mine.localDescription.toJSON() });
  });
  L.ch.on('broadcast', { event: 'ice' }, async ({ payload }) => { if (payload.from !== 's' || payload.vid !== vid || payload.sid !== sid || !pc) return; tally(rc, candType(payload.c)); await addCand(pc, q, payload.c); say(); });
  L.ch.on('broadcast', { event: 'meta' }, ({ payload }) => onMeta(payload));
  L.ch.on('broadcast', { event: 'up' }, () => { helloN++; L.send('hello', { vid }); });
  say();
  await L.ready; step = '촬영기 찾는 중 — 촬영기 폰 화면이 켜져 있고, 방 · 키 표식이 같은지 확인'; onState('connecting'); helloN++; L.send('hello', { vid }); say();
  // 연결이 안 됐거나 끊기면 3초마다 다시 부른다
  setInterval(() => {
    const s = pc?.connectionState;
    if (s === 'connected' || s === 'connecting' || (s === 'new' && Date.now() - offerAt < 6000)) { say(); return; }
    if (s !== 'failed') onState('connecting');
    helloN++; L.send('hello', { vid }); say();
  }, 3000);
  return { stats: () => pc?.getStats(), tag };
}
