// v3 살롱 — 입장 연출이 끝난 벽에서 화면을 누르면 카메라. 현장의 후보작을 비추면 그 그림의 해설·심사 기준(부합/지적)이 뜬다
// 정답 그림(메르송 〈환상〉)은 비추는 순간 노골적으로 — 그림 둘레 금빛 후광, 위로 오르는 금가루, 그림 위에 도는 1873 메달, 화면 가장자리 금빛
// 다른 그림은 훑는 빛만. 문서 기준(<base>)이 v2 폴더라 v3 자원은 V3 경로로 읽는다
import { ZONES } from './data.js';
import { openCam, closeCam, esc } from './camui.js';
import { showDone } from './result.js';
import { store } from './store.js';

const V3 = '../../experience-v3/';
const task = ZONES.find((z) => z.id === 'salon').tasks[0];
const targets = task.targets.map((t) => ({ ...t, img: V3 + t.img }));
const RATIO = [0.724, 0.65, 0.839, 1.693, 0.574];   // 타깃 세로/가로 — .mind 컴파일 원본 비율(앱 mission-b 와 같은 값)
const WIN = targets.findIndex((t) => t.correct);

function canvasTex(THREE, w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

// 인식한 그림 위 효과 — 프레임(테두리)은 그리지 않는다(추적이 흔들리면 테두리가 떨린다). 부드러운 빛·입자만
function fx({ THREE, anchors }) {
  const add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  // 훑는 빛 — 모든 그림
  const sweeps = anchors.map((a, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff3d6, opacity: 0, ...add }));
    m.position.z = 0.002; a.group.add(m); return { m, t0: -9, r: RATIO[i] };
  });

  // 정답 그림 — 후광(가운데는 비고 가장자리에서 밖으로 번지는 금빛)
  const g = anchors[WIN].group, r = RATIO[WIN];
  const haloTex = canvasTex(THREE, 512, 512, (x, w, h) => {
    const pad = 0.2, iw = w * (1 - pad * 2), ih = h * (1 - pad * 2);
    for (let k = 0; k < 26; k++) {
      const s = k / 26, a = Math.pow(1 - s, 2.2) * 0.16;
      x.strokeStyle = `rgba(233,199,122,${a})`; x.lineWidth = 9;
      const e = s * w * pad;
      x.strokeRect(w * pad - e, h * pad - e, iw + e * 2, ih + e * 2);
    }
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1 / 0.6, r / 0.6), new THREE.MeshBasicMaterial({ map: haloTex, opacity: 0.9, ...add }));
  halo.position.z = -0.001; g.add(halo);

  // 금가루 — 그림 가장자리에서 위로 오르며 사라진다
  const N = 90, pos = new Float32Array(N * 3), seed = Array.from({ length: N }, () => Math.random());
  const dotTex = canvasTex(THREE, 64, 64, (x, w) => { const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.35, 'rgba(233,199,122,.7)'); gr.addColorStop(1, 'rgba(233,199,122,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex, size: 0.05, color: 0xffe2a0, opacity: 1, ...add }));
  dots.position.z = 0.01; g.add(dots);

  // 1873 메달 — 그림 위쪽에서 천천히 돈다
  const medalTex = canvasTex(THREE, 256, 256, (x, w) => {
    const c = w / 2, gr = x.createRadialGradient(c * 0.8, c * 0.7, 10, c, c, c);
    gr.addColorStop(0, '#FFF1C4'); gr.addColorStop(0.55, '#E2B565'); gr.addColorStop(1, '#9C6B22');
    x.fillStyle = gr; x.beginPath(); x.arc(c, c, c - 6, 0, 7); x.fill();
    x.strokeStyle = 'rgba(110,70,20,.6)'; x.lineWidth = 5; x.beginPath(); x.arc(c, c, c - 22, 0, 7); x.stroke();
    x.fillStyle = '#5B3A12'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '800 30px Paperlogy, sans-serif'; x.fillText('SALON', c, c - 34);
    x.font = '800 64px Paperlogy, sans-serif'; x.fillText('1873', c, c + 18);
  });
  const medal = new THREE.Mesh(new THREE.CircleGeometry(0.13, 48), new THREE.MeshBasicMaterial({ map: medalTex, transparent: true, side: THREE.DoubleSide }));
  medal.position.set(0, r / 2 + 0.2, 0.04); g.add(medal);
  const medalGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: dotTex, opacity: 0.7, ...add }));
  medalGlow.position.set(0, r / 2 + 0.2, 0.03); g.add(medalGlow);

  return {
    found(i) { sweeps[i].t0 = performance.now() / 1000; },
    tick(t) {
      const now = performance.now() / 1000;
      for (const s of sweeps) {
        const p = (now - s.t0) / 0.7;
        s.m.visible = p >= 0 && p <= 1;
        if (s.m.visible) { s.m.position.y = s.r / 2 - p * s.r; s.m.material.opacity = Math.sin(p * Math.PI) * 0.9; }
      }
      halo.material.opacity = 0.65 + 0.35 * Math.sin(t * 3);
      halo.scale.setScalar(1 + 0.025 * Math.sin(t * 3));
      for (let k = 0; k < N; k++) {
        const s = seed[k], life = (t * 0.32 + s * 7) % 1;
        const side = Math.floor(s * 4), u = (s * 97) % 1 - 0.5;
        let x = side < 2 ? u * 1.05 : (side === 2 ? -0.54 : 0.54);
        let y = side < 2 ? (side ? -r / 2 : r / 2) : u * r;
        x += Math.sin(t * 2 + s * 30) * 0.02;
        pos[k * 3] = x; pos[k * 3 + 1] = y + life * 0.35; pos[k * 3 + 2] = 0;
      }
      geo.attributes.position.needsUpdate = true;
      dots.material.size = 0.045 + 0.015 * Math.sin(t * 5);
      medal.rotation.y = t * 1.6;
      medal.position.y = medalGlow.position.y = r / 2 + 0.2 + Math.sin(t * 2) * 0.015;
      medalGlow.material.opacity = 0.55 + 0.25 * Math.sin(t * 3);
    },
  };
}

function head(i) {
  const t = targets[i];
  return `<div class="dc${t.correct ? ' gold' : ''}">${t.correct ? '아카데미가 요구하는 덕목을 모두 갖춘 그림' : `아카데미 살롱 · 출품 제${i + 1}호`}</div>
    <div class="dt">${esc(t.title)}</div><div class="ds">${esc(t.sub)}</div>`;
}

function onFound(i, ui) {
  const t = targets[i];
  const hp = `<div class="hp">${t.pro ? `<span class="pro"><b>부합</b>${esc(t.pro)}</span>` : ''}${t.con ? `<span class="con"><b>지적</b>${esc(t.con)}</span>` : ''}</div>`;
  if (t.correct) {
    ui.show({ golden: true, html: head(i) + `<div class="dd">${esc(t.desc)}</div>` + hp,
      buttons: [{ label: '이 그림에 메달', cls: 'gold', on: win }] });
    return;
  }
  ui.show({ html: head(i) + `<div class="dd">${esc(t.desc)}</div>` + hp,
    buttons: [
      { label: '다른 그림 비추기', cls: 'line', on: () => ui.release() },
      { label: '이 그림에 메달', on: () => ui.show({ html: head(i) + `<div class="fb">${esc(t.feedback)}</div>`, buttons: [{ label: '다른 그림 비추기', on: () => ui.release() }] }) },
    ] });
}

function win() {
  closeCam();
  showDone(task, { hub: V3 + 'index.html', base: V3 });
}

function open() {
  openCam({
    title: '아카데미 살롱 · 후보작 심사',
    find: '특별한 액자에 걸린 후보작에\n카메라를 비추세요',
    mind: V3 + 'mind/salon.mind',
    targets, demo: store.demo(), fx,
    onFound,
  });
}
window.addEventListener('salon:tap', open);
if (store.solved(task.id) && new URLSearchParams(location.search).has('done')) showDone(task, { hub: V3 + 'index.html', base: V3 });
