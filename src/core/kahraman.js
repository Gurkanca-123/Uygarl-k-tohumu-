// Kahramanlar (docs/AKSIYON.md §3): nüfustan terfi eden adlı kişiler. Nüfusa sayılır, yiyecek yer, konut kullanır, işçi yuvasına
// girmez (yardimci.js `calisamayanSayisi`); ölmez, yalnız yaralanır. Seviye 1–5 (XP_ESIK), 3 eşya yuvası (silah/giysi/tılsım).
// Görev yeri: usta (bir binaya üretim +%25) · bekçi (savunma = sınıf savunması + seviye) · danışman (sınıf yeteneği). Seferdeyken
// ya da yaralıyken görev işlemez. Saf; RNG kullanmaz (ad/portre sırayla).
import { SINIFLAR, ESYALAR, XP_ESIK, KAHRAMAN_TAVAN, YEMIN_MALIYET, ADLAR, GOREV_TURLERI, GOREV_AD, ESYA_YUVALARI, YUVA_AD } from '../data/kahramanlar.js';
import { KAHRAMAN_ILK_GUN, KAHRAMAN_USTA, KAHRAMAN_YARALI, SANDIK_MAX, NUFUS_MIN } from '../data/denge.js';
import {
  BINA, kopya, cagSira, binaBul, binaKurulu, calisanBinalar, merkezBina, kaynakYeter, eksikMetni, kaynakUygula,
  bildir, olayKilitli, OLAY_KILIDI, hataDon, seferdekiKahramanUid, kahramanSayisi,
} from './yardimci.js';

export const SINIF = Object.fromEntries(SINIFLAR.map((s) => [s.id, s]));
export const ESYA = Object.fromEntries(ESYALAR.map((e) => [e.id, e]));
export const BOS_ESYA = () => ({ silah: null, giysi: null, tilsim: null });
export const kahramanDurumVarsayilan = () => ({ teklif: null, ilk: false, yemin: {}, sayac: 0 });

// ---------- Okuma (saf) ----------
export const kahramanBul = (d, uid) => (d.kahramanlar || []).find((k) => k.uid === uid);
export const seviyeHesapla = (xp) => XP_ESIK.reduce((sv, esik, i) => (xp >= esik ? i + 1 : sv), 1);
export const acikYetenekler = (k) => (SINIF[k.sinif]?.yetenekler || []).filter((y) => y.sv <= k.seviye);
export const kahramanSeferde = (d, k) => seferdekiKahramanUid(d).has(k.uid);
// Görevi işleyen kahraman: köyde, yaralı değil.
export const gorevde = (d, k, tur) => k.gorev?.tur === tur && !k.yarali && !kahramanSeferde(d, k);
export const kahramanTavani = (d) => KAHRAMAN_TAVAN[d.cag] ?? 1;

// Eşya etkisi: kahramanın taktığı eşyaların `anahtar` değerleri (sayılar toplanır, mantıksal true bulunursa true).
export function esyaEtki(k, anahtar) {
  let t = 0;
  for (const y of ESYA_YUVALARI) {
    const v = ESYA[k.esya?.[y]]?.etki?.[anahtar];
    if (v === true) return true;
    if (typeof v === 'number') t += v;
  }
  return t;
}
export const esyaVar = (k, esyaId) => ESYA_YUVALARI.some((y) => k.esya?.[y] === esyaId);

// Kahramanlar listesinin açık yeteneklerinden `anahtar` değerleri (dizi).
export function yetenekDegerleri(kahramanlar, anahtar) {
  const v = [];
  for (const k of kahramanlar) for (const y of acikYetenekler(k)) if (y.etki?.[anahtar] !== undefined) v.push(y.etki[anahtar]);
  return v;
}
export const yetenekVar = (kahramanlar, anahtar) => yetenekDegerleri(kahramanlar, anahtar).some(Boolean);
export const yetenekToplam = (kahramanlar, anahtar) => yetenekDegerleri(kahramanlar, anahtar).reduce((a, x) => a + (Number(x) || 0), 0);
export const yetenekEnBuyuk = (kahramanlar, anahtar, taban = 1) => Math.max(taban, ...yetenekDegerleri(kahramanlar, anahtar).map(Number));

// Sefer gücüne katkı: (taban + seviye) × sınıf/hedef çarpanı + eşya gücü (AKSIYON §2.2).
export function kahramanGucu(k, sefer) {
  const s = SINIF[k.sinif];
  let c = sefer?.sinifCarpan?.[k.sinif] ?? 1;
  if (sefer?.etiket === 'av') c = Math.max(c, yetenekEnBuyuk([k], 'avCarpan'));
  return (s.taban + k.seviye) * c + esyaEtki(k, 'guc');
}

// Köyde bekçi kahramanların savunma kalemleri (savunma.js `savunmaDokum`; TEHDIT §7 `kahramanSavunma` kancası).
export function kahramanSavunmaKalemleri(d) {
  return (d.kahramanlar || []).filter((k) => gorevde(d, k, 'bekci')).map((k) => ({
    id: `kahraman:${k.uid}`, ad: `Kahraman ${k.ad}`, deger: (SINIF[k.sinif]?.savunma || 0) + k.seviye, uid: k.uid,
  })).filter((x) => x.deger > 0);
}

// Usta kahramanın bulunduğu binaya üretim çarpanı (uretim.js).
export function ustaCarpani(d, binaUid) {
  return (d.kahramanlar || []).some((k) => gorevde(d, k, 'usta') && k.gorev.hedef === binaUid) ? 1 + KAHRAMAN_USTA : 1;
}

// ---------- Kopya üstünde değişimler ----------
// XP ekler (Kurt Dişi Kolye +%25), seviye atlamayı bildirir. Dönüş: eklenen XP.
export function xpEkle(d, k, miktar, bildirimler) {
  if (!(miktar > 0)) return 0;
  const n = Math.round(miktar * (1 + esyaEtki(k, 'xp')));
  const eski = k.seviye;
  k.xp += n;
  k.seviye = Math.min(XP_ESIK.length, seviyeHesapla(k.xp));
  if (k.seviye > eski) {
    const yeni = acikYetenekler(k).filter((y) => y.sv > eski);
    bildir(bildirimler, 'kahraman_seviye', `${k.ad} ${k.seviye}. seviyeye yükseldi${yeni.length ? `; yeni yetenek: ${yeni.map((y) => y.ad).join(', ')}` : ''}.`,
      'iyi', { kahraman: k.uid, seviye: k.seviye });
  }
  return n;
}

// Yaralanma: süre − eşya `yaraliSure`; Şifacı Çadırı çalışıyorsa ×0,5 (en az 1).
export function kahramanYarala(d, k, sure, bildirimler) {
  let s = Math.max(1, sure - esyaEtki(k, 'yaraliSure'));
  if (calisanBinalar(d).some((b) => b.id === 'sifaci_cadiri')) s = Math.max(1, Math.ceil(s * KAHRAMAN_YARALI.sifaci));
  k.yarali = Math.max(k.yarali, s);
  bildir(bildirimler, 'kahraman_yarali', `${k.ad} yaralandı; ${k.yarali} gün görev ve sefer yapamaz.`, 'uyari', { kahraman: k.uid, sure: k.yarali });
}

// Eşyayı sandığa koyar (dolu ise kaybolur, bildirilir). Dönüş: konduysa true.
export function sandigaKoy(d, esyaId, bildirimler) {
  if (!ESYA[esyaId]) return false;
  if ((d.sandik || []).length >= SANDIK_MAX) {
    bildir(bildirimler, 'kahraman_sandik_dolu', `Köy sandığı dolu; ${ESYA[esyaId].ad} bırakıldı.`, 'uyari', { esya: esyaId });
    return false;
  }
  d.sandik = [...(d.sandik || []), esyaId];
  bildir(bildirimler, 'kahraman_esya', `Yeni eşya: ${ESYA[esyaId].ad} (sandıkta).`, 'iyi', { esya: esyaId });
  return true;
}
// Eşya köyde (sandıkta ya da bir kahramanda) var mı.
export const esyaSahip = (d, esyaId) => (d.sandik || []).includes(esyaId) || (d.kahramanlar || []).some((k) => esyaVar(k, esyaId));

// Kopya üstünde: yeni kahraman (nüfustan; çağıran nüfus/tavan denetimini yapar). Ad ve portre sırayla.
export function kahramanOlustur(d, sinif, { seviye = 1 } = {}) {
  const kd = d.kahramanDurum;
  kd.sayac += 1;
  const i = (kd.sayac - 1 + (Number(d.tohum) || 0)) % ADLAR.length;
  const k = { uid: `h${kd.sayac}`, ad: ADLAR[i], sinif, seviye, xp: XP_ESIK[seviye - 1] || 0, gorev: null, yarali: 0, esya: BOS_ESYA(), portre: i };
  d.kahramanlar = [...(d.kahramanlar || []), k];
  return k;
}
// Bir kişi daha kahraman olabilir mi (köyde en az NUFUS_MIN sıradan kişi kalır). Dönüş: hata ya da null.
export function terfiHatasi(d, { ekNufus = 0 } = {}) {
  if (kahramanSayisi(d) >= kahramanTavani(d)) return `Bu çağda en çok ${kahramanTavani(d)} kahraman olabilir.`;
  if (d.nufus + ekNufus - kahramanSayisi(d) - 1 < NUFUS_MIN) return 'Köyde en az iki sıradan kişi kalmalı.';
  return null;
}
export const acikSiniflar = (d) => SINIFLAR.filter((s) => s.acik && cagSira(s.cagMin) <= cagSira(d.cag));

// ---------- Adımlar (sefer adımı m3 çağırır) ----------
// Yaralı süreleri −1; tehdit varışı: püskürtmede köydeki bekçi kahramana XP = güç, yenilgide ağır yaralı (8 tur);
// danışman Kaşif (Sv3) tehdit gücünü kesinleştirir; danışman Avcı +1 yiyecek.
export function adimKahraman(d, bildirimler) {
  if (!d.kahramanlar?.length) return;
  for (const k of d.kahramanlar) {
    if (k.yarali > 0 && !kahramanSeferde(d, k)) {
      k.yarali -= 1;
      if (k.yarali === 0) bildir(bildirimler, 'kahraman_iyilesti', `${k.ad} iyileşti.`, 'iyi', { kahraman: k.uid });
    }
  }
  const son = d.tehdit?.gecmis?.at(-1);
  if (son && son.tur === d.tur) {
    for (const k of d.kahramanlar.filter((x) => gorevde(d, x, 'bekci'))) {
      if (son.sonuc === 'puskurtme') xpEkle(d, k, son.guc, bildirimler);
      if (son.sonuc === 'yenilgi') kahramanYarala(d, k, KAHRAMAN_YARALI.tehdit, bildirimler);
    }
  }
  const danisman = d.kahramanlar.filter((x) => gorevde(d, x, 'danisman'));
  const a = d.tehdit?.aktif;
  if (a && !a.bilinen && yetenekVar(danisman, 'danismanTehdit')) {
    a.bilinen = true;
    bildir(bildirimler, 'tehdit_bilgi', `Danışman kaşif tehdidin gücünü öğrendi: ${a.guc}.`, 'bilgi', { tehdit: a.id });
  }
  for (const k of danisman) {
    const y = SINIF[k.sinif]?.danisman?.danismanYiyecek || 0;
    if (y) kaynakUygula(d, { yiyecek: y });
  }
}

// İlk kahraman teklifi (gün KAHRAMAN_ILK_GUN, garanti; hedef adımı o3 çağırır). Oyunu durdurmaz; `kahramanTerfi` ile seçilir.
export function ilkKahramanTeklifi(d, bildirimler) {
  const kd = d.kahramanDurum;
  if (kd.ilk || d.tur + 1 < KAHRAMAN_ILK_GUN) return;
  kd.ilk = true;
  if (kahramanSayisi(d) > 0) return;
  kd.teklif = { tur: d.tur, siniflar: ['avci', 'kasif'] };
  bildir(bildirimler, 'kahraman_teklif', 'Ateş Başında Bir Ses: kabileden biri öne çıkıyor. Avcı mı olsun, Kaşif mi?', 'iyi',
    { siniflar: ['avci', 'kasif'] });
}

// ---------- Komutlar ----------
// Teklif varsa ücretsiz (yalnız teklifteki sınıflar); yoksa Ateş Yemini: çağ başına 1, merkez bina, YEMIN_MALIYET.
export function kahramanTerfiBilgi(d, sinif) {
  const s = SINIF[sinif];
  const teklif = d.kahramanDurum?.teklif;
  const maliyet = teklif ? {} : (YEMIN_MALIYET[d.cag] || {});
  let hata = null;
  if (!s || !s.acik) hata = 'Bu sınıf henüz yok.';
  else if (cagSira(s.cagMin) > cagSira(d.cag)) hata = `${s.ad} sınıfı bu çağda açılmadı.`;
  else if (teklif && !teklif.siniflar.includes(sinif)) hata = `Teklif yalnız ${teklif.siniflar.map((x) => SINIF[x].ad).join(' ya da ')} için.`;
  else hata = terfiHatasi(d);
  if (!hata && !teklif) {
    if (d.kahramanDurum?.yemin?.[d.cag]) hata = 'Ateş Yemini bu çağda zaten yapıldı.';
    else if (!merkezBina(d)) hata = 'Ateş Yemini için merkez bina gerekir.';
    else if (!kaynakYeter(d, maliyet)) hata = `Kaynak yetersiz: ${eksikMetni(d, maliyet)} eksik.`;
  }
  return { uygun: !hata, hata, maliyet, teklif: !!teklif };
}
export function kahramanTerfi(durum, sinif) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const b = kahramanTerfiBilgi(durum, sinif);
  if (b.hata) return hataDon(durum, b.hata);
  const d = kopya(durum);
  const bildirimler = [];
  if (!b.teklif) {
    kaynakUygula(d, Object.fromEntries(Object.entries(b.maliyet).map(([r, m]) => [r, -m])));
    d.kahramanDurum.yemin = { ...d.kahramanDurum.yemin, [d.cag]: true };
  }
  d.kahramanDurum.teklif = null;
  const k = kahramanOlustur(d, sinif);
  bildir(bildirimler, 'kahraman_yeni', `${k.ad} artık bir ${SINIF[sinif].ad}.`, 'iyi', { kahraman: k.uid, sinif });
  return { durum: d, bildirimler, kahraman: k.uid };
}

// gorev: null (görevsiz) | { tur: 'usta', hedef: binaUid } | { tur: 'bekci' } | { tur: 'danisman' } (ya da tür dizgisi).
export function kahramanGorev(durum, uid, gorev) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const k = kahramanBul(durum, uid);
  if (!k) return hataDon(durum, 'Böyle bir kahraman yok.');
  const g = typeof gorev === 'string' ? { tur: gorev } : gorev;
  if (g !== null && (!g || !GOREV_TURLERI.includes(g.tur))) return hataDon(durum, 'Geçersiz görev.');
  if (g?.tur === 'usta') {
    const b = binaBul(durum, g.hedef);
    if (!b || !binaKurulu(durum, b)) return hataDon(durum, 'Usta için kurulu bir bina seç.');
    if (!(BINA[b.id].isci > 0)) return hataDon(durum, `${BINA[b.id].ad} işçi çalıştırmıyor; usta olunamaz.`);
    if ((durum.kahramanlar || []).some((x) => x.uid !== uid && x.gorev?.tur === 'usta' && x.gorev.hedef === b.uid)) {
      return hataDon(durum, 'Bu binada zaten bir usta var.');
    }
  }
  const d = kopya(durum);
  kahramanBul(d, uid).gorev = g ? (g.tur === 'usta' ? { tur: 'usta', hedef: g.hedef } : { tur: g.tur, hedef: null }) : null;
  return { durum: d };
}

export function kahramanEsyaGiy(durum, uid, esyaId) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const k = kahramanBul(durum, uid);
  if (!k) return hataDon(durum, 'Böyle bir kahraman yok.');
  if (kahramanSeferde(durum, k)) return hataDon(durum, `${k.ad} seferde; eşya değiştirilemez.`);
  const e = ESYA[esyaId];
  if (!e) return hataDon(durum, 'Böyle bir eşya yok.');
  const i = (durum.sandik || []).indexOf(esyaId);
  if (i < 0) return hataDon(durum, `${e.ad} sandıkta yok.`);
  const d = kopya(durum);
  const dk = kahramanBul(d, uid);
  d.sandik.splice(i, 1);
  if (dk.esya[e.yuva]) d.sandik.push(dk.esya[e.yuva]);
  dk.esya[e.yuva] = esyaId;
  return { durum: d };
}

export function kahramanEsyaCikar(durum, uid, yuva) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const k = kahramanBul(durum, uid);
  if (!k) return hataDon(durum, 'Böyle bir kahraman yok.');
  if (!ESYA_YUVALARI.includes(yuva)) return hataDon(durum, 'Geçersiz yuva.');
  if (!k.esya[yuva]) return hataDon(durum, `${YUVA_AD[yuva]} yuvası zaten boş.`);
  if (kahramanSeferde(durum, k)) return hataDon(durum, `${k.ad} seferde; eşya değiştirilemez.`);
  if ((durum.sandik || []).length >= SANDIK_MAX) return hataDon(durum, 'Köy sandığı dolu.');
  const d = kopya(durum);
  const dk = kahramanBul(d, uid);
  d.sandik.push(dk.esya[yuva]);
  dk.esya[yuva] = null;
  return { durum: d };
}

// Tarifli eşya yap (ör. Taş Mızrak: 2 alet + 1 deri, Alet Yapımcısı). Sandığa girer.
export function esyaYapHatasi(d, esyaId) {
  const e = ESYA[esyaId];
  if (!e?.tarif || !e.mvp) return 'Bu eşya yapılamaz.';
  if (!calisanBinalar(d).some((b) => b.id === e.tarif.bina)) return `${e.ad} için ${BINA[e.tarif.bina].ad} gerekir.`;
  if (!kaynakYeter(d, e.tarif.kaynak)) return `Kaynak yetersiz: ${eksikMetni(d, e.tarif.kaynak)} eksik.`;
  if ((d.sandik || []).length >= SANDIK_MAX) return 'Köy sandığı dolu.';
  return null;
}
export function esyaYap(durum, esyaId) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const h = esyaYapHatasi(durum, esyaId);
  if (h) return hataDon(durum, h);
  const e = ESYA[esyaId];
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(e.tarif.kaynak).map(([r, m]) => [r, -m])));
  d.sandik.push(esyaId);
  return { durum: d };
}

// ---------- Arayüz okuması ----------
export function kahramanGorunumu(d) {
  const seferde = seferdekiKahramanUid(d);
  const liste = (d.kahramanlar || []).map((k) => {
    const s = SINIF[k.sinif];
    const sonraki = XP_ESIK[k.seviye] ?? null;
    return {
      uid: k.uid, ad: k.ad, sinif: k.sinif, sinifAd: s.ad, renk: s.renk, portre: k.portre, seviye: k.seviye, xp: k.xp,
      xpSonraki: sonraki, yarali: k.yarali, seferde: seferde.has(k.uid),
      gorev: k.gorev, gorevAd: k.gorev ? GOREV_AD[k.gorev.tur] : null, gorevHedefAd: k.gorev?.hedef ? BINA[binaBul(d, k.gorev.hedef)?.id]?.ad ?? null : null,
      guc: kahramanGucu(k, null), savunma: (s.savunma || 0) + k.seviye,
      esya: Object.fromEntries(ESYA_YUVALARI.map((y) => [y, k.esya[y] ? { id: k.esya[y], ad: ESYA[k.esya[y]].ad, etki: ESYA[k.esya[y]].etki } : null])),
      yetenekler: s.yetenekler.map((y) => ({ id: y.id, ad: y.ad, metin: y.metin, sv: y.sv, acik: y.sv <= k.seviye })),
    };
  });
  return {
    liste,
    tavan: kahramanTavani(d),
    sandik: (d.sandik || []).map((id) => ({ id, ad: ESYA[id].ad, yuva: ESYA[id].yuva, yuvaAd: YUVA_AD[ESYA[id].yuva], etki: ESYA[id].etki })),
    sandikMax: SANDIK_MAX,
    teklif: d.kahramanDurum?.teklif ? { siniflar: d.kahramanDurum.teklif.siniflar.map((id) => ({ id, ad: SINIF[id].ad })) } : null,
    terfi: acikSiniflar(d).map((s) => ({ sinif: s.id, ad: s.ad, ...kahramanTerfiBilgi(d, s.id) })),
    tarifler: ESYALAR.filter((e) => e.tarif && e.mvp).map((e) => ({ id: e.id, ad: e.ad, kaynak: e.tarif.kaynak, bina: e.tarif.bina,
      uygun: !esyaYapHatasi(d, e.id), hata: esyaYapHatasi(d, e.id) })),
    gorevTurleri: GOREV_TURLERI.map((id) => ({ id, ad: GOREV_AD[id] })),
  };
}
