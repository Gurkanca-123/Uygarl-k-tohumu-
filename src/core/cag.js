// Çağlar (TASARIM §4, §7.2; adım o'daki çağ kontrolü): geçiş şartları, çağ atlama komutu, zafer ve serbest kip. Saf.
// Çağ atlama bir oyuncu eylemidir: şartlar sağlanınca maliyet ödenir, çağ hemen değişir (bir sonraki tur yeni çağda çözülür):
// merkez bina dönüşür, açık alan büyür (acikAlan çağdan okunur), yeni kaynaklar/binalar/eylemler açılır.
import { CAGLAR } from '../data/caglar.js';
import {
  BINA, BULUS, CAG, kopya, mevcutCag, kuruluSayisi, kaynakYeter, eksikMetni, kaynakUygula, bildir,
  olayKilitli, OLAY_KILIDI, hataDon, merkezBina,
} from './yardimci.js';

export const sonrakiCag = (d) => CAGLAR.find((c) => c.sira === mevcutCag(d).sira + 1) || null;

// Dönüş: { uygun, eksikler[] (Türkçe), sonraki }
export function cagSartlari(d) {
  const c = mevcutCag(d);
  const sonraki = sonrakiCag(d);
  if (!c.gecis || !sonraki) return { uygun: false, eksikler: ['Son çağdasın.'], sonraki: null };
  const g = c.gecis;
  const eksikler = [];
  if (d.nufus < g.nufus) eksikler.push(`Nüfus ${d.nufus}/${g.nufus}`);
  for (const [id, adet] of Object.entries(g.binalar)) {
    const n = kuruluSayisi(d, id);
    if (n < adet) eksikler.push(`${BINA[id].ad} ${n}/${adet}`);
  }
  if (g.bulus && !d.buluslar.includes(g.bulus)) eksikler.push(`Buluş: ${BULUS[g.bulus].ad}`);
  if (!kaynakYeter(d, g.maliyet)) eksikler.push(`Kaynak eksik: ${eksikMetni(d, g.maliyet)}`);
  return { uygun: eksikler.length === 0, eksikler, sonraki };
}

export function cagAtla(durum) {
  if (olayKilitli(durum)) return hataDon(durum, OLAY_KILIDI);
  const s = cagSartlari(durum);
  if (!s.uygun) return hataDon(durum, `Çağ atlanamaz: ${s.eksikler.join('; ')}.`);
  const d = kopya(durum);
  const eski = mevcutCag(d);
  kaynakUygula(d, Object.fromEntries(Object.entries(eski.gecis.maliyet).map(([r, m]) => [r, -m])));
  d.cag = s.sonraki.id;
  d.cagBaslangicTuru = d.tur;
  const m = merkezBina(d);
  if (m) m.id = s.sonraki.merkez;
  for (const r of s.sonraki.yeniKaynaklar) if (d.kaynaklar[r] === undefined) d.kaynaklar[r] = 0;
  const bildirimler = [];
  bildir(bildirimler, 'cag_atlandi', `${s.sonraki.ad} başladı! Merkez: ${BINA[s.sonraki.merkez].ad}.`, 'iyi', { cag: d.cag });
  return { durum: d, bildirimler };
}

// Zafer (son çağ): zafer binası kurulu ve nüfus yeterli. Sonrasında oyun serbest kipte sürer.
export function zaferSaglandi(d) {
  const z = mevcutCag(d).zafer;
  return !!z && d.nufus >= z.nufus && kuruluSayisi(d, z.bina) > 0;
}

// Adım o: takvim (+1 tur) ve çağ şartları kontrolü (düğme yanar → bildirim, çağ başına bir kez), zafer.
export function adimTakvim(durum, bildirimler = []) {
  const d = kopya(durum);
  d.tur += 1;
  d.istatistik = { ...d.istatistik };
  if (cagSartlari(d).uygun && d.istatistik.cagHazir !== d.cag) {
    d.istatistik.cagHazir = d.cag;
    bildir(bildirimler, 'cag_hazir', `Çağ atlama şartları sağlandı (sonraki: ${sonrakiCag(d).ad}).`, 'iyi');
  }
  if (!d.istatistik.zafer && zaferSaglandi(d)) {
    d.istatistik.zafer = { tur: d.tur };
    d.istatistik.serbestKip = true;
    bildir(bildirimler, 'zafer', `Zafer! ${CAG[d.cag].ad} tamamlandı; oyun serbest kipte sürüyor.`, 'iyi');
  }
  return d;
}
