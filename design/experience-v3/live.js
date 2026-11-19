// 나다르 사진관 촬영기(폰) 카메라 화면 → 태블릿 실시간 미리보기(WebRTC)
// 영상은 폰 ↔ 태블릿 직접(같은 와이파이면 기기끼리) — 서버는 연결 신호(SDP · ICE)만 Supabase 실시간 방송으로 주고받는다. 영상은 서버를 거치지 않고 남지도 않는다
// 채널 이름에 촬영기 키의 해시를 넣어 키를 아는 화면만 붙는다
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm';

const sb = createClient('https://bttjtkhfyzapcsqocick.supabase.co', 'sb_publishable_0IErNY9FrSeZurr0goY5aA_FG3qftYs', { auth: { persistSession: false, autoRefreshToken: false } });
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];
const room = () => new URLSearchParams(location.search).get('room') || 'c4';
async function chanName(key) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('m100-live:' + (key || '')));
  return 'm100-nadar-live-' + room() + '-' + [...new Uint8Array(b)].slice(0, 6).map((x) => x.toString(16).padStart(2, '0')).join('');
}
function join(name) {
  const ch = sb.channel(name, { config: { broadcast: { self: false } } });
  const ready = new Promise((res, rej) => ch.subscribe((s) => { if (s === 'SUBSCRIBED') res(); else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') rej(new Error(s)); }));
  return { ch, ready, send: async (event, payload) => { await ready; return ch.send({ type: 'broadcast', event, payload }); } };
}

// ── 보내는 쪽(촬영기 폰). getStream: 지금 카메라 스트림, getMeta: 보는 쪽에 같이 줄 값(줌 배율 등)
export async function liveSender(getStream, key, getMeta = () => ({})) {
  const L = join(await chanName(key));
  const peers = new Map();   // 보는 화면 id → RTCPeerConnection
  const close = (vid) => { try { peers.get(vid)?.close(); } catch {} peers.delete(vid); };
  async function connect(vid) {
    close(vid);
    const st = getStream(); const tr = st?.getVideoTracks()[0]; if (!tr) return;
    const pc = new RTCPeerConnection({ iceServers: ICE }); peers.set(vid, pc);
    const sender = pc.addTrack(tr, st);
    pc.onicecandidate = (e) => { if (e.candidate) L.send('ice', { vid, from: 's', c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) close(vid); };
    await pc.setLocalDescription(await pc.createOffer());
    // 원본은 최대 4032px — 미리보기는 긴 변 1280px 정도로 줄여 보낸다(촬영 화질과 무관)
    try {
      const s = tr.getSettings(), long = Math.max(s.width || 1280, s.height || 720);
      const p = sender.getParameters(); p.encodings = p.encodings?.length ? p.encodings : [{}];
      p.encodings[0].scaleResolutionDownBy = Math.max(1, long / 1280); p.encodings[0].maxBitrate = 3_000_000; p.degradationPreference = 'maintain-resolution';
      await sender.setParameters(p);
    } catch {}
    L.send('offer', { vid, sdp: pc.localDescription.toJSON(), meta: getMeta() });
  }
  L.ch.on('broadcast', { event: 'hello' }, ({ payload }) => connect(payload.vid));
  L.ch.on('broadcast', { event: 'answer' }, async ({ payload }) => { const pc = peers.get(payload.vid); if (pc && !pc.currentRemoteDescription) try { await pc.setRemoteDescription(payload.sdp); } catch {} });
  L.ch.on('broadcast', { event: 'ice' }, async ({ payload }) => { if (payload.from !== 'v') return; const pc = peers.get(payload.vid); if (pc) try { await pc.addIceCandidate(payload.c); } catch {} });
  await L.ready; L.send('up', {});   // 먼저 열려 있던 화면이 다시 붙도록
  return {
    // 카메라를 다시 켜면 트랙만 바꿔 끼움
    restream() { const tr = getStream()?.getVideoTracks()[0]; for (const pc of peers.values()) pc.getSenders().forEach((s) => s.track?.kind === 'video' && tr && s.replaceTrack(tr).catch(() => {})); },
    meta() { L.send('meta', getMeta()); },
    count: () => peers.size,
  };
}

// ── 보는 쪽(태블릿). onStream(stream), onMeta(meta), onState('connecting'|'connected'|'lost')
export async function liveViewer(key, { onStream, onMeta, onState }) {
  const L = join(await chanName(key));
  const vid = Math.random().toString(36).slice(2, 10);
  let pc = null, offerAt = 0;
  L.ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
    if (payload.vid !== vid) return;
    offerAt = Date.now();
    try { pc?.close(); } catch {}
    pc = new RTCPeerConnection({ iceServers: ICE });
    pc.ontrack = (e) => onStream(e.streams[0] || new MediaStream([e.track]));
    pc.onicecandidate = (e) => { if (e.candidate) L.send('ice', { vid, from: 'v', c: e.candidate.toJSON() }); };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') onState('connected');
      else if (s === 'failed' || s === 'disconnected' || s === 'closed') onState('lost');
    };
    if (payload.meta) onMeta(payload.meta);
    await pc.setRemoteDescription(payload.sdp);
    // 처음부터 높은 비트레이트로 시작(기본은 낮게 시작해 15초쯤 걸려 화질이 오름)
    const ans = await pc.createAnswer();
    ans.sdp = ans.sdp.replace(/(a=fmtp:\d+ [^\r\n]*)/g, '$1;x-google-start-bitrate=2500;x-google-min-bitrate=800');
    await pc.setLocalDescription(ans);
    L.send('answer', { vid, sdp: pc.localDescription.toJSON() });
  });
  L.ch.on('broadcast', { event: 'ice' }, async ({ payload }) => { if (payload.from !== 's' || payload.vid !== vid || !pc) return; try { await pc.addIceCandidate(payload.c); } catch {} });
  L.ch.on('broadcast', { event: 'meta' }, ({ payload }) => onMeta(payload));
  L.ch.on('broadcast', { event: 'up' }, () => L.send('hello', { vid }));
  await L.ready; onState('connecting'); L.send('hello', { vid });
  // 연결이 안 됐거나 끊기면 3초마다 다시 부른다
  setInterval(() => {
    const s = pc?.connectionState;
    if (s === 'connected' || s === 'connecting' || (s === 'new' && Date.now() - offerAt < 6000)) return;
    onState('connecting'); L.send('hello', { vid });
  }, 3000);
  return { stats: () => pc?.getStats() };
}
