// Test botu (TASARIM §9 kabul ölçütü). Denge ayarı aşama 7'de; burada yalnız ölçülür ve raporlanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import { botOyna, botOzeti } from './yardimci/bot.js';
import { NUFUS_MIN } from '../src/data/denge.js';

const TOHUMLAR = Array.from({ length: 30 }, (_, i) => i + 1);
const ozet = botOzeti(TOHUMLAR);

test('bot deterministik: aynı tohum aynı tur', () => {
  assert.equal(botOyna(7).tur, botOyna(7).tur);
});

test('bot her tohumda Göçebe Çağı\'nı bitirir; nüfus hiçbir zaman NUFUS_MIN altına inmez', (t) => {
  t.diagnostic(`bitiren ${ozet.tamamSayisi}/${TOHUMLAR.length} · tur min/ortanca/max ${ozet.min}/${ozet.ortanca}/${ozet.max}`
    + ` · 20–32 aralığında ${ozet.aralikta} · en düşük nüfus ${ozet.minNufus}`);
  assert.equal(ozet.tamamSayisi, TOHUMLAR.length);
  assert.ok(ozet.minNufus >= NUFUS_MIN);
});

// Kabul ölçütü (§9): 20–32 turda bitir, nüfus 2'ye düşmesin. Denge aşama 7'de ayarlanacak → şimdilik TODO.
test('kabul ölçütü §9: her tohumda 20–32 tur ve nüfus > 2', { todo: 'denge ayarı aşama 7' }, () => {
  assert.equal(ozet.aralikta, TOHUMLAR.length);
  assert.ok(ozet.minNufus > NUFUS_MIN);
});

// TEHDIT.md §9 ölçüt 1 ve 3 (tehdit motoru açık, Normal, hazırlıklı bot): 50 tohumda ≥ 40 hedef aralıkta, nüfus ≥ 2.
test('tehdit açıkken 50 tohum Göçebe: ≥ 40/50 tohum 20–32 turda; en düşük nüfus ≥ 2', (t) => {
  const oz = botOzeti(Array.from({ length: 50 }, (_, i) => i + 1));
  t.diagnostic(`bitiren ${oz.tamamSayisi}/50 · tur min/ortanca/max ${oz.min}/${oz.ortanca}/${oz.max} · aralıkta ${oz.aralikta}`
    + ` · en düşük nüfus ${oz.minNufus} · tehdit sonuçları ${JSON.stringify(oz.tehdit)}`);
  assert.ok(oz.aralikta >= 40, `aralıkta ${oz.aralikta}`);
  assert.ok(oz.minNufus >= NUFUS_MIN);
});

// AKSIYON.md §9.2 (h): sefer kullanan hazırlıklı bot ("dengeli": r yeterliyse gönder; ilk kahraman Avcı, danışman; boşta keşif).
test('sefer kullanan bot 50 tohum Göçebe: ≥ 40/50 tohum 20–32 turda; nüfus ≥ 2; ayı destanı ölçümü', (t) => {
  const oz = botOzeti(Array.from({ length: 50 }, (_, i) => i + 1), { sefer: true });
  const d = oz.destan;
  t.diagnostic(`seferli: bitiren ${oz.tamamSayisi}/50 · tur min/ortanca/max ${oz.min}/${oz.ortanca}/${oz.max} · aralıkta ${oz.aralikta}`
    + ` · en düşük nüfus ${oz.minNufus} · sefer ${JSON.stringify(oz.sefer)} · destan ${d.length}/50 bitirdi`
    + ` (tur min/ortanca/max ${d[0]}/${d[Math.floor(d.length / 2)]}/${d.at(-1)}) · tehdit ${JSON.stringify(oz.tehdit)}`);
  assert.ok(oz.aralikta >= 40, `aralıkta ${oz.aralikta}`);
  assert.ok(oz.minNufus >= NUFUS_MIN);
  assert.ok(oz.sefer.gonderilen >= 50, 'bot gerçekten sefer kullanıyor');
});
