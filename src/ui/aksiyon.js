// Aksiyon arayüzü: sefer, kahraman, komşu ve hedef panelleri (sağ sekme penceresinde alt sekmeler), haritadaki hedef işaretleri,
// üst çubuk hedef rozeti ve sol altta küçük teklif / yol olayı kartı. Çekirdeği yalnız okur; durumu `a.oyun.komut(fn, ...)` ile değiştirir.
// Hiçbir pencere oyunu DURDURMAZ (tehdit penceresi gibi). Düzen: kompakt, tek sıra düğmeler, ≥40px dokunma hedefi.
import {
  seferGonder, seferGeriCagir, seferOlayCoz, seferOnizleme, seferGorunumu, kahramanTerfi, kahramanGorev, kahramanEsyaGiy,
  kahramanEsyaCikar, esyaYap, kahramanGorunumu, komsuTicaret, komsuElciGonder, komsuYanit, komsuGorunumu, gorevKartiSec, destanAdim,
  hedefGorunumu,
} from '../core/komutlar.js';
import { SINIF } from '../core/kahraman.js';
import { KAYNAK, binaKurulu, isciYuvasi } from '../core/yardimci.js';
import { BINALAR } from '../data/binalar.js';
import { XP_ESIK } from '../data/kahramanlar.js';
import { CAGLAR } from '../data/caglar.js';
import { kesifli } from '../world/kesif.js';
import { h, yuvarla } from './dom.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
export const ALTLAR = [['sefer', '🗺', 'Sefer'], ['yolda', '⏳', 'Yolda'], ['kahraman', '🛡', 'Kahraman'], ['komsu', '🏕', 'Komşu'], ['hedef', '🎯', 'Hedef']];
const GIZLI_SEFER = ['baskin_seferi']; // MVP: baskın / haraç / ittifak başlatma gizli (talep yanıtı panelde kalır)
const TUR_SIMGE = { kesif: '🧭', ayi_avi: '🐻', harabe: '🗿', kurt_avi: '🐺', koyun: '🐑', uzak_kamp: '⛺' };
const TUR_KISA = { kesif: 'Keşif', ayi_avi: 'Ayı Avı', harabe: 'Harabe', kurt_avi: 'Kurt Avı', koyun: 'Sürü', uzak_kamp: 'Kamp' };
export const ISARET_SIMGE = { ayi: '🐻', iz: '🐾', harabe: '🗿', suru: '🐑', ates: '⛺', kaynak: '🌲' };
const SONUC = [['buyuk', 'Büyük başarı', 'b'], ['basari', 'Başarı', 's'], ['kismi', 'Kısmi', 'k'], ['basarisiz', 'Başarısız', 'x']];
const SONUC_AD = Object.fromEntries(SONUC.map(([id, ad]) => [id, ad]));
const YUVA_SIMGE = { silah: '🗡', giysi: '🧥', tilsim: '📿' };
const NIYET_METNI = { ittifak: 'ittifak öneriyor', ticaret: 'takas öneriyor', harac: 'haraç istiyor', baskin: 'baskına hazırlanıyor', dusmanca: 'düşmanca bakıyor', sessiz: 'sessiz' };
const ILISKI_RENK = { dusman: 'kotu', soguk: 'uyari', notr: '', dost: 'iyi', muttefik: 'iyi' };
export const KOD_SIMGE = [['sefer_', '🗺'], ['kahraman_', '🛡'], ['komsu_', '🏕'], ['hedef_', '🎯']];
export const kodSimge = (kod) => (KOD_SIMGE.find(([p]) => (kod || '').startsWith(p)) || [])[1] || '';

const kay = (r) => KAYNAK[r]?.simge ?? r;
const maliyet = (m) => Object.entries(m || {}).filter(([, x]) => x > 0).map(([r, x]) => `${Math.max(1, Math.round(x))}${kay(r)}`).join(' ') || 'bedelsiz';
const maliyetAd = (m) => Object.entries(m || {}).filter(([, x]) => x > 0).map(([r, x]) => `${Math.round(x)} ${(KAYNAK[r]?.ad ?? r).toLocaleLowerCase('tr')}`).join(', ');

// En büyük kalan yöntemiyle toplamı tam 100 olan tamsayı yüzdeler (dizi sırası SONUC ile aynı).
export function yuzdeler(p) {
  const ham = SONUC.map(([id]) => Math.max(0, (p?.[id] || 0) * 100));
  const taban = ham.map(Math.floor);
  let eksik = 100 - taban.reduce((a, b) => a + b, 0);
  ham.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (eksik > 0) { taban[i] += 1; eksik -= 1; } });
  return taban;
}

function etkiMetni(e = {}) {
  const p = [];
  if (e.guc) p.push(`güç +${e.guc}`);
  if (e.xp) p.push(`XP +%${Math.round(e.xp * 100)}`);
  if (e.sureAz) p.push('süre −1');
  if (e.kisCeza === false) p.push('kış cezası yok');
  if (e.yaraliSure) p.push(`yaralı −${e.yaraliSure}`);
  if (e.yaraliKoru) p.push('yaralıdan korur');
  if (e.huzur) p.push(`huzur +${e.huzur}`);
  return p.join(', ');
}

// ---------- Dikkat noktaları (sekme rozetleri) ----------
export function dikkatDurumu(a, d) {
  const son = (d.sefer?.son || []).at(-1);
  const hg = d.hedef ? hedefGorunumu(d) : null;
  const o = {
    sefer: false,
    yolda: (d.sefer?.aktif || []).some((s) => s.olay) || (!!son && son.uid !== a.gorulenSon),
    kahraman: !!d.kahramanDurum?.teklif,
    komsu: (d.komsular || []).some((k) => k.niyet && !k.niyet.kullanildi && ['harac', 'ittifak', 'ticaret'].includes(k.niyet.tur)),
    hedef: !!hg && ((hg.kartlar.length > 0 && !hg.gorev) || !!hg.destan?.komut?.uygun),
  };
  o.hepsi = Object.values(o).some(Boolean);
  return o;
}

// ---------- Küçük görsel parçalar ----------
const SAC = ['#2a1d12', '#5b3a1e', '#1b1b1f', '#8a5a2b', '#3d2a4f', '#6b2b1e'];
const TEN = ['#e0b08a', '#c68b5e', '#a8693f'];
export function portre(k, px = 40) {
  const i = Number(k.portre) || 0;
  const sac = SAC[i % SAC.length], ten = TEN[i % TEN.length];
  const sacYol = [
    'M11 20c0-9 5-12 9-12s9 3 9 12c-2-4-5-6-9-6s-7 2-9 6z', 'M10 24c-2-12 4-17 10-17s12 5 10 17c-1-6-4-10-10-10s-9 4-10 10z',
    'M12 19c1-7 4-9 8-9s7 2 8 9c-3-3-5-4-8-4s-5 1-8 4z', 'M11 22c0-10 4-14 9-14s9 4 9 14l-2 6c0-8-3-12-7-12s-7 4-7 12z',
    'M13 18c0-6 3-9 7-9s7 3 7 9c-2-2-4-3-7-3s-5 1-7 3z', 'M10 21c0-10 5-13 10-13s10 3 10 13c-3-5-6-7-10-7s-7 2-10 7z',
  ][i % 6];
  const el = h('span', { class: 'sf-por', style: `width:${px}px;height:${px}px` });
  el.innerHTML = `<svg viewBox="0 0 40 40" width="${px}" height="${px}" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="${k.renk}"/>`
    + `<path d="M6 38c1-8 7-11 14-11s13 3 14 11a19 19 0 0 1-28 0z" fill="rgba(0,0,0,0.35)"/><circle cx="20" cy="19" r="7.5" fill="${ten}"/>`
    + `<path d="${sacYol}" fill="${sac}"/></svg>`;
  return el;
}

const cubuk = (oran, sinif = '') => h('div', { class: `sf-bar ${sinif}` }, h('i', { style: `width:${Math.round(Math.max(0, Math.min(1, oran)) * 100)}%` }));
const alt = (k, ek) => h('small', {}, k, ek);

// ---------- Ana sekme ----------
export function aksiyonSekmesi(a) {
  const d = a.d;
  const dk = dikkatDurumu(a, d);
  const g = seferGorunumu(d);
  const yoldaN = g.aktif.length;
  const sade = (id) => (id === 'yolda' && yoldaN ? ` ${yoldaN}` : '');
  const serit = h('div', { class: 'sf-serit' }, ALTLAR.map(([id, ik, ad]) =>
    h('button', { class: `${a.aksiyonAlt === id ? 'secili' : ''}${dk[id] ? ' dikkat' : ''}`, 'data-alt': id, onclick: () => { a.aksiyonAlt = id; a.yenile(); } },
      h('span', {}, ik), h('em', {}, `${ad}${sade(id)}`))));
  let govde;
  if (a.aksiyonAlt === 'yolda') govde = yoldaPaneli(a, d, g);
  else if (a.aksiyonAlt === 'kahraman') govde = kahramanPaneli(a, d);
  else if (a.aksiyonAlt === 'komsu') govde = komsuPaneli(a, d);
  else if (a.aksiyonAlt === 'hedef') govde = hedefPaneli(a, d);
  else govde = seferPaneli(a, d, g);
  return h('div', { class: 'sf-kok' }, serit, h('div', { class: `sf-icerik sf-${a.aksiyonAlt}` }, govde));
}

// ---------- SEFER (oluşturucu + önizleme) ----------
function seferPaneli(a, d, g) {
  const sf = a.sf;
  const turler = g.turler.filter((t) => !GIZLI_SEFER.includes(t.id));
  if (!turler.some((t) => t.id === sf.tur && t.acik)) sf.tur = (turler.find((t) => t.acik) || turler[0])?.id ?? null;
  const tur = turler.find((t) => t.id === sf.tur);
  if (!tur) return h('p', { class: 'soluk' }, 'Bu çağda açık sefer yok.');
  const hedefler = tur.hedef === 'isaret' ? g.isaretler.filter((i) => i.tur === tur.isaret) : [];
  if (tur.hedef === 'isaret' && !hedefler.some((i) => i.uid === sf.hedef && !i.rezerve)) sf.hedef = (hedefler.find((i) => !i.rezerve) || hedefler[0])?.uid ?? null;
  const hedef = tur.hedef === 'isaret' ? sf.hedef : null;
  if (!sf.hazir) { sf.kahraman = g.kahramanlar.filter((k) => k.uygun).map((k) => k.uid); sf.isci = Math.min(2, g.bosIsci); sf.onder = false; sf.hazir = true; }
  sf.kahraman = sf.kahraman.filter((u) => g.kahramanlar.some((k) => k.uid === u && k.uygun));
  sf.isci = Math.max(0, Math.min(sf.isci, g.bosIsci));
  if (sf.onder && !g.onderUygun) sf.onder = false;
  const ekip = { kahraman: sf.kahraman, isci: sf.isci, onder: sf.onder };
  const o = seferOnizleme(d, sf.tur, hedef, ekip);

  const turSatiri = h('div', { class: 'sf-tur' }, turler.map((t) =>
    h('button', { class: sf.tur === t.id ? 'secili' : '', disabled: !t.acik, title: t.acik ? t.metin : t.hata, 'data-tur': t.id,
      onclick: () => { sf.tur = t.id; a.yenile(); } }, h('span', {}, TUR_SIMGE[t.id] || '🗺'), h('em', {}, TUR_KISA[t.id] || t.ad))));

  let hedefSatiri;
  if (tur.hedef !== 'isaret') hedefSatiri = h('div', { class: 'sf-not soluk' }, 'Hedefsiz: sisin ötesini yoklar.');
  else if (!hedefler.length) hedefSatiri = h('div', { class: 'sf-not soluk' }, 'Haritada bu hedef yok. Keşfet ya da Keşif Seferi gönder.');
  else {
    hedefSatiri = h('div', { class: 'sf-hedefler' }, hedefler.map((i) =>
      h('button', { class: sf.hedef === i.uid ? 'secili' : '', disabled: i.rezerve, 'data-hedef': i.uid, title: i.rezerve ? 'Bu işarete zaten bir ekip gidiyor.' : `${i.ad}: ${i.kalan} gün sonra kaybolur`,
        onclick: () => { sf.hedef = i.uid; a.yenile(); } }, `${ISARET_SIMGE[i.tur] || '📍'} ${i.ad} · ${i.kalan}g`)));
  }

  const kahSatiri = g.kahramanlar.length
    ? h('div', { class: 'sf-kahlar' }, g.kahramanlar.map((k) => {
      const ic = sf.kahraman.includes(k.uid);
      return h('button', { class: ic ? 'secili' : '', disabled: !k.uygun, title: k.uygun ? '' : `${k.ad} şu an uygun değil (yaralı ya da seferde).`, 'data-kahraman': k.uid,
        onclick: () => { sf.kahraman = ic ? sf.kahraman.filter((u) => u !== k.uid) : [...sf.kahraman, k.uid]; a.yenile(); } }, `${ic ? '✓ ' : ''}${k.ad}`);
    }))
    : h('div', { class: 'sf-not soluk' }, 'Kahraman yok (ilk kahraman 6. günde çıkar).');

  const ekipSatiri = h('div', { class: 'sf-ekip' },
    h('span', { class: 'sf-et' }, '👷'),
    h('button', { class: 'sf-pm', 'aria-label': 'İşçi azalt', disabled: sf.isci <= 0, onclick: () => { sf.isci -= 1; a.yenile(); } }, '−'),
    h('b', { class: 'sf-n', 'data-isci': sf.isci }, sf.isci),
    h('button', { class: 'sf-pm', 'aria-label': 'İşçi artır', disabled: sf.isci >= g.bosIsci, onclick: () => { sf.isci += 1; a.yenile(); } }, '+'),
    h('button', { class: `sf-onder${sf.onder ? ' secili' : ''}`, disabled: !g.onderUygun, title: g.onderUygun ? 'Önder de gider (eylemi o süre seferde)' : 'Önder uygun değil.',
      onclick: () => { sf.onder = !sf.onder; a.yenile(); } }, `${sf.onder ? '✓ ' : ''}🧭 Önder`));

  const sol = h('div', { class: 'sf-sol' }, turSatiri, hedefSatiri, kahSatiri, ekipSatiri);
  const sag = h('div', { class: 'sf-sag' }, onizlemeBlogu(a, d, o, g), gonderDugmesi(a, d, o, sf, hedef, ekip));
  return h('div', { class: 'sf-izgara' }, sol, sag);
}

function onizlemeBlogu(a, d, o, g) {
  if (o.guc == null) return h('div', { class: 'sf-onizleme' }, h('div', { class: 'neden' }, `⚠ ${o.hata}`));
  const y = yuzdeler(o.olasiliklar);
  const olcek = Math.max(o.guc, o.zorluk * 1.5, 1);
  const renk = o.oran >= 1 ? 'iyi' : o.oran >= 0.6 ? 'uyari' : 'kotu';
  const sav = o.savunmaOnce, sonra = o.savunmaSonra;
  const odul = [maliyet(o.odul?.kaynak), o.odul?.bp ? `${o.odul.bp}💡` : ''].filter((x) => x && x !== 'bedelsiz').join(' ');
  return h('div', { class: 'sf-onizleme' },
    h('div', { class: 'sf-guc', title: o.kalemler.map((k) => `${k.ad}: ${yuvarla(k.deger)}`).join('\n') },
      h('span', {}, '💪 Güç ', h('b', {}, yuvarla(o.guc))), h('span', { class: 'soluk' }, ' / Zorluk ', h('b', {}, o.zorluk)),
      h('em', { class: renk }, o.oran >= 1.21 ? 'üstün' : o.oran >= 0.79 ? 'denk' : o.oran >= 0.55 ? 'zayıf' : 'riskli')),
    h('div', { class: `sf-bar guc ${renk}`, 'data-oran': o.oran }, h('i', { style: `width:${Math.round(o.guc / olcek * 100)}%` }), h('u', { style: `left:${Math.round(o.zorluk / olcek * 100)}%` })),
    h('div', { class: 'sf-sonuc', title: 'Sonuç olasılıkları' }, SONUC.map(([id], i) => h('i', { class: `c-${id}`, 'data-yuzde': y[i], style: `flex:${y[i]} 0 0` }))),
    h('div', { class: 'sf-yuzde' }, SONUC.map(([id, ad], i) => h('span', { class: `c-${id}` }, h('em', {}, ad), h('b', {}, `%${y[i]}`)))),
    h('div', { class: 'sf-meta' },
      h('span', { title: 'Yolculuk süresi' }, '⏱ ', h('b', {}, `${o.sure} gün`)),
      h('span', { title: 'Peşin yiyecek erzakı' }, '🍖 ', h('b', {}, `${o.erzak} erzak`)),
      odul ? h('span', { title: 'Başarıdaki taban ödül' }, '🎁 ', h('b', {}, odul)) : null),
    h('div', { class: `sf-sav${sonra < sav - 0.05 ? ' dus' : ''}`, title: 'Seferdeki işçi, önder ve kahraman köyü savunamaz' }, '🛡 Köy savunması ', h('b', {}, yuvarla(sav)), ' → ', h('b', {}, yuvarla(sonra))),
    o.uyari ? h('div', { class: 'sf-uyari' }, `⚠ ${o.uyari}`) : null,
    !o.uygun && o.hata ? h('div', { class: 'neden sf-hata' }, `⚠ ${o.hata}`) : null);
}

function gonderDugmesi(a, d, o, sf, hedef, ekip) {
  return h('button', { class: 'vurgu sf-gonder', disabled: !o.uygun, 'data-gonder': '1', title: o.uygun ? '' : o.hata,
    onclick: () => {
      const r = a.oyun.komut(seferGonder, sf.tur, hedef, ekip);
      if (!r.hata) { sf.hazir = false; a.aksiyonAlt = 'yolda'; a.yenile(); }
    } }, '🗺 Gönder');
}

// ---------- YOLDA (devam eden seferler, olaylar, son sonuçlar) ----------
function yoldaPaneli(a, d, g) {
  const son = (d.sefer?.son || []).at(-1);
  if (son) a.gorulenSon = son.uid;
  const adlar = Object.fromEntries(g.turler.map((t) => [t.id, t.ad]));
  const liste = g.aktif.map((s) => {
    const ekipMetni = [...s.ekip.kahraman.map((k) => k.ad), s.ekip.isci ? `${s.ekip.isci} işçi` : null, s.ekip.onder ? 'Önder' : null].filter(Boolean).join(' · ');
    const y = yuzdeler(s.olasiliklar);
    return h('div', { class: `sf-yol${s.olay ? ' olayli' : ''}`, 'data-sefer': s.uid },
      h('div', { class: 'sf-yol-ust' },
        h('span', { class: 'sf-yol-ad' }, TUR_SIMGE[s.tur] || '🗺', ' ', h('b', {}, s.ad)),
        h('span', { class: 'sf-kalan', title: 'Dönüşe kalan gün' }, `⏳ ${s.kalan}/${s.sure} gün`),
        s.geriCagrilir ? h('button', { class: 'kucuk-d sf-geri', title: 'Bu tur geri çağırırsan erzakın yarısı iade edilir.', onclick: () => a.oyun.komut(seferGeriCagir, s.uid) }, '↩ Geri çağır') : null),
      h('div', { class: 'sf-yol-alt soluk' }, ekipMetni || 'ekip', ' · ', `başarı %${y[0] + y[1]}`),
      cubuk((s.sure - s.kalan) / Math.max(1, s.sure), 'ilerleme'),
      s.olay ? h('div', { class: 'sf-olay' },
        h('div', { class: 'sf-olay-m' }, h('b', {}, `${s.olay.ad}: `), s.olay.metin),
        h('div', { class: 'sf-olay-s' }, s.olay.secenekler.map((m, i) =>
          h('button', { 'data-secenek': i, onclick: () => a.oyun.komut(seferOlayCoz, s.uid, i) }, m)))) : null);
  });
  const sonlar = [...(d.sefer?.son || [])].reverse().slice(0, 3).map((x) => {
    const kazanc = Object.entries(x.kazanc || {}).filter(([, n]) => n > 0).map(([r, n]) => `${Math.round(n)}${kay(r)}`).join(' ');
    return h('div', { class: `sf-son c-${x.sonuc}` }, h('b', {}, adlar[x.tur] || x.tur), h('span', {}, SONUC_AD[x.sonuc]),
      h('small', {}, [kazanc, x.bp ? `${x.bp}💡` : '', x.xp ? `${x.xp} XP` : '', x.yarali ? `${x.yarali} yaralı` : ''].filter(Boolean).join(' · ') || 'kazanç yok'));
  });
  return [
    liste.length ? liste : h('p', { class: 'soluk sf-bos' }, 'Yolda sefer yok. 🗺 Sefer sekmesinden ekip gönder.'),
    sonlar.length ? [h('h4', {}, 'Son dönenler'), sonlar] : null,
    h('div', { class: 'soluk kucuk sf-ipucu' }, `Aynı anda en çok ${g.enCok} sefer. Yoldaki ekip üretmez ve köyü savunmaz.`)];
}

// ---------- KAHRAMAN ----------
function kahramanPaneli(a, d) {
  const kg = kahramanGorunumu(d);
  const ust = [];
  if (kg.teklif) {
    ust.push(h('div', { class: 'sf-teklif' },
      h('div', { class: 'sf-teklif-m' }, h('b', {}, '🔥 Ateş Başında Bir Ses'), ' Kabileden biri öne çıkıyor. Hangi yolu seçsin?'),
      h('div', { class: 'sf-teklif-d' }, kg.teklif.siniflar.map((s) => teklifDugmesi(a, s)))));
  }
  const secili = kg.liste.find((k) => k.uid === a.kahSecili) || kg.liste[0];
  if (secili) a.kahSecili = secili.uid;
  const sol = [], sag = [];
  if (kg.liste.length > 1) {
    sol.push(h('div', { class: 'sf-kahsec' }, kg.liste.map((k) =>
      h('button', { class: k.uid === a.kahSecili ? 'secili' : '', onclick: () => { a.kahSecili = k.uid; a.yenile(); } }, `${k.ad} · Sv${k.seviye}`))));
  }
  if (secili) sol.push(kahramanKarti(a, d, kg, secili));
  else if (!kg.teklif) sol.push(h('p', { class: 'soluk sf-bos' }, d.kahramanDurum?.ilk ? 'Köyde kahraman yok.' : 'İlk kahraman 6. günde ortaya çıkar (Avcı ya da Kaşif).'));
  // Sağ sütun: sandık, eşya yap, Ateş Yemini
  sag.push(h('h4', {}, `Sandık ${kg.sandik.length}/${kg.sandikMax}`));
  sag.push(kg.sandik.length
    ? h('div', { class: 'sf-sandik' }, kg.sandik.map((e) => h('button', { disabled: !secili || secili.seferde, title: `${e.ad} (${e.yuvaAd}): ${etkiMetni(e.etki)}${secili ? `\n${secili.ad} giyer` : ''}`, 'data-esya': e.id,
      onclick: () => a.oyun.komut(kahramanEsyaGiy, secili.uid, e.id) }, h('span', {}, `${YUVA_SIMGE[e.yuva]} ${e.ad}`), h('small', {}, etkiMetni(e.etki)))))
    : h('div', { class: 'soluk sf-not' }, 'Boş. Sefer ve harabelerden eşya çıkar.'));
  if (kg.tarifler.length) {
    sag.push(h('h4', {}, 'Eşya yap'));
    sag.push(h('div', { class: 'sf-sandik' }, kg.tarifler.map((t) => h('button', { disabled: !t.uygun, title: t.hata || '', 'data-tarif': t.id, onclick: () => a.oyun.komut(esyaYap, t.id) },
      h('span', {}, `🔨 ${t.ad}`), h('small', {}, maliyet(t.kaynak))))));
    const ilk = kg.tarifler.find((t) => !t.uygun);
    if (ilk) sag.push(h('div', { class: 'soluk sf-not' }, ilk.hata));
  }
  if (!kg.teklif && kg.liste.length < kg.tavan) {
    const t = kg.terfi.filter((x) => x.sinif);
    if (t.length) {
      sag.push(h('h4', {}, `Ateş Yemini ${kg.liste.length}/${kg.tavan}`));
      sag.push(h('div', { class: 'sf-sandik' }, t.map((x) => h('button', { disabled: !x.uygun, title: x.hata || '', 'data-terfi': x.sinif, onclick: () => a.oyun.komut(kahramanTerfi, x.sinif) },
        h('span', {}, `➕ ${x.ad}`), h('small', {}, maliyet(x.maliyet))))));
      const ilk = t.find((x) => !x.uygun);
      if (ilk && t.every((x) => !x.uygun)) sag.push(h('div', { class: 'neden sf-not' }, ilk.hata));
    }
  }
  return [ust, h('div', { class: 'sf-izgara kah' }, h('div', { class: 'sf-sol' }, sol), h('div', { class: 'sf-sag' }, sag))];
}

function teklifDugmesi(a, s) {
  const c = SINIF[s.id];
  const y = c?.yetenekler?.[0];
  return h('button', { class: 'vurgu', 'data-terfi': s.id, title: y ? `${y.ad}: ${y.metin}` : '', onclick: () => a.oyun.komut(kahramanTerfi, s.id) },
    h('span', {}, s.ad), h('small', {}, y?.ad || ''));
}

function kahramanKarti(a, d, kg, k) {
  const alt0 = XP_ESIK[k.seviye - 1] ?? 0;
  const xpOran = k.xpSonraki == null ? 1 : (k.xp - alt0) / Math.max(1, k.xpSonraki - alt0);
  const ustaAdaylari = d.binalar.filter((b) => binaKurulu(d, b) && isciYuvasi(b) > 0 && !(d.kahramanlar || []).some((x) => x.uid !== k.uid && x.gorev?.tur === 'usta' && x.gorev.hedef === b.uid));
  const gorev = (tur) => k.gorev?.tur === tur;
  const gorevDugme = (tur, ad, ipucu) => h('button', { class: gorev(tur) ? 'secili' : '', disabled: k.seferde || k.yarali > 0, title: k.seferde ? 'Seferde.' : k.yarali ? 'Yaralı.' : ipucu, 'data-gorev': tur || 'yok',
    onclick: () => {
      if (tur === 'usta') { a.ustaSecim = a.ustaSecim === k.uid ? null : k.uid; a.yenile(); return; }
      a.ustaSecim = null; a.oyun.komut(kahramanGorev, k.uid, tur);
    } }, `${gorev(tur) || (!tur && !k.gorev) ? '✓ ' : ''}${ad}`);
  return h('div', { class: 'sf-kah', 'data-kahraman': k.uid },
    h('div', { class: 'sf-kah-ust' }, portre(k, 44),
      h('div', { class: 'sf-kah-ad', title: `Sefer gücü ${k.guc} · köy savunması ${k.savunma}` }, h('b', {}, k.ad), h('span', { class: 'soluk' }, `${k.sinifAd} · Sv ${k.seviye}`),
        k.yarali > 0 ? h('em', { class: 'yarali' }, `🩹 ${k.yarali} gün`) : k.seferde ? h('em', { class: 'seferde' }, '🗺 seferde') : h('span', { class: 'soluk' }, `💪${k.guc} 🛡${k.savunma}`)),
      h('div', { class: 'sf-kah-xp', title: `XP ${k.xp}${k.xpSonraki != null ? ` / ${k.xpSonraki}` : ' (ustalık)'}` }, cubuk(xpOran, 'xp'),
        h('small', {}, k.xpSonraki == null ? 'Ustalık' : `${k.xp}/${k.xpSonraki} XP`))),
    h('div', { class: 'sf-yetenek' }, k.yetenekler.map((y) => h('span', { class: y.acik ? 'acik' : 'kilit', title: `${y.ad} (Sv ${y.sv}): ${y.metin}` }, `${y.acik ? '' : '🔒 '}${y.ad}${y.acik ? '' : ` Sv${y.sv}`}`))),
    h('div', { class: 'sf-yuvalar' }, ['silah', 'giysi', 'tilsim'].map((y) => {
      const e = k.esya[y];
      return h('button', { class: e ? 'dolu' : '', disabled: !e || k.seferde, 'data-yuva': y, title: e ? `${e.ad}: ${etkiMetni(e.etki)}\nÇıkarmak için dokun.` : `${y === 'silah' ? 'Silah' : y === 'giysi' ? 'Giysi' : 'Tılsım'} yuvası boş. Sandıktan bir eşya seç.`,
        onclick: () => a.oyun.komut(kahramanEsyaCikar, k.uid, y) }, h('span', {}, YUVA_SIMGE[y]), h('small', {}, e ? e.ad : 'boş'));
    })),
    h('div', { class: 'sf-gorev' }, h('span', { class: 'sf-et soluk' }, 'Görev'),
      gorevDugme(null, 'Yok', 'Görevsiz'), gorevDugme('bekci', 'Bekçi', `Köyü savunur: +${k.savunma} savunma`), gorevDugme('danisman', 'Danışman', 'Sınıf yeteneği köyde işler'),
      gorevDugme('usta', k.gorev?.tur === 'usta' && k.gorevHedefAd ? `Usta·${k.gorevHedefAd}` : 'Usta', 'Bir atölyede üretim +%25')),
    a.ustaSecim === k.uid ? h('div', { class: 'sf-usta' }, ustaAdaylari.length
      ? ustaAdaylari.map((b) => h('button', { class: k.gorev?.hedef === b.uid ? 'secili' : '', onclick: () => { a.ustaSecim = null; a.oyun.komut(kahramanGorev, k.uid, { tur: 'usta', hedef: b.uid }); } }, BINA[b.id].ad))
      : h('span', { class: 'soluk sf-not' }, 'Usta olabilecek (işçi çalıştıran) bina yok.')) : null);
}

// ---------- KOMŞU ----------
function komsuPaneli(a, d) {
  const liste = komsuGorunumu(d);
  if (!liste.length) {
    return h('div', { class: 'sf-bos' }, h('p', { class: 'soluk' }, 'Henüz komşu bulunamadı.'),
      h('p', { class: 'soluk kucuk' }, 'Taş Devri\'nde haritanın dörtte biri keşfedilince ya da bir Keşif Seferi başarıyla dönünce komşu köy görünür.'));
  }
  return liste.map((k) => {
    const n = k.niyet;
    const oran = (k.iliski + 100) / 200;
    const talep = k.yanit.uygun ? n : null;
    const tk = k.ticaret.uygun ? n.takas : null;
    return h('div', { class: 'sf-komsu', 'data-komsu': k.id },
      h('div', { class: 'sf-komsu-ust' }, h('span', { class: 'sf-komsu-ik' }, '🏕'),
        h('div', { class: 'sf-komsu-ad' }, h('b', {}, k.ad), h('span', { class: 'soluk' }, `${k.mizacAd} · ${CAGLAR.find((c) => c.id === k.cag)?.ad ?? k.cag}`)),
        h('div', { class: 'sf-komsu-guc', title: 'Komşunun gücü, köy savunmanıza göre' }, `⚔ ${k.guc}`, h('small', {}, k.gucKademe))),
      h('div', { class: 'sf-iliski', title: `İlişki ${k.iliski} (−100…+100)` },
        h('span', { class: `sf-il-et ${ILISKI_RENK[k.etiket] || ''}` }, `${k.etiketAd} ${k.iliski > 0 ? '+' : ''}${k.iliski}`),
        h('div', { class: 'sf-il-bar' }, h('i', { style: `left:${Math.round(Math.min(oran, 0.5) * 100)}%;width:${Math.round(Math.abs(oran - 0.5) * 100)}%`, class: k.iliski >= 0 ? 'pozitif' : 'negatif' }), h('u', {}))),
      h('div', { class: 'sf-niyet soluk' }, n && n.tur !== 'sessiz' ? `Son haber: ${NIYET_METNI[n.tur] || n.tur}${n.kalan ? ` (${n.kalan} gün)` : ''}.` : 'Son haber: sessiz.'),
      talep ? h('div', { class: 'sf-talep' },
        h('span', {}, talep.tur === 'harac' ? `💰 Haraç talebi: ${maliyetAd(talep.harac)}` : '🤝 İttifak teklifi'),
        h('div', { class: 'sf-talep-d' },
          h('button', { class: 'iyi', 'data-yanit': 'kabul', onclick: () => a.oyun.komut(komsuYanit, k.id, 'kabul') }, talep.tur === 'harac' ? 'Öde' : 'Kabul'),
          h('button', { class: 'kotu', 'data-yanit': 'red', onclick: () => a.oyun.komut(komsuYanit, k.id, 'red') }, 'Reddet'))) : null,
      h('div', { class: 'sf-komsu-d' },
        h('button', { disabled: !k.hediye.uygun, title: k.hediye.hata || `Hediye: ${maliyetAd(k.hediye.maliyet)} · ilişki +${k.hediye.iliski}`, 'data-elci': k.id,
          onclick: () => a.oyun.komut(komsuElciGonder, k.id) }, h('span', {}, '🕊 Elçi'), h('small', {}, `${maliyet(k.hediye.maliyet)} · +${k.hediye.iliski}`)),
        h('button', { disabled: !tk, title: tk ? `Ver ${tk.verMiktar} ${KAYNAK[tk.ver].ad}, al ${tk.alMiktar} ${KAYNAK[tk.al].ad}` : 'Bu mevsim takas teklifi yok.', 'data-ticaret': k.id,
          onclick: () => a.oyun.komut(komsuTicaret, k.id) }, h('span', {}, '🤝 Takas'),
        h('small', {}, tk ? `${tk.verMiktar}${kay(tk.ver)}→${tk.alMiktar}${kay(tk.al)}` : 'teklif yok'))),
      !k.hediye.uygun && k.hediye.hata ? h('div', { class: 'soluk sf-not' }, k.hediye.hata) : null);
  });
}

// ---------- HEDEF ----------
function hedefPaneli(a, d) {
  const hg = hedefGorunumu(d);
  const bloklar = [];
  const ds = hg.destan;
  if (ds) {
    const n = ds.adimlar.length;
    bloklar.push(h('div', { class: 'sf-destan' },
      h('div', { class: 'sf-destan-ust' }, h('b', {}, `📜 ${ds.ad}`), h('span', { class: 'soluk' }, ds.bitti ? 'tamamlandı' : `adım ${ds.adim + 1}/${n}`)),
      h('div', { class: 'sf-adimlar' }, ds.adimlar.map((x, i) =>
        h('div', { class: `sf-adim${x.tamam ? ' tamam' : x.etkin ? ' etkin' : ''}` }, h('i', {}, x.tamam ? '✓' : i + 1), h('span', {}, x.metin)))),
      cubuk(ds.bitti ? 1 : ds.adim / n, 'destan'),
      !ds.bitti && ds.komut?.uygun ? h('button', { class: 'vurgu sf-destan-d', 'data-destan': '1', onclick: () => a.oyun.komut(destanAdim) }, '✨ Postu Totem\'e sun') : null,
      !ds.bitti && ds.adimlar[ds.adim] && ds.komut && !ds.komut.uygun && ds.komut.hata && !/komutla tamamlanmaz/.test(ds.komut.hata) ? h('div', { class: 'neden sf-not' }, ds.komut.hata) : null,
      h('div', { class: 'soluk sf-not' }, `Ödül: ${ds.odul.esyaAd || 'eşya'}${ds.odul.huzurKalici ? `, kalıcı huzur +${ds.odul.huzurKalici}` : ''}${ds.odul.unvan ? `, unvan "${ds.odul.unvan}"` : ''}.`)));
  }
  if (hg.gorev) {
    bloklar.push(h('h4', {}, 'Mevsim görevi'));
    bloklar.push(h('div', { class: 'sf-gorev-k etkin' }, h('b', {}, hg.gorev.ad), h('span', {}, hg.gorev.metin), h('small', {}, `⏳ ${hg.gorev.kalan} gün · ${odulMetni(hg.gorev.odul)}`)));
  } else if (hg.kartlar.length) {
    bloklar.push(h('h4', {}, 'Mevsim görevi (isteğe bağlı)'));
    if (hg.kartKalan != null) bloklar.push(h('div', { class: 'soluk sf-not' }, `Görmezden gelebilirsin; ${hg.kartKalan} gün sonra kendiliğinden kapanır.`));
    bloklar.push(h('div', { class: 'sf-kartlar' }, hg.kartlar.map((k) =>
      h('button', { class: 'sf-gorev-k', 'data-kart': k.id, onclick: () => a.oyun.komut(gorevKartiSec, k.id) },
        h('b', {}, k.ad), h('span', {}, k.metin), h('small', {}, `${k.sure} gün · ${odulMetni(k.odul)}`)))));
  } else bloklar.push(h('div', { class: 'soluk sf-not' }, 'Zaman zaman isteğe bağlı bir mevsim görevi çıkar; istersen birini seçersin, istemezsen kendiliğinden kapanır.'));
  if (hg.unvanlar.length) bloklar.push(h('div', { class: 'soluk sf-not' }, `Unvanlar: ${hg.unvanlar.join(', ')}`));
  bloklar.push(h('div', { class: 'sf-ritim' }, '🌱 Bahar: keşif · ☀️ Yaz: sefer · 🍂 Güz: hazırlık · ❄️ Kış: tehdit'));
  return bloklar;
}
function odulMetni(o = {}) {
  const p = [];
  if (o.kaynak) p.push(maliyet(o.kaynak));
  if (o.bp) p.push(`${o.bp}💡`);
  if (o.xp) p.push(`${o.xp} XP`);
  if (o.huzur) p.push(`huzur +${o.huzur}`);
  if (o.iliski) p.push(`ilişki +${o.iliski}`);
  return p.join(' ') || 'küçük ödül';
}

// ---------- Üst çubuk hedef rozeti ----------
export function hedefCipi(a, d) {
  if (!d.hedef) return null;
  const hg = hedefGorunumu(d);
  const kartBekler = hg.kartlar.length > 0 && !hg.gorev;
  let etiket, ipucu;
  if (kartBekler) { etiket = 'Görev!'; ipucu = 'Mevsim görev kartı seç'; }
  else if (hg.gorev) { etiket = `${hg.gorev.kalan}g`; ipucu = `Görev: ${hg.gorev.ad}`; }
  else if (hg.destan && !hg.destan.bitti) { etiket = `${hg.destan.adim + 1}/${hg.destan.adimlar.length}`; ipucu = `${hg.destan.ad}: ${hg.destan.adimlar[hg.destan.adim]?.metin || ''}`; }
  else { etiket = '✓'; ipucu = 'Hedefler'; }
  return h('button', { class: `chip hedef${kartBekler || hg.destan?.komut?.uygun ? ' dikkat' : ''}`, title: ipucu, 'aria-label': `Hedefler: ${ipucu}`, 'data-hedef-chip': '1',
    onclick: () => a.aksiyonAc({ alt: 'hedef' }) }, h('span', { class: 'sim' }, '🎯'), h('b', {}, etiket));
}

// ---------- Sol altta küçük kart: ilk kahraman teklifi ve yol olayı (oyunu durdurmaz) ----------
export function aksiyonKarti(a, d) {
  const teklif = d.kahramanDurum?.teklif;
  if (teklif && !a.gizliKart.has('teklif')) {
    const kg = kahramanGorunumu(d);
    return { anahtar: 'a-teklif', baslik: 'Ateş Başında Bir Ses', ikon: '🔥', sinif: 'aksiyon-kart',
      kapat: () => { a.gizliKart.add('teklif'); a.yenile(); }, kapatIpucu: 'Sonra karar ver',
      govde: [h('p', { class: 'sf-kart-m' }, 'Kabileden biri öne çıkıyor. Avcı mı olsun, Kaşif mi?'),
        h('div', { class: 'sf-teklif-d' }, kg.teklif.siniflar.map((s) => teklifDugmesi(a, s)))] };
  }
  for (const s of seferGorunumu(d).aktif) {
    if (!s.olay || a.gizliKart.has(`olay:${s.uid}:${s.olay.id}`)) continue;
    if (a.pencere === 'acik' && a.sekme === 'aksiyon' && a.aksiyonAlt === 'yolda') continue; // seçenekler zaten Yolda sekmesinde
    return { anahtar: `a-olay${s.uid}`, baslik: s.olay.ad, ikon: '🗺', sinif: 'aksiyon-kart',
      kapat: () => { a.gizliKart.add(`olay:${s.uid}:${s.olay.id}`); a.yenile(); }, kapatIpucu: 'Seçmezsen ilk seçenek uygulanır',
      govde: [h('p', { class: 'sf-kart-m' }, `${s.ad}: ${s.olay.metin}`),
        h('div', { class: 'sf-olay-s' }, s.olay.secenekler.map((m, i) => h('button', { 'data-secenek': i, onclick: () => a.oyun.komut(seferOlayCoz, s.uid, i) }, m)))] };
  }
  return null;
}

// ---------- Haritadaki hedef işaretleri (DOM katmanı; kamerayla birlikte konumlanır) ----------
export class IsaretKatmani {
  constructor(a) {
    this.a = a;
    this.el = h('div', { class: 'isaret-katman' });
    this.ogeler = [];
    this.anahtar = null; this.kamera = '';
  }
  guncelle(d) {
    const a = this.a;
    const ac = !a.yerlestirme;
    const isaretler = ac ? (d.hedefIsaretleri || []) : [];
    const rez = new Set((d.sefer?.aktif || []).map((s) => s.hedef));
    const komsular = ac ? (d.komsular || []).filter((k) => kesifli(d, k.x, k.y)) : [];
    const anahtar = JSON.stringify([isaretler.map((i) => [i.uid, i.kalan, rez.has(i.uid)]), komsular.map((k) => k.id), ac]);
    if (anahtar === this.anahtar) return;
    this.anahtar = anahtar;
    this.el.replaceChildren(); this.ogeler = [];
    const gv = isaretler.length ? seferGorunumu(d).isaretler : [];
    for (const i of isaretler) {
      const g = gv.find((x) => x.uid === i.uid) || { ad: i.tur, seferler: [] };
      const acil = i.kalan <= 2;
      const el = h('button', { class: `isaret ${i.tur}${acil ? ' acil' : ''}${rez.has(i.uid) ? ' yolda' : ''}${g.seferler.length ? '' : ' sessiz'}`, 'data-isaret': i.uid,
        'aria-label': `${g.ad}: ${i.kalan} gün kaldı${rez.has(i.uid) ? ' (ekip yolda)' : ''}`, title: `${g.ad} · ${i.kalan} gün kaldı`,
        onclick: () => a.aksiyonAc(rez.has(i.uid) ? { alt: 'yolda' } : { alt: 'sefer', hedef: i.uid, tur: g.seferler[0] }) },
      h('span', { class: 'is-sim' }, ISARET_SIMGE[i.tur] || '📍'), h('em', { class: 'is-kalan' }, i.kalan));
      this.ogeler.push({ el, x: i.x, y: i.y }); this.el.append(el);
    }
    for (const k of komsular) {
      const el = h('button', { class: 'isaret komsu', 'data-komsu-isaret': k.id, 'aria-label': 'Komşu köy', title: 'Komşu köy', onclick: () => a.aksiyonAc({ alt: 'komsu' }) },
        h('span', { class: 'is-sim' }, '🏕'));
      this.ogeler.push({ el, x: k.x, y: k.y }); this.el.append(el);
    }
    this.kamera = '';
    this.konumla();
  }
  konumla() {
    if (!this.ogeler.length) return;
    const S = this.a.sahne, c = S.canvas, k = S.kamera;
    const w = c.clientWidth, hh = c.clientHeight;
    const anahtar = `${S.hedef.x.toFixed(2)},${S.hedef.z.toFixed(2)},${k.zoom.toFixed(3)},${w}x${hh}`;
    if (anahtar === this.kamera) return;
    this.kamera = anahtar;
    const r = c.getBoundingClientRect(), r0 = this.el.getBoundingClientRect();
    const dx = r.left - r0.left, dy = r.top - r0.top;
    const p = { x: 0, y: 0 };
    for (const { el, x, y } of this.ogeler) {
      S.ekranNokta(x + 0.5, 0.6, y + 0.5, p);
      const gor = p.x > -20 && p.y > -20 && p.x < w + 20 && p.y < hh + 20;
      if (el.hidden === gor) el.hidden = !gor;
      if (gor) el.style.transform = `translate(${Math.round(p.x + dx)}px, ${Math.round(p.y + dy)}px) translate(-50%, -50%)`;
    }
  }
}
