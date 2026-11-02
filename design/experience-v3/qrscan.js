// QR 스캔 — 벽 액자 옆 QR 을 비추면 그 사진을 받는 화면(photo.html)으로. 카메라 화면 모양은 다른 체험과 같은 v3-cam
const JSQR = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
const loadJsQR = () => (window.jsQR ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = JSQR; s.onload = ok; s.onerror = no; document.head.appendChild(s); }));

export function openQR({ title = '나다르 사진관 · 사진 받기', find = '액자 옆 QR 을 비춰 주세요', onUrl }) {
  const el = document.createElement('div');
  el.className = 'v3-cam on';
  el.innerHTML = `<div class="ar"><video playsinline muted autoplay style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video></div>
    <div class="flash"></div>
    <div class="top"><button class="x" aria-label="닫기"><svg class="ico" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="tt"><small class="cap">${title.split(' · ')[0]}</small><b class="t">${title.split(' · ')[1] || ''}</b></div><span></span></div>
    <div class="finder"><i></i><i></i><i></i><i></i><span class="bar"></span></div>
    <div class="msg">${find}</div><div class="err"></div>`;
  document.body.appendChild(el);
  const video = el.querySelector('video'), cv = document.createElement('canvas'), g = cv.getContext('2d', { willReadFrequently: true });
  let stream = null, stop = false;
  const close = () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); el.remove(); };
  el.querySelector('.x').onclick = close;
  (async () => {
    try {
      [stream] = await Promise.all([navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }), loadJsQR()]);
    } catch (e) {
      el.classList.add('failed');
      el.querySelector('.err').textContent = /Permission|NotAllowed/i.test(e?.name + e?.message) ? '카메라 권한이 없습니다.\n폰의 기본 카메라로 QR 을 찍어도 사진을 받을 수 있습니다.' : '카메라를 켜지 못했습니다.\n폰의 기본 카메라로 QR 을 찍어도 사진을 받을 수 있습니다.';
      return;
    }
    if (stop) return close();
    video.srcObject = stream; await video.play().catch(() => {});
    const tick = () => {
      if (stop) return;
      if (video.readyState >= 2) {
        const w = 480, h = Math.round(w * video.videoHeight / video.videoWidth) || 640;
        cv.width = w; cv.height = h; g.drawImage(video, 0, 0, w, h);
        const r = window.jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
        if (r && /photo\.html/.test(r.data)) {
          navigator.vibrate?.(18); el.classList.add('locked', 'snap');
          setTimeout(() => { close(); onUrl(r.data); }, 350);
          return;
        }
      }
      setTimeout(tick, 160);
    };
    tick();
  })();
  return close;
}
