// Komşular — model B (docs/AKSIYON.md §4): keşifle bulunan komşu yerleşim, ilişki, mevsimlik niyet (6 kurallı basit yapay zekâ),
// ticaret teklifi, hediye/elçi, haraç talebi, ittifak; baskın seferi sefer.js'de. Saf; yalnız ayrı tohumlu `durum.komsu.rng`.
// Komşu kendi başına saldırı başlatmaz: düşmanlık tehdit motorunun ağırlık/gerginlik/kesin doğum kancalarından geçer (komsu_temel.js).
import { KOMSULAR, MIZACLAR, NIYET_KURALLARI, KOMSU_MVP_SAYI } from '../data/komsular.js';
import {
  KOMSU_MESAFE, KOMSU_BUL_KESIF, KOMSU_CAG_GECIKME, KOMSU_KAYMA, KOMSU_ILISKI, KOMSU_HEDIYE, KOMSU_TICARET, KOMSU_HARAC_ORAN,
  KOMSU_HARAC_GERGINLIK, MEVSIM_TUR, TEHDIT_DOGUM_ESIK,
} from '../data/denge.js';
import { CAGLAR } from '../data/caglar.js';
import {
  KARO, KAYNAK, kopya, cagSira, kaynakAcik, kaynakUygula, kaynakYeter, eksikMetni, bildir, siklikProfil, bekleyenKararSayisi, olayKilitli, OLAY_KILIDI, hataDon,
} from './yardimci.js';
import { rngBaslat, rngSonraki } from './rng.js';
import { karoAt, merkezNokta } from '../world/harita.js';
import { icinde } from '../world/izgara.js';
import { kesifSayisi, kesifUygula, yonAdi } from '../world/kesif.js';
import { savunmaHesapla } from './savunma.js';
import { KOMSU, komsuBul, komsuIliski, iliskiDegistir, iliskiEtiketi, komsuGucu } from './komsu_temel.js';

export const komsuRngBaslat = (tohum) => rngBaslat(`komsu:${tohum}`);
export const komsuDurumVarsayilan = (tohum) => ({ rng: komsuRngBaslat(tohum), sonTalep: -99 });
const MIZAC_IDLER = Object.keys(MIZACLAR);

function kz(d) {
  const r = rngSonraki(d.komsu.rng);
  d.komsu.rng = r.rng;
  return r.deger;
}
const barisci = (d) => d.zorluk === 'barisci';

// ---------- Bulunma ----------
// Kopya üstünde: bulunabilecek sıradaki komşu (çağı gelmiş, MVP sayısı içinde) yerleştirilir. Dönüş: komşu ya da null.
export function komsuKesfet(d, bildirimler, { neden = 'kesif' } = {}) {
  if (!d.komsu) return null;
  const sira = (d.komsular || []).length;
  const t = KOMSULAR[sira];
  if (!t || sira >= KOMSU_MVP_SAYI || cagSira(d.cag) < cagSira(t.cagBul)) return null;
  const yer = komsuYerlestir(d);
  if (!yer) return null;
  const mizac = MIZAC_IDLER[Math.floor(kz(d) * MIZAC_IDLER.length)];
  const k = { id: t.id, x: yer.x, y: yer.y, mizac, cag: d.cag, cagTur: d.tur, iliski: 0, durum: 'bagimsiz', niyet: null, bekleme: {} };
  k.iliski = komsuIliski(d, k); // TEHDIT §7 ilişki puanı (A) göçsüz aktarılır
  d.komsular = [...(d.komsular || []), k];
  kesifUygula(d, { x: yer.x + 0.5, y: yer.y + 0.5 }, 2);
  const m = merkezNokta(d);
  bildir(bildirimler, 'komsu_bulundu', `${t.ilkMesaj} (${yonAdi(yer.x + 0.5 - m.x, yer.y + 0.5 - m.y)}, ${MIZACLAR[mizac].ad})`, 'iyi',
    { komsu: k.id, x: k.x, y: k.y, neden });
  return k;
}

// Merkezden KOMSU_MESAFE aralığında, geçilebilir karo (sis altında olabilir). Tohumlu (komsu.rng).
export function komsuYerlestir(d) {
  const m = merkezNokta(d);
  const [a, b] = KOMSU_MESAFE;
  const n = d.harita.boyut;
  const aday = [];
  for (let y = Math.floor(m.y - b); y <= m.y + b; y++) for (let x = Math.floor(m.x - b); x <= m.x + b; x++) {
    if (!icinde(n, x, y)) continue;
    const u = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
    if (u < a || u > b || !KARO[karoAt(d, x, y)]?.gecilir || karoAt(d, x, y) === 'yol') continue;
    aday.push({ x, y });
  }
  if (!aday.length) return null;
  return aday[Math.floor(kz(d) * aday.length)];
}

// ---------- Yapay zekâ (saf) ----------
function kuralTutar(d, k, kural, gucOran) {
  const c = kural.kosul || {};
  const il = komsuIliski(d, k);
  if (c.barisciKapali && barisci(d)) return false;
  if (c.iliskiMin !== undefined && il < c.iliskiMin) return false;
  if (c.iliskiMax !== undefined && il > c.iliskiMax) return false;
  if (c.cagMin && cagSira(d.cag) < cagSira(c.cagMin)) return false;
  if (c.ittifakYok && k.durum === 'ittifak') return false;
  if (c.mizac && k.mizac !== c.mizac) return false;
  if (c.gucOranMin !== undefined && gucOran < c.gucOranMin) return false;
  return true;
}
// §4.3: ilk tutan kural (sabit sıra). Dönüş: kural.
export function komsuNiyeti(d, k) {
  const gucOran = komsuGucu(d, k) / Math.max(1, savunmaHesapla(d));
  return NIYET_KURALLARI.find((r) => kuralTutar(d, k, r, gucOran));
}

// Kopya üstünde: kuralın içeriğini (teklif/talep) komsu.rng ile kurar.
function niyetKur(d, k, kural) {
  const n = { tur: kural.id, kalan: kural.sure, etki: kural.etki ? { ...kural.etki } : null, kullanildi: false };
  if (kural.id === 'ticaret') {
    const acik = ['yiyecek', 'odun', 'tas', 'deri', 'alet', 'kil', 'metal', 'sikke'].filter((r) => kaynakAcik(d, r));
    const ver = acik[Math.floor(kz(d) * acik.length)];
    const al = acik.filter((r) => r !== ver)[Math.floor(kz(d) * (acik.length - 1))];
    const [a, b] = KOMSU_TICARET.miktar;
    const verMiktar = a + Math.floor(kz(d) * (b - a + 1));
    n.takas = { ver, verMiktar, al, alMiktar: Math.max(1, Math.round(verMiktar * (KOMSU_TICARET.carpan[k.mizac] ?? 1))) };
  }
  if (kural.id === 'harac') {
    n.harac = Object.fromEntries(['yiyecek', 'odun', 'tas', 'deri', 'alet', 'metal', 'sikke'].filter((r) => (d.kaynaklar[r] || 0) >= 1)
      .map((r) => [r, Math.ceil((d.kaynaklar[r] || 0) * KOMSU_HARAC_ORAN)]));
  }
  return n;
}

// ---------- Adım o4 (takvimden sonra) ----------
// Her tur: keşif oranıyla bulunma, çağ yetişme. Mevsim başı: süresi biten niyetler (cevapsız haraç = red), ilişki kayması, yeni niyet.
export function adimKomsu(durum, bildirimler = [], sec = {}) {
  if (!durum.komsu) return durum;
  const d = kopya(durum);
  const n = d.harita.boyut;
  if (!(d.komsular || []).length && cagSira(d.cag) >= cagSira(KOMSULAR[0].cagBul) && kesifSayisi(d) >= KOMSU_BUL_KESIF * n * n) {
    komsuKesfet(d, bildirimler, { neden: 'kesif' });
  }
  for (const k of d.komsular || []) {
    const sonraki = CAGLAR.find((c) => c.sira === cagSira(k.cag) + 1);
    if (sonraki && cagSira(k.cag) < cagSira(d.cag) && d.tur - d.cagBaslangicTuru >= KOMSU_CAG_GECIKME) {
      k.cag = sonraki.id;
      k.cagTur = d.tur;
      bildir(bildirimler, 'komsu_cag', `${KOMSU[k.id].ad} ${sonraki.ad}'na geçti.`, 'bilgi', { komsu: k.id, cag: k.cag });
    }
  }
  if (d.tur % MEVSIM_TUR !== 0 || d.tur === 0) return d;
  for (const k of d.komsular || []) {
    const ad = KOMSU[k.id].ad;
    if (k.niyet) {
      k.niyet.kalan -= 1;
      if (k.niyet.kalan > 0 && !k.niyet.kullanildi) continue;
      if (k.niyet.tur === 'harac' && !k.niyet.kullanildi) haracRed(d, k, bildirimler, true);
      k.niyet = null;
    }
    const il = komsuIliski(d, k);
    if (il) iliskiDegistir(d, k, -Math.sign(il) * Math.min(Math.abs(il), KOMSU_KAYMA));
    const kural = komsuNiyeti(d, k);
    // Karar isteyen teklif/talepler (takas, haraç, ittifak) nadir: iki talep arası komsuTalepAralik tur ve başka bekleyen karar yokken.
    // Düşmanca/baskın niyeti karar değil, tehdit ağırlığıdır; süzülmez.
    const talep = ['ticaret', 'harac', 'ittifak'].includes(kural.id);
    if (talep && (d.tur - (d.komsu.sonTalep ?? -99) < siklikProfil(sec).komsuTalepAralik || bekleyenKararSayisi(d))) {
      k.niyet = null;
      continue;
    }
    k.niyet = kural.id === 'sessiz' ? null : niyetKur(d, k, kural);
    if (talep) d.komsu.sonTalep = d.tur;
    if (k.niyet) bildir(bildirimler, 'komsu_niyet', kural.metin.replace('{ad}', ad), ['harac', 'baskin', 'dusmanca'].includes(kural.id) ? 'uyari' : 'bilgi',
      { komsu: k.id, niyet: kural.id });
  }
  return d;
}

function haracRed(d, k, bildirimler, cevapsiz = false) {
  iliskiDegistir(d, k, KOMSU_ILISKI.haracRed);
  if (d.tehdit && !d.tehdit.aktif) d.tehdit.gerginlik = Math.min(TEHDIT_DOGUM_ESIK, d.tehdit.gerginlik + KOMSU_HARAC_GERGINLIK);
  bildir(bildirimler, 'komsu_harac_red', `${KOMSU[k.id].ad}'na haraç ${cevapsiz ? 'gönderilmedi' : 'reddedildi'}; ilişki bozuldu.`, 'uyari', { komsu: k.id });
}

// ---------- Komutlar ----------
export function hediyeBilgi(d, k) {
  const g = komsuGucu(d, k);
  const sikke = cagSira(d.cag) >= cagSira(KOMSU_HEDIYE.sikkeCag);
  const maliyet = sikke ? { sikke: Math.ceil(g * KOMSU_HEDIYE.sikkeCarpan) } : { yiyecek: Math.ceil(g * KOMSU_HEDIYE.yiyecekCarpan) };
  let hata = null;
  if ((k.bekleme?.hediye ?? -Infinity) > d.tur) hata = 'Bu mevsim zaten elçi gönderildi.';
  else if (!kaynakYeter(d, maliyet)) hata = `Kaynak yetersiz: ${eksikMetni(d, maliyet)} eksik.`;
  return { uygun: !hata, hata, maliyet, iliski: KOMSU_ILISKI.hediye };
}
// Elçi + hediye: ilişki +12, mevsimde 1 kez (mevsim görevi "Komşuya hediye götür" ilerler).
export function komsuElciGonder(durum, komsuId) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const k0 = komsuBul(durum, komsuId);
  if (!k0) return hataDon(durum, 'Böyle bir komşu bilinmiyor.');
  const b = hediyeBilgi(durum, k0);
  if (b.hata) return hataDon(durum, b.hata);
  const d = kopya(durum);
  const k = komsuBul(d, komsuId);
  kaynakUygula(d, Object.fromEntries(Object.entries(b.maliyet).map(([r, m]) => [r, -m])));
  const yeni = iliskiDegistir(d, k, b.iliski);
  const mevsimSonu = (Math.floor(d.tur / MEVSIM_TUR) + 1) * MEVSIM_TUR;
  k.bekleme = { ...k.bekleme, hediye: mevsimSonu };
  if (d.hedef) d.hedef.sayac = { ...d.hedef.sayac, hediye: (d.hedef.sayac.hediye || 0) + 1 };
  const bildirimler = [];
  bildir(bildirimler, 'komsu_hediye', `${KOMSU[k.id].ad} hediyeyi kabul etti (ilişki ${yeni}).`, 'iyi', { komsu: k.id, iliski: yeni });
  return { durum: d, bildirimler };
}

// Mevsimin ticaret teklifini uygula (bir kez).
export function komsuTicaret(durum, komsuId) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const k0 = komsuBul(durum, komsuId);
  if (!k0) return hataDon(durum, 'Böyle bir komşu bilinmiyor.');
  const n = k0.niyet;
  if (n?.tur !== 'ticaret' || n.kullanildi) return hataDon(durum, 'Bu mevsim ticaret teklifi yok.');
  const t = n.takas;
  if ((durum.kaynaklar[t.ver] || 0) + 1e-9 < t.verMiktar) return hataDon(durum, `Yeterli ${KAYNAK[t.ver].ad} yok (${t.verMiktar}).`);
  const d = kopya(durum);
  const k = komsuBul(d, komsuId);
  kaynakUygula(d, { [t.ver]: -t.verMiktar });
  kaynakUygula(d, { [t.al]: t.alMiktar });
  k.niyet.kullanildi = true;
  iliskiDegistir(d, k, KOMSU_ILISKI.ticaret);
  const bildirimler = [];
  bildir(bildirimler, 'komsu_ticaret', `${KOMSU[k.id].ad} ile takas: ${t.verMiktar} ${KAYNAK[t.ver].ad} → ${t.alMiktar} ${KAYNAK[t.al].ad}.`, 'iyi',
    { komsu: k.id });
  return { durum: d, bildirimler };
}

// Haraç talebi / ittifak teklifine yanıt.
export function komsuYanit(durum, komsuId, yanit) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const k0 = komsuBul(durum, komsuId);
  if (!k0) return hataDon(durum, 'Böyle bir komşu bilinmiyor.');
  if (!['kabul', 'red'].includes(yanit)) return hataDon(durum, 'Yanıt "kabul" ya da "red" olmalı.');
  const n = k0.niyet;
  if (!n || !['harac', 'ittifak'].includes(n.tur) || n.kullanildi) return hataDon(durum, 'Yanıt bekleyen talep yok.');
  const d = kopya(durum);
  const k = komsuBul(d, komsuId);
  const bildirimler = [];
  k.niyet.kullanildi = true;
  if (n.tur === 'harac') {
    if (yanit === 'kabul') {
      kaynakUygula(d, Object.fromEntries(Object.entries(n.harac).map(([r, m]) => [r, -m])));
      iliskiDegistir(d, k, KOMSU_ILISKI.haracOde);
      bildir(bildirimler, 'komsu_harac', `${KOMSU[k.id].ad}'na haraç ödendi.`, 'bilgi', { komsu: k.id });
    } else haracRed(d, k, bildirimler);
  } else if (yanit === 'kabul') {
    k.durum = 'ittifak';
    bildir(bildirimler, 'komsu_ittifak', `${KOMSU[k.id].ad} ile ittifak kuruldu.`, 'iyi', { komsu: k.id });
  }
  return { durum: d, bildirimler };
}

// ---------- Arayüz okuması ----------
const GUC_KADEME = [[0.6, 'zayıf'], [1, 'denk'], [1.5, 'güçlü'], [Infinity, 'çok güçlü']];
export function komsuGorunumu(d) {
  const sv = Math.max(1, savunmaHesapla(d));
  return (d.komsular || []).map((k) => {
    const il = komsuIliski(d, k);
    const g = komsuGucu(d, k);
    const e = iliskiEtiketi(il);
    const n = k.niyet;
    const bas = (d.sefer?.bekleme?.[`baskin_seferi:${k.id}`] ?? -Infinity) - d.tur;
    return {
      id: k.id, ad: KOMSU[k.id].ad, x: k.x, y: k.y, mizac: k.mizac, mizacAd: MIZACLAR[k.mizac].ad, profil: MIZACLAR[k.mizac].profil,
      cag: k.cag, guc: g, gucKademe: GUC_KADEME.find(([u]) => g / sv <= u)[1], iliski: il, etiket: e.id, etiketAd: e.ad, durum: k.durum,
      niyet: n ? { tur: n.tur, kalan: n.kalan, kullanildi: n.kullanildi, takas: n.takas || null, harac: n.harac || null } : null,
      hediye: hediyeBilgi(d, k),
      ticaret: { uygun: n?.tur === 'ticaret' && !n.kullanildi },
      yanit: { uygun: !!n && ['harac', 'ittifak'].includes(n.tur) && !n.kullanildi },
      baskin: { bekleme: bas > 0 ? bas : 0, kapali: barisci(d) || cagSira(d.cag) < cagSira('bronz') },
    };
  });
}
