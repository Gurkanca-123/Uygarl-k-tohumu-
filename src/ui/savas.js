// Savaş arayüzü (F1): yerleşim penceresi (3×3 ızgara, birlik kartları, öneri, canlı olasılık), savaş oynatma + sonuç kartı,
// Seferler > Savaş sekmesi (bekleyen / son savaşlar / ordu / rütbe) ve sol alttaki "Savaş hazır" kartı. Çekirdeği yalnız okur;
// durumu `a.oyun.komut(fn, ...)` ile değiştirir. Hiçbir pencere oyunu DURDURMAZ. Düzen: kompakt, tek sıra düğmeler, ≥40px hedefler.
import {
  savasKur, yerlesimOnizle, yerlesimKaydet, savasBaslat, savasIzle, savasGorunumu, birlikTerfi, birlikTerhis,
} from '../core/komutlar.js';
import { SEFER } from '../core/sefer.js';
import { BIRIM } from '../core/savas.js';
import { mevcutCag, KAYNAK } from '../core/yardimci.js';
import { SEFER_SONUC, SEFER_OLCEK } from '../data/denge.js';
import { takvim } from '../core/takvim.js';
import { h, yuvarla } from './dom.js';
import { yuzdeler } from './aksiyon.js';

const SONUC = [['buyuk', 'Büyük başarı'], ['basari', 'Başarı'], ['kismi', 'Kısmi'], ['basarisiz', 'Başarısız']];
const SIRA_AD = ['Ön', 'Orta', 'Arka'];
const ROL_SIMGE = { mizrakci: '🔱', okcu: '🏹', kahraman: '★', onder: '🧭', kalkanli: '🛡', suvari: '🐎', kusatma: '🪨' };
const ROL_AD = { onder: 'Önder', kahraman: 'Kahraman' };
const DUSMAN_SIMGE = { ayi: '🐻', ayi_yavrusu: '🐻', kurt: '🐺' };
const VARIS_METNI = { ayi: 'Ayıya ulaşıldı!' };
const IPUCU_VARSAYILAN = 'Mızrakçılar önde, okçular arkada, kahraman ortada.';
const KADEME_SIMGE = { buyuk: '🏆', basari: '✔', kismi: '◐', basarisiz: '✖' };
const rolAd = (r) => ROL_AD[r] || BIRIM[r]?.ad || r;
const kay = (r) => KAYNAK[r]?.simge ?? r;
const anahtar = (s, c) => `${s},${c}`;
const sayi = (x) => String(yuvarla(x, 1)).replace('.', ',');

// ---------- Yerleşim modeli ----------
// hucre = { "sira,sutun": rol } (kahraman hücresi hariç); birimler havuzdan rolüne göre atanır.
function havuz(k) {
  const ilk = k.birlikler.find((b) => b.tur === 'kahraman');
  const sabit = {}; const esnek = []; let esnekRoller = [];
  for (const b of k.birlikler) {
    if (b === ilk) continue;
    if (b.roller.length === 1) (sabit[b.roller[0]] ||= []).push(b);
    else { esnek.push(b); esnekRoller = b.roller; }
  }
  const roller = [...new Set([...Object.keys(sabit), ...(esnek.length ? esnekRoller : [])])]
    .sort((x, y) => (['mizrakci', 'okcu'].indexOf(x) + 1 || 9) - (['mizrakci', 'okcu'].indexOf(y) + 1 || 9));
  return { ilk, sabit, esnek, esnekRoller, roller, toplam: k.birlikler.length - (ilk ? 1 : 0) };
}

// Hücre rollerinden birim ataması. Dönüş { ok, kalan:{rol:n}, bos (yerleşmemiş birim), yerlesim }.
function dagit(k, hv, hucre) {
  const sayac = {};
  for (const rol of Object.values(hucre)) sayac[rol] = (sayac[rol] || 0) + 1;
  let esnekKalan = hv.esnek.length;
  for (const [rol, n] of Object.entries(sayac)) {
    const tasan = n - (hv.sabit[rol]?.length || 0);
    if (tasan > 0) { if (!hv.esnekRoller.includes(rol)) return { ok: false }; esnekKalan -= tasan; }
  }
  if (esnekKalan < 0) return { ok: false };
  const kalan = {};
  for (const r of hv.roller) kalan[r] = Math.max(0, (hv.sabit[r]?.length || 0) - (sayac[r] || 0)) + (hv.esnekRoller.includes(r) ? esnekKalan : 0);
  const kuyruk = Object.fromEntries(Object.entries(hv.sabit).map(([r, l]) => [r, [...l]]));
  const esnek = [...hv.esnek];
  const yerlesim = [];
  if (hv.ilk) yerlesim.push({ id: hv.ilk.id, rol: 'kahraman', sira: k.izgara.kahraman.sira, sutun: k.izgara.kahraman.sutun });
  for (const [kx, rol] of Object.entries(hucre)) {
    const [sira, sutun] = kx.split(',').map(Number);
    const b = kuyruk[rol]?.shift() || esnek.shift();
    yerlesim.push({ id: b.id, rol, sira, sutun });
  }
  const sabitKalan = Object.fromEntries(Object.entries(hv.sabit).map(([r, l]) => [r, Math.max(0, l.length - (sayac[r] || 0))]));
  return { ok: true, kalan, sabitKalan, esnekKalan, bos: hv.toplam - Object.keys(hucre).length, yerlesim };
}

function baslangicHucre(k) {
  const hucre = {};
  const ilkId = k.birlikler.find((b) => b.tur === 'kahraman')?.id;
  for (const y of k.yerlesim) if (y.id !== ilkId) hucre[anahtar(y.sira, y.sutun)] = y.rol;
  return hucre;
}
const oneriHucre = (k) => {
  const hucre = {};
  const ilkId = k.birlikler.find((b) => b.tur === 'kahraman')?.id;
  for (const y of k.oneri) if (y.id !== ilkId) hucre[anahtar(y.sira, y.sutun)] = y.rol;
  return hucre;
};

// Açık hücreler (kahraman yoksa kahraman hücresi de açık) ve kahraman hücresi.
function acikHucreler(k, hv) {
  const l = k.izgara.acik.map((x) => anahtar(x.sira, x.sutun));
  const kh = anahtar(k.izgara.kahraman.sira, k.izgara.kahraman.sutun);
  if (!hv.ilk && !l.includes(kh)) l.push(kh);
  return { acik: new Set(l), kh };
}

// Kurala göre doldurma: yerleşmemiş birimleri mızrakçı/önder → ön, okçu → arka, kalan → orta sıraya koyar (işçilerin ~üçte biri okçu).
function doldur(k, hv, hucre, acik) {
  const ds = dagit(k, hv, hucre);
  if (!ds.ok || !ds.bos) return hucre;
  const yeni = { ...hucre };
  const khx = hv.ilk ? anahtar(k.izgara.kahraman.sira, k.izgara.kahraman.sutun) : null;
  const bos = [...acik].filter((x) => !(x in yeni) && x !== khx);
  const tercih = (rol) => (['mizrakci', 'onder', 'kalkanli', 'suvari'].includes(rol) ? 0 : ['okcu', 'kusatma'].includes(rol) ? k.izgara.sira - 1 : Math.floor(k.izgara.sira / 2));
  const plan = [];
  for (const [r, n] of Object.entries(ds.sabitKalan)) for (let i = 0; i < n; i++) plan.push(r);
  const okcuMevcut = Object.values(yeni).filter((r) => r === 'okcu').length + plan.filter((r) => r === 'okcu').length;
  const okcuHedef = Math.floor((hv.toplam) / 3);
  const esnekOkcu = hv.esnekRoller.includes('okcu') ? Math.max(0, Math.min(ds.esnekKalan, okcuHedef - okcuMevcut)) : 0;
  for (let i = 0; i < ds.esnekKalan; i++) plan.push(i < esnekOkcu ? 'okcu' : hv.esnekRoller.includes('mizrakci') ? 'mizrakci' : hv.esnekRoller[0]);
  plan.sort((x, y) => tercih(x) - tercih(y));
  const orta = (k.izgara.sutun - 1) / 2;
  for (const rol of plan) {
    bos.sort((x, y) => Math.abs(Number(x.split(',')[0]) - tercih(rol)) - Math.abs(Number(y.split(',')[0]) - tercih(rol))
      || Math.abs(Number(x.split(',')[1]) - orta) - Math.abs(Number(y.split(',')[1]) - orta));
    const kx = bos.shift();
    if (kx == null) break;
    yeni[kx] = rol;
  }
  return dagit(k, hv, yeni).ok ? yeni : hucre;
}

function ipucuHesapla(k, hucre) {
  const girdi = Object.entries(hucre);
  if (!girdi.length) return { m: 'Ekipte işçi ya da asker yok: formasyon etkisi yok, sonuç ekip gücüne bağlı.', sinif: 'soluk' };
  const son = k.izgara.sira - 1;
  const okcuOn = girdi.some(([kx, r]) => r === 'okcu' && kx.startsWith('0,'));
  const mizArka = girdi.some(([kx, r]) => r === 'mizrakci' && Number(kx.split(',')[0]) === son);
  if (okcuOn) return { m: '⚠ Okçu önde: arkaya al (ön sırada zayıf).', sinif: 'uyari' };
  if (mizArka) return { m: '⚠ Mızrakçı arkada: öne al.', sinif: 'uyari' };
  const okcu = girdi.some(([, r]) => r === 'okcu'), miz = girdi.some(([, r]) => r === 'mizrakci');
  if (miz && !okcu) return { m: 'Okçu yok: işçiyi okçu yapıp arkaya koymak menzil kazandırır.', sinif: 'soluk' };
  return { m: `✓ ${IPUCU_VARSAYILAN}`, sinif: 'iyi' };
}

// ---------- Pencere yaşam döngüsü ----------
export function savasAc(a, uid) {
  const d = a.d;
  const k = savasKur(d, uid);
  if (k.hata) { a.hata(k.hata); return; }
  if (k.durum !== 'bekliyor') { a.hata('Bu savaş zaten yapıldı.'); return; }
  a.sv = { uid, hucre: baslangicHucre(k), sec: null, mesaj: '', suruk: false, kucuk: false };
  a.pencere = 'kapali'; a.secim = null; a.tehditAcik = false; a.menuAcik = false; a.kaydetUi();
  a.sahne.secim?.(null);
  a.yenile();
}
export function savasKapatPencere(a) { a.sv = null; a.yenile(); }

function olasilik(a, k, hv, ds) {
  if (!ds.ok || ds.bos > 0) return null;
  const o = yerlesimOnizle(a.d, a.sv.uid, ds.yerlesim);
  if (o.hata) return null;
  const taban = k.carpanlar.carpan > 0 ? k.guc.biz / k.carpanlar.carpan : k.guc.biz;
  return { ...o, biz: taban * o.carpanlar.carpan };
}

// ---------- Etkileşim ----------
function uygula(a, yeni, mesaj = '') {
  const k = a.sv.k;
  if (!dagit(k, a.sv.hv, yeni).ok) { a.sv.mesaj = 'Bu birlik o rolü alamaz ya da kalmadı.'; return false; }
  a.sv.hucre = yeni; a.sv.mesaj = mesaj; return true;
}
function yerlestir(a, kx, rol) {
  if (!a.sv.acik.has(kx) || kx === a.sv.kh && a.sv.hv.ilk) return;
  uygula(a, { ...a.sv.hucre, [kx]: rol });
}
function tasi(a, kaynak, hedef) {
  if (kaynak === hedef) return;
  const y = { ...a.sv.hucre };
  const r1 = y[kaynak], r2 = y[hedef];
  if (!a.sv.acik.has(hedef) || (hedef === a.sv.kh && a.sv.hv.ilk)) return;
  delete y[kaynak];
  y[hedef] = r1;
  if (r2) y[kaynak] = r2;
  uygula(a, y);
}
function cikar(a, kx) {
  const y = { ...a.sv.hucre }; const rol = y[kx];
  delete y[kx];
  a.sv.hucre = y; a.sv.mesaj = '';
  a.sv.sec = { tip: 'kart', rol };
}
function dokun(a, kaynak) {
  const sv = a.sv;
  if (kaynak.tip === 'kart') {
    if (sv.sec?.tip === 'hucre') { const kx = sv.sec.k; sv.sec = null; yerlestir(a, kx, kaynak.rol); }
    else sv.sec = sv.sec?.rol === kaynak.rol && sv.sec.tip === 'kart' ? null : { tip: 'kart', rol: kaynak.rol };
  } else {
    const kx = kaynak.k;
    if (sv.sec?.tip === 'kart') {
      yerlestir(a, kx, sv.sec.rol);
      if (dagit(sv.k, sv.hv, sv.hucre).kalan?.[sv.sec.rol] <= 0 || sv.mesaj) sv.sec = null;
    } else if (sv.sec?.tip === 'hucre') {
      if (sv.sec.k === kx) { cikar(a, kx); } else { tasi(a, sv.sec.k, kx); sv.sec = null; }
    } else if (kx in sv.hucre) sv.sec = { tip: 'hucre', k: kx };
    else {
      const ds = dagit(sv.k, sv.hv, sv.hucre);
      const rol = sv.hv.roller.find((r) => ds.kalan?.[r] > 0);
      if (rol) yerlestir(a, kx, rol);
    }
  }
  a.savasCiz();
}
function birak(a, kaynak, hedefEl) {
  if (hedefEl.dataset.havuz != null) { if (kaynak.tip === 'hucre') cikar(a, kaynak.k); a.sv.sec = null; return; }
  const kx = hedefEl.dataset.hucre;
  a.sv.sec = null;
  if (kaynak.tip === 'kart') yerlestir(a, kx, kaynak.rol); else tasi(a, kaynak.k, kx);
}

// Dokun + sürükle-bırak (işaretçi olayları; dokunmatik için touch-action:none).
function suruklenebilir(a, el, kaynak, simge) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || !a.sv) return;
    const x0 = e.clientX, y0 = e.clientY;
    let hayalet = null, basladi = false;
    const hedefBul = (ev) => document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-hucre],[data-havuz]');
    const tasiOlayi = (ev) => {
      if (!basladi && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) {
        basladi = true; a.sv.suruk = true; el.classList.add('suruk');
        hayalet = h('div', { class: 'sv-hayalet' }, simge); document.body.append(hayalet);
      }
      if (!basladi) return;
      hayalet.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -65%)`;
      document.querySelectorAll('.sv-hucre.hedef').forEach((x) => x.classList.remove('hedef'));
      hedefBul(ev)?.classList.add('hedef');
    };
    const bitir = (ev) => {
      window.removeEventListener('pointermove', tasiOlayi);
      window.removeEventListener('pointerup', bitir);
      window.removeEventListener('pointercancel', bitir);
      if (basladi) {
        hayalet.remove();
        if (a.sv) { a.sv.suruk = false; const he = ev.type === 'pointerup' ? hedefBul(ev) : null; if (he) birak(a, kaynak, he); a.savasCiz(); }
      } else if (ev.type === 'pointerup') dokun(a, kaynak);
    };
    window.addEventListener('pointermove', tasiOlayi);
    window.addEventListener('pointerup', bitir);
    window.addEventListener('pointercancel', bitir);
  });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dokun(a, kaynak); } });
}

// ---------- Yerleşim penceresi ----------
// Dönüş: pencereKabuk parametreleri ({ baslik, ikon, govde }) ya da null (pencere yok / artık geçersiz).
export function savasPenceresi(a, d) {
  const sv = a.sv;
  if (!sv) return null;
  const k = savasKur(d, sv.uid);
  if (k.hata || k.durum !== 'bekliyor') { a.sv = null; return null; }
  sv.k = k; sv.hv = havuz(k);
  const { acik, kh } = acikHucreler(k, sv.hv);
  sv.acik = acik; sv.kh = kh;
  let ds = dagit(k, sv.hv, sv.hucre);
  if (!ds.ok) { sv.hucre = baslangicHucre(k); ds = dagit(k, sv.hv, sv.hucre); }
  const o = olasilik(a, k, sv.hv, ds);
  const eksik = ds.bos || 0;
  const dus = k.dusman;
  const y = yuzdeler(o?.olasiliklar ?? k.olasiliklar);
  const ipucu = eksik ? { m: `${eksik} birlik yerleşmedi: karttan seç, hücreye dokun.`, sinif: 'uyari' } : ipucuHesapla(k, sv.hucre);
  const bizGuc = o ? o.biz : k.guc.biz;
  const oranSinif = (o?.oran ?? k.oran) >= 1 ? 'iyi' : (o?.oran ?? k.oran) >= 0.6 ? 'uyari' : 'kotu';

  // --- ızgara ---
  const ilkB = sv.hv.ilk;
  const izgara = h('div', { class: 'sv-izgara', style: `--sut:${k.izgara.sutun}`, 'data-izgara': '1' });
  for (let s = 0; s < k.izgara.sira; s++) {
    izgara.append(h('span', { class: 'sv-sira' }, SIRA_AD[s] || ''));
    for (let c = 0; c < k.izgara.sutun; c++) {
      const kx = anahtar(s, c);
      const rol = sv.hucre[kx];
      if (kx === kh && ilkB) {
        izgara.append(h('div', { class: 'sv-hucre kahraman', title: `${ilkB.ad} (kahraman) ortada durur` }, h('span', {}, '★'), h('small', {}, ilkB.ad)));
      } else if (!acik.has(kx)) {
        const kl = k.izgara.kilitli.find((x) => x.sira === s && x.sutun === c);
        izgara.append(h('div', { class: 'sv-hucre kilit', title: kl?.acilir ? `${kl.acilir} rütbesinde açılır` : 'Kilitli' }, h('span', {}, '🔒')));
      } else {
        const secili = sv.sec?.tip === 'hucre' && sv.sec.k === kx;
        const el = h('button', { class: `sv-hucre ${rol ? `dolu r-${rol}` : 'bos'}${secili ? ' secili' : ''}`, 'data-hucre': kx, 'data-rol': rol || '', title: rol ? `${rolAd(rol)} (dokun: seç, sürükle: taşı)` : 'Boş hücre',
          'aria-label': `${SIRA_AD[s] || ''} sıra ${c + 1}. hücre${rol ? `: ${rolAd(rol)}` : ' boş'}` }, rol ? h('span', {}, ROL_SIMGE[rol] || '●') : h('span', { class: 'artı' }, '+'));
        if (rol) suruklenebilir(a, el, { tip: 'hucre', k: kx }, ROL_SIMGE[rol] || '●'); else suruklenebilir(a, el, { tip: 'hucre', k: kx }, '');
        izgara.append(el);
      }
    }
  }

  // --- kartlar ---
  const kartlar = h('div', { class: 'sv-kartlar', 'data-havuz': '1' });
  const yerlesen = {};
  for (const r of Object.values(sv.hucre)) yerlesen[r] = (yerlesen[r] || 0) + 1;
  for (const r of sv.hv.roller) {
    const n = ds.kalan?.[r] ?? 0;               // hâlâ yerleştirilebilecek
    const say = yerlesen[r] || 0;               // ızgarada
    const secili = sv.sec?.tip === 'kart' && sv.sec.rol === r;
    const guc = r === 'kahraman' || r === 'onder' ? null : (BIRIM[r]?.seferGuc ?? 1);
    const el = h('button', { class: `sv-kart r-${r}${secili ? ' secili' : ''}${n <= 0 ? ' bitti' : ''}`, 'data-kart': r, disabled: n <= 0,
      title: `${rolAd(r)}: ızgarada ${say}, ${n} birlik daha yerleştirilebilir${guc ? ` · birim gücü ${guc}` : ''}. Dokun ya da sürükle.`, 'aria-label': `${rolAd(r)} kartı, ızgarada ${say}, ${n} kaldı` },
    h('span', { class: 'sv-k-ad' }, h('i', {}, ROL_SIMGE[r] || '●'), rolAd(r)),
    h('span', { class: 'sv-k-say' }, h('b', {}, say), guc ? h('small', {}, `💪${sayi(say * guc)}`) : null),
    n > 0 ? h('u', { class: 'sv-k-boşta' }, `+${n}`) : null);
    if (n > 0) suruklenebilir(a, el, { tip: 'kart', rol: r }, ROL_SIMGE[r] || '●');
    kartlar.append(el);
  }
  if (ilkB) {
    kartlar.append(h('div', { class: 'sv-kart kahraman-k', title: `${ilkB.ad}: Sv ${ilkB.sv} — ortada sabit` },
      h('span', { class: 'sv-k-ad' }, h('i', {}, '★'), 'Kahraman'), h('span', { class: 'sv-k-say' }, h('b', {}, `Sv${ilkB.sv}`), h('small', {}, ilkB.ad))));
  }

  const sol = h('div', { class: 'sv-sol' }, izgara, kartlar);

  // --- sağ panel ---
  const dusSatiri = h('div', { class: 'sv-dus', title: `${dus.ipucu || ''}${dus.ozel?.length ? `\nÖzel: ${dus.ozel.map((x) => x.ad).join(', ')}` : ''}` },
    h('span', { class: 'sv-dus-s' }, DUSMAN_SIMGE[dus.id] || '👹'), h('div', {}, h('b', {}, dus.ad), h('small', {}, `güç ${sayi(k.guc.onlar)}${dus.ozel?.length ? ` · ${dus.ozel.map((x) => x.ad).join(', ')}` : ''}`)));
  const gucSatiri = h('div', { class: 'sv-guc' }, h('span', {}, '⚔ ', h('b', { 'data-biz': yuvarla(bizGuc, 2) }, sayi(bizGuc))), h('span', { class: 'soluk' }, ' / 🐻 ', h('b', {}, sayi(k.guc.onlar))),
    h('em', { class: oranSinif }, `${o ? `×${String(yuvarla(o.carpanlar.carpan, 2)).replace('.', ',')}` : ''}`));
  const bar = h('div', { class: 'sf-sonuc', 'data-sv-bar': '1' }, SONUC.map(([id], i) => h('i', { class: `c-${id}`, 'data-yuzde': y[i], style: `flex:${y[i]} 0 0` })));
  const yuz = h('div', { class: `sf-yuzde${o ? '' : ' sonuk'}`, 'data-sv-yuzde': '1' }, SONUC.map(([id, ad], i) => h('span', { class: `c-${id}` }, h('em', {}, ad), h('b', {}, `%${y[i]}`))));
  const aracSatiri = h('div', { class: 'sv-arac' },
    h('button', { 'data-sv': 'oneri', title: 'En yüksek çarpanlı düzen', onclick: () => { sv.hucre = oneriHucre(k); sv.sec = null; sv.mesaj = ''; a.savasCiz(); } }, '✨ Öneri'),
    h('button', { 'data-sv': 'doldur', disabled: eksik === 0, title: 'Yerleşmeyenleri kurala göre koyar: mızrakçı ön, okçu arka',
      onclick: () => { sv.hucre = doldur(k, sv.hv, sv.hucre, sv.acik); sv.sec = null; sv.mesaj = ''; a.savasCiz(); } }, '⚙ Otomatik doldur'),
    h('button', { 'data-sv': 'temizle', 'aria-label': 'Hepsini çıkar', title: 'Hepsini çıkar', class: 'sv-temizle', disabled: !Object.keys(sv.hucre).length,
      onclick: () => { sv.hucre = {}; sv.sec = { tip: 'kart', rol: sv.hv.roller[0] }; sv.mesaj = ''; a.savasCiz(); } }, '⟲'));
  const basla = h('button', { class: 'vurgu sv-basla', 'data-sv': 'basla', disabled: !ds.ok || eksik > 0, title: eksik ? 'Önce tüm birlikleri yerleştir' : '',
    onclick: () => savasBasla(a) }, '⚔ Savaşa başla');
  const sag = h('div', { class: 'sv-sag' }, dusSatiri, gucSatiri, bar, yuz,
    h('div', { class: `sv-ipucu ${ipucu.sinif}`, 'data-sv-ipucu': '1' }, sv.mesaj ? `⚠ ${sv.mesaj}` : ipucu.m), aracSatiri, basla);
  return { baslik: `Savaş düzeni · ${k.ad}`, ikon: '⚔', govde: h('div', { class: 'sv-govde' }, sol, sag) };
}

// ---------- Savaşı başlat + oynat ----------
export function savasBasla(a) {
  const sv = a.sv;
  if (!sv) return;
  const ds = dagit(sv.k, sv.hv, sv.hucre);
  if (!ds.ok || ds.bos > 0) { a.hata('Önce tüm birlikleri yerleştir.'); return; }
  const kaydet = a.oyun.komut(yerlesimKaydet, sv.uid, ds.yerlesim);
  if (kaydet.hata) return;
  a.sv = null;
  savasYap(a, sv.uid);
}
// Kayıtlı/Öneri yerleşimle hemen savaşır ("Otomatik").
export function savasOtomatik(a, uid) {
  if (a.sv?.uid === uid) a.sv = null;
  savasYap(a, uid);
}
function savasYap(a, uid) {
  const d0 = a.d;
  const sf = d0.sefer.aktif.find((s) => s.uid === uid);
  const sefer = sf ? SEFER[sf.tur] : null;
  const r = a.oyun.komut(savasBaslat, uid);
  if (r.hata) return;
  const bil = r.bildirimler || [];
  const sonuc = bil.find((b) => b.kod === 'savas_sonuc' || b.kod === 'savas_izle');
  const yildiz = bil.find((b) => b.kod === 'rutbe_yildiz');
  const bilgi = { tur: sf?.tur, ad: sefer?.ad, kademe: r.savas.kademe, zp: sonuc?.zp || 0, yildiz: yildiz ? yildiz.metin : null, tekrar: false, no: sonuc?.savas };
  savasSahnedeOynat(a, r.liste, bilgi);
}
export function savasTekrarIzle(a, no) {
  const r = savasIzle(a.d, no);
  if (!r) { a.hata('Bu savaş kaydı artık yok.'); return; }
  const g = r.girdi;
  savasSahnedeOynat(a, r.liste, { tur: g.sefer, ad: SEFER[g.sefer]?.ad, kademe: g.kademe, zp: 0, yildiz: null, tekrar: true, no });
}
function savasSahnedeOynat(a, liste, bilgi) {
  a.izleBekleyen = (a.izleBekleyen || []).filter((x) => x.no !== bilgi.no);
  a.savasBilgi = bilgi;
  a.savasCiz();
  a.yenile();
  try {
    a.sahne.savasOynat(liste, {
      hiz: 1, hud: true, arayuzGizle: true, mevsim: takvim(a.d.tur).mevsim,
      onBitti: (oz) => sonucKartiGoster(a, oz, liste, bilgi),
      onKapat: () => sonucuKapat(a),
    });
  } catch (e) {
    console.warn('[savas.oynat]', e);
    sonucKartiGoster(a, { kademe: bilgi.kademe, kademeAd: SEFER_SONUC[bilgi.kademe]?.ad, ozet: liste?.ozet || {} }, liste, bilgi);
  }
}

// ---------- Sonuç kartı ----------
function sonucKartiGoster(a, oz, liste, bilgi) {
  document.querySelector('.savas-hud .sonuc')?.style.setProperty('display', 'none');
  document.querySelector('.sv-sonuc')?.remove();
  const kd = oz.kademe || bilgi.kademe;
  const sc = SEFER_SONUC[kd] || {};
  const d = a.d;
  const s = bilgi.tur ? SEFER[bilgi.tur] : null;
  const olcek = 1 + SEFER_OLCEK * mevcutCag(d).sira;
  const odul = Object.entries(s?.odul?.kaynak || {}).map(([r, m]) => [r, Math.round(m * (sc.odul || 0) * olcek)]).filter(([, n]) => n > 0);
  const yarali = sc.yarali ? (sc.yarali[0] === sc.yarali[1] ? `${sc.yarali[0]}` : `${sc.yarali[0]}–${sc.yarali[1]}`) : '0';
  const ozet = oz.ozet || liste?.ozet || {};
  const rg = d.rutbe || {};
  const satirlar = [];
  if (!bilgi.tekrar) {
    satirlar.push(h('div', { class: 'sv-s-satir', 'data-sv-odul': '1' }, h('span', {}, '🎁 Ödül (dönüşte)'),
      h('b', {}, odul.length ? `≈ ${odul.map(([r, n]) => `${n}${kay(r)}`).join(' ')}${sc.esya ? ` · 📦 eşya ×${sc.esya}` : ''}` : 'yok')));
    satirlar.push(h('div', { class: 'sv-s-satir', 'data-sv-yarali': '1' }, h('span', {}, '🩹 Yaralı'),
      h('b', {}, `${yarali}${sc.kahramanYarali ? ' · kahraman yorulabilir' : ''}`)));
    satirlar.push(h('div', { class: 'sv-s-satir', 'data-sv-zp': '1' }, h('span', {}, '⭐ Rütbe'),
      h('b', {}, `${bilgi.zp ? `+${bilgi.zp} ZP` : 'ZP yok'} · ${rg.zp ?? 0} toplam`)));
    if (bilgi.yildiz) satirlar.push(h('div', { class: 'sv-s-yildiz', 'data-sv-yildiz': '1' }, `⭐ ${bilgi.yildiz}`));
  }
  if (ozet.ekipCan != null) satirlar.push(h('div', { class: 'sv-s-satir' }, h('span', {}, '❤ Ekip canı'), h('b', {}, `%${Math.round(ozet.ekipCan * 100)}${ozet.coken?.length ? ` · ${ozet.coken.length} birlik düştü` : ''}`)));
  const kart = h('div', { class: `sv-sonuc c-${kd}`, role: 'dialog', 'aria-label': 'Savaş sonucu' },
    h('div', { class: 'sv-s-ust' }, h('span', { class: 'sv-s-sim' }, KADEME_SIMGE[kd] || '⚔'),
      h('div', {}, h('h2', {}, oz.kademeAd || sc.ad || ''), h('small', {}, `${bilgi.ad || 'Savaş'}${bilgi.tekrar ? ' · tekrar izleme' : ''}`))),
    h('div', { class: 'sv-s-govde' }, satirlar),
    h('div', { class: 'sv-s-d' },
      !bilgi.tekrar ? h('small', { class: 'soluk' }, 'Ekip dönüş yolunda.') : null,
      h('button', { class: 'vurgu', 'data-sv': 'devam', onclick: () => { a.sahne.savasKapat(); sonucuKapat(a); } }, 'Devam ▶')));
  document.body.append(kart);
}
function sonucuKapat(a) {
  document.querySelector('.sv-sonuc')?.remove();
  a.savasBilgi = null;
  a.yenile();
}

// ---------- Sol alttaki kart (savas_hazir / savas_izle) ----------
export function savasKarti(a, d) {
  if (!a.oyun.savasSahnesi) return null;
  const sg = savasGorunumu(d, a.sec);
  for (const b of sg.bekleyen) {
    if (a.gizliKart.has(`savas:${b.uid}`)) continue;
    return { anahtar: `a-savas${b.uid}`, baslik: 'Savaş hazır', ikon: '⚔', sinif: 'aksiyon-kart savas-kart',
      kapat: () => { a.gizliKart.add(`savas:${b.uid}`); a.yenile(); }, kapatIpucu: 'Sonra',
      govde: [h('p', { class: 'sf-kart-m' }, h('b', {}, VARIS_METNI[b.dusman] || `${b.dusmanAd} karşında!`), ' Savaş hazır.', h('br'),
        h('span', { class: 'soluk' }, 'Düzeni kur; kurmazsan ekip yarın kendiliğinden saldırır.')),
      h('div', { class: 'sf-olay-s sv-kart-d' },
        h('button', { class: 'vurgu', 'data-sv': 'duzenle', onclick: () => savasAc(a, b.uid) }, '✎ Düzenle'),
        h('button', { 'data-sv': 'otomatik', onclick: () => savasOtomatik(a, b.uid) }, '⚡ Otomatik'))] };
  }
  const iz = (a.izleBekleyen || [])[0];
  if (iz && !a.sv && !a.savasBilgi) {
    return { anahtar: `a-izle${iz.no}`, baslik: 'Savaş yapıldı', ikon: '⚔', sinif: 'aksiyon-kart savas-kart',
      kapat: () => { a.izleBekleyen = a.izleBekleyen.filter((x) => x.no !== iz.no); a.yenile(); }, kapatIpucu: 'Kapat',
      govde: [h('p', { class: 'sf-kart-m' }, iz.metin), h('div', { class: 'sf-olay-s sv-kart-d' },
        h('button', { class: 'vurgu', 'data-sv': 'izle', onclick: () => { a.izleBekleyen = a.izleBekleyen.filter((x) => x.no !== iz.no); savasTekrarIzle(a, iz.no); } }, '▶ İzle'),
        h('button', { onclick: () => { a.izleBekleyen = a.izleBekleyen.filter((x) => x.no !== iz.no); a.yenile(); } }, 'Kapat'))] };
  }
  return null;
}
// Tur bildirimlerinden "savas_izle" kayıtlarını toplar (arayüz `olay` çağırır).
export function savasBildirimleriIsle(a, bildirimler) {
  if (!a.oyun.savasSahnesi) return;
  for (const b of bildirimler || []) {
    if (b.kod === 'savas_izle' && b.savas != null) a.izleBekleyen = [...(a.izleBekleyen || []).filter((x) => x.no !== b.savas), { no: b.savas, metin: b.metin }].slice(-3);
  }
}
export function savasDikkat(a, d) {
  if (!a.oyun.savasSahnesi) return false;
  return savasGorunumu(d, a.sec).bekleyen.length > 0 || (a.izleBekleyen || []).length > 0;
}

// ---------- Seferler > Savaş sekmesi ----------
export function savasSekmesi(a) {
  const d = a.d;
  const sg = savasGorunumu(d, a.sec);
  const sol = [], sag = [];
  sol.push(h('h4', {}, 'Bekleyen savaş'));
  if (sg.bekleyen.length) {
    for (const b of sg.bekleyen) {
      sol.push(h('div', { class: 'sv-bek', 'data-savas': b.uid },
        h('div', { class: 'sv-bek-ust' }, h('span', {}, DUSMAN_SIMGE[b.dusman] || '⚔', ' ', h('b', {}, b.ad)), h('small', { class: 'soluk' }, `${b.dusmanAd} karşında`)),
        h('small', { class: 'soluk' }, 'Kurmazsan ekip yarın kendiliğinden saldırır.'),
        h('div', { class: 'sv-bek-d' },
          h('button', { class: 'vurgu', 'data-sv': 'duzenle', onclick: () => savasAc(a, b.uid) }, '✎ Düzenle'),
          h('button', { 'data-sv': 'otomatik', onclick: () => savasOtomatik(a, b.uid) }, '⚡ Otomatik'))));
    }
  } else sol.push(h('p', { class: 'soluk sf-not' }, 'Bekleyen savaş yok. Ayı Avı gönder: ekip hedefe varınca düzeni burada kurarsın.'));
  const son = [...sg.son].reverse().slice(0, 3);
  if (son.length) {
    sol.push(h('h4', {}, 'Son savaşlar'));
    for (const x of son) {
      sol.push(h('div', { class: `sv-son c-${x.kademe}`, 'data-savas-no': x.no },
        h('div', {}, h('b', {}, x.ad || 'Savaş'), h('small', {}, ` ${x.kademeAd} · gün ${x.turNo + 1}`)),
        h('button', { 'data-sv': 'izle', 'aria-label': 'Savaşı izle', onclick: () => savasTekrarIzle(a, x.no) }, '▶ İzle')));
    }
  }

  // Rütbe + ordu
  const rg = sg.rutbe, og = sg.ordu;
  const yildiz = [1, 2, 3].map((i) => (i <= rg.yildiz ? '★' : '☆')).join('');
  const oran = rg.sonrakiEsik ? Math.min(1, rg.zp / rg.sonrakiEsik) : 1;
  sag.push(h('h4', {}, 'Rütbe'));
  sag.push(h('div', { class: 'sv-rutbe', 'data-rutbe': rg.id, title: `Komuta çarpanı ×${rg.komutaC}${rg.komuta?.ad ? ` · ${rg.komuta.ad}` : ''}` },
    h('span', { class: 'sv-rozet' }, h('i', {}, '⭐'), h('b', {}, rg.ad)), h('em', { class: 'sv-yildiz' }, yildiz),
    h('div', { class: 'sf-bar ilerleme' }, h('i', { style: `width:${Math.round(oran * 100)}%` })),
    h('small', { class: 'soluk' }, rg.sonrakiEsik ? `ZP ${rg.zp}/${rg.sonrakiEsik}${rg.yildiz < 3 ? ` → ★${rg.yildiz + 1}` : ''}` : `ZP ${rg.zp}`,
      rg.sonraki && !rg.sonraki.acik ? ` · ${rg.sonraki.ad} yakında` : '')));
  sag.push(h('h4', {}, `Ordu ${og.acik ? `${og.toplam}/${og.tavan}` : ''}`));
  if (!og.acik) sag.push(h('p', { class: 'soluk sf-not' }, 'Kalıcı ordu Taş Devri\'nde kurulur. Şimdilik sefere giden işçilere savaşta rol verirsin.'));
  else {
    for (const b of og.birlikler) {
      sag.push(h('div', { class: 'sv-ordu', 'data-birlik': b.id },
        h('span', { class: 'sv-o-ad' }, ROL_SIMGE[b.id] || '', ' ', b.ad, b.kademe > 1 ? h('small', {}, ` T${b.kademe}`) : null),
        h('button', { class: 'sf-pm', 'aria-label': `${b.ad} terhis`, disabled: b.koyde <= 0, title: 'Askeri işçiye döndür (bedelsiz)', onclick: () => a.oyun.komut(birlikTerhis, b.id, 1) }, '−'),
        h('b', { class: 'sf-n', 'data-asker': b.adet }, b.adet),
        h('button', { class: 'sf-pm', 'aria-label': `${b.ad} terfi`, disabled: !!b.hata, title: b.hata || `İşçiyi ${b.ad.toLocaleLowerCase('tr')} yap: ${Object.entries(b.maliyet).map(([r, n]) => `${n}${kay(r)}`).join(' ') || 'bedelsiz'}`,
          onclick: () => a.oyun.komut(birlikTerfi, b.id, 1) }, '+')));
    }
    sag.push(h('div', { class: 'soluk kucuk sv-not' }, `En çok nüfusun %30'u. Asker çalışmaz (üretim düşer) ama köyü savunur; sefere gönderilebilir.${og.seferde ? ` Seferde: ${og.seferde}.` : ''}`));
  }
  return h('div', { class: 'sf-izgara sv-sekme' }, h('div', { class: 'sf-sol' }, sol), h('div', { class: 'sf-sag' }, sag));
}

// Sefer oluşturucuda asker satırı (Taş+ ve köyde asker varsa). sf.asker = { mizrakci: n }.
export function askerSatiri(a, d, sf) {
  if (!a.oyun.savasSahnesi) return null;
  const og = savasGorunumu(d, a.sec).ordu;
  if (!og.acik) return null;
  const l = og.birlikler.filter((b) => b.koyde > 0);
  sf.asker = sf.asker || {};
  for (const b of og.birlikler) if ((sf.asker[b.id] || 0) > b.koyde) sf.asker[b.id] = b.koyde;
  if (!l.length) return null;
  return h('div', { class: 'sf-ekip sf-asker' }, l.map((b) => {
    const n = sf.asker[b.id] || 0;
    return h('span', { class: 'sf-asker-b', 'data-asker-birlik': b.id },
      h('span', { class: 'sf-et', title: b.ad }, ROL_SIMGE[b.id] || '🪖'),
      h('button', { class: 'sf-pm', 'aria-label': `${b.ad} azalt`, disabled: n <= 0, onclick: () => { sf.asker[b.id] = n - 1; a.yenile(); } }, '−'),
      h('b', { class: 'sf-n', 'data-asker': n }, n),
      h('button', { class: 'sf-pm', 'aria-label': `${b.ad} artır`, disabled: n >= b.koyde, onclick: () => { sf.asker[b.id] = n + 1; a.yenile(); } }, '+'));
  }));
}
