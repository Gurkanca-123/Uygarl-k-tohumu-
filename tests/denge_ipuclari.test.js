// Kullanıcı onaylı küçük denge/bilgi düzeltmeleri (2026-10-30): Taş Ocağı bitişiklik bonusu, yiyecek bozulması ipucu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { hamUretimHesapla } from '../src/core/uretim.js';
import { cagSartlari } from '../src/core/cag.js';
import { isAta } from '../src/core/nufus.js';
import { durum, binaEkle, karoKoy, K } from './yardimci/durum.js';

test('Taş Ocağı: taşlığa bitişik her karo +%25 (en çok 2); serbest Taşçı\'dan (1,5) üstün', () => {
  const kur = (taslikSayisi) => {
    let d = durum({ cag: 'tasdevri', nufus: 6, atama: { 'serbest:toplayici': 3 } });
    for (let i = 0; i < taslikSayisi; i++) d = karoKoy(d, K + 2, K + 4 + i, 'tasli');
    d = binaEkle(d, 'tas_ocagi', K + 3, K + 4, { uid: 'o1' });
    d = isAta(d, 'o1', 3).durum;
    return hamUretimHesapla(d).toplam.tas;
  };
  assert.equal(kur(1), 3 * 1.5 * 1.25); // 5,625
  assert.equal(kur(2), 3 * 1.5 * 1.5);  // 6,75
  assert.equal(kur(3), 3 * 1.5 * 1.5);  // üst sınır max 2
  assert.ok(kur(1) / 3 > 1.5);          // işçi başına serbest Taşçı'dan (Taş Yontma ile 1,5) fazla
});

test('çağ geçişi yiyecek ipucu: bozulma yüzünden ulaşılamayan maliyet için uyarır; ulaşılabilirse susar', () => {
  // Bronz → Antik değil; Göçebe geçişi 30 yiyecek ister. Denge = fazla / bozulma oranı (%4).
  const sonTur = (uretim, tuketim) => ({ tur: 5, kapali: [], kapaliDegistirici: [], aclik: false, isinmaEksik: false, olumAdayi: 0,
    uretim: { yiyecek: uretim }, tuketim: { yiyecek: tuketim }, kirpilan: {}, bilgi: 0, eylem: null });
  const kur = (uretim, tuketim, stok) => {
    const d = durum({ kaynaklar: { yiyecek: stok, odun: 0, tas: 0, deri: 0 } });
    d.istatistik = { ...d.istatistik, sonTur: sonTur(uretim, tuketim) };
    return d;
  };
  // fazla +0,6 → denge 15 < 30: uyarı
  const dar = cagSartlari(kur(10.6, 10, 12)).ipuclari;
  assert.equal(dar.length, 1);
  assert.match(dar[0], /bozulur/);
  assert.match(dar[0], /~15/);
  // fazla +2 → denge 50 ≥ 30: ipucu yok
  assert.deepEqual(cagSartlari(kur(12, 10, 12)).ipuclari, []);
  // stok zaten yeterliyse ipucu yok
  assert.deepEqual(cagSartlari(kur(10.6, 10, 40)).ipuclari, []);
  // şartı DEĞİŞTİRMEZ: ipucu olsa da eksik listesi aynı
  assert.ok(cagSartlari(kur(10.6, 10, 12)).eksikler.some((e) => /Kaynak eksik/.test(e)));
});
