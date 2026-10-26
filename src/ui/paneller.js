// Sağ panel sekmeleri ve bina/hücre bilgi kartı. Durumu yalnız okur; değişiklik `a.islem(komut, ...)` ile çekirdeğe gider.
import { BINALAR } from '../data/binalar.js';
import { BULUSLAR } from '../data/buluslar.js';
import { EYLEMLER } from '../data/eylemler.js';
import { KAYNAKLAR } from '../data/kaynaklar.js';
import { CAGLAR } from '../data/caglar.js';
import { SERBEST_ISLER, VERGI, YOL_CAG, YOL_MALIYET, YORGUNLUK_MAX, VARSAYILAN_EYLEM } from '../data/denge.js';
import { KARO_ADLARI } from '../render/harita.js';
import {
  isAta, insaEt, yukselt, onar, yik, ormanTemizle, yolYap, yolKaldir, arastirmaSec, onderEylemiSec, cagAtla, vergiAyarla, vergiAcik,
} from '../core/komutlar.js';
import {
  KAYNAK, BINA, BULUS, CAG, kaynakAcik, cagAcik, issizSayisi, evsizSayisi, barinmaKapasitesi, isciYuvasi, binaIsi, kuruluSayisi,
  kaynakYeter, eksikMetni, yaraliSayisi, mevcutCag, binaIscisi,
} from '../core/yardimci.js';
import { maliyetHesapla, yukseltmeMaliyeti, onarimMaliyeti, insaEdilebilirMi, insaatSinirDolu } from '../core/insa.js';
import { arastirilabilirMi, bilgiUretimi } from '../core/arastirma.js';
import { eylemUygunMu } from '../core/eylem.js';
import { cagSartlari } from '../core/cag.js';
import { gorunurKaro } from '../world/kesif.js';
import { h, yuvarla } from './dom.js';

const sim = (id) => KAYNAK[id]?.simge ?? id;
export const uretimMetni = (u) => Object.entries(u || {}).map(([r, m]) => `+${yuvarla(m)}${sim(r)}`).join(' ');

// Yetersiz kaynak kırmızı ve eksik miktarıyla gösterilir.
export function maliyetChips(d, maliyet) {
  const e = Object.entries(maliyet || {});
  if (!e.length) return h('div', { class: 'maliyet' }, h('span', {}, 'Ücretsiz'));
  return h('div', { class: 'maliyet' }, e.map(([r, m]) => {
    const var_ = d.kaynaklar[r] || 0;
    const eksik = var_ + 1e-9 < m;
    return h('span', { class: eksik ? 'eksik' : '', title: KAYNAK[r]?.ad || r }, `${sim(r)} ${m}`, eksik ? h('i', {}, ` −${Math.ceil(m - var_)}`) : null);
  }));
}

// ---------- Bina resmi (önizleme varsa onu, yoksa simge) ----------
const TUR_SIMGE = { konut: '🏠', uretim: '⚒️', donusum: '🔥', depo: '📦', huzur: '🎭', anit: '🏰', bilgi: '📚', kamu: '🏛️', savunma: '🛡️', merkez: '🔥' };
const ONIZLEME = import.meta.glob('../render/onizleme.js'); // dosya yoksa boş: derleme kırılmaz
const resimOnbellek = new Map();
let onizlemeModul = null;
async function onizlemeYukle() {
  if (onizlemeModul !== null) return onizlemeModul;
  const f = Object.values(ONIZLEME)[0];
  if (!f) return (onizlemeModul = false);
  try { onizlemeModul = await f(); } catch { onizlemeModul = false; }
  return onizlemeModul;
}
export function binaResmi(binaId, px = 44) {
  const t = BINA[binaId];
  const kutu = h('span', { class: 'resim', style: `width:${px}px;height:${px}px;font-size:${Math.round(px * 0.55)}px` }, TUR_SIMGE[t?.tur] || '🏗');
  const anahtar = `${binaId}:${px}`;
  const koy = (src) => kutu.replaceChildren(h('img', { src, alt: '', draggable: 'false' }));
  if (resimOnbellek.has(anahtar)) { const v = resimOnbellek.get(anahtar); if (v) koy(v); return kutu; }
  onizlemeYukle().then(async (m) => {
    if (!m?.binaOnizleme) return;
    const r = await m.binaOnizleme(binaId, px * 2);
    const src = typeof r === 'string' ? r : r?.toDataURL?.();
    resimOnbellek.set(anahtar, src || null);
    if (src) koy(src);
  }).catch(() => resimOnbellek.set(anahtar, null));
  return kutu;
}

// ---------- İnşa ----------
function insaNedeni(d, b) {
  const h1 = insaEdilebilirMi(d, b.id);
  if (h1) return h1;
  if (insaatSinirDolu(d)) return `Aynı anda en çok ${mevcutCag(d).esZamanliInsaat} inşaat sürebilir.`;
  const m = maliyetHesapla(d, b.id);
  if (!kaynakYeter(d, m)) return `Kaynak yetersiz: ${eksikMetni(d, m)} eksik.`;
  return null;
}

const KATEGORILER = [['hepsi', 'Tümü', '🏗️'], ['barinma', 'Barınma', '🏠'], ['uretim', 'Üretim', '⚒️'], ['depo', 'Depo', '📦'],
  ['kultur', 'Kültür ve inanç', '🎭'], ['bilgi', 'Bilgi', '📚'], ['kamu', 'Kamu', '🏛️'], ['savunma', 'Savunma', '🛡️']];
const TUR_KATEGORI = { konut: 'barinma', uretim: 'uretim', donusum: 'uretim', depo: 'depo', huzur: 'kultur', anit: 'kultur', bilgi: 'bilgi', kamu: 'kamu', savunma: 'savunma' };
const kategoriDe = (b) => TUR_KATEGORI[b.tur] || 'kamu';

function etkiMetni(b) {
  const p = [];
  if (b.kapasite) p.push(`🏠 ${b.kapasite} kişi`);
  if (Object.keys(b.uretim || {}).length) p.push(`${uretimMetni(b.uretim)}/işçi`);
  if (Object.keys(b.sabitUretim || {}).length) p.push(`${uretimMetni(b.sabitUretim)}/gün`);
  if (b.huzur) p.push(`😊 +${b.huzur}`);
  if (b.savunma) p.push(`🛡 +${b.savunma}`);
  if (b.bilgi) p.push(`💡 +${b.bilgi}`);
  if (b.isciBilgi) p.push(`💡 +${b.isciBilgi}/işçi`);
  if (Object.keys(b.depo || {}).length) p.push('📦 depo');
  return p.join('  ');
}

export function insaSekmesi(a) {
  const d = a.d;
  const liste = BINALAR.filter((b) => b.tur !== 'merkez' && cagAcik(d, b.cag));
  const kats = KATEGORILER.filter(([id]) => id === 'hepsi' || liste.some((b) => kategoriDe(b) === id));
  if (!kats.some(([id]) => id === a.insaKat)) a.insaKat = 'hepsi';
  const durumlar = new Map(liste.map((b) => [b.id, insaNedeni(d, b)]));
  const kurulabilirSay = liste.filter((b) => !durumlar.get(b.id)).length;
  const katlar = kats.map(([id, ad, ik]) => h('button', {
    class: `kat${a.insaKat === id ? ' secili' : ''}`, onclick: () => { a.insaKat = id; a.yenile(); } }, `${ik} ${ad}`));
  const filtre = h('button', { class: `filtre${a.insaSadeceAcik ? ' secili' : ''}`, onclick: () => { a.insaSadeceAcik = !a.insaSadeceAcik; a.yenile(); } },
    a.insaSadeceAcik ? '✓ Kurulabilir' : 'Kurulabilir', h('small', {}, ` ${kurulabilirSay}/${liste.length}`));
  const kart = (b) => {
    const neden = durumlar.get(b.id);
    const sahip = d.binalar.filter((x) => x.id === b.id).length;
    return h('div', { class: `oge insa-kart tikla${neden ? ' gri' : ''}`, onclick: () => (neden ? a.hata(neden) : a.yerlestirmeBaslat(b.id)) },
      binaResmi(b.id, 48),
      h('div', { class: 'insa-gov' },
        h('div', { class: 'baslik' }, h('span', { class: 'ad' }, b.ad), h('span', { class: 'etiket' }, CAG[b.cag].ad)),
        h('div', { class: 'soluk kucuk' }, `${b.boyut[0]}×${b.boyut[1]} · ⏱ ${b.insaSuresi} gün${b.isci ? ` · 👷 ${b.isci}` : ''}${sahip ? ` · ${sahip} adet` : ''}`),
        etkiMetni(b) ? h('div', { class: 'etki' }, etkiMetni(b)) : null,
        maliyetChips(d, maliyetHesapla(d, b.id)),
        neden ? h('div', { class: 'neden' }, `⚠ ${neden}`) : null));
  };
  const govde = [];
  const secili = liste.filter((b) => (a.insaKat === 'hepsi' || kategoriDe(b) === a.insaKat) && (!a.insaSadeceAcik || !durumlar.get(b.id)));
  const sirali = (xs) => [...xs].sort((x, y) => CAG[y.cag].sira - CAG[x.cag].sira);
  if (a.insaKat === 'hepsi') {
    for (const [id, ad, ik] of kats.slice(1)) {
      const xs = secili.filter((b) => kategoriDe(b) === id);
      if (xs.length) { govde.push(h('h4', {}, `${ik} ${ad}`)); govde.push(sirali(xs).map(kart)); }
    }
  } else govde.push(sirali(secili).map(kart));
  if (!secili.length) govde.push(h('div', { class: 'bos' }, 'Bu filtreyle kurulabilir bina yok.'));
  return h('div', {}, h('div', { class: 'filtre-satir' }, filtre, katlar), govde);
}

// ---------- İş ----------
function sayac(a, hedef, deger, ust, issiz) {
  return h('div', { class: 'sayac' },
    h('button', { disabled: deger <= 0, onclick: () => a.islem(isAta, hedef, deger - 1), 'aria-label': 'Azalt' }, '−'),
    h('b', {}, deger, h('small', { class: 'soluk' }, `/${ust}`)),
    h('button', { class: 'artir', disabled: deger >= ust || issiz <= 0, onclick: () => a.islem(isAta, hedef, deger + 1), 'aria-label': 'Arttır' }, '+'));
}

export function isSekmesi(a) {
  const d = a.d;
  const issiz = issizSayisi(d);
  const ust = h('div', { class: `oge ozet${issiz > 0 ? ' dikkat' : ''}` },
    h('div', { class: 'baslik' }, h('span', {}, issiz > 0 ? `👥 ${issiz} kişi boşta` : '✓ Herkesin işi var'), h('span', { class: 'soluk kucuk' }, `Nüfus ${d.nufus} · barınak ${barinmaKapasitesi(d)}`)),
    issiz > 0 ? h('div', { class: 'neden' }, 'İşsizler huzuru düşürür; aşağıdan + ile iş ver.') : null,
    yaraliSayisi(d) ? h('div', { class: 'soluk kucuk' }, `Yaralı: ${yaraliSayisi(d)}`) : null,
    evsizSayisi(d) ? h('div', { class: 'neden' }, `Evsiz: ${evsizSayisi(d)} (konut kur)`) : null);
  const satir = (ad, alt, hedef, n, yuva) => h('div', { class: 'oge is-satir' },
    h('div', { class: 'is-ad' }, h('b', {}, ad), h('div', { class: 'soluk kucuk' }, alt)), sayac(a, hedef, n, yuva, issiz));
  const serbest = SERBEST_ISLER.map((is) => {
    const k = `serbest:${is.id}`;
    const n = d.atama[k] || 0;
    return satir(is.ad, `kişi başı ${uretimMetni(is.uretim)}`, k, n, n + issiz);
  });
  const binalar = d.binalar.filter((b) => isciYuvasi(b) > 0).map((b) => {
    const t = BINA[b.id];
    const isi = binaIsi(d, b);
    return satir(t.ad, isi === 'insa' ? 'inşaatta' : b.hasarli ? 'hasarlı' : (uretimMetni(t.uretim) || 'çalışıyor'), b.uid, d.atama[b.uid] || 0, isciYuvasi(b));
  });
  return h('div', {}, ust, h('h4', {}, 'Serbest işler'), serbest, binalar.length ? h('h4', {}, 'Bina yuvaları') : null, binalar);
}

// ---------- Araştırma ----------
export function arastirmaSekmesi(a) {
  const d = a.d;
  const aktif = d.arastirma ? BULUS[d.arastirma.id] : null;
  const ust = h('div', { class: 'oge' },
    h('div', { class: 'baslik' }, h('span', {}, '💡 Bilgi Puanı'), h('span', { class: 'ok' }, `+${yuvarla(bilgiUretimi(d))}/gün`)),
    aktif
      ? [h('div', {}, `Araştırılan: ${aktif.ad}`),
        h('div', { class: 'cubuk' }, h('i', { style: `width:${Math.min(100, (100 * d.arastirma.ilerleme) / aktif.maliyet.bilgi)}%` })),
        h('div', { class: 'soluk kucuk' }, `${yuvarla(d.arastirma.ilerleme)} / ${aktif.maliyet.bilgi} BP${aktif.maliyet.kitap ? ` · 📜 ${aktif.maliyet.kitap}` : ''}`)]
      : h('div', { class: 'soluk' }, `Buluş seçilmedi; BP havuzda birikiyor (${yuvarla(d.bilgiHavuz)}).`));
  const acik = BULUSLAR.filter((b) => cagAcik(d, b.cag) && !d.buluslar.includes(b.id));
  const kartlar = acik.map((b) => {
    const neden = arastirilabilirMi(d, b.id);
    const secili = d.arastirma?.id === b.id;
    return h('div', { class: `oge${neden && !secili ? ' gri' : ''}` },
      h('div', { class: 'baslik' }, h('span', {}, b.ad), h('span', { class: 'soluk kucuk' }, `${b.maliyet.bilgi} BP${b.maliyet.kitap ? ` + ${b.maliyet.kitap}📜` : ''}`)),
      h('div', { class: 'soluk kucuk' }, b.aciklama || ''),
      neden ? h('div', { class: 'neden' }, neden) : null,
      h('button', { disabled: !!neden || secili, onclick: () => a.islem(arastirmaSec, b.id), style: 'margin-top:6px;width:100%' }, secili ? 'Araştırılıyor' : 'Araştır'));
  });
  const bilinen = d.buluslar.map((id) => BULUS[id].ad);
  return h('div', {}, ust, h('h4', {}, 'Açık buluşlar'), kartlar.length ? kartlar : h('div', { class: 'soluk' }, 'Şu an araştırılabilecek buluş yok.'),
    bilinen.length ? [h('h4', {}, `Bilinenler (${bilinen.length})`), h('div', { class: 'soluk kucuk' }, bilinen.join(', '))] : null);
}

// ---------- Önder ----------
export function onderSekmesi(a) {
  const d = a.d;
  const o = d.onder;
  const secili = o.eylem || VARSAYILAN_EYLEM;
  const ust = h('div', { class: 'oge' },
    h('div', { class: 'baslik' }, h('span', {}, 'Yorgunluk'), h('span', {}, `${o.yorgunluk}/${YORGUNLUK_MAX}`)),
    h('div', { class: 'cubuk yorgun' }, h('i', { style: `width:${(100 * Math.max(0, o.yorgunluk)) / YORGUNLUK_MAX}%` })),
    o.yaraliKalan > 0 ? h('div', { class: 'neden' }, `Önder yaralı: ${o.yaraliKalan} gün yalnız dinlenebilir.`) : null,
    h('div', { class: 'soluk kucuk' }, 'Her gün 1 eylem; seçmezsen "Dinlen" sayılır.'));
  const acikKaynak = KAYNAKLAR.filter((k) => kaynakAcik(d, k.id));
  const kartlar = EYLEMLER.filter((e) => cagAcik(d, e.cag)).map((e) => {
    const kervan = !!e.sonuc.kervan;
    const sec = e.id === secili ? (o.secim || null) : null;
    let secimDeger = sec || (kervan ? a.kervanSecim : null);
    const neden = eylemUygunMu(d, e.id, secimDeger);
    const secimKutu = kervan ? h('div', { style: 'display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap' },
      h('span', { class: 'kucuk' }, 'Ver'), kaynakSecici(acikKaynak, secimDeger?.ver, (v) => { a.kervanSecim = { ...(a.kervanSecim || {}), ver: v }; a.yenile(); }),
      h('span', { class: 'kucuk' }, 'Al'), kaynakSecici(acikKaynak, secimDeger?.al, (v) => { a.kervanSecim = { ...(a.kervanSecim || {}), al: v }; a.yenile(); })) : null;
    return h('div', { class: `oge${neden && e.id !== secili ? ' gri' : ''}`, style: e.id === secili ? 'border-color:var(--vurgu)' : '' },
      h('div', { class: 'baslik' }, h('span', {}, e.ad), h('span', { class: 'soluk kucuk' }, `yorgunluk ${e.yorgunluk > 0 ? '+' : ''}${e.yorgunluk}`)),
      h('div', { class: 'soluk kucuk' }, eylemAciklama(e)),
      neden && e.id !== secili ? h('div', { class: 'neden' }, neden) : null,
      secimKutu,
      h('button', { disabled: e.id === secili && !kervan || (!!neden), onclick: () => a.islem(onderEylemiSec, e.id, kervan ? secimDeger : null), style: 'margin-top:6px;width:100%' },
        e.id === secili ? 'Seçili' : 'Seç'));
  });
  const vergi = vergiAcik(d) ? h('div', { class: 'oge' }, h('div', { class: 'baslik' }, 'Vergi'),
    h('div', { style: 'display:flex;gap:6px;margin-top:6px' }, VERGI.map((v) => h('button', { disabled: d.vergi === v.id, style: 'flex:1', class: d.vergi === v.id ? 'vurgu' : '', onclick: () => a.islem(vergiAyarla, v.id) }, v.ad)))) : null;
  return h('div', {}, ust, h('h4', {}, 'Eylemler'), kartlar, vergi);
}

function kaynakSecici(liste, deger, degisti) {
  const s = h('select', { onchange: (e) => degisti(e.target.value) }, h('option', { value: '' }, '—'),
    liste.map((k) => h('option', { value: k.id, selected: k.id === deger }, `${k.simge} ${k.ad}`)));
  return s;
}

function eylemAciklama(e) {
  const t = {
    avlan: '+4 yiyecek, +1 deri; küçük yaralanma riski.',
    kesfet: 'Haritada sisi açar; kaynak, BP ya da olay bulabilir.',
    hikaye_anlat: '+2 BP, +2 huzur.',
    dinlen: 'Yorgunluğu 3 azaltır.',
    alet_yap: '2 taş + 1 odun → 1 alet.',
    kervan_gonder: '20 birim ver, 3 gün sonra 15 birim al (Pazar gerekir).',
    halka_hitap: '+6 huzur (yüksek vergide +10).',
    turnuva_duzenle: '−20 sikke, +10 huzur, 3 gün savunma +10.',
  };
  return t[e.id] || '';
}

// ---------- Çağ ----------
const ilerlemeSatiri = (ok, ad, mevcut, hedef) => {
  const oran = hedef ? Math.max(0, Math.min(1, mevcut / hedef)) : ok ? 1 : 0;
  return h('div', { class: `sart ${ok ? 'ok' : 'yok'}` },
    h('div', { class: 'sart-ust' }, h('span', {}, `${ok ? '✓' : '○'} ${ad}`), hedef ? h('b', {}, `${yuvarla(mevcut, 0)}/${hedef}`) : null),
    hedef ? h('div', { class: `cubuk${ok ? ' tam' : ''}` }, h('i', { style: `width:${oran * 100}%` })) : null);
};

export function cagSekmesi(a) {
  const d = a.d;
  const c = mevcutCag(d);
  const ust = h('div', { class: 'oge' }, h('div', { class: 'baslik' }, h('span', {}, `🏛 ${c.ad}`), h('span', { class: 'soluk kucuk' }, c.kimlik || '')),
    h('div', { class: 'soluk kucuk' }, `Depo tavanı ${c.depoTavani} · eşzamanlı inşaat ${c.esZamanliInsaat}`));
  if (!c.gecis) {
    const z = c.zafer;
    return h('div', {}, ust, h('h4', {}, 'Zafer şartları'), h('div', { class: 'oge' },
      ilerlemeSatiri(kuruluSayisi(d, z.bina) > 0, `${BINA[z.bina].ad} kurulu`, kuruluSayisi(d, z.bina), 1),
      ilerlemeSatiri(d.nufus >= z.nufus, 'Nüfus', d.nufus, z.nufus),
      h('div', { class: 'soluk kucuk', style: 'margin-top:6px' }, d.istatistik?.serbestKip ? 'Zafer kazanıldı; serbest kipte devam ediyorsun.' : 'Şartlar sağlanınca zafer kazanılır; oyun serbest kipte sürer.')));
  }
  const g = c.gecis;
  const s = cagSartlari(d);
  const satirlar = [[d.nufus >= g.nufus, 'Nüfus', d.nufus, g.nufus]];
  for (const [id, n] of Object.entries(g.binalar)) satirlar.push([kuruluSayisi(d, id) >= n, BINA[id].ad, kuruluSayisi(d, id), n]);
  if (g.bulus) satirlar.push([d.buluslar.includes(g.bulus), `Buluş: ${BULUS[g.bulus].ad}`, d.buluslar.includes(g.bulus) ? 1 : 0, 1]);
  for (const [r, m] of Object.entries(g.maliyet)) satirlar.push([(d.kaynaklar[r] || 0) >= m, `${sim(r)} ${KAYNAK[r]?.ad || r}`, Math.floor(d.kaynaklar[r] || 0), m]);
  const tamam = satirlar.filter((x) => x[0]).length;
  return h('div', {}, ust,
    h('h4', {}, `Sonraki: ${s.sonraki.ad}`),
    h('div', { class: 'oge' },
      h('div', { class: 'baslik' }, h('span', {}, 'Çağ atlama ilerlemesi'), h('b', {}, `${tamam}/${satirlar.length}`)),
      h('div', { class: `cubuk buyuk${s.uygun ? ' tam' : ''}` }, h('i', { style: `width:${(100 * tamam) / satirlar.length}%` })),
      satirlar.map((x) => ilerlemeSatiri(...x))),
    h('button', { class: `tam-genislik${s.uygun ? ' vurgu' : ''}`, disabled: !s.uygun, onclick: () => a.cagAtla() }, s.uygun ? `Çağ atla → ${s.sonraki.ad}` : 'Şartlar eksik: yukarıdaki kırmızı satırlar'),
    h('div', { class: 'soluk kucuk', style: 'margin-top:6px' }, 'Çağ atlayınca kaynak maliyeti ödenir, yerleşim sınırı büyür, yeni bina ve buluşlar açılır.'));
}

// ---------- Bilgi kartı (içerik; pencere kabuğunu arayuz.js çizer) ----------
export function binaKarti(a, b) {
  const d = a.d;
  const t = BINA[b.id];
  const isi = binaIsi(d, b);
  const kapali = d.istatistik?.sonTur?.kapali?.includes(b.uid);
  const insaatta = isi === 'insa' || isi === 'yukselt' || isi === 'onar';
  const durum = isi === 'insa' ? `İnşaat: ${b.insaKalan} gün kaldı` : isi === 'yukselt' ? `Yükseltiliyor: ${b.insaKalan} gün` : isi === 'onar' ? `Onarılıyor: ${b.insaKalan} gün`
    : b.hasarli ? 'Hasarlı (üretmez)' : kapali ? 'Bakım ödenmedi (çalışmıyor)' : 'Çalışıyor';
  const durumSinif = insaatta ? 'bekle' : b.hasarli || kapali ? 'kotu' : 'iyi';
  const yuva = isciYuvasi(b);
  const ykl = yukselt(d, b.uid), onr = onar(d, b.uid);
  const dugmeler = [];
  if (t.tur !== 'merkez') {
    if (t.maxSeviye > 1) dugmeler.push(h('button', { disabled: !!ykl.hata, onclick: () => a.islem(yukselt, b.uid) }, `⬆ Yükselt (Sv${b.seviye + 1})`));
    if (b.hasarli) dugmeler.push(h('button', { class: 'vurgu', disabled: !!onr.hata, onclick: () => a.islem(onar, b.uid) }, '🔧 Onar'));
    const onay = a.yikOnay === b.uid;
    dugmeler.push(h('button', { class: onay ? 'kotu' : '', onclick: () => (onay ? a.yik(b.uid) : a.yikOnayla(b.uid)) }, onay ? 'Emin misin? Yık' : '🗑 Yık'));
  }
  const govde = [
    h('div', { class: 'kart-ust' }, binaResmi(b.id, 52), h('div', {},
      h('div', { class: `durum-rozet ${durumSinif}` }, durum),
      h('div', { class: 'soluk kucuk', style: 'margin-top:3px' }, `${t.aciklama || ''}`))),
    yuva ? h('div', { class: 'satir' }, `👷 İşçi ${binaIscisi(d, b)}/${yuva} ${uretimMetni(t.uretim) ? `· işçi başına ${uretimMetni(t.uretim)}` : ''}`) : null,
    t.sabitUretim && Object.keys(t.sabitUretim).length ? h('div', { class: 'satir' }, `Sabit: ${uretimMetni(t.sabitUretim)}/gün`) : null,
    t.kapasite ? h('div', { class: 'satir' }, `🏠 Barınak ${t.kapasite + b.seviye - 1} kişi`) : null,
    t.huzur ? h('div', { class: 'satir' }, `😊 Huzur +${t.huzur}`) : null,
    t.savunma ? h('div', { class: 'satir' }, `🛡 Savunma +${t.savunma}`) : null,
    Object.keys(t.bakim || {}).length ? h('div', { class: 'satir soluk kucuk' }, `Bakım: ${uretimMetni(t.bakim).replace(/\+/g, '')}/gün`) : null,
    b.seviye < t.maxSeviye && t.tur !== 'merkez' ? h('div', { class: 'satir kucuk' }, 'Yükseltme: ', maliyetChips(d, yukseltmeMaliyeti(b))) : null,
    ykl.hata && t.maxSeviye > 1 && t.tur !== 'merkez' ? h('div', { class: 'neden' }, `⚠ ${ykl.hata}`) : null,
    b.hasarli ? h('div', { class: 'satir kucuk' }, 'Onarım: ', maliyetChips(d, onarimMaliyeti(b))) : null,
    dugmeler.length ? h('div', { class: 'dugmeler' }, dugmeler) : null,
  ];
  return { baslik: `${t.ad} · Sv${b.seviye}`, ikon: TUR_SIMGE[t.tur] || '🏗️', govde };
}

export function hucreKarti(a, x, y) {
  const d = a.d;
  const id = gorunurKaro(d, x, y);
  if (id === null) return { baslik: 'Keşfedilmemiş', ikon: '🌫', govde: [h('div', { class: 'soluk' }, 'Bu bölge sisle kaplı. Önder ile "Keşfet" eylemini kullan.')] };
  const dugmeler = [];
  const bilgi = [];
  if (id === 'orman') {
    const r = ormanTemizle(d, x, y);
    dugmeler.push(h('button', { class: 'vurgu', disabled: !!r.hata, onclick: () => a.islem(ormanTemizle, x, y) }, '🪓 Temizle (+5 odun)'));
    if (r.hata) bilgi.push(h('div', { class: 'neden' }, `⚠ ${r.hata}`));
  } else if (id === 'yol') {
    dugmeler.push(h('button', { onclick: () => a.islem(yolKaldir, x, y) }, 'Yolu kaldır'));
  } else if (id === 'cimen' || id === 'verimli') {
    if (cagAcik(d, YOL_CAG)) {
      const r = yolYap(d, x, y);
      dugmeler.push(h('button', { class: 'vurgu', disabled: !!r.hata, onclick: () => a.islem(yolYap, x, y) }, '🛤 Yol yap'), maliyetChips(d, YOL_MALIYET));
      if (r.hata) bilgi.push(h('div', { class: 'neden' }, `⚠ ${r.hata}`));
    } else bilgi.push(h('div', { class: 'soluk kucuk' }, `Yol: ${CAG[YOL_CAG].ad}'nda açılır.`));
  }
  const aciklama = {
    cimen: 'İnşaata uygun.', verimli: 'İnşaata uygun; tarım için iyi toprak.', orman: 'Odun kaynağı; inşa için önce temizle.',
    tasli: 'Taş Ocağı buna bitişik kurulur.', su: 'Geçilmez; balıkçılık ve toplayıcılık için iyi.', kil: 'Kil Ocağı buna bitişik kurulur.',
    cevher: 'Yalnız Maden Ocağı üstüne.', mermer: 'Yalnız Mermer Ocağı üstüne.', kayalik: 'İnşa edilemez.', dag: 'Geçilmez.', yol: 'Yol karosu.',
  }[id];
  return { baslik: KARO_ADLARI[id] || id, ikon: '🗺', govde: [h('div', { class: 'satir soluk' }, `${aciklama || ''} (${x}, ${y})`), bilgi, dugmeler.length ? h('div', { class: 'dugmeler' }, dugmeler) : null] };
}

// ---------- Olay gereksinim metni ----------
export function gereksinimMetni(g = {}) {
  const p = [];
  const ad = (id) => KAYNAK[id]?.ad ?? id;
  if (g.kaynakMin) p.push(...Object.entries(g.kaynakMin).map(([r, m]) => `${m} ${ad(r)}`));
  if (g.kaynakMax) p.push(...Object.entries(g.kaynakMax).map(([r, m]) => `en çok ${m} ${ad(r)}`));
  if (g.nufusMin !== undefined) p.push(`nüfus ≥ ${g.nufusMin}`);
  if (g.nufusMax !== undefined) p.push(`nüfus ≤ ${g.nufusMax}`);
  if (g.huzurMin !== undefined) p.push(`huzur ≥ ${g.huzurMin}`);
  if (g.huzurMax !== undefined) p.push(`huzur ≤ ${g.huzurMax}`);
  if (g.binaVar) p.push(...g.binaVar.map((id) => `çalışan ${BINA[id]?.ad ?? id}`));
  if (g.binaYok) p.push(...g.binaYok.map((id) => `${BINA[id]?.ad ?? id} olmamalı`));
  if (g.bulusVar) p.push(...g.bulusVar.map((id) => `buluş: ${BULUS[id]?.ad ?? id}`));
  if (g.isciTuruMin) p.push(...Object.entries(g.isciTuruMin).map(([t, n]) => `${n} ${t} işçisi`));
  if (g.mevsim) p.push(`mevsim: ${g.mevsim.join('/')}`);
  if (g.vergi !== undefined) p.push(`vergi: ${g.vergi}`);
  if (g.acTurMin !== undefined) p.push('açlık sürüyor');
  return p.length ? `Gerekir: ${p.join(', ')}` : 'Gereksinim sağlanmıyor';
}
export { insaEt };
