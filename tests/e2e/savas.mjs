// Görsel savaş sahnesi ekran görüntüleri + ölçüm (Playwright global kurulu; `npm run build` sonrası; port 4174).
// Çekirdekten gerçek bir Ayı Avı savaşı kurulur (Avcı + 3 işçi, Öneri düzeni), sahne `window.__oyun.sahne.savasOynat(girdi)` ile sürülür,
// `savasSar(sn)` ile üç anda dondurulup çekilir: docs/ekran/savas-{yerlesim,carpisma,sonuc}.png (1000×450, dpr 2).
// Ardından 1× oynatımda kare süresi (SwiftShader) ve çizim çağrısı / üçgen sayısı yazılır. Kullanım: npm run build && node tests/e2e/savas.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { durum } from '../yardimci/durum.js';
import { kahramanli, isaretli } from '../yardimci/aksiyon.js';
import { turIlerlet } from '../../src/core/tur.js';
import { seferGonder } from '../../src/core/sefer.js';
import { savasKur, savasBaslat, yerlesimKaydet } from '../../src/core/savas.js';

const gerek = createRequire(import.meta.url);
let playwright;
try { playwright = gerek('playwright'); } catch { playwright = gerek(`${process.env.PLAYWRIGHT_DIR || '/opt/node22/lib/node_modules'}/playwright`); }
const { chromium } = playwright;
const PORT = 4174, URL = `http://localhost:${PORT}/`, CIKTI = process.env.SAVAS_CIKTI || 'docs/ekran';
const KADEME = process.env.SAVAS_KADEME || 'basari';
mkdirSync(CIKTI, { recursive: true });

function girdiBul() {
  for (let t = 1; t < 400; t++) {
    const { d: d0, uid: h } = kahramanli(durum({ nufus: 8, atama: { 'serbest:toplayici': 8 }, kaynaklar: { yiyecek: 50, odun: 20, tas: 5, deri: 5 } }, 1), 'avci', { seviye: 3 });
    const { d, uid: ayi } = isaretli({ ...d0, tohum: t, sefer: { ...d0.sefer, rng: (t * 2654435761) >>> 0 } }, 'ayi');
    let x = seferGonder(d, 'ayi_avi', ayi, { kahraman: [h], isci: 3 }).durum;
    for (let i = 0; i < 4 && !x.sefer.aktif[0]?.savas; i++) {
      if (x.olay.aktif) break;
      x = turIlerlet(x, { savasSahnesi: true }).durum;
    }
    const sf = x.sefer.aktif[0];
    if (!sf?.savas) continue;
    // Whiteout düzeni: iki mızrakçı ön kanatlarda, okçu arkada, kahraman ortada (Öneri üç mızrakçıyı öne koyar; fark küçük).
    const k = savasKur(x, sf.uid);
    const isci = k.birlikler.filter((u) => u.tur === 'isci');
    const yer = [{ id: k.birlikler[0].id, rol: 'kahraman', sira: 1, sutun: 1 }, { id: isci[0].id, rol: 'mizrakci', sira: 0, sutun: 0 },
      { id: isci[1].id, rol: 'mizrakci', sira: 0, sutun: 2 }, { id: isci[2].id, rol: 'okcu', sira: 2, sutun: 1 }];
    if (process.env.SAVAS_ONERI !== '1') x = yerlesimKaydet(x, sf.uid, yer).durum;
    const b = savasBaslat(x, sf.uid);
    if (b.savas?.kademe === KADEME) return { girdi: b.savas.girdi, liste: b.liste, oneri: savasKur(x, sf.uid).oneri };
  }
  throw new Error('girdi bulunamadı');
}

const { girdi, liste, oneri } = girdiBul();
console.log(`girdi: tohum ${girdi.tohum} · kademe ${girdi.kademe} · ${girdi.birimler.length} birim · süre ${liste.sure} sn (+2,5 giriş) · öneri ${JSON.stringify(oneri.map((y) => `${y.rol}@${y.sira},${y.sutun}`))}`);
const yetenek = liste.olaylar.find((o) => o.tur === 'yetenek' && o.k?.startsWith('k:') && !o.ek?.komuta && !o.ek?.pasif);
const vurusT = liste.olaylar.find((o) => o.tur === 'vurus' && o.h === 'd0')?.t ?? 6;
const ANLAR = [
  ['yerlesim', 1.6],
  ['carpisma', ((yetenek ? yetenek.t + 0.5 : vurusT + 3) + 5) * 0.5],
  ['sonuc', (liste.tick + 5) * 0.5 + 0.6],
];

const sunucu = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await bekle(2500);
  const tarayici = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await tarayici.newContext({ viewport: { width: 1000, height: 450 }, deviceScaleFactor: 2 });
  const sayfa = await ctx.newPage();
  sayfa.on('pageerror', (e) => console.log('[sayfa hatası]', e.message));
  sayfa.on('console', (m) => { if (m.type() === 'error') console.log('[konsol hatası]', m.text().slice(0, 160)); });
  await sayfa.goto(URL);
  await sayfa.waitForFunction(() => window.__oyun?.sahne);
  await sayfa.evaluate((g) => window.__oyun.sahne.savasOynat(g, { mevsim: 'yaz' }), girdi);
  for (const [ad, sn] of ANLAR) {
    await sayfa.evaluate((s) => window.__oyun.sahne.savasSar(s), sn);
    await bekle(700);
    if (ad === 'sonuc') await sayfa.evaluate(() => { window.__oyun.sahne.savasDevam(); });
    if (ad === 'sonuc') await bekle(600);
    await sayfa.screenshot({ path: `${CIKTI}/savas-${ad}.png` });
    console.log(ad, sn.toFixed(2), 'sn', JSON.stringify(await sayfa.evaluate(() => window.__oyun.sahne.savasBilgi())));
  }
  // 1× oynatım ölçümü (baştan, 6 sn)
  await sayfa.evaluate((g) => { const s = window.__oyun.sahne; s.savasKapat(); s.kareSureleri.length = 0; s.savasOynat(g, { mevsim: 'yaz' }); }, girdi);
  const kareAraligi = await sayfa.evaluate(() => new Promise((son) => {
    const l = []; let once = performance.now();
    const f = (t) => { l.push(t - once); once = t; if (l.length < 40) requestAnimationFrame(f); else son(l.slice(3)); };
    requestAnimationFrame(f);
  }));
  kareAraligi.sort((a, b) => a - b);
  console.log(`kare aralığı (rAF, SwiftShader): ortanca ${kareAraligi[Math.floor(kareAraligi.length / 2)].toFixed(0)} ms · en kötü ${kareAraligi.at(-1).toFixed(0)} ms`);
  await bekle(2000);
  const olcum = await sayfa.evaluate(() => {
    const s = window.__oyun.sahne, k = s.kareSureleri.slice(10);
    const ort = k.reduce((a, b) => a + b, 0) / Math.max(1, k.length);
    return { kare: k.length, ortMs: Math.round(ort * 10) / 10, maxMs: Math.round(Math.max(...k) * 10) / 10, ...s.savasBilgi() };
  });
  console.log('ölçüm (SwiftShader, dpr 2, 1000×450):', JSON.stringify(olcum));
  await tarayici.close();
} finally {
  sunucu.kill();
}
