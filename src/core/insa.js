// İnşaat (TASARIM §3.2, §3.5, §7.2): maliyet, yerleşim denetimi, süre, işçi yuvası, bakım; adımlar b (inşaat) ve c (bakım).
// Komutlar: insaEt, yukselt, onar, yik → { durum, hata? }. Geçersiz komut durumu değiştirmez.
import {
  MALIYET_K, MALIYET_K_KONUT, YUKSELTME_MALIYET, YIKIM_IADE, TASIMA_MALIYET, ONARIM, ONARIM_SURE, YOL_MALIYET, YOL_ZEMIN, YOL_CAG,
} from '../data/denge.js';
import {
  BINA, CAG, BULUS, KARO, KAYNAK, kopya, cagSira, mevcutCag, cagAcik, binaBul, binaKurulu, binaIsi, bildir, sonTur,
  kaynakYeter, eksikMetni, kaynakUygula, atamaDuzelt, olayKilitli, OLAY_KILIDI, hataDon, bulusEtkileri, etkinDegistiriciler,
} from './yardimci.js';
import { izgara, icinde } from '../world/izgara.js';
import { yerUygunMu, uygunYerler } from '../world/yerlestir.js';
import { gorunurKaro, kesifUygula } from '../world/kesif.js';
import { karoDegistir, sinirIcinde, zeminKaro } from '../world/harita.js';

export { yerUygunMu, uygunYerler };

// §7.2: n'inci bina = max(taban, round(taban × k^(n−1))); yıkılanlar sayılmaz, inşaatta olanlar sayılır.
export function maliyetHesapla(d, binaId) {
  const t = BINA[binaId];
  const mevcut = d.binalar.filter((b) => b.id === binaId).length;
  const k = t.tur === 'konut' ? MALIYET_K_KONUT : MALIYET_K;
  if (t.maliyetSabit) return { ...t.maliyet }; // çevre parçaları (Çit, Sur): adetle büyümez (TEHDIT.md §12)
  const m = {};
  for (const [r, taban] of Object.entries(t.maliyet)) m[r] = Math.max(taban, Math.round(taban * k ** mevcut));
  return m;
}
export function yukseltmeMaliyeti(b) {
  const t = BINA[b.id];
  const c = YUKSELTME_MALIYET[b.seviye - 1];
  return Object.fromEntries(Object.entries(t.maliyet).map(([r, m]) => [r, Math.round(m * c)]));
}
// Toparlanma (TEHDIT.md §5.3.5): `onarimBedava` değiştiricisi varken onarım bedava (d verilirse denetlenir).
export function onarimMaliyeti(b, d = null) {
  if (d && etkinDegistiriciler(d).some((m) => m.etki?.onarimBedava)) return {};
  return Object.fromEntries(Object.entries(BINA[b.id].maliyet).map(([r, m]) => [r, Math.round(m * ONARIM)]));
}

// Eşzamanlı inşaat sınırına yeni inşaat, yükseltme ve orman temizleme sayılır.
// TODO(tasarim): onarım (1 tur) sınıra sayılır mı yazılmamış → sayılmaz varsayıldı.
// Çevre parçaları (`insaatSinirDisi`: Çit, Sur) sınıra sayılmaz: sürükleyerek çok parça çizilebilsin (TEHDIT.md §12).
function sinirSayilir(d, s) {
  if (s.startsWith('onar:')) return false;
  if (s.startsWith(TEMIZLE_ONEK)) return true;
  const b = binaBul(d, s.includes(':') ? s.split(':')[1] : s);
  return !(b && BINA[b.id].insaatSinirDisi);
}
export const suankiInsaatSayisi = (d) => d.insaatSirasi.filter((s) => sinirSayilir(d, s)).length;
export function insaatSinirDolu(d) {
  return suankiInsaatSayisi(d) >= mevcutCag(d).esZamanliInsaat;
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

function yeniUid(d) {
  const enBuyuk = d.binalar.reduce((a, b) => Math.max(a, Number(b.uid.slice(1)) || 0), 0);
  return `b${enBuyuk + 1}`;
}

// Komut: inşa et. Maliyet anında düşer; bina `insaKalan` tur sonra (b adımında 0 olduğu tur) çalışmaya başlar.
export function insaEt(durum, binaId, x, y) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const h1 = insaEdilebilirMi(durum, binaId);
  if (h1) return hataDon(durum, h1);
  if (!BINA[binaId].insaatSinirDisi && insaatSinirDolu(durum)) return hataDon(durum, `Aynı anda en çok ${mevcutCag(durum).esZamanliInsaat} inşaat sürebilir.`);
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

// Komut: çok parçalı inşa (arayüz sürükleyerek çit/sur çizer). Hücreler sırayla denenir; kaynak bitince kalanlar atlanır,
// uygun olmayan hücre (dolu, sis, sınır dışı…) atlanıp devam edilir. Hiçbiri kurulamazsa hata döner ve durum değişmez.
// Dönüş: { durum, kurulan: [{ x, y, uid }], atlanan: [{ x, y, hata }], hata? }
export function insaEtCok(durum, binaId, hucreler) {
  if (olayKilitli(durum)) return { ...hataDon(durum, OLAY_KILIDI), kurulan: [], atlanan: [] };
  const h1 = insaEdilebilirMi(durum, binaId);
  if (h1) return { ...hataDon(durum, h1), kurulan: [], atlanan: [] };
  if (!Array.isArray(hucreler) || !hucreler.length) return { ...hataDon(durum, 'Hücre seçilmedi.'), kurulan: [], atlanan: [] };
  let d = durum;
  const kurulan = [], atlanan = [];
  let kaynakBitti = null;
  const gorulen = new Set();
  for (const hc of hucreler) {
    const [x, y] = Array.isArray(hc) ? hc : [hc?.x, hc?.y];
    const anahtar = `${x},${y}`;
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    if (kaynakBitti) { atlanan.push({ x, y, hata: kaynakBitti }); continue; }
    const r = insaEt(d, binaId, x, y);
    if (r.hata) {
      if (r.hata.startsWith('Kaynak yetersiz')) kaynakBitti = r.hata;
      atlanan.push({ x, y, hata: r.hata });
      continue;
    }
    d = r.durum;
    kurulan.push({ x, y, uid: r.uid });
  }
  if (!kurulan.length) return { durum, kurulan, atlanan, hata: atlanan[0]?.hata || 'Hiçbir parça kurulamadı.' };
  return { durum: d, kurulan, atlanan };
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
  const maliyet = onarimMaliyeti(b, durum);
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

// Taşıma: bina anında yeni konuma geçer; seviye, hasar ve işçi ataması korunur. Maliyet = taban × TASIMA_MALIYET (en az 1).
// Merkez, çevre parçaları (çit/sur) ve üzerinde iş süren bina taşınamaz. Yeni yer, bina kendi yerinde yokmuş gibi denetlenir
// (bitişik/üst üste kaydırma serbest).
export function tasimaMaliyeti(b) {
  return Object.fromEntries(Object.entries(BINA[b.id].maliyet).map(([r, m]) => [r, Math.max(1, Math.round(m * TASIMA_MALIYET))]));
}
export function tasimaEdilebilirMi(d, uid) {
  const b = binaBul(d, uid);
  if (!b) return 'Böyle bir bina yok.';
  const t = BINA[b.id];
  if (t.tur === 'merkez') return 'Merkez bina taşınamaz.';
  if (t.cevre) return `${t.ad} taşınamaz; yıkıp yeniden çiz.`;
  if (binaIsi(d, b)) return `${t.ad} üzerinde süren bir iş var.`;
  return null;
}
// Taşıma için "bina yokmuş gibi" durum (yerleşim denetimi ve uygun yerler için).
export function tasimaZemini(d, uid) {
  return { ...d, binalar: d.binalar.filter((x) => x.uid !== uid) };
}
export function tasi(durum, uid, x, y) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const h1 = tasimaEdilebilirMi(durum, uid);
  if (h1) return hataDon(durum, h1);
  const b = binaBul(durum, uid);
  if (b.x === x && b.y === y) return hataDon(durum, 'Bina zaten burada.');
  const h2 = yerUygunMu(tasimaZemini(durum, uid), b.id, x, y);
  if (h2) return hataDon(durum, h2);
  const maliyet = tasimaMaliyeti(b);
  if (!kaynakYeter(durum, maliyet)) return hataDon(durum, `Kaynak yetersiz: ${eksikMetni(durum, maliyet)} eksik.`);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(maliyet).map(([r, m]) => [r, -m])));
  const nb = binaBul(d, uid);
  nb.x = x; nb.y = y;
  return { durum: d };
}

// Adım b: insaKalan − 1; 0 olan iş biter (yeni bina bu tur çalışmaya başlar).
export function adimInsaat(durum, bildirimler = []) {
  const d = kopya(durum);
  const kalan = [];
  const cevreBitti = {}; // çit/sur parçaları tek bildirimde toplanır (sürükleyerek onlarca parça kurulabilir)
  for (const s of d.insaatSirasi) {
    if (s.startsWith(TEMIZLE_ONEK)) {
      const t = temizlemeCoz(s);
      if (t.kalan > 1) { kalan.push(temizlemeKodu(t.i, t.kalan - 1)); continue; }
      temizlemeBitir(d, t.i, bildirimler);
      continue;
    }
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
    } else if (BINA[b.id].cevre) {
      cevreBitti[b.id] = (cevreBitti[b.id] || 0) + 1;
    } else {
      bildir(bildirimler, 'insaat_bitti', `${ad} tamamlandı.`, 'iyi', { uid });
      // Görüş: gözcü yapıları tamamlanınca çevrelerini açar (aşama 3).
      const t = BINA[b.id];
      if (t.gorus) {
        const r = kesifUygula(d, { x: b.x + t.boyut[0] / 2, y: b.y + t.boyut[1] / 2 }, t.gorus);
        for (const bul of r.bulgular) bildir(bildirimler, 'kesif_bulgu', bul.metin, 'iyi', { karo: bul.karo, x: bul.x, y: bul.y });
      }
    }
  }
  for (const [id, n] of Object.entries(cevreBitti)) {
    bildir(bildirimler, 'insaat_bitti', n === 1 ? `${BINA[id].ad} tamamlandı.` : `${n} ${BINA[id].ad.toLowerCase()} parçası tamamlandı.`, 'iyi', { id, adet: n });
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

// ---------- Orman temizleme ve yol (aşama 3) ----------
// insaatSirasi girdisi: 'temizle:<hücre indeksi>:<kalan tur>'. Eşzamanlı inşaat sınırına sayılır; bitince karo
// `temizlenir.donusur` olur ve `kazanc` depoya eklenir (tavanda kırpılır).
export const TEMIZLE_ONEK = 'temizle:';
const temizlemeKodu = (i, kalan) => `${TEMIZLE_ONEK}${i}:${kalan}`;
function temizlemeCoz(s) {
  const [, i, k] = s.split(':');
  return { i: Number(i), kalan: Number(k) || 1 };
}
export const temizlemeSuruyor = (d, x, y) => d.insaatSirasi.some((s) => s.startsWith(TEMIZLE_ONEK)
  && temizlemeCoz(s).i === y * d.harita.boyut + x);

function temizlemeBitir(d, i, bildirimler) {
  const n = d.harita.boyut;
  const x = i % n, y = (i - x) / n;
  const karo = KARO[gorunurKaro(d, x, y)];
  if (!karo?.temizlenir) return;
  karoDegistir(d, x, y, karo.temizlenir.donusur);
  const uyg = kaynakUygula(d, karo.temizlenir.kazanc);
  const kazanc = Object.entries(uyg).filter(([, m]) => m > 0).map(([r, m]) => `+${Math.round(m * 10) / 10} ${KAYNAK[r]?.ad ?? r}`).join(', ');
  bildir(bildirimler, 'temizlendi', `${karo.ad} temizlendi${kazanc ? ` (${kazanc})` : ''}.`, 'iyi', { x, y });
}

// Komut: temizlenebilir karoyu (orman) temizle. Keşfedilmiş ve yerleşim sınırı içinde olmalı.
export function ormanTemizle(durum, x, y) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (!Number.isInteger(x) || !Number.isInteger(y) || !icinde(durum.harita.boyut, x, y)) return hataDon(durum, 'Geçersiz konum.');
  const id = gorunurKaro(durum, x, y);
  if (id === null) return hataDon(durum, 'Bu karo keşfedilmemiş (sis).');
  if (!sinirIcinde(durum, x, y)) return hataDon(durum, 'Konum yerleşim sınırının dışında.');
  const karo = KARO[id];
  if (!karo.temizlenir) return hataDon(durum, `${karo.ad} temizlenemez.`);
  if (temizlemeSuruyor(durum, x, y)) return hataDon(durum, 'Bu karo zaten temizleniyor.');
  if (insaatSinirDolu(durum)) return hataDon(durum, `Aynı anda en çok ${mevcutCag(durum).esZamanliInsaat} inşaat sürebilir.`);
  const d = kopya(durum);
  d.insaatSirasi = [...d.insaatSirasi, temizlemeKodu(y * d.harita.boyut + x, karo.temizlenir.sure)];
  return { durum: d };
}

// Komut: yol yap (§3.4). Bronz+, anında, YOL_MALIYET; yalnız YOL_ZEMIN karolarına, boş, keşfedilmiş ve sınır içinde.
export function yolYap(durum, x, y) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (!cagAcik(durum, YOL_CAG)) return hataDon(durum, `Yol ${CAG[YOL_CAG].ad}'nda açılır.`);
  if (!Number.isInteger(x) || !Number.isInteger(y) || !icinde(durum.harita.boyut, x, y)) return hataDon(durum, 'Geçersiz konum.');
  const id = gorunurKaro(durum, x, y);
  if (id === null) return hataDon(durum, 'Bu karo keşfedilmemiş (sis).');
  if (!sinirIcinde(durum, x, y)) return hataDon(durum, 'Konum yerleşim sınırının dışında.');
  if (id === 'yol') return hataDon(durum, 'Burada zaten yol var.');
  if (!YOL_ZEMIN.includes(id)) return hataDon(durum, `${KARO[id].ad} üstüne yol yapılamaz.`);
  if (izgara(durum)[y * durum.harita.boyut + x]) return hataDon(durum, 'Bu karo dolu.');
  if (!kaynakYeter(durum, YOL_MALIYET)) return hataDon(durum, `Kaynak yetersiz: ${eksikMetni(durum, YOL_MALIYET)} eksik.`);
  const d = kopya(durum);
  kaynakUygula(d, Object.fromEntries(Object.entries(YOL_MALIYET).map(([r, m]) => [r, -m])));
  karoDegistir(d, x, y, 'yol');
  return { durum: d };
}

// Komut: yolu kaldır (iade yok). Altındaki zemin yol yapılabilir türdense geri gelir, değilse (temizlenmiş orman) çimen.
export function yolKaldir(durum, x, y) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (gorunurKaro(durum, x, y) !== 'yol') return hataDon(durum, 'Burada yol yok.');
  const d = kopya(durum);
  karoDegistir(d, x, y, YOL_ZEMIN.includes(zeminKaro(d, x, y)) ? zeminKaro(d, x, y) : 'cimen');
  return { durum: d };
}
