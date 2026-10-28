// Oyuncu komutları (TASARIM §1.1). Hepsi saf: (durum, ...) → { durum, hata? }. Geçersiz komut durumu değiştirmez,
// Türkçe `hata` döner. Bekleyen olay varken olayCoz dışındaki komutlar kilitlidir.
import { VERGI } from '../data/denge.js';
import {
  BINA, KAYNAK, kopya, kaynakAcik, calisanBinalar, etkinDegistiriciler, kaynakUygula,
  olayKilitli, OLAY_KILIDI, hataDon, BULUS,
} from './yardimci.js';

export { isAta } from './nufus.js';
export { isDagit, isDagitimAyarla } from './isdagit.js';
export { insaEt, insaEtCok, yukselt, onar, yik, ormanTemizle, yolYap, yolKaldir } from './insa.js';
export { tehditTavir, tehditTavirSec, haracOde, tahkimatYap, bekciAta, zorlukAyarla, silahDagit, kusatmaKarar } from './tehdit.js';
export { arastirmaSec } from './arastirma.js';
export { onderEylemiSec } from './eylem.js';
export { olayCoz } from './olay.js';
export { cagAtla } from './cag.js';
export { mevsimSonunaIlerlet } from './tur.js';
// Aksiyon MVP (docs/AKSIYON.md §8.3)
export { seferGonder, seferGeriCagir, seferOlayCoz, seferOnizleme, seferGorunumu, seferOlasiliklari, ekipGucu } from './sefer.js';
export { kahramanTerfi, kahramanGorev, kahramanEsyaGiy, kahramanEsyaCikar, esyaYap, kahramanGorunumu } from './kahraman.js';
export { komsuTicaret, komsuElciGonder, komsuYanit, komsuGorunumu } from './komsu.js';
export { gorevKartiSec, destanAdim, hedefGorunumu } from './hedef.js';
// Görsel savaş F1 (docs/SAVAS.md §10)
export {
  savasKur, yerlesimKaydet, ordunuYerlestir, yerlesimOnizle, savasBaslat, savasIzle, savasGorunumu, savasOlayListesi, birlikTerfi,
  birlikTerhis, orduGorunumu, rutbeGorunumu,
} from './savas.js';

export const vergiAcik = (d) => d.buluslar.some((id) => BULUS[id].acar.ozellikler.includes('vergi'));

export function vergiAyarla(durum, duzey) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  if (!vergiAcik(durum)) return hataDon(durum, 'Vergi için önce "Para" buluşu gerekir.');
  if (!VERGI.some((v) => v.id === duzey)) return hataDon(durum, 'Geçersiz vergi düzeyi.');
  if (durum.vergi === duzey) return hataDon(durum, 'Vergi zaten bu düzeyde.');
  return { durum: { ...kopya(durum), vergi: duzey } };
}

// Takas oranı: çalışan takas binalarından en iyisi (Pazar 3 → 2, Liman 4 → 3). Tur başı sınır Pazar'dan.
// TODO(tasarim): Liman tek başına takas açar mı belirsiz → açar, tur başı sınır yoksa sınırsız varsayıldı.
export function takasKosullari(d) {
  const binalar = calisanBinalar(d).filter((b) => BINA[b.id].takas);
  if (!binalar.length) return null;
  const oranlar = binalar.map((b) => BINA[b.id].takas);
  const enIyi = oranlar.reduce((a, o) => (o.al / o.ver > a.al / a.ver ? o : a));
  const sinirlar = oranlar.map((o) => o.turBasinaMax).filter((x) => x !== undefined);
  return { ver: enIyi.ver, al: enIyi.al, turBasinaMax: sinirlar.length ? Math.max(...sinirlar) : Infinity };
}

// Komut: `miktar` birim `ver` kaynağı verip floor(miktar × al / ver) birim `al` kaynağı alır.
export function takasYap(durum, ver, al, miktar) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const k = takasKosullari(durum);
  if (!k) return hataDon(durum, 'Takas için Pazar Yeri gerekir.');
  if (etkinDegistiriciler(durum).some((m) => m.etki?.ticaretKapali)) return hataDon(durum, 'Ticaret şu an kapalı.');
  if (!kaynakAcik(durum, ver) || !kaynakAcik(durum, al) || ver === al) return hataDon(durum, 'Geçersiz takas kaynağı.');
  if (!Number.isInteger(miktar) || miktar <= 0) return hataDon(durum, 'Takas miktarı geçersiz.');
  if ((durum.kaynaklar[ver] || 0) < miktar) return hataDon(durum, `Yeterli ${KAYNAK[ver].ad} yok.`);
  const st = durum.istatistik?.takas;
  const verilen = st && st.tur === durum.tur ? st.verilen : 0;
  if (verilen + miktar > k.turBasinaMax) return hataDon(durum, `Bu tur en çok ${k.turBasinaMax - verilen} birim daha verilebilir.`);
  const alinan = Math.floor((miktar * k.al) / k.ver);
  if (alinan <= 0) return hataDon(durum, `En az ${k.ver} birim vermelisin.`);
  const d = kopya(durum);
  kaynakUygula(d, { [ver]: -miktar });
  kaynakUygula(d, { [al]: alinan });
  d.istatistik = { ...d.istatistik, takas: { tur: d.tur, verilen: verilen + miktar } };
  return { durum: d, alinan };
}
