// Uçtan uca tarayıcı testi (Playwright, global kurulu). `npm run build` sonrası `vite preview` ile çalışır; `npm test`'e dahil değil.
// Kullanım: npm run build && npm run e2e
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const gerek = createRequire(import.meta.url);
let playwright;
try { playwright = gerek('playwright'); } catch { playwright = gerek(`${process.env.PLAYWRIGHT_DIR || '/node-tools/node_modules'}/playwright`); }
const { chromium } = playwright;

const PORT = 4173, URL = `http://localhost:${PORT}/`, EKRAN = 'docs/ekran';
mkdirSync(EKRAN, { recursive: true });
const sonuclar = [];
const kontrol = (ad, ok, ek = '') => { sonuclar.push({ ad, ok }); console.log(`${ok ? 'GEÇTİ' : 'KALDI'}  ${ad}${ek ? ` — ${ek}` : ''}`); };

const sunucu = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const bekle = async () => { for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) return; } catch { /* bekle */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('sunucu açılmadı'); };

async function senaryo(tarayici, ad, secenek, ekranGoruntusu0) {
  const ekranGoruntusu = process.env.EKRAN_YAZ === '1' ? ekranGoruntusu0 : null; // varsayılan: docs/ekran dosyalarını ezme
  console.log(`\n== ${ad} ==`);
  const ctx = await tarayici.newContext(secenek);
  const sayfa = await ctx.newPage();
  const hatalar = [];
  sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  sayfa.on('pageerror', (e) => hatalar.push(String(e)));
  const durum = () => sayfa.evaluate(() => { const d = window.__oyun.oyun.durum; return d && { tur: d.tur, bina: d.binalar.length, olay: !!d.olay.aktif, cag: d.cag, nufus: d.nufus }; });
  // Sekme penceresi aç/kapa olduğundan: yalnız açık değilse ya da başka sekmedeyse dokun.
  const sekmeAc = async (ad, id) => {
    const acik = await sayfa.evaluate((i) => { const a = window.__oyun.arayuz; return a.pencere === 'acik' && a.sekme === i; }, id);
    if (!acik) await sayfa.locator('.sekmeler button', { hasText: ad }).click();
    await sayfa.waitForSelector(`.pencere.sag.acik`);
    await sayfa.waitForTimeout(260);
  };
  const tikla = (metin, kapsam = '') => sayfa.locator(`${kapsam} button`, { hasText: metin }).first().click();

  await sayfa.goto(URL);
  await sayfa.waitForSelector('.menu');
  kontrol(`${ad}: sayfa açılır, ana menü görünür`, true);
  {
    const vp = sayfa.viewportSize();
    await sayfa.setViewportSize({ width: vp.height, height: vp.width + 200 });
    await sayfa.waitForTimeout(150);
    const dikeyGorunur = await sayfa.locator('#donus-perde').isVisible();
    await sayfa.setViewportSize(vp);
    await sayfa.waitForTimeout(150);
    const yatayGizli = !(await sayfa.locator('#donus-perde').isVisible());
    kontrol(`${ad}: dikeyde 'Telefonu yan çevirin' örtüsü çıkar, yatayda kalkar`, dikeyGorunur && yatayGizli);
  }
  await sayfa.evaluate(() => localStorage.clear());
  await tikla('Yeni Oyun');
  await sayfa.waitForSelector('.ust .chip');
  const d0 = await durum();
  kontrol(`${ad}: yeni oyun başladı`, d0 && d0.tur === 0 && d0.bina === 2);
  const harita = await sayfa.evaluate(() => { const m = window.__oyun.sahne.harita.mesh; return { cimen: m.cimen?.count || 0, sis: m.sis?.count || 0 }; });
  kontrol(`${ad}: harita çizildi (çimen ${harita.cimen}, sis ${harita.sis})`, harita.cimen > 20 && harita.sis > 3000);
  await sayfa.waitForTimeout(400);

  // iş ata: toplayıcıdan 1 kişiyi oduncuya
  await sekmeAc('İş', 'is');
  await sayfa.locator('.oge', { hasText: 'Toplayıcı' }).first().locator('button', { hasText: '−' }).click();
  await sayfa.locator('.oge', { hasText: 'Oduncu' }).first().locator('button', { hasText: '+' }).click();
  const atama = await sayfa.evaluate(() => window.__oyun.oyun.durum.atama);
  kontrol(`${ad}: iş atandı`, atama['serbest:oduncu'] === 1, JSON.stringify(atama));

  // Çadır 5 odun + 2 deri ister; başlangıçta deri yok → Önder "Avlan" ile deri toplanır (Önder sekmesi üzerinden).
  const yeterli = () => sayfa.evaluate(() => { const k = window.__oyun.oyun.durum.kaynaklar; return k.odun >= 5 && k.deri >= 2; });
  for (let i = 0; i < 10 && !(await yeterli()); i++) {
    await sekmeAc('Önder', 'onder');
    const av = sayfa.locator('.oge', { hasText: 'Avlan' }).first().locator('button');
    if (await av.isEnabled()) await av.click();
    await tikla('Günü bitir');
  }
  kontrol(`${ad}: Avlan + Oduncu ile Çadır maliyeti toplandı`, await yeterli());
  // çadır kur (yerleştirme modu + onay)
  await sekmeAc('İnşa', 'insa');
  await sayfa.locator('.oge', { hasText: 'Çadır' }).first().click();
  await sayfa.waitForSelector('.alt.yerlesme');
  // haritaya dokun/tıkla: ghost'u başka uygun hücreye taşı
  const kutu = await sayfa.locator('#oyun canvas').boundingBox();
  const hedefHucre = await sayfa.evaluate(() => { const y = window.__oyun.arayuz.yerlestirme; return { x: y.x + 1, y: y.y }; });
  const ekranXY = await sayfa.evaluate(({ x, y }) => { const s = window.__oyun.sahne; const v = s.kamera.position.clone(); const p = new (s.hedef.constructor)(x + 0.5, 0.3, y + 0.5).project(s.kamera); const r = s.canvas.getBoundingClientRect(); return { px: r.left + (p.x + 1) / 2 * r.width, py: r.top + (1 - p.y) / 2 * r.height }; }, hedefHucre);
  if (secenek.hasTouch) await sayfa.touchscreen.tap(ekranXY.px, ekranXY.py); else await sayfa.mouse.click(ekranXY.px, ekranXY.py);
  const yer = await sayfa.evaluate(() => { const y = window.__oyun.arayuz.yerlestirme; return { x: y.x, y: y.y, hata: y.hata }; });
  kontrol(`${ad}: haritaya dokununca yerleştirme önizlemesi taşındı`, yer.x === hedefHucre.x && yer.y === hedefHucre.y, JSON.stringify(yer));
  if (yer.hata) { // uygun değilse ilk uygun konuma dön
    await sayfa.evaluate(() => { const a = window.__oyun.arayuz; const y = a.yerlestirme; a.yerlestirmeBaslat(y.binaId); });
  }
  await tikla('Onayla', '.alt.yerlesme');
  const d1 = await durum();
  kontrol(`${ad}: Çadır yerleştirildi`, d1.bina === 3);
  if (ekranGoruntusu) await sayfa.screenshot({ path: `${EKRAN}/${ekranGoruntusu}-insa.png` });

  // bina seç (hücre dokunuşu) → bilgi kartı
  const bk = await sayfa.evaluate(() => { const b = window.__oyun.oyun.durum.binalar[2]; const s = window.__oyun.sahne; const p = new (s.hedef.constructor)(b.x + 0.5, 0.3, b.y + 0.5).project(s.kamera); const r = s.canvas.getBoundingClientRect(); return { px: r.left + (p.x + 1) / 2 * r.width, py: r.top + (1 - p.y) / 2 * r.height }; });
  if (secenek.hasTouch) await sayfa.touchscreen.tap(bk.px, bk.py); else await sayfa.mouse.click(bk.px, bk.py);
  kontrol(`${ad}: bina seçilince bilgi kartı açılır`, (await sayfa.locator('.pencere.kart h3').count()) === 1);

  // kaydırma (tek parmak sürükle) ve çimdik (iki parmak) — PointerEvent ile; masaüstünde ayrıca fare tekerleği
  const olaylar = (dizi) => sayfa.evaluate((dz) => {
    const c = window.__oyun.sahne.canvas;
    for (const [tip, id, x, y] of dz) c.dispatchEvent(new PointerEvent(tip, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }));
  }, dizi);
  const h0 = await sayfa.evaluate(() => window.__oyun.sahne.hedef.toArray());
  await olaylar([['pointerdown', 1, kutu.x + 200, kutu.y + 150], ['pointermove', 1, kutu.x + 170, kutu.y + 140], ['pointermove', 1, kutu.x + 120, kutu.y + 120], ['pointerup', 1, kutu.x + 120, kutu.y + 120]]);
  const h1 = await sayfa.evaluate(() => window.__oyun.sahne.hedef.toArray());
  kontrol(`${ad}: tek parmak sürükleme kamerayı kaydırır`, Math.hypot(h1[0] - h0[0], h1[2] - h0[2]) > 0.5);
  const z0 = await sayfa.evaluate(() => window.__oyun.sahne.kamera.zoom);
  const cx = kutu.x + 300, cy = kutu.y + 150;
  await olaylar([['pointerdown', 1, cx - 30, cy], ['pointerdown', 2, cx + 30, cy], ['pointermove', 2, cx + 60, cy], ['pointermove', 2, cx + 90, cy], ['pointerup', 2, cx + 90, cy], ['pointerup', 1, cx - 30, cy]]);
  const z1 = await sayfa.evaluate(() => window.__oyun.sahne.kamera.zoom);
  kontrol(`${ad}: iki parmak çimdik yakınlaştırır`, z1 > z0 * 1.3, `${z0.toFixed(2)} → ${z1.toFixed(2)}`);
  if (!secenek.hasTouch) {
    await sayfa.mouse.move(kutu.x + 200, kutu.y + 150); await sayfa.mouse.wheel(0, -300);
    const z2 = await sayfa.evaluate(() => window.__oyun.sahne.kamera.zoom);
    kontrol(`${ad}: fare tekerleği yakınlaştırır`, z2 > z1, `${z1.toFixed(2)} → ${z2.toFixed(2)}`);
  }

  // günü bitir
  await sayfa.evaluate(() => window.__oyun.arayuz.secimiKaldir());
  await tikla('Günü bitir');
  const d2 = await durum();
  kontrol(`${ad}: "Günü bitir" turu ilerletir`, d2.tur > d1.tur, `tur=${d2.tur}`);

  // olay çıkana dek mevsim sonuna ilerlet
  let olayGordu = false;
  for (let i = 0; i < 14 && !olayGordu; i++) {
    const d = await durum();
    if (d.olay) { olayGordu = true; break; }
    await tikla('Mevsim sonuna');
  }
  const olayVar = (await durum()).olay;
  kontrol(`${ad}: olay penceresi çıktı`, olayVar || olayGordu);
  if (olayVar) {
    await sayfa.waitForSelector('.modal .secenekler button');
    const kilit = await sayfa.locator('.alt .buyuk').first().isDisabled();
    kontrol(`${ad}: olay varken Günü bitir kilitli`, kilit || (await sayfa.locator('.perde').count()) > 0);
    if (ekranGoruntusu) await sayfa.screenshot({ path: `${EKRAN}/${ekranGoruntusu}-olay.png` });
    const dugmeler = sayfa.locator('.modal .secenekler button:not([disabled])');
    await dugmeler.first().click();
    kontrol(`${ad}: olay çözüldü`, !(await durum()).olay);
  }

  // kayıt ve yenileme
  await tikla('Günü bitir');
  const onceki = await durum();
  await sayfa.reload();
  await sayfa.waitForSelector('.menu');
  await tikla('Devam');
  await sayfa.waitForSelector('.ust .chip');
  const sonra = await durum();
  kontrol(`${ad}: yenileyince kayıttan devam eder`, sonra && sonra.tur === onceki.tur && sonra.bina === onceki.bina, `tur ${onceki.tur} → ${sonra?.tur}`);
  kontrol(`${ad}: konsol hatası yok`, hatalar.length === 0, hatalar.slice(0, 3).join(' | '));
  await ctx.close();
}

let cikis = 0;
try {
  await bekle();
  const tarayici = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  await senaryo(tarayici, 'telefon 844×390', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }, 'telefon');
  await senaryo(tarayici, 'masaüstü 1280×720', { viewport: { width: 1280, height: 720 } }, 'masaustu');
  await tarayici.close();
} catch (e) {
  console.error('HATA:', e);
  cikis = 1;
} finally { sunucu.kill(); }
const kalan = sonuclar.filter((s) => !s.ok).length;
console.log(`\n${sonuclar.length - kalan}/${sonuclar.length} kontrol geçti`);
process.exit(cikis || (kalan ? 1 : 0));
