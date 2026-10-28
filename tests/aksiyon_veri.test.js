// Aksiyon veri tabloları (docs/AKSIYON.md §8.1): çapraz denetim (dogrula.js §8) hatayı yakalar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { VERI } from '../src/data/index.js';
import { dogrula } from '../src/data/dogrula.js';

const bozuk = (fn) => { const v = structuredClone({ ...VERI, DENGE: undefined }); fn(v); return dogrula({ ...v, DENGE: VERI.DENGE }); };

test('aksiyon tabloları geçerli; MVP: Keşif, Ayı Avı, Harabe açık; Avcı + Kaşif; 1 komşu; 1 destan + 5 görev', () => {
  assert.deepEqual(dogrula(VERI), []);
  assert.deepEqual(VERI.SEFERLER.filter((s) => s.mvp).map((s) => s.id), ['kesif', 'ayi_avi', 'harabe']);
  assert.deepEqual(VERI.SINIFLAR.filter((s) => s.acik).map((s) => s.id), ['avci', 'kasif']);
  assert.equal(VERI.MEVSIM_GOREVLERI.length, 5);
  assert.equal(VERI.DESTANLAR[0].id, 'ayinin_izinde');
});

test('dogrula: bozuk sefer/eşya/destan/kural satırları yakalanır', () => {
  const h = (fn) => bozuk(fn).join(' | ');
  assert.match(h((v) => { v.SEFERLER[1].cagMax = 'yok'; }), /bilinmeyen çağ/);
  assert.match(h((v) => { v.SEFERLER.push({ ...v.SEFERLER[0] }); }), /tekrarlanan id "kesif"/);
  assert.match(h((v) => { v.SEFERLER[0].odul.ozel.kaynak = { altin: 3 }; }), /altin/);
  assert.match(h((v) => { v.ESYALAR[0].yuva = 'kask'; }), /geçersiz yuva/);
  assert.match(h((v) => { v.DESTANLAR[0].adimlar[0].kosul = { uc: 1 }; }), /tanınan anahtar/);
  assert.match(h((v) => { v.NIYET_KURALLARI[0].kosul.bilinmez = 1; }), /bilinmeyen koşul/);
  assert.match(h((v) => { v.SEFERLER[2].odul.ozel.esyalar.push('yok_esya'); }), /bilinmeyen eşya/);
});
