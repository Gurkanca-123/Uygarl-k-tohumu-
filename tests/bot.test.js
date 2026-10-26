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
