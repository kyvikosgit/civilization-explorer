// v3 나다르 사진관 — 사진 찍기 → 당시 사진관 사진풍(photo.js) → 벽의 액자 화면(frame.html)으로 보내기
import { loadImage, transform } from './photo.js';
import { joinRoom, room } from './link.js';

const $ = (s) => document.querySelector(s);
const link = joinRoom({ ack: (p) => { if (p?.id === pending) shown(); } });
let card = null, pending = null, timer = 0;
$('#frameLink').href = `frame.html?room=${encodeURIComponent(room())}`;

$('#take').onclick = () => $('#file').click();
$('#retake').onclick = () => $('#file').click();
$('#file').onchange = async (e) => {
  const f = e.target.files?.[0]; e.target.value = '';
  if (!f) return;
  $('#shot').classList.add('ing'); $('#sent').textContent = ''; $('#sent').className = 'sent';
  try {
    await Promise.race([document.fonts?.load('800 34px Paperlogy'), new Promise((r) => setTimeout(r, 1500))]);
    const img = await loadImage(f);
    card = transform(img);
    $('#out').src = card.toDataURL('image/jpeg', 0.85); $('#out').hidden = false; $('#ph').hidden = true;
    $('#pre').hidden = true; $('#post').hidden = false; $('#send').disabled = false;
  } catch (err) {
    $('#sent').textContent = '사진을 읽지 못했습니다. 다시 찍어 주세요.'; $('#sent').className = 'sent bad';
  } finally { $('#shot').classList.remove('ing'); }
};

$('#send').onclick = async () => {
  if (!card) return;
  const b = $('#send'); b.disabled = true;
  $('#sent').textContent = '액자로 보내는 중'; $('#sent').className = 'sent';
  pending = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    const r = await link.send('photo', { id: pending, img: card.toDataURL('image/jpeg', 0.78) });
    if (r !== 'ok') throw new Error(r);
    clearTimeout(timer);
    timer = setTimeout(() => { if (pending) { $('#sent').textContent = '액자 화면이 응답하지 않습니다. 액자 화면이 켜져 있는지 확인해 주세요.'; $('#sent').className = 'sent bad'; b.disabled = false; } }, 6000);
  } catch (err) {
    $('#sent').textContent = '보내지 못했습니다. 연결을 확인하고 다시 눌러 주세요.'; $('#sent').className = 'sent bad'; b.disabled = false;
  }
};
function shown() {
  pending = null; clearTimeout(timer);
  $('#sent').textContent = '벽의 액자를 보세요. 당신의 사진이 걸렸습니다.'; $('#sent').className = 'sent ok';
  navigator.vibrate?.(16);
}
