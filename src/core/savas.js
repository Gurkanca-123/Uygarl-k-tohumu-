// Görsel otomatik savaş — çekirdek (docs/SAVAS.md §5–§6, F1 = Ayı Avı). Saf; DOM/three bilmez.
// İlke "önce kademe, sonra savaş" (§6.1): savaşın sonuç kademesi sefer formülüyle aynı TEK `sefer.rng` çekiminden gelir
// (r' = r × (SEFER_SANS[0] + SEFER_SANS[1] × u)); yerleşim yalnız r'yi çarpanla (formC × karsC × komutaC) değiştirir.
// Simülasyon ayrı, durumsuz `savas:<tohum>:<seferUid>` akışıyla koşar ve gizli düşman çarpanı m'yi kademe ölçütü tutana dek
// ikiye bölerek ayarlar → sahne her zaman çekirdeğin kademesini gösterir. Olay listesi kayda yazılmaz; girdiden yeniden üretilir.
// Savaş yalnız `savas: true` seferlerinde ve `sec.savasSahnesi` açıkken (oyuncu ayarı; turIlerlet parametresi) devreye girer;
// kapalıyken sefer eski hesaplamalı yolla çözülür (src/core/sefer.js `seferSonuclandir`).
import { SEFERLER } from '../data/seferler.js';
import { SINIFLAR, ESYALAR } from '../data/kahramanlar.js';
import { BIRIMLER, DUSMANLAR, KARSITLIK, KONUM_C, KADEME_TAVAN } from '../data/birimler.js';
import { RUTBELER, KOMUTA_C, ZP_KAYNAK } from '../data/rutbeler.js';
import {
  SAVAS_TICK, SAVAS_TICK_MAX, M_ARALIK, M_DENEME, FORM_SINIR, KARS_SINIR, ON_BOS_CEZA, SAVAS_ZORLUK, KILIT_OLCUT, SIM_OLCEK,
  OFKE, COKME_GERI, KAHRAMAN_CEKILME, KAHRAMAN_BIRIM, ONDER_BIRIM, ASKER_ORAN, ORDU_CAG, SAVAS_SON_MAX, ASKER_SAVUNMA,
} from '../data/savas.js';
import { SEFER_SANS, SEFER_SONUC, NUFUS_MIN } from '../data/denge.js';
import {
  kopya, cagSira, bildir, hataDon, olayKilitli, OLAY_KILIDI, aktifSeferler, askerToplam, seferdekiAsker, seferdekiIsci,
  seferdekiKahramanUid, kahramanSayisi, yaraliSayisi, kaynakUygula, KAYNAK, sinirla,
} from './yardimci.js';
import { rngBaslat, rngSonraki } from './rng.js';
import { sonucBelirle, seferOlasiliklari } from './sefer.js';

const SEFER = Object.fromEntries(SEFERLER.map((s) => [s.id, s]));
export const BIRIM = Object.fromEntries(BIRIMLER.map((b) => [b.id, b]));
export const DUSMAN = Object.fromEntries(DUSMANLAR.map((b) => [b.id, b]));
const SINIF = Object.fromEntries(SINIFLAR.map((s) => [s.id, s]));
const ESYA = Object.fromEntries(ESYALAR.map((e) => [e.id, e]));
export const ROLLER = BIRIMLER.filter((b) => b.acik).map((b) => b.id); // F1: işçiye verilebilen roller
const KADEME_AD = Object.fromEntries(Object.entries(SEFER_SONUC).map(([k, v]) => [k, v.ad]));

// ---------- Ayar / sınıflandırma ----------
export const savasAcik = (sec) => !!sec?.savasSahnesi;
export const savasliSefer = (s) => !!(s?.savas && s.dusman && DUSMAN[s.dusman.id]?.acik);
export const savasZorlukCarpani = (seferId) => SAVAS_ZORLUK[seferId] ?? 1;
export const savasVarsayilan = () => ({ sayac: 0, son: [] });
export const orduVarsayilan = () => ({ asker: {}, kademe: {}, yerlesim: {} });
export const rutbeVarsayilan = () => ({ zp: 0, sira: 0, yildiz: 1 });

// ---------- Rütbe (§3; F1: yalnız Lider aktif, ZP sayılır, yükselme yok) ----------
export const rutbe = (d) => RUTBELER[d.rutbe?.sira ?? 0] || RUTBELER[0];
const yildizBul = (r, zp) => (zp >= r.zp[2] ? 3 : zp >= r.zp[1] ? 2 : 1);
export const komutaCarpani = (d) => KOMUTA_C[(d.rutbe?.yildiz ?? 1) - 1] ?? 1;

// Kopya üstünde: ZP ekler, yıldızı günceller (rütbe değişmez; F2'de çağ + ZP ile yükselme).
export function zpEkle(d, miktar, neden, bildirimler) {
  if (!(miktar > 0)) return 0;
  const r0 = d.rutbe || rutbeVarsayilan();
  const r = rutbe(d);
  const zp = r0.zp + miktar;
  const yildiz = Math.max(r0.yildiz || 1, yildizBul(r, zp));
  d.rutbe = { ...r0, zp, yildiz };
  if (yildiz > (r0.yildiz || 1)) bildir(bildirimler, 'rutbe_yildiz', `${r.ad} ★${yildiz}! Komuta gücü arttı.`, 'iyi', { rutbe: r.id, yildiz, neden });
  return miktar;
}
export function rutbeGorunumu(d) {
  const r = rutbe(d);
  const rr = d.rutbe || rutbeVarsayilan();
  const sonraki = RUTBELER[RUTBELER.indexOf(r) + 1];
  const esik = rr.yildiz < 3 ? r.zp[rr.yildiz] : sonraki?.zp[0] ?? null;
  return { id: r.id, ad: r.ad, yildiz: rr.yildiz, zp: rr.zp, sonrakiEsik: esik, komutaC: komutaCarpani(d),
    komuta: { ...r.komuta }, kapasite: r.kapasite, sonraki: sonraki ? { id: sonraki.id, ad: sonraki.ad, acik: !!sonraki.acik } : null };
}

// ---------- Ordu: asker = nüfustan terfi (§2.4) ----------
export const koydekiAsker = (d, tur) => Math.max(0, (d.ordu?.asker?.[tur] || 0)
  - aktifSeferler(d).reduce((a, s) => a + (s.ekip?.asker?.[tur] || 0), 0));
export const kademe = (d, tur) => Math.min(d.ordu?.kademe?.[tur] || 1, KADEME_TAVAN[d.cag] ?? 1);
export function askerTavani(d) {
  const r = rutbe(d);
  return Math.min(Math.floor(d.nufus * ASKER_ORAN), r.kalici ?? Infinity);
}
// Terfi edilebilecek boş işçi (sağlıklı, köyde, işçi).
const bosIsciSay = (d) => Math.max(0, d.nufus - yaraliSayisi(d) - kahramanSayisi(d) - seferdekiIsci(d) - askerToplam(d));
function terfiHatasiOrdu(d, tur, adet) {
  const b = BIRIM[tur];
  if (!b || !b.acik) return 'Böyle bir birlik yok.';
  if (!Number.isInteger(adet) || adet <= 0) return 'Asker sayısı geçersiz.';
  if (cagSira(d.cag) < cagSira(ORDU_CAG)) return 'Kalıcı ordu Taş Devri\'nde kurulur; Göçebe\'de seferdeki işçilere savaşta rol verilir.';
  if (cagSira(d.cag) < cagSira(b.cagMin)) return `${b.ad} bu çağda yetiştirilemez.`;
  if (askerToplam(d) + adet > askerTavani(d)) return `En çok ${askerTavani(d)} asker olabilir (nüfusun %${Math.round(ASKER_ORAN * 100)}'u).`;
  if (adet > bosIsciSay(d)) return `Terfi edilebilecek sağlıklı işçi: ${bosIsciSay(d)}.`;
  // Köyde (asker ve seferdekiler dışında) en az NUFUS_MIN kişi kalır.
  if (d.nufus - askerToplam(d) - adet - seferdekiIsci(d) - seferdekiKahramanUid(d).size < NUFUS_MIN) return 'Köyde en az iki sivil kalmalı.';
  const m = egitimMaliyeti(tur, adet);
  for (const [r, x] of Object.entries(m)) if ((d.kaynaklar[r] || 0) + 1e-9 < x) return `Yeterli ${KAYNAK[r]?.ad ?? r} yok (${x}).`;
  return null;
}
export const egitimMaliyeti = (tur, adet = 1) => Object.fromEntries(Object.entries(BIRIM[tur]?.egitim?.maliyet || {}).map(([r, x]) => [r, x * adet]));
// Komut: boş işçiyi asker yapar (F1: anında; eğitim kuyruğu F2 TODO). Dönüş { durum, hata? }.
export function birlikTerfi(durum, tur, adet = 1) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const h = terfiHatasiOrdu(durum, tur, adet);
  if (h) return hataDon(durum, h);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(egitimMaliyeti(tur, adet)).map(([r, x]) => [r, -x])));
  d.ordu = d.ordu || orduVarsayilan();
  d.ordu.asker = { ...d.ordu.asker, [tur]: (d.ordu.asker[tur] || 0) + adet };
  if (!d.ordu.kademe[tur]) d.ordu.kademe = { ...d.ordu.kademe, [tur]: 1 };
  return { durum: d };
}
// Komut: köydeki askeri işçiye döndürür (anında, bedelsiz; kademe köy çapında korunur).
export function birlikTerhis(durum, tur, adet = 1) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (!BIRIM[tur]) return hataDon(durum, 'Böyle bir birlik yok.');
  if (!Number.isInteger(adet) || adet <= 0) return hataDon(durum, 'Asker sayısı geçersiz.');
  if (koydekiAsker(durum, tur) < adet) return hataDon(durum, `Köyde ${koydekiAsker(durum, tur)} ${BIRIM[tur].ad} var.`);
  const d = kopya(durum);
  d.ordu.asker = { ...d.ordu.asker, [tur]: d.ordu.asker[tur] - adet };
  if (!d.ordu.asker[tur]) delete d.ordu.asker[tur];
  return { durum: d };
}
export function orduGorunumu(d) {
  return {
    acik: cagSira(d.cag) >= cagSira(ORDU_CAG), tavan: askerTavani(d), toplam: askerToplam(d), seferde: seferdekiAsker(d),
    terfiEdilebilir: bosIsciSay(d),
    birlikler: BIRIMLER.filter((b) => b.acik).map((b) => ({ id: b.id, ad: b.ad, adet: d.ordu?.asker?.[b.id] || 0, koyde: koydekiAsker(d, b.id),
      kademe: kademe(d, b.id), maliyet: egitimMaliyeti(b.id), hata: terfiHatasiOrdu(d, b.id, 1) })),
  };
}
// Köy savunmasında "Ordu" kalemi (savunma.js): köydeki asker × ASKER_SAVUNMA[T].
export function orduSavunmaKalemi(d) {
  let s = 0;
  for (const tur of Object.keys(d.ordu?.asker || {})) s += koydekiAsker(d, tur) * (ASKER_SAVUNMA[kademe(d, tur) - 1] ?? ASKER_SAVUNMA[0]);
  return s > 0 ? { id: 'ordu', ad: `Ordu ×${Object.keys(d.ordu.asker).reduce((a, t) => a + koydekiAsker(d, t), 0)}`, deger: s } : null;
}

// ---------- Birlik listesi ve ızgara ----------
const esyaGuc = (k, yuva) => ESYA[k.esya?.[yuva]]?.etki?.guc || 0;
// ekip → savaş birlikleri. id: kahraman `k:<uid>`, önder `onder`, işçi `i<n>`, asker `a:<tur>:<n>`.
export function birlikListesi(d, ekip) {
  const l = [];
  for (const u of ekip.kahraman || []) {
    const k = (d.kahramanlar || []).find((x) => x.uid === u);
    if (k) l.push({ id: `k:${u}`, tur: 'kahraman', ad: k.ad, sinif: k.sinif, sv: k.seviye, silah: esyaGuc(k, 'silah'), giysi: esyaGuc(k, 'giysi'),
      kahramanUid: u, roller: ['kahraman'], sabit: true });
  }
  if (ekip.onder) l.push({ id: 'onder', tur: 'onder', ad: 'Önder', roller: ['onder'], sabit: false });
  for (const [tur, n] of Object.entries(ekip.asker || {})) {
    for (let i = 0; i < n; i++) l.push({ id: `a:${tur}:${i}`, tur, ad: BIRIM[tur]?.ad, T: kademe(d, tur), roller: [tur], asker: true, sabit: false });
  }
  for (let i = 0; i < (ekip.isci || 0); i++) l.push({ id: `i${i}`, tur: 'isci', ad: `İşçi ${i + 1}`, roller: [...ROLLER], sabit: false });
  return l;
}
export function izgaraBilgisi(d) {
  const r = rutbe(d);
  const kilitli = [];
  const acik = new Set(r.acikHucre.map((h) => h.join(',')));
  for (let s = 0; s < r.izgara[0]; s++) for (let c = 0; c < r.izgara[1]; c++) {
    const k = `${s},${c}`;
    if (!acik.has(k) && k !== r.kahramanHucre.join(',')) {
      const ac = RUTBELER.find((x) => x.acikHucre.some((h) => h.join(',') === k));
      kilitli.push({ sira: s, sutun: c, acilir: ac ? ac.ad : null });
    }
  }
  return { sira: r.izgara[0], sutun: r.izgara[1], acik: r.acikHucre.map(([s, c]) => ({ sira: s, sutun: c })),
    kahraman: { sira: r.kahramanHucre[0], sutun: r.kahramanHucre[1] }, kilitli };
}
// Yerleşim: [{ id, rol, sira, sutun }]. Kahraman (ilk) kahraman hücresinde sabit; kahraman yoksa o hücre de açıktır.
function hucreler(d, birlikler) {
  const r = rutbe(d);
  const kh = { sira: r.kahramanHucre[0], sutun: r.kahramanHucre[1] };
  const ac = r.acikHucre.map(([s, c]) => ({ sira: s, sutun: c }));
  const kahramanVar = birlikler.some((b) => b.tur === 'kahraman');
  return { kh, serbest: kahramanVar ? ac : [...ac, kh], kahramanVar };
}
export function yerlesimHatasi(d, birlikler, yerlesim) {
  if (!Array.isArray(yerlesim)) return 'Yerleşim geçersiz.';
  const { kh, serbest, kahramanVar } = hucreler(d, birlikler);
  const ids = new Set(birlikler.map((b) => b.id));
  const gor = new Set(), hucre = new Set();
  const ilkKahraman = birlikler.find((b) => b.tur === 'kahraman');
  for (const y of yerlesim) {
    const b = birlikler.find((x) => x.id === y?.id);
    if (!b) return 'Yerleşimde bilinmeyen birlik var.';
    if (gor.has(y.id)) return 'Bir birlik iki kez yerleştirilmiş.';
    gor.add(y.id);
    if (!b.roller.includes(y.rol)) return `${b.ad} bu rolü alamaz.`;
    const k = `${y.sira},${y.sutun}`;
    if (hucre.has(k)) return 'Bir hücrede tek birlik olabilir.';
    hucre.add(k);
    if (b === ilkKahraman) { if (y.sira !== kh.sira || y.sutun !== kh.sutun) return 'Kahraman ortada durur.'; continue; }
    if (!serbest.some((h) => h.sira === y.sira && h.sutun === y.sutun)) return 'Bu hücre kilitli.';
  }
  if (gor.size !== ids.size) return 'Tüm birlikler yerleştirilmeli.';
  if (kahramanVar && !gor.has(ilkKahraman.id)) return 'Kahraman yerleştirilmeli.';
  return null;
}

// ---------- Çarpanlar (§5.3) ----------
const katki = (b) => (b.tur === 'isci' ? 1 : b.asker ? (BIRIM[b.tur].seferGuc * (1 + 0.15 * ((b.T || 1) - 1))) : 0);
// Dönüş { formC, karsC, komutaC, carpan }. guc = seferin toplam ekip gücü (kahraman/önder/alet kalanı nötr: konum 1, karşıtlık 1).
export function savasCarpanlari(d, birlikler, yerlesim, profil, guc) {
  const rolu = Object.fromEntries((yerlesim || []).map((y) => [y.id, y]));
  let k = 0, fNum = 0, kNum = 0, birlikVar = false, onDolu = false;
  for (const b of birlikler) {
    const y = rolu[b.id];
    if (y?.sira === 0) onDolu = true;
    const w = katki(b);
    if (!w || !y || !BIRIM[y.rol]) continue;
    birlikVar = true;
    k += w;
    fNum += w * KONUM_C[y.rol][y.sira];
    kNum += w * (KARSITLIK[BIRIM[y.rol].sinif]?.[profil] ?? 1);
  }
  const top = Math.max(guc, k);
  const notr = top - k;
  let formC = 1, karsC = 1;
  if (birlikVar && top > 0) {
    formC = sinirla(((notr + fNum) / top) * (onDolu ? 1 : ON_BOS_CEZA), ...FORM_SINIR);
    karsC = sinirla((notr + kNum) / top, ...KARS_SINIR);
  }
  const komutaC = komutaCarpani(d);
  return { formC, karsC, komutaC, carpan: formC * karsC * komutaC };
}
// Öneri (§5.3 açgözlü yerine küçük kaba kuvvet; ≤ 5 serbest birim): en yüksek formC × karsC; eşitlikte hücre öncelik sırası.
const HUCRE_ONCELIK = (h) => [h.sira === 0 ? 0 : h.sira === 2 ? 1 : 2, Math.abs(h.sutun - 1), h.sutun];
export function oneriYerlesim(d, birlikler, profil, guc) {
  const { kh, serbest } = hucreler(d, birlikler);
  const ilkK = birlikler.find((b) => b.tur === 'kahraman');
  const sabit = ilkK ? [{ id: ilkK.id, rol: 'kahraman', sira: kh.sira, sutun: kh.sutun }] : [];
  const hs = [...serbest].sort((a, b) => { const x = HUCRE_ONCELIK(a), y = HUCRE_ONCELIK(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  // Ayrıca: rollü birimleri (işçi/asker) önce, nötrleri (önder, 2. kahraman) sonra yerleştir; nötrler kalan en iyi hücreye.
  const rollu = birlikler.filter((b) => b !== ilkK && katki(b) > 0);
  const notr = birlikler.filter((b) => b !== ilkK && !katki(b));
  let enIyi = null, enC = -Infinity;
  const ata = [];
  const kullan = new Set();
  const gez = (i) => {
    if (i === rollu.length) {
      const y = [...sabit, ...ata];
      const kalan = hs.filter((h) => !kullan.has(`${h.sira},${h.sutun}`));
      notr.forEach((b, j) => { const h = kalan[j]; if (h) y.push({ id: b.id, rol: b.roller[0], sira: h.sira, sutun: h.sutun }); });
      const c = savasCarpanlari(d, birlikler, y, profil, guc);
      const v = c.formC * c.karsC;
      if (v > enC + 1e-9) { enC = v; enIyi = y.map((x) => ({ ...x })); }
      return;
    }
    for (const h of hs) {
      const key = `${h.sira},${h.sutun}`;
      if (kullan.has(key)) continue;
      for (const rol of rollu[i].roller) {
        kullan.add(key);
        ata.push({ id: rollu[i].id, rol, sira: h.sira, sutun: h.sutun });
        gez(i + 1);
        ata.pop();
        kullan.delete(key);
      }
    }
  };
  gez(0);
  return enIyi || sabit;
}
// Hatırlanan yerleşim (ordu.yerlesim[seferTur] = [{ rol, sira, sutun }] işçi rolleri) yeni ekibe uyarlanır; uymazsa null.
function hatirlananYerlesim(d, seferTur, birlikler) {
  const m = d.ordu?.yerlesim?.[seferTur];
  if (!Array.isArray(m) || !m.length) return null;
  const { kh } = hucreler(d, birlikler);
  const ilkK = birlikler.find((b) => b.tur === 'kahraman');
  const y = ilkK ? [{ id: ilkK.id, rol: 'kahraman', sira: kh.sira, sutun: kh.sutun }] : [];
  const kalan = [...m];
  for (const b of birlikler) {
    if (b === ilkK) continue;
    const j = kalan.findIndex((x) => b.roller.includes(x.rol));
    if (j < 0) return null;
    y.push({ id: b.id, rol: kalan[j].rol, sira: kalan[j].sira, sutun: kalan[j].sutun });
    kalan.splice(j, 1);
  }
  return yerlesimHatasi(d, birlikler, y) ? null : y;
}

// ---------- Savaş kurulumu (UI'nın yerleşim penceresi için okuma; saf) ----------
const seferBul = (d, uid) => aktifSeferler(d).find((s) => s.uid === uid);
function kurIc(d, sf) {
  const s = SEFER[sf.tur];
  const dus = DUSMAN[s.dusman.id];
  const birlikler = birlikListesi(d, sf.ekip);
  const guc = sf.guc;
  const oneri = oneriYerlesim(d, birlikler, dus.profil, guc);
  const kayitli = sf.savas?.yerlesim && !yerlesimHatasi(d, birlikler, sf.savas.yerlesim) ? sf.savas.yerlesim : null;
  const yerlesim = kayitli || hatirlananYerlesim(d, sf.tur, birlikler) || oneri;
  return { s, dus, birlikler, guc, oneri, yerlesim };
}
// r (savaşta): ekipGücü × formC × karsC × komutaC / (zorluk × SAVAS_ZORLUK).
const savasR = (d, sf, s, c) => (sf.zorluk > 0 ? (sf.guc * c.carpan) / (sf.zorluk * savasZorlukCarpani(s.id)) : 0);
export function savasKur(d, seferUid) {
  const sf = seferBul(d, seferUid);
  if (!sf) return { hata: 'Böyle bir sefer yok.' };
  if (!sf.savas) return { hata: 'Bu seferde savaş yok.' };
  const k = kurIc(d, sf);
  const c = savasCarpanlari(d, k.birlikler, k.yerlesim, k.dus.profil, k.guc);
  const co = savasCarpanlari(d, k.birlikler, k.oneri, k.dus.profil, k.guc);
  const r = savasR(d, sf, k.s, c);
  return {
    uid: sf.uid, sefer: sf.tur, ad: k.s.ad, durum: sf.savas.durum, kademe: sf.savas.kademe ?? null,
    otomatikTur: sf.savas.durum === 'bekliyor' ? d.tur + 1 : null,
    izgara: izgaraBilgisi(d), birlikler: k.birlikler.map((b) => ({ ...b })), yerlesim: k.yerlesim.map((x) => ({ ...x })),
    oneri: k.oneri.map((x) => ({ ...x })), roller: ROLLER.map((id) => ({ id, ad: BIRIM[id].ad, sinif: BIRIM[id].sinif, konumC: [...KONUM_C[id]],
      karsitlik: KARSITLIK[BIRIM[id].sinif][k.dus.profil] })),
    dusman: { id: k.dus.id, ad: k.dus.ad, profil: k.dus.profil, adet: k.s.dusman.adet, ipucu: k.dus.ipucu,
      ozel: k.dus.ozel.map((o) => ({ id: o.id, ad: o.ad })) },
    guc: { biz: Math.round(sf.guc * c.carpan * 100) / 100, onlar: Math.round(sf.zorluk * savasZorlukCarpani(k.s.id) * 100) / 100 },
    carpanlar: c, oneriCarpanlar: co, oran: Math.round(r * 100) / 100, olasiliklar: seferOlasiliklari(r), rutbe: rutbeGorunumu(d),
  };
}
// Saf önizleme: verilen yerleşimin olasılıkları (kaydetmeden; sürükle-bırak sırasında canlı çubuk).
export function yerlesimOnizle(d, seferUid, yerlesim) {
  const sf = seferBul(d, seferUid);
  if (!sf?.savas) return { hata: 'Bu seferde savaş yok.' };
  const k = kurIc(d, sf);
  const h = yerlesimHatasi(d, k.birlikler, yerlesim);
  if (h) return { hata: h };
  const c = savasCarpanlari(d, k.birlikler, yerlesim, k.dus.profil, k.guc);
  const r = savasR(d, sf, k.s, c);
  return { carpanlar: c, oran: Math.round(r * 100) / 100, olasiliklar: seferOlasiliklari(r) };
}
// Komut: yerleşimi saklar (sefer + tür başına hatırlanan roller). Dönüş { durum, hata?, olasiliklar }.
export function yerlesimKaydet(durum, seferUid, yerlesim) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const sf = seferBul(durum, seferUid);
  if (!sf?.savas) return hataDon(durum, 'Bu seferde savaş yok.');
  if (sf.savas.durum !== 'bekliyor') return hataDon(durum, 'Savaş zaten yapıldı.');
  const o = yerlesimOnizle(durum, seferUid, yerlesim);
  if (o.hata) return hataDon(durum, o.hata);
  const d = kopya(durum);
  const sf2 = seferBul(d, seferUid);
  const temiz = yerlesim.map((y) => ({ id: y.id, rol: y.rol, sira: y.sira, sutun: y.sutun }));
  sf2.savas = { ...sf2.savas, yerlesim: temiz };
  d.ordu = d.ordu || orduVarsayilan();
  d.ordu.yerlesim = { ...d.ordu.yerlesim, [sf2.tur]: temiz.filter((y) => !y.id.startsWith('k:')).map(({ rol, sira, sutun }) => ({ rol, sira, sutun })) };
  return { durum: d, olasiliklar: o.olasiliklar, carpanlar: o.carpanlar };
}
// Komut ortak adı (UI): "Ordunu yerleştir".
export const ordunuYerlestir = yerlesimKaydet;

// ---------- Sefer önizlemesi için (sefer.js seferOnizleme, savaş açık): Öneri düzeninin çarpanı ----------
export function seferSavasCarpani(d, s, ekip, guc) {
  const birlikler = birlikListesi(d, ekip);
  const dus = DUSMAN[s.dusman.id];
  const y = hatirlananYerlesim(d, s.id, birlikler) || oneriYerlesim(d, birlikler, dus.profil, guc);
  return { ...savasCarpanlari(d, birlikler, y, dus.profil, guc), zorlukCarpan: savasZorlukCarpani(s.id) };
}

// ---------- Sefer akışı kancaları (sefer.js adimSefer çağırır; kopya üstünde) ----------
// Varış: yolun yarısı (ceil(süre/2) tur) geçince savaş "bekliyor" + bildirim savas_hazir. Saldırtılmazsa sonraki adımda otomatik.
export function savasVarisDenetle(d, sf, bildirimler) {
  const s = SEFER[sf.tur];
  if (sf.savas || !savasliSefer(s)) return;
  if (sf.sure - sf.kalan < Math.ceil(sf.sure / 2)) return;
  sf.savas = { durum: 'bekliyor', varisTur: d.tur, yerlesim: null, kademe: null, no: null };
  const dus = DUSMAN[s.dusman.id];
  bildir(bildirimler, 'savas_hazir', `Ekip ${dus.ad.toLocaleLowerCase('tr')} ile karşılaştı! Düzeni kur ve saldırt (yoksa sonraki gün kendiliğinden saldırır).`,
    'uyari', { sefer: sf.uid, tur: sf.tur, dusman: dus.id });
}
function seferCek(d) {
  const r = rngSonraki(d.sefer.rng);
  d.sefer.rng = r.rng;
  return r.deger;
}
// Kopya üstünde: TEK sefer.rng çekimiyle kademe, girdi kaydı, ZP. Dönüş: girdi.
export function savasCoz(d, sf, bildirimler, { oto = false } = {}) {
  const k = kurIc(d, sf);
  const c = savasCarpanlari(d, k.birlikler, k.yerlesim, k.dus.profil, k.guc);
  const r = savasR(d, sf, k.s, c);
  const u = seferCek(d);
  const kd = sonucBelirle(r * (SEFER_SANS[0] + SEFER_SANS[1] * u));
  d.savas = d.savas || savasVarsayilan();
  d.savas.sayac += 1;
  const no = d.savas.sayac;
  const girdi = savasGirdisi(d, sf, k, kd, no);
  d.savas.son = [...(d.savas.son || []), girdi].slice(-SAVAS_SON_MAX);
  sf.savas = { durum: 'bitti', varisTur: sf.savas?.varisTur ?? d.tur, yerlesim: k.yerlesim.map((x) => ({ ...x })), kademe: kd, no };
  const zp = Math.floor((ZP_KAYNAK.savas[kd] || 0) * (1 + ZP_KAYNAK.cagCarpan * cagSira(d.cag)));
  if (zp) zpEkle(d, zp, 'savas', bildirimler);
  const iyi = kd === 'buyuk' || kd === 'basari';
  bildir(bildirimler, oto ? 'savas_izle' : 'savas_sonuc',
    `${oto ? 'Ekip kendiliğinden saldırdı — ' : ''}${k.s.ad}: ${KADEME_AD[kd]}.${zp ? ` +${zp} ZP.` : ''} Ekip dönüş yolunda.`,
    iyi ? 'iyi' : kd === 'kismi' ? 'bilgi' : 'uyari', { sefer: sf.uid, tur: sf.tur, kademe: kd, savas: no, izle: true, zp });
  return girdi;
}
// Girdi: olay listesini üretmeye yeten, kayda giren küçük özet (≤ ~350 bayt).
function savasGirdisi(d, sf, k, kd, no) {
  const r = rutbe(d);
  const y = Object.fromEntries(k.yerlesim.map((x) => [x.id, x]));
  return {
    no, tohum: d.tohum, uid: sf.uid, sefer: sf.tur, dusman: k.dus.id, cag: d.cag, kademe: kd, turNo: d.tur, rutbe: r.id,
    yildiz: d.rutbe?.yildiz ?? 1, izgara: [...r.izgara],
    birimler: k.birlikler.map((b) => {
      const x = y[b.id];
      const o = { id: b.id, tur: x.rol === 'kahraman' ? 'kahraman' : x.rol, sira: x.sira, sutun: x.sutun };
      if (b.tur === 'kahraman') Object.assign(o, { sinif: b.sinif, sv: b.sv, ad: b.ad, silah: b.silah, giysi: b.giysi });
      if (b.T > 1) o.T = b.T;
      return o;
    }),
  };
}
export const savasKademesi = (sf) => (sf.savas?.durum === 'bitti' ? sf.savas.kademe : null);

// Komut: "Saldır!" — bekleyen savaşı şimdi yapar. Dönüş { durum, bildirimler, savas: { kademe, girdi }, liste, hata? }.
export function savasBaslat(durum, seferUid) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const sf0 = seferBul(durum, seferUid);
  if (!sf0) return hataDon(durum, 'Böyle bir sefer yok.');
  if (sf0.savas?.durum !== 'bekliyor') return hataDon(durum, sf0.savas ? 'Savaş zaten yapıldı.' : 'Ekip henüz hedefe varmadı.');
  const d = kopya(durum);
  const bildirimler = [];
  const girdi = savasCoz(d, seferBul(d, seferUid), bildirimler, { oto: false });
  return { durum: d, bildirimler, savas: { kademe: girdi.kademe, girdi }, liste: savasOlayListesi(girdi) };
}
// "Tekrar izle" / "İzle" (bildirim `savas`): kayıtlı girdiden olay listesi; yoksa null.
export function savasIzle(d, no) {
  const g = (d.savas?.son || []).find((x) => x.no === no);
  return g ? { girdi: g, liste: savasOlayListesi(g) } : null;
}
// Arayüz okuması.
export function savasGorunumu(d, sec = {}) {
  return {
    acik: savasAcik(sec),
    bekleyen: aktifSeferler(d).filter((sf) => sf.savas?.durum === 'bekliyor').map((sf) => ({ uid: sf.uid, sefer: sf.tur, ad: SEFER[sf.tur].ad,
      dusman: SEFER[sf.tur].dusman.id, dusmanAd: DUSMAN[SEFER[sf.tur].dusman.id].ad, varisTur: sf.savas.varisTur, otomatikTur: d.tur + 1 })),
    yolda: aktifSeferler(d).filter((sf) => sf.savas?.durum === 'bitti').map((sf) => ({ uid: sf.uid, sefer: sf.tur, kademe: sf.savas.kademe, no: sf.savas.no })),
    son: (d.savas?.son || []).map((g) => ({ no: g.no, uid: g.uid, sefer: g.sefer, ad: SEFER[g.sefer]?.ad, kademe: g.kademe, kademeAd: KADEME_AD[g.kademe], turNo: g.turNo })),
    rutbe: rutbeGorunumu(d), ordu: orduGorunumu(d),
  };
}

// =====================================================================================================
// ---------- Simülasyon (saf; girdi → olay listesi) ----------
// Konum birimi: hücre. Biz: ön x=0, orta −1, arka −2 (sağa, +x yönünde saldırır); z = sütun − orta. Düşman x=7'den gelir.
// Olay: { t (tick, kesirli olabilir), tur, k, h, d, kalan, x, z, ek }. tur: yuru | saldiri | mermi | vurus | yetenek | sersem |
//   cokme | geri_cekil | kacis | zafer | bitis.
const ARALIK_X = 1.15;
const BIZ_X = [0, -ARALIK_X, -2 * ARALIK_X];
const DUSMAN_X0 = 7;
const GERI_X = -4.6;

function birimStat(b) {
  if (b.tur === 'kahraman') {
    const K = KAHRAMAN_BIRIM, sv = b.sv || 1, sav = SINIF[b.sinif]?.savas || {};
    return { can: K.can[0] + K.can[1] * sv + (b.giysi || 0) * K.giysi, saldiri: K.saldiri[0] + K.saldiri[1] * sv + (b.silah || 0) * K.silah,
      zirh: K.zirh[0] + K.zirh[1] * sv, menzil: sav.menzil || 1, aralik: K.aralik, hiz: 1, sinif: null };
  }
  if (b.tur === 'onder') return { ...ONDER_BIRIM, sinif: 'piyade' };
  const t = BIRIM[b.tur];
  const c = 1 + 0.25 * ((b.T || 1) - 1);
  return { can: t.can * c, saldiri: t.saldiri * c, zirh: t.zirh, menzil: t.menzil, aralik: t.aralik, hiz: t.hiz, sinif: t.sinif };
}
const zirhC = (z) => 20 / (20 + z);

function simKur(girdi) {
  const dus = DUSMAN[girdi.dusman];
  const nc = girdi.izgara?.[1] || 3;
  const biz = girdi.birimler.map((b, i) => {
    const st = birimStat(b);
    const pasif = b.tur === 'kahraman' ? SINIF[b.sinif]?.savas?.pasif?.etki || {} : {};
    const K = st.sinif ? (KARSITLIK[st.sinif]?.[dus.profil] ?? 1) : (pasif.canavarHasar && dus.profil === 'canavar' ? pasif.canavarHasar : 1);
    const konum = KONUM_C[b.tur]?.[b.sira] ?? 1;
    return { i, id: b.id, taraf: 'biz', tur: b.tur, sv: b.sv || 0, ad: b.ad || null, sira: b.sira, sutun: b.sutun,
      T: b.T || 1, x0: BIZ_X[b.sira], z0: b.sutun - (nc - 1) / 2, ...st, birimSinif: st.sinif, sinif: b.sinif || null, can0: st.can, K, konum,
      kahraman: b.tur === 'kahraman' };
  });
  // Düşman tabanı ekibe göre (m = 1'de ekip düşmanı ~oldurme tick'te, düşman ekibi ~dayanma tick'te çökertir; §6.1 m ayarı bunun üstünde).
  const dpsBiz = biz.reduce((a, u) => a + (u.saldiri * u.K * u.konum * zirhC(dus.zirh)) / u.aralik, 0);
  const canBiz = biz.reduce((a, u) => a + u.can, 0);
  const zOrt = biz.reduce((a, u) => a + u.zirh, 0) / Math.max(1, biz.length);
  const onSay = Math.min(3, biz.length);
  const pence = dus.ozel.find((o) => o.id === 'pence');
  const vurusTick = 1 / dus.aralik + (pence ? (pence.etki.carpan * Math.min(pence.etki.adet, onSay)) / pence.her : 0);
  const taban = { can: dpsBiz * SIM_OLCEK.oldurme, saldiri: canBiz / SIM_OLCEK.dayanma / (vurusTick * zirhC(zOrt)) };
  return { dus, biz, taban, canBiz };
}

// Tek koşu. kural: 'olum' (düşman çökene dek) | 'kacis' (düşman %50'de kaçar, ≥1 çöken) | 'cekilme' (ekip ≤%35 / kahraman çöktü).
function simKos(kur, girdi, m, kural) {
  const { dus, taban } = kur;
  let rng = rngBaslat(`savas:${girdi.tohum}:${girdi.uid}`);
  const r01 = () => { const x = rngSonraki(rng); rng = x.rng; return x.deger; };
  const ol = [];
  const ev = (o) => { ol.push(o); };
  const biz = kur.biz.map((u) => ({ ...u, x: u.x0, z: u.z0, cd: 0, ilk: true, coken: false, cokT: null, cekildi: false, ofke: 0, sersem: -1, yavas: -1 }));
  const kahraman = biz.find((u) => u.kahraman) || null;
  const kSav = kahraman ? SINIF[kahraman.sinif]?.savas : null;
  const gecikme = kSav?.pasif?.etki?.dusmanGecikme || 0;
  const e = { id: 'd0', taraf: 'onlar', tur: dus.id, x: DUSMAN_X0, z: 0, can0: taban.can * m, can: taban.can * m, saldiri: taban.saldiri * m,
    zirh: dus.zirh, aralik: dus.aralik, hiz: dus.hiz, cd: 1 + gecikme, sersem: -1, yavas: -1, coken: false, hamle: false };
  const pence = dus.ozel.find((o) => o.id === 'pence');
  const hamle = dus.ozel.find((o) => o.id === 'hamle');
  const r = RUTBELER.find((x) => x.id === girdi.rutbe) || RUTBELER[0];
  const ilkBuff = (r.komuta?.etki?.ilkSaldiri || 0) * (girdi.yildiz >= 3 ? 1.5 : 1);
  ev({ t: 0, tur: 'yetenek', k: kahraman?.id ?? null, ek: { yetenekId: r.komuta.id, ad: r.komuta.ad, komuta: true } });
  if (gecikme) ev({ t: 0, tur: 'yetenek', k: kahraman.id, ek: { yetenekId: kSav.pasif.id, ad: kSav.pasif.ad, pasif: true } });
  const ayakta = () => biz.filter((u) => !u.coken);
  const ekipCan = () => biz.reduce((a, u) => a + u.can, 0) / kur.canBiz;
  let son = null, sonT = 0, kahramanCokT = null;

  const hasarVer = (k, h, carpan, t, ek = {}) => {
    const v = 0.9 + 0.2 * r01();
    let x = k.taraf === 'biz' ? k.saldiri * k.K * k.konum * carpan * zirhC(h.zirh) * v : k.saldiri * carpan * zirhC(h.zirh) * v;
    if (k.taraf === 'biz' && k.ilk) { x *= 1 + ilkBuff; k.ilk = false; }
    const d = Math.max(1, Math.round(x));
    h.can = Math.max(0, h.can - d);
    ev({ t, tur: 'vurus', k: k.id, h: h.id, d, kalan: Math.round(h.can), ek });
    if (k.kahraman) k.ofke += OFKE.vurus;
    if (h.kahraman) h.ofke += OFKE.hasar;
    if (h.can <= 0 && !h.coken) {
      h.coken = true; h.cokT = t;
      ev({ t, tur: 'cokme', h: h.id });
      if (h.kahraman && kahramanCokT === null) kahramanCokT = t;
    }
    return d;
  };
  const enYakinBiz = () => {
    let b = null, bd = Infinity;
    for (const u of biz) { if (u.coken) continue; const dd = Math.abs(u.x - e.x) + 0.35 * Math.abs(u.z - e.z); if (dd < bd - 1e-9) { bd = dd; b = u; } }
    return b;
  };

  for (let t = 0; t <= SAVAS_TICK_MAX; t++) {
    sonT = t;
    // çöken birimler 2 tick sonra arkaya çekilir
    for (const u of biz) if (u.coken && !u.cekildi && t >= u.cokT + COKME_GERI) {
      u.cekildi = true; u.x = GERI_X - 0.4 * u.sutun; ev({ t, tur: 'geri_cekil', h: u.id, x: u.x, z: u.z });
    }
    // Pusu (Avcı Sv3): okçular tick 0'da menzilden bağımsız bedava atış
    if (t === 0 && kahraman?.sinif === 'avci' && kahraman.sv >= 3) {
      for (const u of biz) if (u.tur === 'okcu') { ev({ t, tur: 'mermi', k: u.id, h: e.id }); hasarVer(u, e, 1, t + 0.6, { pusu: true }); }
    }
    // --- hareket ---
    for (const u of ayakta()) {
      if (u.sersem > t) continue;
      const dx = e.x - u.x;
      const yakin = u.menzil <= 1.5;
      if (yakin && Math.abs(dx) > 1.25) {
        const adim = Math.sign(dx) * Math.min(Math.abs(dx) - 1.1, u.hiz * 0.95);
        u.x += adim;
        ev({ t, tur: 'yuru', k: u.id, x: Math.round(u.x * 100) / 100, z: u.z });
      }
    }
    if (!e.coken && e.sersem <= t) {
      const h = enYakinBiz();
      if (h && Math.abs(e.x - h.x) > 1.3) {
        const adim = Math.sign(h.x - e.x) * Math.min(Math.abs(h.x - e.x) - 1.2, e.hiz * 1.0);
        e.x += adim; e.z += (h.z - e.z) * 0.35;
        ev({ t, tur: 'yuru', k: e.id, x: Math.round(e.x * 100) / 100, z: Math.round(e.z * 100) / 100 });
      }
    }
    // --- biz saldırır ---
    for (const u of ayakta()) {
      if (e.coken || u.sersem > t || t < u.cd) continue;
      const dx = Math.abs(e.x - u.x);
      const erim = u.menzil <= 1.5 ? 1.35 : u.menzil + 2;
      if (dx > erim) continue;
      u.cd = t + u.aralik * (u.yavas > t ? 1.5 : 1);
      let carpan = 1;
      const ek = {};
      if (u.kahraman && u.ofke >= OFKE.esik && kSav) {
        u.ofke = 0;
        const a = kSav.aktif;
        carpan = a.etki.carpan || 1;
        ev({ t, tur: 'yetenek', k: u.id, h: [e.id], ek: { yetenekId: a.id, ad: a.ad } });
        if (a.etki.yavas) { e.yavas = t + a.etki.yavas; }
        if (a.etki.sersem) { e.sersem = t + 1 + a.etki.sersem; ev({ t: t + 0.4, tur: 'sersem', h: e.id, ek: { sure: a.etki.sersem } }); }
        ek.yetenek = a.id;
      }
      if (u.tur === 'okcu' && kahraman?.sinif === 'kasif' && kahraman.sv >= 3 && r01() < (kSav.sv3.etki.okcuKritik || 0)) { carpan *= 1.5; ek.kritik = true; }
      const menzilli = u.menzil > 1.5;
      ev({ t, tur: 'saldiri', k: u.id, h: e.id, ek: menzilli ? { menzilli: true } : {} });
      if (menzilli) ev({ t: t + 0.1, tur: 'mermi', k: u.id, h: e.id });
      hasarVer(u, e, carpan, t + (menzilli ? 0.7 : 0.3), ek);
      if (e.coken) break;
    }
    // --- düşman ---
    if (!e.coken && e.sersem <= t && ayakta().length) {
      if (hamle && !e.hamle && t >= hamle.tick + gecikme) {
        const orta = ayakta().filter((u) => u.sira === 1).sort((a, b) => (b.kahraman ? 1 : 0) - (a.kahraman ? 1 : 0))[0] || enYakinBiz();
        e.hamle = true;
        e.x = orta.x + 1.15; e.z = orta.z;
        ev({ t, tur: 'yetenek', k: e.id, h: [orta.id], ek: { yetenekId: hamle.id, ad: hamle.ad } });
        ev({ t, tur: 'yuru', k: e.id, x: Math.round(e.x * 100) / 100, z: e.z, ek: { sicra: true } });
        hasarVer(e, orta, hamle.etki.carpan, t + 0.5, { yetenek: hamle.id });
        e.cd = t + e.aralik;
      } else if (t >= e.cd) {
        const yakin = ayakta().filter((u) => Math.abs(u.x - e.x) <= 1.6).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x) || a.i - b.i);
        if (pence && (t - gecikme) % pence.her === pence.her - 1 && yakin.length >= 2) {
          const hedef = yakin.slice(0, pence.etki.adet);
          ev({ t, tur: 'yetenek', k: e.id, h: hedef.map((u) => u.id), ek: { yetenekId: pence.id, ad: pence.ad } });
          for (const h of hedef) hasarVer(e, h, pence.etki.carpan, t + 0.35, { yetenek: pence.id });
          e.cd = t + e.aralik * (e.yavas > t ? 1.5 : 1);
        } else if (yakin.length) {
          // Normal pençe: menzildeki en zayıf (en az canlı) birime — yaralıyı bitirmeye çalışır.
          const h = [...yakin].sort((p, q) => p.can - q.can || p.i - q.i)[0];
          ev({ t, tur: 'saldiri', k: e.id, h: h.id });
          hasarVer(e, h, 1, t + 0.35);
          e.cd = t + e.aralik * (e.yavas > t ? 1.5 : 1);
        }
      }
    }
    // --- bitiş denetimi ---
    const ec = e.can / e.can0;
    if (e.coken) { son = 'dusman_coktu'; break; }
    const coken = biz.filter((u) => u.coken).length;
    const tekBirim = biz.length < 2;
    if (kural === 'kacis' && ec <= KILIT_OLCUT.kismi.kacisCan && (coken >= KILIT_OLCUT.kismi.cokenMin || tekBirim) && !(kahraman?.coken)) {
      e.kacti = true; son = 'dusman_kacti'; break;
    }
    const cekil = ekipCan() <= KILIT_OLCUT.basarisiz.cekilmeCan || (kahramanCokT !== null && t >= kahramanCokT + (kural === 'cekilme' ? 0 : KAHRAMAN_CEKILME))
      || !ayakta().length;
    if (cekil) { son = kural === 'cekilme' && ec >= KILIT_OLCUT.basarisiz.dusmanCanMin ? 'ekip_cekildi' : 'ekip_yenildi'; break; }
  }
  if (!son) son = 'zaman';
  const coken = biz.filter((u) => u.coken).map((u) => u.id);
  return { ol, son, sonT, ekipCan: ekipCan(), dusmanCan: e.can / e.can0, kahramanAyakta: !kahraman || !kahraman.coken, coken, biz, e, m };
}

// Kademe ölçütü (§6.1). Dönüş { ok, yon } — yon +1: m büyümeli (düşman güçlensin), −1: küçülmeli.
function olcut(kd, s, tekBirim) {
  const O = KILIT_OLCUT[kd];
  if (kd === 'buyuk' || kd === 'basari') {
    if (s.son !== 'dusman_coktu') return { ok: false, yon: -1 };
    const ok = s.ekipCan >= (O.ekipCanMin ?? 0) && s.ekipCan <= (O.ekipCanMax ?? 1) && s.kahramanAyakta
      && (O.cokenMax === undefined || s.coken.length <= O.cokenMax);
    return { ok, yon: s.ekipCan > O.hedefCan ? 1 : -1, sapma: Math.abs(s.ekipCan - O.hedefCan) };
  }
  if (kd === 'kismi') {
    if (s.son === 'dusman_kacti') return { ok: s.kahramanAyakta && (tekBirim || s.coken.length >= O.cokenMin), yon: 0 };
    return { ok: false, yon: s.son === 'dusman_coktu' ? 1 : -1 };
  }
  if (s.son === 'ekip_cekildi') return { ok: true, yon: 0 };
  return { ok: false, yon: 1 };
}
const KURAL = { buyuk: 'olum', basari: 'olum', kismi: 'kacis', basarisiz: 'cekilme' };

// Saf: girdi → { birimler, olaylar, sure (sn, 1×), tick, kademe, m, zorla, ozet }. Aynı girdi → aynı liste (bit düzeyinde).
export function savasOlayListesi(girdi) {
  const kur = simKur(girdi);
  const kd = girdi.kademe;
  const tek = kur.biz.length < 2;
  let lo = Math.log(M_ARALIK[0]), hi = Math.log(M_ARALIK[1]);
  let enIyi = null, son = null;
  for (let i = 0; i < M_DENEME; i++) {
    const m = Math.exp((lo + hi) / 2);
    const s = simKos(kur, girdi, m, KURAL[kd]);
    const o = olcut(kd, s, tek);
    son = s;
    if (o.ok && (!enIyi || (o.sapma ?? 0) < (enIyi.o.sapma ?? 0))) enIyi = { s, o };
    if (o.ok && o.yon === 0) break;
    if (o.yon > 0) lo = Math.log(m); else hi = Math.log(m);
  }
  let s = enIyi?.s || son;
  let zorla = !enIyi;
  let ol = [...s.ol];
  let bitT = s.sonT + 0.8;
  if (zorla) {
    // Ölçüt tutmadı: çelişen olaylar kesilir, zorunlu bitiş eklenir (düşman kaçar ya da ekip çekilir).
    const celisen = kd === 'basarisiz' ? (x) => x.tur === 'cokme' && x.h === 'd0'
      : (x) => x.tur === 'cokme' && (x.h === 'd0' || kd !== 'kismi' || s.biz.find((u) => u.id === x.h)?.kahraman);
    const tc = ol.find(celisen)?.t;
    if (tc !== undefined) ol = ol.filter((x) => x.t < tc);
    bitT = (tc ?? s.sonT) + 0.5;
  }
  // Bitiş olayları
  const bizAyakta = s.biz.filter((u) => !ol.some((x) => x.tur === 'cokme' && x.h === u.id));
  if (kd === 'basarisiz') {
    for (const u of bizAyakta) ol.push({ t: bitT, tur: 'geri_cekil', h: u.id, x: GERI_X - 0.4 * u.sutun, z: u.z, ek: { ekip: true } });
    ol.push({ t: bitT + 0.6, tur: 'zafer', k: 'd0' });
  } else {
    const dusmanCoktu = ol.some((x) => x.tur === 'cokme' && x.h === 'd0');
    if (!dusmanCoktu) ol.push({ t: bitT, tur: 'kacis', k: 'd0', x: DUSMAN_X0 + 6, z: 1.5 });
    for (const u of bizAyakta) ol.push({ t: bitT + 0.6, tur: 'zafer', k: u.id });
  }
  const tick = Math.ceil(bitT + 2.4);
  ol.push({ t: tick, tur: 'bitis', ek: { kademe: kd } });
  ol.sort((a, b) => a.t - b.t);
  const birimler = [
    ...kur.biz.map((u) => ({ id: u.id, taraf: 'biz', tur: u.tur, T: u.T, sira: u.sira, sutun: u.sutun, n: 1, can: Math.round(u.can0), x: u.x0, z: u.z0,
      menzilli: u.menzil > 1.5, ...(u.kahraman ? { kahraman: true, sinif: u.sinif, sv: u.sv, ad: u.ad, kahramanUid: u.id.slice(2) } : {}) })),
    { id: 'd0', taraf: 'onlar', tur: girdi.dusman, ad: kur.dus.ad, n: 1, can: Math.round(s.e.can0), x: DUSMAN_X0, z: 0, menzilli: false },
  ];
  const sonCan = (id, c0) => { const v = [...ol].reverse().find((x) => x.tur === 'vurus' && x.h === id); return v ? v.kalan : c0; };
  const ozet = {
    son: zorla ? (kd === 'basarisiz' ? 'ekip_cekildi' : 'dusman_kacti') : s.son,
    ekipCan: Math.round(birimler.filter((b) => b.taraf === 'biz').reduce((a, b) => a + sonCan(b.id, b.can), 0) / kur.canBiz * 100) / 100,
    dusmanCan: Math.round(sonCan('d0', birimler.at(-1).can) / Math.max(1, birimler.at(-1).can) * 100) / 100,
    coken: ol.filter((x) => x.tur === 'cokme' && x.h !== 'd0').map((x) => x.h),
  };
  return { birimler, olaylar: ol, tick, sure: Math.round(tick * SAVAS_TICK * 100) / 100, tickSn: SAVAS_TICK, kademe: kd, kademeAd: KADEME_AD[kd],
    m: Math.round(s.m * 1000) / 1000, zorla, ozet, dusman: { id: girdi.dusman, ad: kur.dus.ad }, sefer: girdi.sefer };
}

// Olay listesinden özet (sonuç kartı): çöken, son canlar.
export const savasOzet = (liste) => ({ ...liste.ozet, kademe: liste.kademe, kademeAd: liste.kademeAd });
export const KADEMELER = Object.keys(SEFER_SONUC);
