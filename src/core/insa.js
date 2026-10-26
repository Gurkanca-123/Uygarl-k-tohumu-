// İnşaat (TASARIM §3.2, §3.5, §7.2): maliyet, yerleşim denetimi, süre, işçi yuvası, bakım; adımlar b (inşaat) ve c (bakım).
// Komutlar: insaEt, yukselt, onar, yik → { durum, hata? }. Geçersiz komut durumu değiştirmez.
import {
  MALIYET_K, MALIYET_K_KONUT, YUKSELTME_MALIYET, YIKIM_IADE, ONARIM, ONARIM_SURE,
} from '../data/denge.js';
import {
  BINA, CAG, BULUS, KARO_KOD, kopya, cagSira, mevcutCag, cagAcik, binaBul, binaKurulu, binaIsi, bildir, sonTur,
  kaynakYeter, eksikMetni, kaynakUygula, atamaDuzelt, olayKilitli, OLAY_KILIDI, hataDon, bulusEtkileri,
} from './yardimci.js';
import { izgara, karoAt, kenarKomsulari } from './uretim.js';

// §7.2: n'inci bina = max(taban, round(taban × k^(n−1))); yıkılanlar sayılmaz, inşaatta olanlar sayılır.
export function maliyetHesapla(d, binaId) {
  const t = BINA[binaId];
  const mevcut = d.binalar.filter((b) => b.id === binaId).length;
  const k = t.tur === 'konut' ? MALIYET_K_KONUT : MALIYET_K;
  const m = {};
  for (const [r, taban] of Object.entries(t.maliyet)) m[r] = Math.max(taban, Math.round(taban * k ** mevcut));
  return m;
}
export function yukseltmeMaliyeti(b) {
  const t = BINA[b.id];
  const c = YUKSELTME_MALIYET[b.seviye - 1];
  return Object.fromEntries(Object.entries(t.maliyet).map(([r, m]) => [r, Math.round(m * c)]));
}
export function onarimMaliyeti(b) {
  return Object.fromEntries(Object.entries(BINA[b.id].maliyet).map(([r, m]) => [r, Math.round(m * ONARIM)]));
}

// Eşzamanlı inşaat sınırına yeni inşaat ve yükseltme sayılır.
// TODO(tasarim): onarım (1 tur) sınıra sayılır mı yazılmamış → sayılmaz varsayıldı.
export const suankiInsaatSayisi = (d) => d.insaatSirasi.filter((s) => !s.startsWith('onar:')).length;
export function insaatSinirDolu(d) {
  return suankiInsaatSayisi(d) >= mevcutCag(d).esZamanliInsaat;
}

// Açık alan merkezden kare büyür (§3.1).
export function acikAlan(d) {
  const a = mevcutCag(d).acikAlan;
  const bas = (d.harita.boyut - a) / 2;
  return { x0: bas, y0: bas, x1: bas + a, y1: bas + a };
}

export function insaEdilebilirMi(d, binaId) {
  const t = BINA[binaId];
  if (!t) return 'Böyle bir bina yok.';
  if (t.tur === 'merkez') return 'Merkez bina inşa edilmez; çağ atlayınca dönüşür.';
  if (!cagAcik(d, t.cag)) return `${t.ad} için gereken çağ: ${CAG[t.cag].ad}.`;
  const g = t.gereksinim;
  if (g.bulus && !d.buluslar.includes(g.bulus)) return `${t.ad} için önce "${BULUS[g.bulus].ad}" buluşu gerekir.`;
  if (g.tekil && d.binalar.some((b) => b.id === binaId)) return `${t.ad} tekildir; yalnız bir tane kurulabilir.`;
  return null;
}

export function yerUygunMu(d, binaId, x, y) {
  const t = BINA[binaId];
  const [g, h] = t.boyut;
  if (!Number.isInteger(x) || !Number.isInteger(y)) return 'Geçersiz konum.';
  const a = acikAlan(d);
  if (x < a.x0 || y < a.y0 || x + g > a.x1 || y + h > a.y1) return 'Konum açık alanın dışında.';
  const hucre = izgara(d);
  const n = d.harita.boyut;
  let ustte = false;
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < g; dx++) {
    if (hucre[(y + dy) * n + x + dx]) return 'Bu karolar dolu.';
    const karo = KARO_KOD[d.harita.karolar[(y + dy) * n + x + dx]];
    const izinli = karo.insaEdilir || (karo.yalnizBina || []).includes(binaId);
    if (!izinli) return `${karo.ad} üstüne inşa edilemez.`;
    if (karo.yalnizBina && !karo.yalnizBina.includes(binaId)) return `${karo.ad} yalnız ilgili ocak için.`;
    if (t.gereksinim.karoUstu && karo.id === t.gereksinim.karoUstu) ustte = true;
  }
  if (t.gereksinim.karoUstu && !ustte) return `${t.ad} en az bir ${t.gereksinim.karoUstu} karosunun üstüne kurulmalı.`;
  if (t.gereksinim.karoBitisik) {
    const sanal = { id: binaId, x, y };
    if (!kenarKomsulari(d, sanal).some(([kx, ky]) => karoAt(d, kx, ky) === t.gereksinim.karoBitisik)) {
      return `${t.ad} bir ${t.gereksinim.karoBitisik} karosuna bitişik olmalı.`;
    }
  }
  return null;
}

function yeniUid(d) {
  const enBuyuk = d.binalar.reduce((a, b) => Math.max(a, Number(b.uid.slice(1)) || 0), 0);
  return `b${enBuyuk + 1}`;
}

// Komut: inşa et. Maliyet anında düşer; bina `insaKalan` tur sonra (b adımında 0 olduğu tur) çalışmaya başlar.
export function insaEt(durum, binaId, x, y) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const h1 = insaEdilebilirMi(durum, binaId);
  if (h1) return hataDon(durum, h1);
  if (insaatSinirDolu(durum)) return hataDon(durum, `Aynı anda en çok ${mevcutCag(durum).esZamanliInsaat} inşaat sürebilir.`);
  const h2 = yerUygunMu(durum, binaId, x, y);
  if (h2) return hataDon(durum, h2);
  const maliyet = maliyetHesapla(durum, binaId);
  if (!kaynakYeter(durum, maliyet)) return hataDon(durum, `Kaynak yetersiz: ${eksikMetni(durum, maliyet)} eksik.`);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(maliyet).map(([r, m]) => [r, -m])));
  const uid = yeniUid(d);
  d.binalar.push({ uid, id: binaId, x, y, seviye: 1, insaKalan: BINA[binaId].insaSuresi, hasarli: false });
  d.insaatSirasi = [...d.insaatSirasi, uid];
  return { durum: d, uid };
}

// Sv2 kendi çağından itibaren; Sv3 bir sonraki çağdan (ya da `seviyeAc` buluşuyla, Gotik Mimari → Orta Çağ binaları).
export function enYuksekSeviye(d, binaId) {
  const t = BINA[binaId];
  let sv = cagSira(d.cag) > cagSira(t.cag) ? 3 : 2;
  for (const e of bulusEtkileri(d, 'seviyeAc')) if (e.hedef === `cag:${t.cag}`) sv = Math.max(sv, e.deger);
  return Math.min(sv, t.maxSeviye);
}

export function yukselt(durum, uid) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const b = binaBul(durum, uid);
  if (!b) return hataDon(durum, 'Böyle bir bina yok.');
  const t = BINA[b.id];
  if (binaIsi(durum, b)) return hataDon(durum, `${t.ad} üzerinde süren bir iş var.`);
  if (b.hasarli) return hataDon(durum, `${t.ad} hasarlı; önce onar.`);
  if (b.seviye >= t.maxSeviye) return hataDon(durum, `${t.ad} en yüksek seviyede.`);
  if (b.seviye + 1 > enYuksekSeviye(durum, b.id)) return hataDon(durum, `Seviye ${b.seviye + 1} sonraki çağda açılır.`);
  if (insaatSinirDolu(durum)) return hataDon(durum, `Aynı anda en çok ${mevcutCag(durum).esZamanliInsaat} inşaat sürebilir.`);
  const maliyet = yukseltmeMaliyeti(b);
  if (!kaynakYeter(durum, maliyet)) return hataDon(durum, `Kaynak yetersiz: ${eksikMetni(durum, maliyet)} eksik.`);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(maliyet).map(([r, m]) => [r, -m])));
  binaBul(d, uid).insaKalan = t.insaSuresi;
  d.insaatSirasi = [...d.insaatSirasi, `yukselt:${uid}`];
  return { durum: d };
}

export function onar(durum, uid) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const b = binaBul(durum, uid);
  if (!b) return hataDon(durum, 'Böyle bir bina yok.');
  if (!b.hasarli) return hataDon(durum, 'Bina hasarlı değil.');
  if (binaIsi(durum, b)) return hataDon(durum, 'Bina üzerinde süren bir iş var.');
  const maliyet = onarimMaliyeti(b);
  if (!kaynakYeter(durum, maliyet)) return hataDon(durum, `Kaynak yetersiz: ${eksikMetni(durum, maliyet)} eksik.`);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(maliyet).map(([r, m]) => [r, -m])));
  binaBul(d, uid).insaKalan = ONARIM_SURE;
  d.insaatSirasi = [...d.insaatSirasi, `onar:${uid}`];
  return { durum: d };
}

// Yıkım: anında, taban maliyetin %50'si (aşağı yuvarlanır) iade. Merkez yıkılamaz. İşçiler işsiz kalır.
export function yik(durum, uid) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const b = binaBul(durum, uid);
  if (!b) return hataDon(durum, 'Böyle bir bina yok.');
  const t = BINA[b.id];
  if (t.tur === 'merkez') return hataDon(durum, 'Merkez bina yıkılamaz.');
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(t.maliyet).map(([r, m]) => [r, Math.floor(m * YIKIM_IADE)])));
  d.binalar = d.binalar.filter((x) => x.uid !== uid);
  d.insaatSirasi = d.insaatSirasi.filter((s) => s !== uid && s !== `yukselt:${uid}` && s !== `onar:${uid}`);
  delete d.atama[uid];
  atamaDuzelt(d);
  return { durum: d };
}

// Adım b: insaKalan − 1; 0 olan iş biter (yeni bina bu tur çalışmaya başlar).
export function adimInsaat(durum, bildirimler = []) {
  const d = kopya(durum);
  const kalan = [];
  for (const s of d.insaatSirasi) {
    const [tur, uid] = s.includes(':') ? s.split(':') : ['insa', s];
    const b = binaBul(d, uid);
    if (!b) continue;
    b.insaKalan = Math.max(0, b.insaKalan - 1);
    if (b.insaKalan > 0) { kalan.push(s); continue; }
    const ad = BINA[b.id].ad;
    if (tur === 'yukselt') {
      b.seviye += 1;
      bildir(bildirimler, 'insaat_bitti', `${ad} seviye ${b.seviye} oldu.`, 'iyi', { uid });
    } else if (tur === 'onar') {
      b.hasarli = false;
      bildir(bildirimler, 'insaat_bitti', `${ad} onarıldı.`, 'iyi', { uid });
    } else {
      bildir(bildirimler, 'insaat_bitti', `${ad} tamamlandı.`, 'iyi', { uid });
    }
  }
  d.insaatSirasi = kalan;
  return d;
}

// Adım c: bakım. Ödeme sırası: tekil binalar önce, sonra inşa sırası; ödenemeyen bina bu tur kapalı (üretim, huzur, savunma yok).
// Değiştiricilerin bakımı (Lonca ayrıcalığı) binalardan sonra; ödenemezse değiştirici bu tur etkisiz.
export function adimBakim(durum, bildirimler = []) {
  const d = kopya(durum);
  const st = sonTur(d);
  st.kapali = [];
  st.kapaliDegistirici = [];
  const adaylar = d.binalar.filter((b) => binaKurulu(d, b) && !b.hasarli && Object.keys(BINA[b.id].bakim).length);
  const sirali = [...adaylar.filter((b) => BINA[b.id].gereksinim.tekil), ...adaylar.filter((b) => !BINA[b.id].gereksinim.tekil)];
  const ode = (bakim) => {
    if (!kaynakYeter(d, bakim)) return false;
    for (const [r, m] of Object.entries(bakim)) d.kaynaklar[r] -= m;
    for (const [r, m] of Object.entries(bakim)) st.tuketim[r] = (st.tuketim[r] || 0) + m;
    return true;
  };
  for (const b of sirali) {
    if (!ode(BINA[b.id].bakim)) {
      st.kapali.push(b.uid);
      bildir(bildirimler, 'bakim_yok', `${BINA[b.id].ad} bakımı ödenemedi; bu tur kapalı.`, 'uyari', { uid: b.uid });
    }
  }
  for (const m of d.degistiriciler) {
    if (m.etki?.bakim && !ode(m.etki.bakim)) {
      st.kapaliDegistirici.push(m.id);
      bildir(bildirimler, 'bakim_yok', `"${m.id}" bakımı ödenemedi; bu tur etkisiz.`, 'uyari');
    }
  }
  return d;
}
