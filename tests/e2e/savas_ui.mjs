// Savaş arayüzü F1 uçtan uca testi (Playwright; `npm run build` sonrası, port 4175). Çekirdekten kurulan "savaş bekliyor" kaydı localStorage'a yazılır,
// arayüz o kayıttan devam eder. Kontroller: ayar kapalı = savaş UI yok + eski akış; kart/sekme/dikkat; yerleşim penceresi viewport içinde;
// Öneri / Otomatik doldur / dokun / sürükle; olasılık yüzdeleri toplamı 100; Savaşa başla → sahne → sonuç kartı → arayüz geri; otomatik savaş + İzle;
// ordu/rütbe; konsol hatası yok. Kullanım: npm run build && node tests/e2e/savas_ui.mjs   (EKRAN_YAZ=1: docs/ekran/savas-ui-*.png yazar, en çok 4)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { durum, cagBaslangic } from '../yardimci/durum.js';
import { kahramanli, isaretli } from '../yardimci/aksiyon.js';
import { turIlerlet } from '../../src/core/tur.js';
import { seferGonder } from '../../src/core/sefer.js';
import { birlikTerfi } from '../../src/core/savas.js';
import { kaydet, ANAHTARLAR } from '../../src/save/kayit.js';

const gerek = createRequire(import.meta.url);
let playwright;
try { playwright = gerek('playwright'); } catch { playwright = gerek(`${process.env.PLAYWRIGHT_DIR || '/opt/node22/lib/node_modules'}/playwright`); }
const { chromium } = playwright;
const PORT = 4175, URL = `http://localhost:${PORT}/`, EKRAN = 'docs/ekran';
const YAZ = process.env.EKRAN_YAZ === '1';
if (YAZ) mkdirSync(EKRAN, { recursive: true });
const sonuclar = [];
const kontrol = (ad, ok, ek = '') => { sonuclar.push({ ad, ok }); console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${ad}${ek ? ` — ${ek}` : ''}`); };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

const kayitMetni = (d) => { const m = {}; kaydet({ setItem: (k, v) => { m[k] = v; } }, ANAHTARLAR.otomatik, d); return m[ANAHTARLAR.otomatik]; };

// Göçebe: Avcı + 3 işçi ayı seferi, varış gelmiş ("bekliyor").
function bekleyenKayit() {
  for (let t = 1; t < 400; t++) {
    const { d: d0, uid: h } = kahramanli(durum({ nufus: 8, atama: { 'serbest:toplayici': 8 }, kaynaklar: { yiyecek: 50, odun: 20, tas: 5, deri: 5 } }, 1), 'avci', { seviye: 3 });
    const { d, uid: ayi } = isaretli({ ...d0, tohum: t, sefer: { ...d0.sefer, rng: (t * 2654435761) >>> 0 } }, 'ayi');
    let x = seferGonder(d, 'ayi_avi', ayi, { kahraman: [h], isci: 3 }).durum;
    for (let i = 0; i < 4 && !x.sefer.aktif[0]?.savas; i++) { if (x.olay.aktif) break; x = turIlerlet(x, { savasSahnesi: true }).durum; }
    if (x.sefer.aktif[0]?.savas?.durum === 'bekliyor') return { kayit: kayitMetni(x), uid: x.sefer.aktif[0].uid };
  }
  throw new Error('bekleyen savaş kurulamadı');
}
// Taş Devri: 2 mızrakçı + kahraman, haritada ayı işareti (sefer kurulumunda asker satırı), savaş yok.
function ordulu() {
  let d = cagBaslangic('tasdevri', 2);
  d = { ...d, nufus: 10, atama: {}, kaynaklar: { ...d.kaynaklar, yiyecek: 80, odun: 40, deri: 12 } };
  d = birlikTerfi(d, 'mizrakci', 2).durum;
  const k = kahramanli(d, 'avci', { seviye: 2 });
  const i = isaretli(k.d, 'ayi');
  return kayitMetni(i.d);
}

const sunucu = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const hazirBekle = async () => { for (let i = 0; i < 60; i++) { try { if ((await fetch(URL)).ok) return; } catch { /* bekle */ } await bekle(200); } throw new Error('sunucu açılmadı'); };

async function sayfaAc(tarayici, vp, dpr, kayit, ayar = null) {
  const ctx = await tarayici.newContext({ viewport: vp, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
  const sayfa = await ctx.newPage();
  sayfa.hatalar = [];
  sayfa.on('console', (m) => { if (m.type() === 'error') sayfa.hatalar.push(m.text()); });
  sayfa.on('pageerror', (e) => sayfa.hatalar.push(String(e)));
  await sayfa.goto(URL);
  await sayfa.waitForSelector('.menu');
  await sayfa.evaluate(([a, k, ayar0]) => { localStorage.clear(); localStorage.setItem(a, k); if (ayar0) localStorage.setItem('ut_ayar', JSON.stringify(ayar0)); localStorage.setItem('ut_tam', JSON.stringify({ soruldu: true })); },
    [ANAHTARLAR.otomatik, kayit, ayar]);
  await sayfa.reload();
  await sayfa.waitForSelector('.menu');
  await sayfa.locator('.menu button', { hasText: 'Devam' }).first().click();
  await sayfa.waitForSelector('.ust .chip');
  await sayfa.evaluate(() => { const o = window.__oyun; o.arayuz.ogretici.kapat(); o.arayuz.pencere = 'kapali'; o.arayuz.yenile(); });
  await sayfa.waitForTimeout(500);
  return sayfa;
}

const yuzdeToplam = (sayfa) => sayfa.evaluate(() => {
  const l = [...document.querySelectorAll('.sv-pencere [data-sv-bar] i')].map((e) => Number(e.dataset.yuzde));
  return { l, toplam: l.reduce((a, b) => a + b, 0) };
});
const kutu = (sayfa, sel) => sayfa.evaluate((q) => {
  const el = document.querySelector(q); if (!el) return null;
  const b = el.getBoundingClientRect();
  const ust = document.querySelector('.ust').getBoundingClientRect(), alt = document.querySelector('.alt').getBoundingClientRect();
  const g = el.querySelector('.govde');
  return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, W: innerWidth, H: innerHeight, ustAlt: ust.bottom, altUst: alt.top, tasma: g ? g.scrollHeight - g.clientHeight : 0, yatay: document.documentElement.scrollWidth > innerWidth };
}, sel);

async function ana(tarayici, ad, vp, dpr, ekranAd) {
  console.log(`\n== ${ad} ==`);
  const { kayit, uid } = bekleyenKayit();
  const sayfa = await sayfaAc(tarayici, vp, dpr, kayit);
  const goruntu = async (konu) => { if (YAZ && ekranAd) { await sayfa.waitForTimeout(350); await sayfa.screenshot({ path: `${EKRAN}/savas-ui-${konu}.png`, timeout: 120000 }); } };
  const oku = (f, ...a) => sayfa.evaluate(f, ...a);

  if (process.env.HATA_AYIKLA) console.log(JSON.stringify(await oku(() => { const a = window.__oyun.arayuz, d = a.d; return { savas: d.sefer.aktif[0]?.savas, olay: d.olay.aktif, tekl: d.kahramanDurum?.teklif, kartlar: a.kartEl.innerHTML.slice(0, 300), ayar: a.oyun.savasSahnesi, hatalar: [] }; })), sayfa.hatalar);
  // --- varış bildirimi: kart + dikkat noktaları ---
  kontrol(`${ad}: "Savaş hazır" kartı kendiliğinden çıkar (Düzenle / Otomatik)`, (await sayfa.locator('.aksiyon-kart [data-sv="duzenle"]').count()) === 1 && (await sayfa.locator('.aksiyon-kart [data-sv="otomatik"]').count()) === 1);
  const kk = await kutu(sayfa, '.pencere.aksiyon-kart');
  kontrol(`${ad}: kart viewport içinde, üst/alt şeridi örtmez`, kk && kk.l >= 0 && kk.r <= kk.W && kk.t >= kk.ustAlt - 1 && kk.b <= kk.altUst + 1, JSON.stringify(kk && { t: Math.round(kk.t), b: Math.round(kk.b), altUst: Math.round(kk.altUst) }));
  const bk = await sayfa.locator('.aksiyon-kart [data-sv="duzenle"]').boundingBox();
  kontrol(`${ad}: kart düğmeleri ≥40px`, bk.height >= 40, `${Math.round(bk.height)}px`);
  kontrol(`${ad}: Seferler simgesinde dikkat noktası`, (await sayfa.locator('.sekmeler button[data-sekme="aksiyon"].dikkat').count()) === 1);
  await goruntu('kart');
  await sayfa.locator('.sekmeler button[data-sekme="aksiyon"]').click();
  await sayfa.waitForSelector('.pencere.sag.acik'); await sayfa.waitForTimeout(300);
  kontrol(`${ad}: Seferler'de "Savaş" sekmesi var ve dikkat noktalı`, (await sayfa.locator('.sf-serit button[data-alt="savas"].dikkat').count()) === 1);
  await sayfa.locator('.sf-serit button[data-alt="savas"]').click();
  await sayfa.waitForTimeout(250);
  kontrol(`${ad}: Savaş sekmesi bekleyen savaşı ve rütbeyi (Lider) gösterir`, (await sayfa.locator('.sv-bek').count()) === 1 && /Lider/.test(await sayfa.locator('.sv-rutbe').innerText()));
  const sk = await kutu(sayfa, '.pencere.sag.acik');
  kontrol(`${ad}: Savaş sekmesi penceresi viewport içinde`, sk && sk.l >= 0 && sk.r <= sk.W && sk.t >= sk.ustAlt - 1 && sk.b <= sk.altUst + 1 && !sk.yatay);
  await goruntu('sekme');

  // --- yerleşim penceresi ---
  await sayfa.locator('.sv-bek [data-sv="duzenle"]').click();
  await sayfa.waitForSelector('.sv-pencere'); await sayfa.waitForTimeout(350);
  const pk = await kutu(sayfa, '.sv-pencere');
  kontrol(`${ad}: yerleşim penceresi açılır, viewport içinde ve üst/alt şeridi örtmez`, pk && pk.l >= 0 && pk.r <= pk.W && pk.t >= pk.ustAlt - 1 && pk.b <= pk.altUst + 1 && !pk.yatay,
    JSON.stringify(pk && { l: Math.round(pk.l), t: Math.round(pk.t), r: Math.round(pk.r), b: Math.round(pk.b), W: pk.W, ustAlt: Math.round(pk.ustAlt), altUst: Math.round(pk.altUst) }));
  kontrol(`${ad}: pencere haritayı tamamen örtmez (genişlik ≤ %75)`, pk.w <= pk.W * 0.75 + 1, `${Math.round(pk.w)}/${pk.W}`);
  kontrol(`${ad}: kaydırma gerektirmez, sıkı düzen`, pk.tasma <= 1, `taşma ${Math.round(pk.tasma)}`);
  kontrol(`${ad}: yerleşim açıkken sağ pencere/sekme şeridi gizli`, (await sayfa.locator('.pencere.sag.acik').count()) === 0 && (await sayfa.locator('.sekmeler.gizli').count()) === 1);
  const hucreSay = await oku(() => ({ hepsi: document.querySelectorAll('.sv-izgara .sv-hucre').length, etkin: document.querySelectorAll('.sv-izgara button.sv-hucre').length, kah: document.querySelectorAll('.sv-hucre.kahraman').length }));
  kontrol(`${ad}: 3×3 ızgara (9 hücre), kahraman ortada sabit`, hucreSay.hepsi === 9 && hucreSay.kah === 1, JSON.stringify(hucreSay));
  const kutular = await oku(() => [...document.querySelectorAll('.sv-pencere .sv-hucre, .sv-pencere .sv-kart:not(.bitti), .sv-pencere [data-sv]:not([disabled])')].map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }));
  kontrol(`${ad}: hücre/kart/düğme dokunma hedefleri ≥40px`, kutular.every(([w, h]) => w >= 40 && h >= 40), JSON.stringify(kutular.filter(([w, h]) => w < 40 || h < 40)));
  kontrol(`${ad}: düşman bilgisi (Boz Ayı gücü) ve formasyon ipucu görünür`, /Boz Ayı/.test(await sayfa.locator('.sv-dus').innerText()) && (await sayfa.locator('[data-sv-ipucu]').innerText()).length > 10);
  let y = await yuzdeToplam(sayfa);
  kontrol(`${ad}: 4 sonuç yüzdesi toplamı 100`, y.l.length === 4 && y.toplam === 100, JSON.stringify(y.l));
  await goruntu('yerlesim');

  // Öneri / kötü düzen → yüzdeler değişir, toplam 100
  await sayfa.locator('[data-sv="oneri"]').click(); await sayfa.waitForTimeout(150);
  const oneri = await yuzdeToplam(sayfa);
  const duzenOneri = await oku(() => Object.assign({}, window.__oyun.arayuz.sv.hucre));
  kontrol(`${ad}: Öneri düzeni uygulanır, yüzdeler toplamı 100`, oneri.toplam === 100 && Object.keys(duzenOneri).length === 3, JSON.stringify(duzenOneri));
  // okçuları öne al (yerel kötü düzen)
  await oku(() => { const a = window.__oyun.arayuz, hv = a.sv.hucre; const yeni = {}; const kl = Object.keys(hv); const on = ['0,0', '0,1', '0,2']; kl.forEach((k, i) => { yeni[on[i]] = 'okcu'; }); a.sv.hucre = yeni; a.savasCiz(); });
  await sayfa.waitForTimeout(150);
  const kotu = await yuzdeToplam(sayfa);
  const ipKotu = await sayfa.locator('[data-sv-ipucu]').innerText();
  kontrol(`${ad}: kötü düzende (okçu önde) yüzdeler değişir ve ipucu uyarır`, kotu.toplam === 100 && JSON.stringify(kotu.l) !== JSON.stringify(oneri.l) && /Okçu önde|Mızrakçı arkada/.test(ipKotu),
    `${JSON.stringify(oneri.l)} → ${JSON.stringify(kotu.l)} · ${ipKotu}`);
  // Hepsini çıkar → Savaşa başla kapalı
  await sayfa.locator('[data-sv="temizle"]').click(); await sayfa.waitForTimeout(120);
  kontrol(`${ad}: birlik yerleşmemişken "Savaşa başla" kapalı, uyarı yazar`, await sayfa.locator('[data-sv="basla"]').isDisabled() && /yerleşmedi/.test(await sayfa.locator('[data-sv-ipucu]').innerText()));
  // Dokun: kart seç → hücreye dokun
  await sayfa.locator('.sv-pencere [data-kart="mizrakci"]').click(); await sayfa.waitForTimeout(80);
  await sayfa.locator('.sv-hucre[data-hucre="0,1"]').click(); await sayfa.waitForTimeout(80);
  let h1 = await oku(() => window.__oyun.arayuz.sv.hucre);
  kontrol(`${ad}: kart + hücre dokunuşu birlik yerleştirir`, h1['0,1'] === 'mizrakci', JSON.stringify(h1));
  // Sürükle-bırak: hücreden hücreye
  const k1 = await sayfa.locator('.sv-hucre[data-hucre="0,1"]').boundingBox(), k2 = await sayfa.locator('.sv-hucre[data-hucre="0,2"]').boundingBox();
  await sayfa.mouse.move(k1.x + k1.width / 2, k1.y + k1.height / 2); await sayfa.mouse.down();
  await sayfa.mouse.move(k1.x + k1.width / 2 + 12, k1.y + k1.height / 2, { steps: 3 }); await sayfa.mouse.move(k2.x + k2.width / 2, k2.y + k2.height / 2, { steps: 6 }); await sayfa.mouse.up();
  await sayfa.waitForTimeout(100);
  h1 = await oku(() => window.__oyun.arayuz.sv.hucre);
  kontrol(`${ad}: sürükle-bırak birliği hücreden hücreye taşır`, h1['0,2'] === 'mizrakci' && !('0,1' in h1), JSON.stringify(h1));
  // karttan sürükle
  const kt = await sayfa.locator('.sv-pencere [data-kart="okcu"]').boundingBox(), k3 = await sayfa.locator('.sv-hucre[data-hucre="2,1"]').boundingBox();
  await sayfa.mouse.move(kt.x + kt.width / 2, kt.y + kt.height / 2); await sayfa.mouse.down();
  await sayfa.mouse.move(kt.x + kt.width / 2 + 14, kt.y + 10, { steps: 3 }); await sayfa.mouse.move(k3.x + k3.width / 2, k3.y + k3.height / 2, { steps: 8 }); await sayfa.mouse.up();
  await sayfa.waitForTimeout(100);
  h1 = await oku(() => window.__oyun.arayuz.sv.hucre);
  kontrol(`${ad}: karttan hücreye sürükleme birlik yerleştirir`, h1['2,1'] === 'okcu', JSON.stringify(h1));
  // Otomatik doldur → tamamlanır, mızrakçı ön / okçu arka
  await sayfa.locator('[data-sv="doldur"]').click(); await sayfa.waitForTimeout(150);
  const dol = await oku(() => window.__oyun.arayuz.sv.hucre);
  const yd = await yuzdeToplam(sayfa);
  kontrol(`${ad}: Otomatik doldur eksikleri tamamlar (3 birlik), "Savaşa başla" açılır, toplam 100`, Object.keys(dol).length === 3 && !(await sayfa.locator('[data-sv="basla"]').isDisabled()) && yd.toplam === 100, JSON.stringify(dol));
  await sayfa.locator('[data-sv="oneri"]').click(); await sayfa.waitForTimeout(100);

  // --- savaşa başla ---
  await sayfa.locator('[data-sv="basla"]').click();
  await sayfa.waitForSelector('.savas-hud', { timeout: 8000 });
  await sayfa.waitForTimeout(600);
  const sahne1 = await oku(() => ({ aktif: window.__oyun.sahne.savasBilgi().aktif, arayuz: getComputedStyle(document.getElementById('arayuz')).visibility, durum: window.__oyun.oyun.durum.sefer.aktif[0].savas.durum, pencere: !!document.querySelector('.sv-pencere') }));
  kontrol(`${ad}: savaşa başla → sahne oynar, ana arayüz gizlenir, pencere kapanır`, sahne1.aktif && sahne1.arayuz === 'hidden' && !sahne1.pencere, JSON.stringify(sahne1));
  kontrol(`${ad}: oyun durumu doğru (savaş "bitti")`, sahne1.durum === 'bitti');
  kontrol(`${ad}: sahnenin kendi HUD'unda hız (1×) ve atla düğmeleri`, (await sayfa.locator('.savas-hud .hiz').count()) === 1 && (await sayfa.locator('.savas-hud .atla').count()) === 1);
  await sayfa.locator('.savas-hud .hiz').click(); await sayfa.waitForTimeout(100);
  kontrol(`${ad}: hız 2× olur`, (await sayfa.locator('.savas-hud .hiz').innerText()).includes('2'));
  await sayfa.locator('.savas-hud .atla').click();
  await sayfa.waitForSelector('.sv-sonuc', { timeout: 8000 });
  await sayfa.waitForTimeout(500);
  const sn = await oku(() => ({ baslik: document.querySelector('.sv-sonuc h2').textContent, odul: !!document.querySelector('[data-sv-odul]'), yarali: !!document.querySelector('[data-sv-yarali]'), zp: !!document.querySelector('[data-sv-zp]'), hudKart: getComputedStyle(document.querySelector('.savas-hud .sonuc')).display }));
  kontrol(`${ad}: sonuç kartı (kademe "${sn.baslik}", ödül, yaralı, rütbe ZP) görünür`, ['Büyük başarı', 'Başarı', 'Kısmi başarı', 'Başarısız'].includes(sn.baslik) && sn.odul && sn.yarali && sn.zp && sn.hudKart === 'none', JSON.stringify(sn));
  if (process.env.HATA_AYIKLA) console.log('KART', JSON.stringify(await oku(() => { const e = document.querySelector('.sv-sonuc'), b = e.getBoundingClientRect(), cs = getComputedStyle(e); return { b: [b.top, b.bottom, b.height], ih: innerHeight, vv: visualViewport.height, ch: document.documentElement.clientHeight, bottom: cs.bottom, tr: cs.transform, anim: cs.animationName }; })));
  await oku(() => document.getAnimations().forEach((x) => x.finish()));
  const sk2 = await kutu(sayfa, '.sv-sonuc');
  kontrol(`${ad}: sonuç kartı viewport içinde`, sk2 && sk2.l >= 0 && sk2.r <= sk2.W && sk2.t >= 0 && sk2.b <= sk2.H, JSON.stringify(sk2 && { t: Math.round(sk2.t), b: Math.round(sk2.b), H: sk2.H }));
  const db = await sayfa.locator('.sv-sonuc [data-sv="devam"]').boundingBox();
  kontrol(`${ad}: "Devam" düğmesi ≥40px`, db.height >= 40, `${Math.round(db.height)}px`);
  await goruntu('sonuc');
  await sayfa.locator('.sv-sonuc [data-sv="devam"]').click();
  await sayfa.waitForTimeout(500);
  const sonra = await oku(() => ({ hud: !!document.querySelector('.savas-hud'), kart: !!document.querySelector('.sv-sonuc'), arayuz: getComputedStyle(document.getElementById('arayuz')).visibility, aktif: window.__oyun.sahne.savasBilgi().aktif,
    kayit: JSON.parse(localStorage.getItem('ut_otomatik') || localStorage.getItem(Object.keys(localStorage).find((k) => /otomatik/.test(k)) || '') || 'null') }));
  kontrol(`${ad}: Devam → sahne kapanır, ana arayüz geri gelir`, !sonra.hud && !sonra.kart && sonra.arayuz === 'visible' && !sonra.aktif, JSON.stringify({ ...sonra, kayit: undefined }));
  const kayitDurum = await oku(() => { const k = Object.keys(localStorage).find((x) => /otomatik/.test(x)); const j = JSON.parse(localStorage.getItem(k)); return j.sefer.aktif[0]?.savas?.durum; });
  kontrol(`${ad}: savaş sonucu kayda yazıldı (otomatik kayıt)`, kayitDurum === 'bitti', String(kayitDurum));
  if (process.env.HATA_AYIKLA) console.log('KALAN', await oku(() => document.querySelector('.kart-yuva').innerHTML.slice(0, 400)), await oku(() => [...document.querySelectorAll('.sf-serit button.dikkat')].map((e) => e.dataset.alt)));
  kontrol(`${ad}: savaş bitince "Savaş hazır" kartı ve dikkat noktası kalkar`, (await sayfa.locator('.aksiyon-kart [data-sv]').count()) === 0 && (await sayfa.locator('.sekmeler button[data-sekme="aksiyon"].dikkat').count()) === 0);
  // Tekrar izle
  await sayfa.locator('.sekmeler button[data-sekme="aksiyon"]').click().catch(() => {});
  await sayfa.waitForTimeout(250);
  if (!(await sayfa.locator('.sf-serit').count())) { await sayfa.locator('.sekmeler button[data-sekme="aksiyon"]').click(); await sayfa.waitForTimeout(250); }
  await sayfa.locator('.sf-serit button[data-alt="savas"]').click(); await sayfa.waitForTimeout(200);
  kontrol(`${ad}: Son savaşlar listesinde "İzle" düğmesi`, (await sayfa.locator('.sv-son [data-sv="izle"]').count()) === 1);
  await sayfa.locator('.sv-son [data-sv="izle"]').click();
  await sayfa.waitForSelector('.savas-hud', { timeout: 8000 });
  await sayfa.locator('.savas-hud .atla').click();
  await sayfa.waitForSelector('.sv-sonuc', { timeout: 8000 });
  kontrol(`${ad}: İzle savaşı sahnede yeniden oynatır (tekrar kartında ödül satırı yok)`, (await sayfa.locator('.sv-sonuc [data-sv-odul]').count()) === 0);
  await sayfa.locator('.sv-sonuc [data-sv="devam"]').click(); await sayfa.waitForTimeout(400);
  kontrol(`${ad}: tekrar izlemeden sonra arayüz geri gelir`, (await oku(() => getComputedStyle(document.getElementById('arayuz')).visibility)) === 'visible');
  kontrol(`${ad}: konsol/sayfa hatası yok`, sayfa.hatalar.length === 0, sayfa.hatalar.slice(0, 3).join(' | '));
  await sayfa.context().close();
}

// Çekirdek otomatik savaşı + İzle kartı, ayar açık/kapalı, ordu (844×390).
async function ek(tarayici) {
  const ad = 'ek 844×390', vp = { width: 844, height: 390 };
  console.log(`\n== ${ad} ==`);
  const { kayit } = bekleyenKayit();
  // 1) Saldırtmadan gün bitir → çekirdek otomatik savaşır, "İzle" kartı
  let sayfa = await sayfaAc(tarayici, vp, 1, kayit);
  await sayfa.locator('.alt button', { hasText: 'Günü bitir' }).click();
  await sayfa.waitForTimeout(500);
  const izle = await sayfa.locator('.aksiyon-kart [data-sv="izle"]').count();
  kontrol(`${ad}: saldırtılmazsa sonraki turda otomatik savaş + "İzle" kartı`, izle === 1, `savas=${await sayfa.evaluate(() => window.__oyun.oyun.durum.sefer.aktif[0]?.savas?.durum)}`);
  await sayfa.locator('.aksiyon-kart [data-sv="izle"]').click();
  await sayfa.waitForSelector('.savas-hud', { timeout: 8000 });
  kontrol(`${ad}: "İzle" savaşı sahnede oynatır`, await sayfa.evaluate(() => window.__oyun.sahne.savasBilgi().aktif));
  await sayfa.locator('.savas-hud .atla').click();
  await sayfa.waitForSelector('.sv-sonuc'); await sayfa.locator('.sv-sonuc [data-sv="devam"]').click(); await sayfa.waitForTimeout(300);
  kontrol(`${ad}: otomatik savaş akışında konsol hatası yok`, sayfa.hatalar.length === 0, sayfa.hatalar.join(' | '));
  await sayfa.context().close();

  // 2) Ayar: Ayarlar menüsünden Kapalı → savaş UI yok, Açık → geri
  sayfa = await sayfaAc(tarayici, vp, 1, kayit);
  kontrol(`${ad}: ayar varsayılan AÇIK`, await sayfa.evaluate(() => window.__oyun.oyun.savasSahnesi === true && window.__oyun.arayuz.ayar.savasSahnesi !== false));
  await sayfa.locator('.alt .menu-d', { hasText: 'Menü' }).click();
  await sayfa.locator('.menu button', { hasText: 'Ayarlar' }).click();
  await sayfa.waitForTimeout(200);
  kontrol(`${ad}: Ayarlar'da "Savaş sahnesi: Açık / Kapalı" seçimi`, (await sayfa.locator('[data-savas-sahnesi="acik"].secili').count()) === 1 && (await sayfa.locator('[data-savas-sahnesi="kapali"]').count()) === 1);
  await sayfa.locator('[data-savas-sahnesi="kapali"]').click(); await sayfa.waitForTimeout(150);
  const kap = await sayfa.evaluate(() => ({ o: window.__oyun.oyun.savasSahnesi, sec: window.__oyun.oyun.savasSec, opt: window.__oyun.oyun.secenek(), ayar: JSON.parse(localStorage.getItem('ut_ayar')).savasSahnesi }));
  kontrol(`${ad}: Kapalı → anında uygulanır, çekirdeğe savasSahnesi parametresi verilmez, ayar kaydedilir`, kap.o === false && kap.sec === undefined && !('savasSahnesi' in kap.opt) && kap.ayar === false, JSON.stringify(kap));
  await sayfa.evaluate(() => { const a = window.__oyun.arayuz; a.menuAcik = false; a.menuSayfa = 'ana'; a.yenile(); }); await sayfa.waitForTimeout(250);
  kontrol(`${ad}: ayar kapalı → "Savaş hazır" kartı yok`, (await sayfa.locator('.aksiyon-kart [data-sv]').count()) === 0);
  await sayfa.locator('.sekmeler button[data-sekme="aksiyon"]').click(); await sayfa.waitForTimeout(300);
  kontrol(`${ad}: ayar kapalı → Savaş sekmesi yok, dikkat noktası yok`, (await sayfa.locator('.sf-serit button[data-alt="savas"]').count()) === 0 && (await sayfa.locator('.sf-serit button.dikkat').count()) === 0);
  await sayfa.locator('.sf-serit button[data-alt="sefer"]').click(); await sayfa.waitForTimeout(200);
  kontrol(`${ad}: ayar kapalı → sefer önizlemesinde savaş satırı yok`, (await sayfa.locator('[data-savas-ipucu]').count()) === 0);
  await sayfa.locator('.alt button', { hasText: 'Günü bitir' }).click(); await sayfa.waitForTimeout(500);
  const eski = await sayfa.evaluate(() => ({ hud: !!document.querySelector('.savas-hud'), izle: !!document.querySelector('.aksiyon-kart [data-sv]'), tur: window.__oyun.oyun.durum.tur, savas: window.__oyun.oyun.durum.sefer.aktif[0]?.savas?.durum ?? null }));
  kontrol(`${ad}: ayar kapalı → gün ilerler, savaş UI görünmez (eski akış)`, !eski.hud && !eski.izle, JSON.stringify(eski));
  // Açık yap → kart geri gelir (durum bekliyor ise)
  await sayfa.evaluate(() => { const a = window.__oyun.arayuz; a.savasSahnesiAyarla(true); });
  await sayfa.waitForTimeout(200);
  kontrol(`${ad}: Açık'a dönünce Savaş sekmesi geri gelir`, await sayfa.evaluate(() => window.__oyun.arayuz.ayar.savasSahnesi === true && !!document.querySelector('.sf-serit button[data-alt="savas"]')));
  kontrol(`${ad}: ayar değişiminde konsol hatası yok`, sayfa.hatalar.length === 0, sayfa.hatalar.join(' | '));
  await sayfa.context().close();
  // ayar kapalı kayıtlı başlangıç: ilk yüklemede de görünmez
  sayfa = await sayfaAc(tarayici, vp, 1, kayit, { kalite: 'yuksek', ses: false, siklik: 'normal', savasSahnesi: false });
  kontrol(`${ad}: ayar kapalı başlangıç → savaş kartı/sekmesi yok`, (await sayfa.locator('.aksiyon-kart [data-sv]').count()) === 0 && (await sayfa.evaluate(() => window.__oyun.oyun.savasSahnesi)) === false);
  await sayfa.context().close();

  // 3) Ordu / rütbe (Taş Devri)
  sayfa = await sayfaAc(tarayici, vp, 1, ordulu());
  await sayfa.locator('.sekmeler button[data-sekme="aksiyon"]').click(); await sayfa.waitForTimeout(300);
  await sayfa.locator('.sf-serit button[data-alt="savas"]').click(); await sayfa.waitForTimeout(250);
  const o0 = await sayfa.evaluate(() => window.__oyun.oyun.durum.ordu.asker.mizrakci || 0);
  kontrol(`${ad}: Ordu bölümü mızrakçı/okçu satırları, rütbe rozeti (Lider ★)`, (await sayfa.locator('.sv-ordu').count()) === 2 && /Lider/.test(await sayfa.locator('.sv-rutbe').innerText()) && o0 === 2);
  const ob = await sayfa.locator('.sv-ordu [aria-label$="terfi"]').first().boundingBox();
  kontrol(`${ad}: ordu −/+ düğmeleri ≥40px`, ob.width >= 40 && ob.height >= 40, `${Math.round(ob.width)}×${Math.round(ob.height)}`);
  await sayfa.locator('.sv-ordu[data-birlik="mizrakci"] [aria-label$="terfi"]').click(); await sayfa.waitForTimeout(150);
  const o1 = await sayfa.evaluate(() => window.__oyun.oyun.durum.ordu.asker.mizrakci || 0);
  await sayfa.locator('.sv-ordu[data-birlik="mizrakci"] [aria-label$="terhis"]').click(); await sayfa.waitForTimeout(150);
  const o2 = await sayfa.evaluate(() => window.__oyun.oyun.durum.ordu.asker.mizrakci || 0);
  kontrol(`${ad}: terfi + / terhis − asker sayısını değiştirir (2 → ${o1} → ${o2})`, o1 === 3 && o2 === 2);
  await sayfa.locator('.sf-serit button[data-alt="sefer"]').click(); await sayfa.waitForTimeout(250);
  await sayfa.locator('.sf-tur [data-tur="ayi_avi"]').click(); await sayfa.waitForTimeout(200);
  kontrol(`${ad}: sefer kurulumunda asker −/+ satırı (köyde asker varsa)`, (await sayfa.locator('[data-asker-birlik="mizrakci"]').count()) === 1);
  await sayfa.locator('[data-asker-birlik="mizrakci"] [aria-label$="artır"]').click(); await sayfa.waitForTimeout(150);
  kontrol(`${ad}: ayı avı önizlemesinde tek satırlık formasyon ipucu`, /Mızrakçılar önde, okçular arkada, kahraman ortada/.test(await sayfa.locator('[data-savas-ipucu]').innerText().catch(() => '')));
  const gucOnce = await sayfa.locator('.sf-guc b').first().innerText();
  const askerN = await sayfa.locator('[data-asker-birlik="mizrakci"] [data-asker]').innerText();
  kontrol(`${ad}: asker eklenince ekip gücü/önizleme güncellenir (asker ${askerN}, güç ${gucOnce})`, askerN === '1');
  const gonder = await sayfa.locator('[data-gonder]').isDisabled();
  if (!gonder) {
    await sayfa.locator('[data-gonder]').click(); await sayfa.waitForTimeout(250);
    const ek2 = await sayfa.evaluate(() => window.__oyun.oyun.durum.sefer.aktif[0]?.ekip);
    kontrol(`${ad}: asker seferle gönderilir (ekip.asker.mizrakci=1)`, ek2?.asker?.mizrakci === 1, JSON.stringify(ek2?.asker));
  } else kontrol(`${ad}: asker seferle gönderilir`, false, 'Gönder kapalı');
  kontrol(`${ad}: ordu arayüzünde konsol hatası yok`, sayfa.hatalar.length === 0, sayfa.hatalar.join(' | '));
  await sayfa.context().close();
}

let tarayici;
try {
  await hazirBekle();
  tarayici = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  await ana(tarayici, 'savaş UI 1000×450 dpr2', { width: 1000, height: 450 }, 2, 'p1000');
  await ana(tarayici, 'savaş UI 844×390', { width: 844, height: 390 }, 1, null);
  await ana(tarayici, 'savaş UI 720×360', { width: 720, height: 360 }, 1, null);
  await ek(tarayici);
} finally {
  await tarayici?.close();
  sunucu.kill();
}
const kalan = sonuclar.filter((s) => !s.ok);
console.log(`\n${sonuclar.length - kalan.length}/${sonuclar.length} kontrol geçti`);
if (kalan.length) { console.log('KALAN:', kalan.map((k) => k.ad).join('\n  ')); process.exit(1); }
