// 현장 대기 접수 공통 — 서버 함수 하나(supabase/functions/waitlist)를 부른다
export const API = 'https://bttjtkhfyzapcsqocick.supabase.co/functions/v1/waitlist';
export const qs = (k) => new URLSearchParams(location.search).get(k) || '';
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function call(action, body = {}) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || `http_${r.status}`); e.code = d.error; throw e; }
  return d;
}

// 오류 코드 → 사람 말
export const say = (code) => ({
  bad_key: '접속 주소가 올바르지 않습니다. 관리자에게 문의해 주세요.',
  closed: '지금은 대기 접수를 받지 않습니다.',
  bad_phone: '휴대폰 번호를 다시 확인해 주세요.',
  bad_party: '인원을 다시 골라 주세요.',
  need_agree: '개인정보 수집·이용에 동의해 주세요.',
  not_found: '대기 정보를 찾을 수 없습니다.',
}[code] || '잠시 후 다시 시도해 주세요.');

// 경과 시간 '12분'
export const ago = (iso) => { if (!iso) return ''; const m = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000)); return m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간 ${m % 60}분`; };
