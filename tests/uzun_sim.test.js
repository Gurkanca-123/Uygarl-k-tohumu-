// Uzun süreli kararlılık testleri (kısa sürüm; 100/500/1000 gün için: `node tests/yardimci/uzun_sim.js <tohum> <gün> <zorluk> [çağ]`).
// Bot optimize etmez; amaç değişmezlerin (negatif/NaN stok, taşan depo, kopuk kuyruk, atama>nüfus, yetim evrim kaydı) bozulmamasıdır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { uzunOyna, degismezler } from './yardimci/uzun_sim.js';
import { CAG_SIRASI } from './yardimci/durum.js';
import { yeniOyun } from '../src/core/oyun_durumu.js';

test('yeni oyun 100 gün: değişmez ihlali yok, nüfus çökmez', (t) => {
  for (const tohum of [1, 2]) {
    const s = uzunOyna(tohum, { gun: 100, ornek: [100] });
    t.diagnostic(`tohum ${tohum}: ${s.sureMs} ms · son nüfus ${s.son.nufus} · çağ ${s.son.cag} · evrim ${s.evrimSayisi}`);
    assert.deepEqual(s.ihlaller, []);
    assert.equal(s.cokus, false);
  }
});

for (const cag of CAG_SIRASI.slice(1)) {
  test(`${cag} başlangıç köyü 40 gün (evrim dahil): değişmez ihlali yok`, (t) => {
    const s = uzunOyna(3, { gun: 40, cag, ornek: [40] });
    t.diagnostic(`${s.sureMs} ms · nüfus ${s.ornekler[0]?.nufus} · bina ${s.ornekler[0]?.bina} · evrim ${s.evrimSayisi}`);
    assert.deepEqual(s.ihlaller, []);
  });
}

test('normal zorluk (savaşlı tehdit) 60 gün: değişmez ihlali yok', () => {
  const s = uzunOyna(5, { gun: 60, zorluk: 'normal', ornek: [60] });
  assert.deepEqual(s.ihlaller, []);
});

test('değişmezler dedektörü bozuk durumu yakalar', () => {
  const d = yeniOyun(1);
  assert.deepEqual(degismezler(d), []);
  const bozuk = { ...d, kaynaklar: { ...d.kaynaklar, odun: -3 }, insaatSirasi: ['evrim:yok'], atama: { 'serbest:oduncu': 99 } };
  const m = degismezler(bozuk).join('|');
  assert.match(m, /negatif/);
  assert.match(m, /kuyrukta olmayan/);
  assert.match(m, /nüfusu/);
});
