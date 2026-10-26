// İş dağıtımı: boştaki kişileri yuvalara (bina işçi yuvaları + serbest işler) kaynak ihtiyacına göre yerleştirir. Saf.
// Elle yapılan mevcut atamalara dokunmaz; yalnız boşta olanları ekler. Otomatik kip (varsayılan KAPALI) her tur inşaattan sonra uygular.
import { SERBEST_ISLER, ISDAGIT_ONCELIKLER } from '../data/denge.js';
import {
  BINA, kopya, kaynakAcik, depoTavani, binaIsi, isciYuvasi, issizSayisi, serbestAnahtar, bildir, olayKilitli, OLAY_KILIDI, hataDon,
} from './yardimci.js';

// Kaynak başına ihtiyaç ağırlığı: depo ne kadar boşsa o kadar değerli; yiyecek açlıkta çok değerli; seçilen öncelik ×3.
function agirliklar(d, oncelik) {
  const w = {};
  for (const r of Object.keys(d.kaynaklar)) {
    if (!kaynakAcik(d, r)) continue;
    const dolu = (d.kaynaklar[r] || 0) / Math.max(1, depoTavani(d, r));
    w[r] = Math.min(1.2, Math.max(0.15, 1.2 - dolu));
  }
  if (w.yiyecek != null) w.yiyecek *= d.acTur > 0 ? 3 : 1.5;
  if (ISDAGIT_ONCELIKLER.includes(oncelik) && oncelik !== 'dengeli' && w[oncelik] != null) w[oncelik] *= 3;
  return w;
}

const deger = (u, w) => Object.entries(u || {}).reduce((a, [r, v]) => a + v * (w[r] ?? 0), 0);

// Bir yuvaya eklenecek kişi başına değer (öncelik puanı). Bekçi/nöbet: tehdit varsa yüksek.
function kisiDegeri(d, t, w) {
  const savunma = d.tehdit?.aktif ? 2 : 0.4;
  let v = 0;
  if (!Object.keys(t.girdi || {}).length) v += deger(t.uretim, w);
  else v += deger(t.uretim, w) * 0.8; // dönüşüm: girdi tüketir
  v += (t.isciBilgi || 0) * 0.8 + (t.isciSavunma || 0) * savunma;
  return v || 0.3;
}

// Dönüş: { atama: { yuvaAnahtari: eklenecek }, toplam }. Durumu değiştirmez.
export function dagitimOnerisi(d, oncelik = d.isDagitim?.oncelik || 'dengeli') {
  let bos = issizSayisi(d);
  const w = agirliklar(d, oncelik);
  const yuvalar = [];
  for (const b of d.binalar) {
    const t = BINA[b.id], yuva = isciYuvasi(b);
    if (!yuva || b.hasarli || binaIsi(d, b)) continue;
    const bosYer = yuva - (d.atama[b.uid] || 0);
    if (bosYer > 0) yuvalar.push({ k: b.uid, kalan: bosYer, v: kisiDegeri(d, t, w), say: 0 });
  }
  const serbest = SERBEST_ISLER.filter((s) => !s.savunma).map((s) => ({ k: serbestAnahtar(s.id), v: deger(s.uretim, w), say: d.atama[serbestAnahtar(s.id)] || 0 }));
  const atama = {};
  let toplam = 0;
  while (bos > 0) {
    let en = null, enPuan = 0;
    for (const y of yuvalar) if (y.kalan > 0 && y.v + 0.01 > enPuan) { en = y; enPuan = y.v + 0.01; }
    for (const s of serbest) { const p = s.v * 0.85 ** s.say; if (p > enPuan) { en = s; enPuan = p; } }
    if (!en || enPuan <= 0) break;
    atama[en.k] = (atama[en.k] || 0) + 1;
    if (en.kalan != null) en.kalan--; else en.say++;
    bos--; toplam++;
  }
  return { atama, toplam };
}

function uygula(d, atama) {
  for (const [k, n] of Object.entries(atama)) d.atama[k] = (d.atama[k] || 0) + n;
}

// Komut: boştakileri dağıt. oncelik verilmezse kayıtlı öncelik. Dönüş: { durum, dagitilan } | { hata }.
export function isDagit(durum, oncelik) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (oncelik != null && !ISDAGIT_ONCELIKLER.includes(oncelik)) return hataDon(durum, 'Geçersiz öncelik.');
  if (issizSayisi(durum) <= 0) return hataDon(durum, 'Boşta kimse yok.');
  const { atama, toplam } = dagitimOnerisi(durum, oncelik);
  if (!toplam) return hataDon(durum, 'Boş işçi yuvası yok.');
  const d = kopya(durum);
  uygula(d, atama);
  return { durum: d, dagitilan: toplam };
}

// Komut: otomatik dağıtımı aç/kapat ve/veya önceliği seç.
export function isDagitimAyarla(durum, { oto, oncelik } = {}) {
  if (oncelik != null && !ISDAGIT_ONCELIKLER.includes(oncelik)) return hataDon(durum, 'Geçersiz öncelik.');
  const d = kopya(durum);
  d.isDagitim = { oto: oto ?? d.isDagitim?.oto ?? false, oncelik: oncelik ?? d.isDagitim?.oncelik ?? 'dengeli' };
  return { durum: d };
}

// Tur adımı b2 (inşaattan sonra): otomatik açıksa boştakileri dağıtır.
export function adimIsDagit(durum, bildirimler = []) {
  if (!durum.isDagitim?.oto || issizSayisi(durum) <= 0) return durum;
  const { atama, toplam } = dagitimOnerisi(durum);
  if (!toplam) return durum;
  const d = kopya(durum);
  uygula(d, atama);
  bildir(bildirimler, 'is_dagit', `${toplam} kişiye otomatik iş verildi.`, 'bilgi', { adet: toplam });
  return d;
}
