// Küçük DOM yardımcıları (vanilla). h('div', { class: 'x', onclick: fn }, ...çocuklar)
export function h(etiket, oz = {}, ...cocuklar) {
  const el = document.createElement(etiket);
  for (const [k, v] of Object.entries(oz || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'disabled') el.disabled = true;
    else el.setAttribute(k, v === true ? '' : v);
  }
  ekle(el, cocuklar);
  return el;
}
function ekle(el, cocuklar) {
  for (const c of cocuklar.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export const yuvarla = (v, n = 1) => Math.round(v * 10 ** n) / 10 ** n;

// Yerel depo (yalnız kolaylık: pencere durumu, ayarlar). Hata verirse sessizce yoksayılır.
export function depoOku(anahtar, varsayilan) {
  try { const m = localStorage.getItem(anahtar); return m == null ? varsayilan : { ...varsayilan, ...JSON.parse(m) }; } catch { return varsayilan; }
}
export function depoYaz(anahtar, deger) {
  try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch { /* yoksay */ }
}

// ---------- Tam ekran ve yönelim ----------
const kokEl = () => document.documentElement;
export const tamEkranDestekli = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(kokEl().requestFullscreen || kokEl().webkitRequestFullscreen);
export const tamEkranMi = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
export async function tamEkranAcKapa() {
  try {
    if (tamEkranMi()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const r = kokEl();
    const p = r.requestFullscreen ? r.requestFullscreen({ navigationUI: 'hide' }) : r.webkitRequestFullscreen();
    await p;
    try { await screen.orientation?.lock?.('landscape'); } catch { /* desteklenmiyor: sessiz geç */ }
  } catch { /* reddedildi / desteklenmiyor */ }
}
export function tamEkranDinle(fn) {
  document.addEventListener('fullscreenchange', fn); document.addEventListener('webkitfullscreenchange', fn);
}
// Dikey yönelimde tam ekran "Telefonu yan çevirin" örtüsü; yatay olunca gizlenir (oyun altında durur).
export function donusPerdesiKur() {
  if (document.getElementById('donus-perde')) return;
  const perde = h('div', { id: 'donus-perde', role: 'alert' },
    h('div', { class: 'telefon-ikon' }, h('i')),
    h('b', {}, 'Telefonu yan çevirin'),
    h('span', {}, 'Oyun yatay ekranda oynanır.'));
  document.body.append(perde);
  const mq = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
  const guncelle = () => { const dikey = mq ? mq.matches : window.innerHeight > window.innerWidth; perde.classList.toggle('acik', dikey); };
  guncelle();
  if (mq) (mq.addEventListener ? mq.addEventListener('change', guncelle) : mq.addListener?.(guncelle));
  window.addEventListener('resize', guncelle);
}
