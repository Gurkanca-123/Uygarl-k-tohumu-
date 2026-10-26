import test from 'node:test';
import assert from 'node:assert/strict';
import { VERI } from '../src/data/index.js';
import { dogrula, bulusDongusu, bulusKapanisi } from '../src/data/dogrula.js';

const kopya = () => structuredClone({ ...VERI, DENGE: { ...VERI.DENGE } });
const bul = (tablo, id) => tablo.find((x) => x.id === id);

test('tüm veri tabloları geçerli (çapraz başvurular)', () => {
  assert.deepEqual(dogrula(VERI), []);
});

test('tablo boyutları belgeyle uyumlu', () => {
  assert.equal(VERI.KAYNAKLAR.length, 12);
  assert.equal(VERI.CAGLAR.length, 5);
  assert.equal(VERI.BULUSLAR.length, 25);
  assert.equal(VERI.BINALAR.filter((b) => b.tur === 'merkez').length, 5);
  // §4 tabloları: 8 + 9 + 11 + 10 + 11 inşa edilebilir bina
  const say = (c) => VERI.BINALAR.filter((b) => b.cag === c && b.tur !== 'merkez').length;
  assert.deepEqual(['gocebe', 'tasdevri', 'bronz', 'antik', 'ortacag'].map(say), [8, 9, 11, 10, 11]);
  assert.equal(VERI.EYLEMLER.length, 8);
});

test('MVP kapsamı (§9): 5 kaynak, 10 bina, 5 buluş, 5 eylem, 10 olay', () => {
  const mvpKaynak = VERI.KAYNAKLAR.filter((k) => ['gocebe', 'tasdevri'].includes(k.cag));
  assert.equal(mvpKaynak.length, 5);
  assert.equal(VERI.BINALAR.filter((b) => b.mvp && b.tur !== 'merkez').length, 10);
  assert.equal(VERI.BULUSLAR.filter((b) => b.mvp).length, 5);
  assert.equal(VERI.EYLEMLER.filter((e) => e.mvp).length, 5);
  assert.equal(VERI.OLAYLAR.filter((o) => o.mvp).length, 10);
});

test('her olayın en az bir gereksinimsiz seçeneği var', () => {
  for (const o of VERI.OLAYLAR) {
    assert.ok(o.secenekler.some((s) => Object.keys(s.gereksinim).length === 0), o.id);
  }
});

test('çağ geçiş maliyetleri o çağın depo tavanını aşmaz (§7.2)', () => {
  for (const c of VERI.CAGLAR.filter((c) => c.gecis)) {
    for (const [k, n] of Object.entries(c.gecis.maliyet)) assert.ok(n <= c.depoTavani, `${c.id}.${k}=${n}`);
  }
});

test('bina maliyetleri kendi çağının depo tavanını aşmaz', () => {
  const tavan = Object.fromEntries(VERI.CAGLAR.map((c) => [c.id, c.depoTavani]));
  for (const b of VERI.BINALAR) {
    for (const [k, n] of Object.entries(b.maliyet)) assert.ok(n <= tavan[b.cag], `${b.id}.${k}=${n}`);
  }
});

test('BP bütçesi (§5): çağ başına tüm buluşlar toplamı', () => {
  const top = (c) => VERI.BULUSLAR.filter((b) => b.cag === c).reduce((a, b) => a + b.maliyet.bilgi, 0);
  assert.deepEqual(['gocebe', 'tasdevri', 'bronz', 'antik', 'ortacag'].map(top), [44, 105, 225, 405, 710]);
});

test('BP bütçesi (§5): geçiş için zorunlu yol (bina gerektirdiği buluşlar dahil) beklenen BP içinde', () => {
  // §5 tablosundaki "çağda beklenen BP"
  const beklenen = { gocebe: 37, tasdevri: 130, bronz: 240, antik: 480, ortacag: 800 };
  for (const c of VERI.CAGLAR) {
    const hedef = c.gecis ? [c.gecis.bulus] : [];
    const binalar = c.gecis ? Object.keys(c.gecis.binalar) : [c.zafer.bina];
    for (const id of binalar) { const g = bul(VERI.BINALAR, id).gereksinim.bulus; if (g) hedef.push(g); }
    const kume = bulusKapanisi(VERI.BULUSLAR, hedef);
    const bp = [...kume].map((id) => bul(VERI.BULUSLAR, id)).filter((b) => b.cag === c.id).reduce((a, b) => a + b.maliyet.bilgi, 0);
    assert.ok(bp <= beklenen[c.id], `${c.id}: ${bp} > ${beklenen[c.id]}`);
  }
});

test('denetleyici kimlik tekrarını yakalar', () => {
  const v = kopya();
  v.BINALAR.push({ ...v.BINALAR[5] });
  assert.ok(dogrula(v).some((h) => h.includes('tekrarlanan id "cadir"')));
});

test('denetleyici geçersiz kimlik biçimini yakalar', () => {
  const v = kopya();
  v.KAYNAKLAR[0] = { ...v.KAYNAKLAR[0], id: 'Yiyecek' };
  assert.ok(dogrula(v).some((h) => h.includes('geçersiz id "Yiyecek"')));
});

test('denetleyici kırık başvuruları yakalar', () => {
  const v = kopya();
  bul(v.BINALAR, 'cadir').maliyet = { odun: 5, altin: 2 };
  bul(v.BULUSLAR, 'deri_isleme').gerekir = ['yok_boyle'];
  bul(v.OLAYLAR, 'nehir_taskini').secenekler[1].sonuc.zincir.olay = 'kayip_olay';
  v.CAGLAR[0].konut = 'saray';
  bul(v.EYLEMLER, 'kervan_gonder').gereksinim.bina = 'carsi';
  const h = dogrula(v);
  for (const parca of ['bilinmeyen kaynak "altin"', 'bilinmeyen buluş "yok_boyle"', 'bilinmeyen olay "kayip_olay"',
    'bilinmeyen konut binası "saray"', 'bilinmeyen bina "carsi"']) {
    assert.ok(h.some((x) => x.includes(parca)), parca);
  }
});

test('denetleyici buluş ↔ bina açılış tutarsızlığını ve çağ sırasını yakalar', () => {
  const v = kopya();
  bul(v.BULUSLAR, 'tas_yontma').acar.binalar = [];
  bul(v.BINALAR, 'cadir').maliyet = { odun: 5, kitap: 1 };
  const h = dogrula(v);
  assert.ok(h.some((x) => x.includes('BINALAR.totem: tas_yontma buluşu bu binayı açar listesinde değil')));
  assert.ok(h.some((x) => x.includes('"kitap" gocebe çağında henüz yok')));
});

test('buluş bağımlılıklarında döngü yok; döngü eklenince yakalanır', () => {
  assert.deepEqual(bulusDongusu(VERI.BULUSLAR), []);
  const v = kopya();
  bul(v.BULUSLAR, 'mizrak_ucu').gerekir = ['yerlesik_hayat'];
  const donguler = bulusDongusu(v.BULUSLAR);
  assert.ok(donguler.length > 0);
  assert.ok(dogrula(v).some((h) => h.startsWith('BULUSLAR: döngüsel bağımlılık')));
});

test('olasılık toplamı 1 olmayan sonuç yakalanır', () => {
  const v = kopya();
  bul(v.EYLEMLER, 'kesfet').sonuc.olasilik[4].p = 0.2;
  assert.ok(dogrula(v).some((h) => h.includes('p toplamı')));
});

test('veri modülleri DOM / three içe aktarmaz', async () => {
  const { readdir, readFile } = await import('node:fs/promises');
  for (const kat of ['src/data', 'src/core']) {
    for (const f of await readdir(kat)) {
      const s = await readFile(`${kat}/${f}`, 'utf8');
      assert.ok(!/from\s+['"]three['"]|document\.|window\.|localStorage/.test(s), `${kat}/${f}`);
    }
  }
});
