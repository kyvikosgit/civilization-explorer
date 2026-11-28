// 11/29 살롱 첫 화면 = 다른 체험과 같은 짜임(사용자: 3D 입장 연출 빼고 배경 그림으로 — 안드로이드에서 벽이 밀려오다 검게 멈추던 것)
//   배경 = 1873년 살롱 출품작(앱 구역 카드와 같은 그림) · 위 역할 문장 · 아래 안내 시트 [수상작 찾기] → 8th Wall 스캔 화면(xr8/salon-scan.html)
//   3D 입장 화면은 salon-3d.html(salon.js · salon-ar.js)로 보관
import { ZONES } from './data.js';
import { makeGuide } from './guide.js';
import { store, againIds } from './store.js';
import { showComplete } from './done.js';

const V3 = new URL('./', import.meta.url).href;
const task = ZONES.find((z) => z.id === 'salon').tasks[0];
const WIN = { title: '환영: 14세기의 전설', artist: '뤽 올리비에 메르송', year: '1872' };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const guide = makeGuide();
const INFO = {
  coach: { img: V3 + 'img/salon_wall.jpg', kind: 'photo', land: true },
  title: '벽의 후보작 가운데\n1등급 메달을 받은 그림을 찾아 비춰 보세요',
  sub: '수상작을 비추면 그림 둘레가 금빛으로 빛납니다',
  buttons: [{ label: '수상작 찾기', cam: true, on: () => toScan() }],
  note: '카메라 권한을 물으면 ‘허용’을 눌러 주세요',
};
function toScan() {
  // 앱 안(폰 안 묶음 file://)에는 8th Wall 페이지가 없으므로 사이트에서 연다
  const base = location.protocol === 'file:' ? 'https://it-ta.com/design/experience-v3/xr8/salon-scan.html' : new URL('xr8/salon-scan.html', V3).href;
  const q = new URLSearchParams(location.search); q.delete('again');
  if (againIds().includes('salon')) q.set('again', 'salon');
  location.href = base + '?' + q.toString();
}
const ctl = window.M100_INTRO || { mode: 'normal', ended() {} };
if (store.saved('salon') && !againIds().includes('salon')) {
  setTimeout(() => showComplete('salon', { item: task.item, title: `〈${WIN.title}〉 · ${WIN.artist}, ${WIN.year}`, body: `${task.successBody || ''}\n\n${task.successVerdict || ''}`.trim(), note: task.after }), 0);
} else {
  document.body.classList.add('ready'); document.getElementById('role')?.classList.add('in');
  ctl.ended(0);
  if (ctl.mode !== 'only') setTimeout(() => guide.show(INFO), RM ? 0 : 1400);
}
