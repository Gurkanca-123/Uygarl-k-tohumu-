// Mimari üretim katmanı: varsayılan kapalı, varyantlar sınırlı ve belirleyici, geometri geçerli, eski modeller etkilenmez.
import test from 'node:test';
import assert from 'node:assert/strict';
import { modelVerisi } from '../src/render/binalar.js';
import { mimariKayitli, mimariVaryantAdet, mimariVaryant, mimariAcik } from '../src/render/mimari/index.js';
import { varyantSec } from '../src/render/mimari/varyasyon.js';
import { MIMARI_CAGLAR, CAG_STILLERI, mimariCag } from '../src/render/mimari/cag_stilleri.js';
import { BINALAR } from '../src/data/binalar.js';

const ucgen = (g) => (g ? g.getAttribute('position').count / 3 : 0);
const gecerli = (g) => { for (const v of g.getAttribute('position').array) if (!Number.isFinite(v)) return false; return true; };

test('mimari: varsayılan kapalı, yalnız yari_ahsap_ev kayıtlı', () => {
  assert.equal(mimariAcik(), false);
  assert.equal(mimariKayitli('yari_ahsap_ev'), true);
  assert.equal(mimariKayitli('katedral'), false);
  assert.equal(mimariVaryantAdet('yari_ahsap_ev'), 4);
  assert.equal(mimariVaryantAdet('katedral'), 1);
});

test('mimari: varyant seçimi uid\'e göre sabit ve dağılımlı', () => {
  const sayim = [0, 0, 0, 0];
  for (let i = 0; i < 400; i++) sayim[varyantSec(`b${i}`, 4)]++;
  for (const n of sayim) assert.ok(n > 60, `dengesiz dağılım ${sayim}`);
  assert.equal(varyantSec('b7', 4), varyantSec('b7', 4));
  assert.equal(mimariVaryant('yari_ahsap_ev', 'b7'), varyantSec('b7', 4));
  assert.equal(varyantSec(undefined, 4), 0);
});

test('mimari: dört varyant geçerli, birbirinden farklı ve belirleyici geometri üretir', () => {
  const imzalar = new Set();
  for (let vr = 0; vr < 4; vr++) {
    const v = modelVerisi('yari_ahsap_ev', 1, '', vr, true);
    assert.ok(gecerli(v.ana), `v${vr} NaN`);
    const n = ucgen(v.ana);
    assert.ok(n > 1500 && n < 9000, `v${vr} üçgen ${n}`);
    assert.ok(v.isil && ucgen(v.isil) > 40, 'pencere ışıltısı yok');
    assert.ok(v.duman.length >= 1, 'baca dumanı yok');
    imzalar.add(`${n}|${v.tepe.toFixed(3)}`);
    const tekrar = modelVerisi('yari_ahsap_ev', 1, '', vr, true);
    assert.equal(tekrar, v, 'önbellekten aynı nesne gelmeli');
  }
  assert.equal(imzalar.size, 4, 'varyantlar özdeş');
});

test('mimari: seviye 2 ve 3 ve inşaat/hasar durumları çalışır', () => {
  for (const sv of [1, 2, 3]) for (const durum of ['', 'i1', 'i3', 'h', 'k']) {
    const v = modelVerisi('yari_ahsap_ev', sv, durum, 2, true);
    assert.ok(ucgen(v.ana) > 100 && gecerli(v.ana), `sv${sv} ${durum}`);
  }
  const s1 = ucgen(modelVerisi('yari_ahsap_ev', 1, '', 0, true).ana), s3 = ucgen(modelVerisi('yari_ahsap_ev', 3, '', 0, true).ana);
  assert.ok(s3 > s1, 'seviye 3 daha ayrıntılı olmalı');
});

test('mimari: eski model yolu değişmedi', () => {
  const eski = modelVerisi('yari_ahsap_ev', 1, '');
  assert.ok(ucgen(eski.ana) < 1200, 'eski model değişti mi?');
  assert.notEqual(eski, modelVerisi('yari_ahsap_ev', 1, '', 0, true));
});

test('mimari: altı çağ stil paketi tanımlı, oyun çağları eşleşir', () => {
  assert.deepEqual(MIMARI_CAGLAR, ['ilkel', 'antik', 'ortacag', 'ronesans', 'sanayi', 'modern']);
  for (const c of MIMARI_CAGLAR) {
    const s = CAG_STILLERI[c];
    assert.ok(s && s.siva.length && s.kiremit.length && s.panjur.length && s.catiDoku, c);
  }
  assert.equal(CAG_STILLERI.ortacag.hazir, true);
  assert.deepEqual(['gocebe', 'tasdevri', 'bronz', 'antik', 'ortacag'].map(mimariCag), ['ilkel', 'ilkel', 'antik', 'antik', 'ortacag']);
});

test('mimari: oyun verisine dokunulmadı (beş çağ)', () => {
  assert.equal(new Set(BINALAR.map((b) => b.cag)).size, 5);
});
