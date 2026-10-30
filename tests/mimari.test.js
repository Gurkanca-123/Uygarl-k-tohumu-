// Mimari üretim katmanı: varsayılan kapalı, varyantlar sınırlı ve belirleyici, geometri geçerli, eski modeller etkilenmez.
import test from 'node:test';
import assert from 'node:assert/strict';
import { modelVerisi } from '../src/render/binalar.js';
import { mimariKayitlar, mimariKayitli, mimariVaryantAdet, mimariVaryant, mimariAcik } from '../src/render/mimari/index.js';
import { varyantSec } from '../src/render/mimari/varyasyon.js';
import { MIMARI_CAGLAR, CAG_STILLERI, mimariCag } from '../src/render/mimari/cag_stilleri.js';
import { BINALAR } from '../src/data/binalar.js';

const ucgen = (g) => (g ? g.getAttribute('position').count / 3 : 0);
const gecerli = (g) => { for (const v of g.getAttribute('position').array) if (!Number.isFinite(v)) return false; return true; };

test('mimari: varsayılan kapalı; kayıtlı binalar yeni motorla, diğerleri eski modelle', () => {
  assert.equal(mimariAcik(), false);
  for (const id of ['yari_ahsap_ev', 'katedral', 'degirmen', 'kale']) assert.equal(mimariKayitli(id), true, id);
  assert.equal(mimariKayitli('olmayan_bina'), false);
  assert.equal(mimariVaryantAdet('yari_ahsap_ev'), 4);
  assert.equal(mimariVaryantAdet('katedral'), 3);
  assert.equal(mimariVaryantAdet('degirmen'), 3);
  assert.equal(mimariVaryantAdet('kale'), 3);
  assert.equal(mimariVaryantAdet('olmayan_bina'), 1);
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

import { mimariLod, LOD_ESIK, LOD_ARALIK } from '../src/render/mimari/index.js';

test('mimari LOD: zoom eşiği histerezisli, titremez', () => {
  assert.equal(mimariLod(1.6, 0), 1, 'varsayılan zoom uzak ayrıntı');
  assert.equal(mimariLod(3.4, 1), 0, 'yakın zoom tam ayrıntı');
  assert.equal(mimariLod(LOD_ESIK, 0), 0, 'eşikte durum değişmez (tam kalır)');
  assert.equal(mimariLod(LOD_ESIK, 1), 1, 'eşikte durum değişmez (uzak kalır)');
  assert.equal(mimariLod(LOD_ESIK + LOD_ARALIK + 0.01, 1), 0);
  assert.equal(mimariLod(LOD_ESIK - LOD_ARALIK - 0.01, 0), 1);
  // ileri-geri küçük oynamada geçiş sayısı: eşik çevresinde salınım tek geçişten fazla olmamalı
  let l = 0, gecis = 0;
  for (let i = 0; i < 200; i++) { const z = LOD_ESIK + Math.sin(i / 3) * 0.08; const n = mimariLod(z, l); if (n !== l) gecis++; l = n; }
  assert.equal(gecis, 0, 'histerezis bandı içinde salınım geçiş üretmemeli');
});

test('mimari kaynak: üçgen, bellek, kurulum süresi ve çizim çağrısı sınırları', () => {
  const t0 = performance.now();
  for (let vr = 0; vr < 4; vr++) {
    const tam = modelVerisi('yari_ahsap_ev', 1, '', vr, true, 0);
    const uzak = modelVerisi('yari_ahsap_ev', 1, '', vr, true, 1);
    const nTam = ucgen(tam.ana), nUzak = ucgen(uzak.ana);
    assert.ok(nTam <= 6000, `v${vr} tam ${nTam} üçgen`);
    assert.ok(nUzak <= nTam * 0.85, `v${vr} uzak (${nUzak}) tamdan (${nTam}) yeterince hafif değil`);
    // çizim çağrısı: ana + ışıltı = en çok 2 ağ
    assert.ok(tam.ana && (tam.isil === null || tam.isil), 'ana + ışıltı');
    // bellek: köşe başına konum+normal+uv+hücre+renk = 13 float
    const bayt = (ucgen(tam.ana) + ucgen(tam.isil)) * 3 * 13 * 4;
    assert.ok(bayt < 1.2 * 1024 * 1024, `v${vr} ${(bayt / 1048576).toFixed(2)} MB`);
    assert.equal(tam.ana.getAttribute('position').count % 3, 0);
    // bounding box makul: karo dışına taşmaz (ölçek 1.24 sonrası ±0.75'ten dar)
    tam.ana.computeBoundingBox();
    const b = tam.ana.boundingBox;
    assert.ok(b.max.x < 0.8 && b.min.x > -0.8 && b.max.z < 0.8 && b.min.z > -0.8, `v${vr} taşma ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)}`);
    assert.ok(b.max.y < 2.0, `v${vr} yükseklik ${b.max.y.toFixed(2)}`);
  }
  assert.ok(performance.now() - t0 < 3000, 'sekiz modelin kurulumu çok yavaş');
});

// ---------- katedral ve su değirmeni ----------
const kutu = (g) => { g.computeBoundingBox(); return g.boundingBox; };

test('katedral: üç varyant geçerli, farklı, sınırlar içinde; uzak LOD belirgin hafif', () => {
  const imza = new Set();
  for (let vr = 0; vr < 3; vr++) {
    const tam = modelVerisi('katedral', 1, '', vr, true, 0), uzak = modelVerisi('katedral', 1, '', vr, true, 1);
    assert.ok(gecerli(tam.ana) && gecerli(tam.isil), `v${vr} NaN`);
    const n = ucgen(tam.ana);
    assert.ok(n > 8000 && n < 24000, `v${vr} üçgen ${n}`);
    assert.ok(ucgen(uzak.ana) <= n * 0.7, `v${vr} uzak yeterince hafif değil (${ucgen(uzak.ana)}/${n})`);
    assert.ok(ucgen(tam.isil) > 500, 'vitray/pencere ışıltısı yok');
    const b = kutu(tam.ana);
    assert.ok(b.max.x < 1.9 && b.min.x > -1.9 && b.max.z < 1.9 && b.min.z > -1.9, `v${vr} taşma x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)}`);
    assert.ok(b.max.y > 2.2 && b.max.y < 4.2, `v${vr} yükseklik ${b.max.y.toFixed(2)}`);
    assert.ok(!tam.pervane, 'katedralde dönen parça olmamalı');
    imza.add(`${n}|${b.max.y.toFixed(2)}`);
    const bayt = (ucgen(tam.ana) + ucgen(tam.isil)) * 3 * 13 * 4;
    assert.ok(bayt < 3 * 1024 * 1024, `v${vr} ${(bayt / 1048576).toFixed(2)} MB`);
  }
  assert.equal(imza.size, 3, 'varyantlar özdeş');
  for (const durum of ['', 'i1', 'i3', 'h', 'k']) assert.ok(ucgen(modelVerisi('katedral', 1, durum, 1, true).ana) > 100, durum);
});

test('değirmen: üç varyant, dönen su çarkı ayrı geometri olarak tanımlı', () => {
  const imza = new Set();
  for (let vr = 0; vr < 3; vr++) {
    const tam = modelVerisi('degirmen', 1, '', vr, true, 0), uzak = modelVerisi('degirmen', 1, '', vr, true, 1);
    assert.ok(gecerli(tam.ana), `v${vr} NaN`);
    const n = ucgen(tam.ana);
    assert.ok(n > 2500 && n < 9000, `v${vr} üçgen ${n}`);
    assert.ok(ucgen(uzak.ana) <= n * 0.8, `v${vr} uzak yeterince hafif değil`);
    const p = tam.pervane;
    assert.ok(p && p.geo && Number.isFinite(p.x + p.y + p.z + p.r), 'çark tanımsız');
    assert.ok(p.r > 0.25 && p.r < 0.6, `çark yarıçapı ${p.r}`);
    assert.ok(gecerli(p.geo) && ucgen(p.geo) > 300 && ucgen(p.geo) < 2000, `çark üçgen ${ucgen(p.geo)}`);
    const bc = kutu(p.geo);
    assert.ok(bc.max.x <= 1.06 && bc.min.x >= -1.06 && bc.max.y <= 1.06 && bc.min.y >= -1.06, 'çark birim yarıçap dışında');
    const b = kutu(tam.ana);
    assert.ok(b.max.x < 1.4 && b.min.x > -1.4 && b.max.z < 1.4 && b.min.z > -1.4, `v${vr} taşma`);
    imza.add(`${n}|${p.x.toFixed(2)}|${p.ry}`);
  }
  assert.equal(imza.size, 3, 'varyantlar özdeş');
  assert.ok(!modelVerisi('degirmen', 1, 'i2', 0, true).pervane, 'inşaat sırasında çark yok');
  for (const durum of ['h', 'k']) assert.ok(modelVerisi('degirmen', 1, durum, 0, true).pervane, `durum ${durum}: çark (eski davranış) kalır`);
  // eski model: rüzgâr değirmeni, özel çark geometrisi yok
  const eski = modelVerisi('degirmen', 1, '', 0, false);
  assert.ok(eski.pervane && !eski.pervane.geo, 'eski değirmen değişmemeli');
});

test('mimari: aynı varyant önbellekten paylaşılır (üçgen sayısı kararlı)', () => {
  for (const id of ['yari_ahsap_ev', 'katedral', 'degirmen']) {
    const a = modelVerisi(id, 1, '', 1, true), b = modelVerisi(id, 1, '', 1, true);
    assert.equal(a, b, id);
  }
});

// ---------- tüm kayıtlı binalar için ortak denetim (yeni bina eklenince otomatik kapsanır) ----------
test('mimari: her kayıtlı bina için ortak kaynak, sınır ve varyant denetimi', () => {
  const BIN = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
  for (const id of mimariKayitlar()) {
    const t = BIN[id], adet = mimariVaryantAdet(id);
    assert.ok(t, `${id} bina verisinde yok`);
    if (!t.anit) assert.ok(adet >= 3, `${id}: en az 3 varyant gerekir (${adet})`);
    const yari = Math.max(t.boyut[0], t.boyut[1]) * 0.5 * (t.tur === 'merkez' ? 1.3 : 1.24) + 0.1; // karo yarısı × ölçek + pay
    const imza = new Set();
    for (let vr = 0; vr < adet; vr++) {
      const tam = modelVerisi(id, 1, '', vr, true, 0), uzak = modelVerisi(id, 1, '', vr, true, 1);
      assert.ok(gecerli(tam.ana) && (!tam.isil || gecerli(tam.isil)), `${id} v${vr} NaN`);
      const n = ucgen(tam.ana);
      assert.ok(n > 100 && n < 25000, `${id} v${vr} üçgen ${n}`);
      assert.ok(n < 1200 || ucgen(uzak.ana) <= n * 0.95, `${id} v${vr} uzak LOD azaltmıyor (${ucgen(uzak.ana)}/${n})`); // küçük (<1200) modellerde LOD kazancı ihmal edilebilir
      assert.ok(ucgen(uzak.ana) <= n, `${id} v${vr} uzak LOD tamdan ağır`);
      const b = kutu(tam.ana);
      assert.ok(b.max.x < yari && b.min.x > -yari && b.max.z < yari && b.min.z > -yari, `${id} v${vr} taşma x ${b.min.x.toFixed(2)}..${b.max.x.toFixed(2)} z ${b.min.z.toFixed(2)}..${b.max.z.toFixed(2)} (sınır ±${yari.toFixed(2)})`);
      assert.ok(b.max.y < 4.8, `${id} v${vr} yükseklik ${b.max.y.toFixed(2)}`);
      assert.ok((ucgen(tam.ana) + ucgen(tam.isil)) * 3 * 13 * 4 < 4 * 1048576, `${id} v${vr} bellek`);
      imza.add(`${n}|${b.max.y.toFixed(2)}|${b.max.x.toFixed(2)}`);
      assert.equal(tam, modelVerisi(id, 1, '', vr, true, 0), 'önbellek paylaşımı');
    }
    assert.equal(imza.size, adet, `${id}: varyantlar birbirinden farklı olmalı`);
    const bagS = t.cevre ? '#5' : ''; // çevre parçaları komşu maskesiyle
    for (const durum of ['', 'i1', 'i3', 'h', 'k']) assert.ok(ucgen(modelVerisi(id, 2, durum + bagS, 0, true).ana) > 0, `${id} durum ${durum}`);
    assert.ok(modelVerisi(id, 1, '', 0, false) !== modelVerisi(id, 1, '', 0, true), `${id}: eski model yolu ayrı kalmalı`);
  }
});
