// Önder eylemleri (TASARIM §1.3; adım a): seçim komutu, yorgunluk, yaralanma, ölçekleme, kervan. Saf.
// Seçilmeyen tur Dinlen sayılır. Yorgunluk YORGUNLUK_MAX iken ya da önder yaralıyken yalnız Dinlen seçilebilir.
// Keşfet "iyi sonuç" bonusu (Hayvan İzleri, Gözcü Direği): iyi dilimlere eklenir, diğer dilimlerden orantılı alınır;
// iki kaynak toplanır (KESIF_BONUS_TOPLANIR). TODO(tasarim) varsayımı.
import { YORGUNLUK_MAX, EYLEM_OLCEK_ADIM, VARSAYILAN_EYLEM, KESIF_BONUS_TOPLANIR } from '../data/denge.js';
import {
  EYLEM, BINA, KAYNAK, kopya, mevcutCag, cagAcik, kaynakAcik, calisanBinalar, kaynakYeter, eksikMetni, kaynakUygula,
  bulusEtkileri, bildir, sonTur, sinirla, olayKilitli, OLAY_KILIDI, hataDon, onderSeferde,
} from './yardimci.js';
import { sonucUygula } from './sonuc.js';
import { haritaKesfiUygula, kesifYaricapi } from '../world/kesif.js';
import { nobetBilgi, nobetTut, elciBilgi, elciGonder } from './tehdit.js';

export const eylemOlcegi = (d, e) => (e.olcekli ? 1 + EYLEM_OLCEK_ADIM * mevcutCag(d).sira : 1);

// Bonus yalnız olasılık listesinde `iyi` dilimi olan eylemlere uygulanır (Keşfet). Buluş etkisi `hedef` = eylem id'si.
export function kesifIyiBonusu(d, eylemId) {
  const e = EYLEM[eylemId];
  if (!e?.sonuc.olasilik?.some((o) => o.iyi)) return 0;
  const kaynaklar = [
    ...bulusEtkileri(d, 'kesifIyiSonuc').filter((x) => x.hedef === eylemId).map((x) => x.deger),
    ...calisanBinalar(d).map((b) => BINA[b.id].kesifIyiSonuc || 0).filter(Boolean),
  ];
  if (!kaynaklar.length) return 0;
  return KESIF_BONUS_TOPLANIR ? kaynaklar.reduce((a, x) => a + x, 0) : Math.max(...kaynaklar);
}

// Dönüş: hata metni ya da null. secim: Kervan Gönder için { ver, al } (kaynak id'leri).
export function eylemUygunMu(d, id, secim) {
  const e = EYLEM[id];
  if (!e) return 'Böyle bir eylem yok.';
  if (!cagAcik(d, e.cag)) return `${e.ad} henüz açılmadı.`;
  if (id !== VARSAYILAN_EYLEM) {
    if (onderSeferde(d)) return 'Önder seferde; dönene kadar köyde eylem yapamaz.';
    if (d.onder.yaraliKalan > 0) return `Önder yaralı; ${d.onder.yaraliKalan} tur yalnız dinlenebilir.`;
    if (d.onder.yorgunluk >= YORGUNLUK_MAX) return 'Önder çok yorgun; yalnız dinlenebilir.';
  }
  if (e.tehditEylemi) {
    const b = e.tehditEylemi === 'nobet' ? nobetBilgi(d) : elciBilgi(d);
    if (b.hata) return b.hata;
  }
  const g = e.gereksinim || {};
  if (g.bina && !calisanBinalar(d).some((b) => b.id === g.bina)) return `${e.ad} için ${BINA[g.bina].ad} gerekir.`;
  const olcek = eylemOlcegi(d, e);
  if (g.kaynak && !kaynakYeter(d, g.kaynak, olcek)) return `Kaynak yetersiz: ${eksikMetni(d, g.kaynak, olcek)} eksik.`;
  if (e.sonuc.kervan) {
    if (!secim || !kaynakAcik(d, secim.ver) || !kaynakAcik(d, secim.al) || secim.ver === secim.al) {
      return 'Kervan için verilecek ve alınacak iki farklı kaynak seç.';
    }
    if (!kaynakYeter(d, { [secim.ver]: e.sonuc.kervan.ver })) return `Kervan için ${e.sonuc.kervan.ver} ${KAYNAK[secim.ver].ad} gerekir.`;
  }
  return null;
}

export function onderEylemiSec(durum, id, secim = null) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const h = eylemUygunMu(durum, id, secim);
  if (h) return hataDon(durum, h);
  const d = kopya(durum);
  d.onder = { ...d.onder, eylem: id, secim: secim ? { ...secim } : null };
  return { durum: d };
}

// Kopya üstünde: sisin merkeze en yakın kenarına doğru kesifYaricapi kadar açar; bulgular bildirime yazılır.
export function haritaKesfi(d, bildirimler) {
  const r = haritaKesfiUygula(d, kesifYaricapi(d, calisanBinalar(d)));
  if (!r.hedef) { bildir(bildirimler, 'kesif', 'Haritanın tamamı keşfedildi.'); return r; }
  if (!r.bulgular.length) bildir(bildirimler, 'kesif', `Keşif: ${r.acilan} yeni karo görüldü.`);
  for (const b of r.bulgular) bildir(bildirimler, 'kesif_bulgu', b.metin, 'iyi', { karo: b.karo, x: b.x, y: b.y });
  return r;
}

// Adım a: önder eylemi sonucu. Ayrıca vadesi gelen kervanlar ulaşır.
export function adimOnder(durum, bildirimler = []) {
  const d = kopya(durum);
  const yarali = d.onder.yaraliKalan > 0;
  let id = d.onder.eylem || VARSAYILAN_EYLEM;
  const secim = d.onder.secim || null;
  if (id !== VARSAYILAN_EYLEM) {
    const h = eylemUygunMu(d, id, secim);
    if (h) {
      bildir(bildirimler, 'eylem_iptal', `${EYLEM[id]?.ad ?? id} yapılamadı: ${h} Önder dinlendi.`, 'uyari');
      id = VARSAYILAN_EYLEM;
    }
  }
  const e = EYLEM[id];
  d.onder.yorgunluk = sinirla(d.onder.yorgunluk + e.yorgunluk, 0, YORGUNLUK_MAX);
  if (yarali) d.onder.yaraliKalan -= 1;
  const olcek = eylemOlcegi(d, e);
  if (e.sonuc.kervan) {
    const k = e.sonuc.kervan;
    kaynakUygula(d, { [secim.ver]: -k.ver });
    d.kervanlar = [...d.kervanlar, { kaynak: secim.al, miktar: k.al, tur: d.tur + k.gecikme }];
    bildir(bildirimler, 'kervan', `Kervan yola çıktı: ${k.gecikme} tur sonra ${k.al} ${KAYNAK[secim.al].ad} gelecek.`);
  } else if (e.tehditEylemi === 'nobet') {
    nobetTut(d, bildirimler);
  } else if (e.tehditEylemi === 'elci') {
    elciGonder(d, bildirimler);
  } else {
    sonucUygula(d, e.sonuc, { bildirimler, olcek, iyiBonus: kesifIyiBonusu(d, id) });
  }
  // Aşama 3: Keşfet haritada da keşif yapar (RNG kullanmaz, oyun akışını kaydırmaz).
  if (e.haritaKesfi) haritaKesfi(d, bildirimler);
  // Vadesi gelen kervanlar (kırpma f adımında).
  const gelen = d.kervanlar.filter((k) => k.tur <= d.tur);
  for (const k of gelen) {
    d.kaynaklar[k.kaynak] = (d.kaynaklar[k.kaynak] || 0) + k.miktar;
    bildir(bildirimler, 'kervan', `Kervan döndü: +${k.miktar} ${KAYNAK[k.kaynak].ad}.`, 'iyi');
  }
  d.kervanlar = d.kervanlar.filter((k) => k.tur > d.tur);
  sonTur(d).eylem = id;
  d.onder.eylem = null;
  d.onder.secim = null;
  return d;
}
