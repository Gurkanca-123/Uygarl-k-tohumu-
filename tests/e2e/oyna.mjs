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
    if (!acik) await sayfa.locator(`.sekmeler button[data-sekme="${id}"]`).click();
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
  {
    const st = await sayfa.evaluate(() => { const S = window.__oyun.sahne; return { kip: S.stil?.kip || null, kalite: S.kalite }; });
    kontrol(`${ad}: varsayılan görünüm bd stili, kalite ayarı sahneye uygulandı`, st.kip === 'bd' && st.kalite === 'yuksek', JSON.stringify(st));
    const k0 = await sayfa.evaluate(() => window.__oyun.oyun.durum.kaynaklar);
    kontrol(`${ad}: ilk gün kaynakları ilk Çadır'a yeter (odun ${k0.odun}, deri ${k0.deri})`, k0.odun >= 6 && k0.deri >= 2);
    const ip = await sayfa.locator('.ipucu').innerText();
    kontrol(`${ad}: öğretici 1. adımla başlar`, ip.includes('1/5'));
    // Ayarlar'dan kalite değişince hemen uygulanır
    await sayfa.evaluate(() => { const a = window.__oyun.arayuz; a.ayar = { ...a.ayar, kalite: 'performans' }; a.kaliteUygula(); });
    const kp = await sayfa.evaluate(() => window.__oyun.sahne.stil.mat.uniforms.uAO.value);
    kontrol(`${ad}: kalite 'performans' → AO kapandı`, kp === 0);
    await sayfa.evaluate(() => { const a = window.__oyun.arayuz; a.ayar = { ...a.ayar, kalite: 'yuksek' }; a.kaliteUygula(); });
  }
  const harita = await sayfa.evaluate(() => { const m = window.__oyun.sahne.harita.mesh; return { cimen: m.cimen?.count || 0, sis: m.sis?.count || 0 }; });
  kontrol(`${ad}: harita çizildi (çimen ${harita.cimen}, sis ${harita.sis})`, harita.cimen > 20 && harita.sis > 3000);
  await sayfa.waitForTimeout(400);

  // iş ata: toplayıcıdan 1 kişiyi oduncuya
  await sekmeAc('İş', 'is');
  await sayfa.locator('.oge', { hasText: 'Toplayıcı' }).first().locator('button', { hasText: '−' }).click();
  await sayfa.locator('.oge', { hasText: 'Oduncu' }).first().locator('button', { hasText: '+' }).click();
  const atama = await sayfa.evaluate(() => window.__oyun.oyun.durum.atama);
  kontrol(`${ad}: iş atandı`, atama['serbest:oduncu'] === 1, JSON.stringify(atama));
  kontrol(`${ad}: öğretici işçi atanınca 2. adıma geçti`, (await sayfa.locator('.ipucu').innerText()).includes('2/5'));

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

  // bina kartında işçi −/+ ve haritada işçi rozeti (Çadır geçici olarak işçi yuvalı Oduncu Kampı'na çevrilir, sonda geri alınır)
  {
    const yedek = await sayfa.evaluate(() => {
      const o = window.__oyun, d = o.oyun.durum, b = d.binalar[2];
      const y = { uid: b.uid, id: b.id, atama: { ...d.atama }, sira: [...d.insaatSirasi] };
      b.id = 'oduncu_kampi'; d.atama = {}; d.insaatSirasi = d.insaatSirasi.filter((x) => x !== b.uid); o.arayuz.secimiKaldir(); o.arayuz.yenile();
      return y;
    });
    const uid = yedek.uid;
    const atamaN = () => sayfa.evaluate((u) => window.__oyun.oyun.durum.atama[u] || 0, uid);
    const dokun = (loc) => (secenek.hasTouch ? loc.tap() : loc.click());
    await sayfa.waitForTimeout(120);
    const rz = sayfa.locator('.rozet');
    kontrol(`${ad}: seçili olmayan binada işçi rozeti yok (harita kalabalıklaşmaz)`, (await rz.count()) === 0);
    const sec = () => sayfa.evaluate((u) => window.__oyun.arayuz.binaSec(u), uid);
    await sec(); await sayfa.waitForSelector('.rozet');
    kontrol(`${ad}: seçili binada işçi rozeti görünür (boşsa soluk)`, (await rz.count()) === 1 && await rz.isVisible() && (await rz.getAttribute('class')).includes('bos') && (await rz.innerText()).includes('0/2'));
    const konum = await sayfa.evaluate((u) => {
      const o = window.__oyun, b = o.oyun.durum.binalar.find((x) => x.uid === u), c = o.sahne.canvas.getBoundingClientRect();
      const p = o.sahne.ekranNokta(b.x + 0.5, 2.6, b.y + 0.5), r = document.querySelector('.rozet').getBoundingClientRect();
      return { dx: Math.abs(r.left + r.width / 2 - (c.left + p.x)), dy: Math.abs(r.bottom - (c.top + p.y)) };
    }, uid);
    kontrol(`${ad}: rozet bina ekran konumuna oturur`, konum.dx < 3 && konum.dy < 3, JSON.stringify(konum));
    if (process.env.IS_EKRAN === '1' && secenek.hasTouch) await sayfa.screenshot({ path: `${EKRAN}/is-rozet.png` });
    await dokun(rz);
    await sayfa.waitForSelector('.pencere.kart .is-blok');
    kontrol(`${ad}: seçili binada bina kartı açık`, await sayfa.evaluate((u) => window.__oyun.arayuz.secim?.uid === u, uid));
    if (process.env.IS_EKRAN === '1' && secenek.hasTouch) {
      await sayfa.screenshot({ path: `${EKRAN}/is-karti.png` });
    }
    const kutuD = await sayfa.locator('.is-d.artir').boundingBox();
    kontrol(`${ad}: kartta −/+ düğmeleri dokunulur ama aşırı büyük değil (40–44px)`, kutuD.width >= 40 && kutuD.height >= 40 && kutuD.width <= 44 && kutuD.height <= 44, `${kutuD.width}×${kutuD.height}`);
    await dokun(sayfa.locator('.is-d.artir')); await dokun(sayfa.locator('.is-d.artir'));
    kontrol(`${ad}: kartta + ile işçi 2/2'ye çıkar, yuva dolunca + kapanır`, (await atamaN()) === 2 && await sayfa.locator('.is-d.artir').isDisabled());
    kontrol(`${ad}: rozet 2/2 gösterir`, (await sayfa.locator('.rozet').innerText()).includes('2/2'));
    await dokun(sayfa.locator('.is-d.azalt'));
    kontrol(`${ad}: kartta − ile işçi azalır`, (await atamaN()) === 1);
    await dokun(sayfa.locator('.is-hizli [data-is="bosalt"]'));
    const bos0 = await atamaN();
    await dokun(sayfa.locator('.is-hizli [data-is="doldur"]'));
    kontrol(`${ad}: Boşalt / Tümünü doldur çalışır`, bos0 === 0 && (await atamaN()) === 2);
    kontrol(`${ad}: kartta tahmini üretim yazar`, (await sayfa.locator('.is-uretim').innerText()).includes('/gün'));
    // sekme ile senkron
    await sekmeAc('İş', 'is');
    const sekmeN = await sayfa.locator('.oge.is-satir', { hasText: 'Oduncu Kampı' }).first().locator('.sayac b').innerText();
    kontrol(`${ad}: İş sekmesi kartla senkron (${sekmeN.replace(/\s+/g, '')})`, sekmeN.trim().startsWith('2'));
    await sayfa.locator('.oge.is-satir', { hasText: 'Oduncu Kampı' }).first().locator('button', { hasText: '−' }).click();
    await sayfa.evaluate(() => { const a = window.__oyun.arayuz; a.pencereKapat(); a.secimiKaldir(); });
    await sayfa.waitForTimeout(300);
    await sec();
    await sayfa.waitForSelector('.pencere.kart .is-blok');
    kontrol(`${ad}: sekmeden azaltınca kart/rozet güncellenir`, (await sayfa.locator('.is-sayi b').innerText()).trim() === '1' && (await sayfa.locator('.rozet').innerText()).includes('1/2'));
    // seçim kalkınca rozet de kalkar
    await sayfa.evaluate(() => window.__oyun.arayuz.secimiKaldir());
    await sayfa.waitForTimeout(250);
    kontrol(`${ad}: seçim kalkınca rozet kalkar`, (await sayfa.locator('.rozet').count()) === 0);
    await sayfa.evaluate((y) => {
      const o = window.__oyun, d = o.oyun.durum; d.binalar[2].id = y.id; d.atama = y.atama; d.insaatSirasi = y.sira; o.arayuz.pencere = 'kapali'; o.arayuz.secimiKaldir(); o.arayuz.yenile();
    }, yedek);
  }

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

// Pencere yerleşimi: görünen pencere viewport içinde, alt şeridi/üst çubuğu örtmez, boyut sınırlarına uyar; kart içindeki düğmeler kesilmez.
async function yerlesimKontrol(sayfa, ad, tur, sinirH = 0.5, kesKontrol = true) {
  await sayfa.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => 0)))); // giriş animasyonu bitsin
  const r = await sayfa.evaluate((tur) => {
    const W = innerWidth, H = innerHeight, sor = (q) => document.querySelector(q);
    const el = tur === 'sekme' ? sor('.pencere.sag.acik') : sor('.pencere.kart');
    if (!el) return { yok: true };
    const b = el.getBoundingClientRect(), alt = sor('.alt').getBoundingClientRect(), ust = sor('.ust').getBoundingClientRect();
    const kes = [];
    if (tur === 'kart') {
      for (const d of el.querySelectorAll('button')) {
        const q = d.getBoundingClientRect();
        if (q.width && (q.left < b.left - 1 || q.right > b.right + 1 || q.top < b.top - 1 || q.bottom > b.bottom + 1)) kes.push(d.textContent.trim() || d.className);
      }
    }
    const kayan = el.querySelector('.govde'); // üstteki düğmelere ulaşmak için kaydırma gerekmesin: gövde taşmıyor ya da yalnız altbilgi (sticky) var
    return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height, W, H, altUst: alt.top, ustAlt: ust.bottom, kes,
      tasma: kayan ? kayan.scrollHeight - kayan.clientHeight : 0, yatayTasma: document.documentElement.scrollWidth > W };
  }, tur);
  if (r.yok) { kontrol(`${ad}: ${tur} penceresi bulunamadı`, false); return; }
  const icinde = r.l >= -1 && r.t >= -1 && r.r <= r.W + 1 && r.b <= r.H + 1;
  const orter = r.b > r.altUst + 1 || r.t < r.ustAlt - 1;
  kontrol(`${ad}: ${tur} penceresi viewport içinde ve alt şeridi/üst çubuğu örtmez`, icinde && !orter && !r.yatayTasma, JSON.stringify({ t: Math.round(r.t), b: Math.round(r.b), altUst: Math.round(r.altUst), ustAlt: Math.round(r.ustAlt) }));
  const sinir = tur === 'sekme' ? [0.38, 0.62] : [0.32, sinirH];
  kontrol(`${ad}: ${tur} penceresi boyut sınırında (${Math.round(r.w)}×${Math.round(r.h)} / ${r.W}×${r.H})`, r.w <= r.W * sinir[0] + 1 && r.h <= r.H * sinir[1] + 1);
  if (tur === 'kart' && kesKontrol) kontrol(`${ad}: kart düğmeleri kesilmez${r.kes.length ? ` (${r.kes.join(',')})` : ''}`, r.kes.length === 0);
}

// Üç ölçüde pencere yerleşimi (İş, İnşa, bina kartı, çimen kartı). EKRAN_YAZ=1 ise docs/ekran/ui2-*.png yazar (görünüm başına İş + bina kartı = en çok 6).
async function yerlesimSenaryosu(tarayici, ad, vp, dpr, ekranAd) {
  console.log(`\n== ${ad} ==`);
  const ctx = await tarayici.newContext({ viewport: vp, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
  const sayfa = await ctx.newPage();
  const hatalar = [];
  sayfa.on('pageerror', (e) => hatalar.push(String(e)));
  await sayfa.goto(URL);
  await sayfa.waitForSelector('.menu');
  await sayfa.evaluate(() => localStorage.clear());
  await sayfa.locator('button', { hasText: 'Yeni Oyun' }).first().click();
  await sayfa.waitForSelector('.ust .chip');
  await sayfa.waitForTimeout(500);
  const yaz = process.env.EKRAN_YAZ === '1' && ekranAd;
  const goruntu = (n) => yaz && ['is', 'bina'].includes(n) && sayfa.screenshot({ path: `${EKRAN}/ui2-${ekranAd}-${n}.png` });
  const sekme = async (id) => { await sayfa.evaluate((i) => { const a = window.__oyun.arayuz; a.secimiKaldir(); a.sekme = i; a.pencere = 'acik'; a.yenile(); }, id); await sayfa.waitForSelector('.pencere.sag.acik'); await sayfa.waitForTimeout(350); };
  await sekme('is'); await yerlesimKontrol(sayfa, ad, 'sekme'); await goruntu('is');
  await sekme('insa'); await yerlesimKontrol(sayfa, ad, 'sekme'); await goruntu('insa');
  // bina kartı: işçi yuvalı bina (Oduncu Kampı olarak geçici çevrilir) ve çimen karosu
  await sayfa.evaluate(() => {
    const o = window.__oyun, d = o.oyun.durum, b = d.binalar[1];
    o.arayuz.pencereKapat(); b.id = 'oduncu_kampi'; d.atama = {}; o.arayuz.binaSec(b.uid);
  });
  await sayfa.waitForSelector('.pencere.kart .is-blok'); await sayfa.waitForTimeout(350);
  await yerlesimKontrol(sayfa, ad, 'kart'); await goruntu('bina');
  await sayfa.evaluate(() => {
    const o = window.__oyun, d = o.oyun.durum;
    const m = o.arayuz; const b = d.binalar[1];
    m.secim = { tip: 'hucre', x: b.x + 3, y: b.y + 3 }; m.kartKucuk = false; m.yenile();
  });
  await sayfa.waitForTimeout(350);
  await yerlesimKontrol(sayfa, ad, 'kart'); await goruntu('cimen');
  kontrol(`${ad}: yatay taşma / konsol hatası yok`, hatalar.length === 0, hatalar.slice(0, 2).join(' | '));
  await ctx.close();
}

// Tehdit penceresi: çağa göre seçenekler (Elçi/Nöbet/Tahkimat/Silah/Haraç), kuşatma karar penceresi, viewport yerleşimi. Durum window.__oyun ile hazırlanır.
// EKRAN_YAZ=1 ise docs/ekran/tehdit-<ad>.png yazar (en çok 3 görüntü).
async function tehditSenaryosu(tarayici, ad, vp, dpr, ekranAd) {
  console.log(`\n== ${ad} ==`);
  const ctx = await tarayici.newContext({ viewport: vp, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
  const sayfa = await ctx.newPage();
  const hatalar = [];
  sayfa.on('pageerror', (e) => hatalar.push(String(e)));
  sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
  await sayfa.goto(URL);
  await sayfa.waitForSelector('.menu');
  await sayfa.evaluate(() => localStorage.clear());
  await sayfa.locator('button', { hasText: 'Yeni Oyun' }).first().click();
  await sayfa.waitForSelector('.ust .chip');
  await sayfa.waitForTimeout(400);
  const yaz = process.env.EKRAN_YAZ === '1' && ekranAd;
  const hazirla = (cfg) => sayfa.evaluate((c) => {
    const o = window.__oyun, d = o.oyun.durum;
    d.cag = c.cag; d.nufus = 8; d.olay.aktif = null; d.onder = { ...d.onder, eylem: 'dinlen', secim: null };
    Object.assign(d.kaynaklar, { yiyecek: 200, alet: 20, metal: 20, sikke: 60, odun: 40, tas: 30 });
    d.tehdit.aktif = { id: c.id, guc: c.guc, aralik: [c.guc, c.guc], kalan: c.kalan, tavir: 'savun', bilinen: true, erteleme: 0, tahkimat: false,
      evre: c.evre || 'uyari', karar: !!c.karar, elciDenendi: false, silah: 0 };
    o.arayuz.tehditAcik = false; o.arayuz.sonTehditId = undefined; o.arayuz.secim = null; o.arayuz.pencere = 'kapali';
    o.arayuz.yenile();
  }, cfg);
  const tAktif = () => sayfa.evaluate(() => window.__oyun.oyun.durum.tehdit.aktif);
  const hataToast = () => sayfa.locator('.toast.hata').count();
  await sayfa.waitForTimeout(200);

  // 1) Taş Devri: komşu baskını → pencere kendiliğinden açılır, Elçi düğmesi hata vermez
  await hazirla({ cag: 'tasdevri', id: 'komsu_baskini', guc: 7, kalan: 3 });
  await sayfa.waitForSelector('.tehdit-pencere .t-grid', { timeout: 20000 });
  kontrol(`${ad}: yeni tehdit varken pencere kendiliğinden açılır`, await sayfa.locator('.tehdit-pencere').count() === 1);
  const baslik = await sayfa.locator('.tehdit-pencere h3').innerText();
  kontrol(`${ad}: pencere başlığı çağa göre tehdit adını gösterir (${baslik})`, /Komşu/.test(baslik));
  const chip = await sayfa.locator('.chip.tehdit').innerText();
  kontrol(`${ad}: üst çubuk çipi kalan günü gösterir (${chip.replace(/\s+/g, ' ')})`, /3/.test(chip));
  await yerlesimKontrol(sayfa, ad, 'kart', 0.67, false); // alttaki savunma/çevre bölümleri kaydırılabilir; eylem düğmeleri ayrıca denetlenir
  const sigar = await sayfa.evaluate(() => { const g = document.querySelector('.tehdit-pencere .govde'), son = document.querySelector('.tehdit-pencere .t-silah') || document.querySelector('.tehdit-pencere .t-grid'); const a = g.getBoundingClientRect(), b = son.getBoundingClientRect(); return { alt: b.bottom - a.bottom, sol: Math.max(0, g.scrollWidth - g.clientWidth) }; });
  kontrol(`${ad}: eylem düğmeleri kaydırma gerektirmeden görünür`, sigar.alt <= 1 && sigar.sol === 0, JSON.stringify(sigar));
  if (yaz) await sayfa.screenshot({ path: `${EKRAN}/tehdit-${ekranAd}-uyari.png` });
  const elci = sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Elçi' });
  kontrol(`${ad}: Elçi düğmesi başarı yüzdesini gösterir`, /%\d+/.test(await elci.innerText()));
  await elci.click();
  await sayfa.waitForTimeout(150);
  kontrol(`${ad}: Elçi seçimi "Geçersiz tavır" hatası vermez, önder eylemi elci_gonder olur`, (await hataToast()) === 0 && await sayfa.evaluate(() => window.__oyun.oyun.durum.onder.eylem === 'elci_gonder'));
  kontrol(`${ad}: seçili Elçi düğmesi işaretlenir`, (await sayfa.locator('.tehdit-pencere .t-d.secili', { hasText: 'Elçi' }).count()) === 1);
  const nobet = sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Nöbet' });
  await nobet.click(); await sayfa.waitForTimeout(120);
  kontrol(`${ad}: Nöbet Tut önder eylemini nobet_tut yapar`, (await hataToast()) === 0 && await sayfa.evaluate(() => window.__oyun.oyun.durum.onder.eylem === 'nobet_tut'));
  // tavır (Saklan) hâlâ tavır komutu
  await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Saklan' }).click(); await sayfa.waitForTimeout(120);
  kontrol(`${ad}: Saklan tavır olarak seçilir`, (await tAktif()).tavir === 'saklan' && (await hataToast()) === 0);
  await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Savun' }).first().click(); await sayfa.waitForTimeout(120);
  // Silah Dağıt: − / + ve dağıt
  const alet0 = await sayfa.evaluate(() => window.__oyun.oyun.durum.kaynaklar.alet);
  await sayfa.locator('.tehdit-pencere .t-pm', { hasText: '+' }).click(); await sayfa.waitForTimeout(100);
  const onizleme = await sayfa.locator('.tehdit-pencere .t-dagit small').innerText();
  kontrol(`${ad}: Silah önizlemesi maliyet ve +savunma yazar (${onizleme})`, /4.*\+2/.test(onizleme));
  await sayfa.locator('.tehdit-pencere .t-dagit').click(); await sayfa.waitForTimeout(150);
  const sv = await tAktif();
  const alet1 = await sayfa.evaluate(() => window.__oyun.oyun.durum.kaynaklar.alet);
  kontrol(`${ad}: Silah Dağıt çalışır (2 silah, ${alet0 - alet1} alet)`, sv.silah === 2 && alet0 - alet1 === 4 && (await hataToast()) === 0);
  // Bronz: haraç + tahkimat + silah (metal)
  await hazirla({ cag: 'bronz', id: 'akincilar', guc: 6, kalan: 2 });
  await sayfa.waitForSelector('.tehdit-pencere .t-grid', { timeout: 20000 });
  const bronzMetin = await sayfa.locator('.tehdit-pencere').innerText();
  kontrol(`${ad}: Bronz'da Haraç, Tahkimat, Nöbet ve Silah satırları var`, /Haraç/.test(bronzMetin) && /Tahkimat/.test(bronzMetin) && /Nöbet/.test(bronzMetin) && /Silah/.test(bronzMetin));
  await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Tahkimat' }).click(); await sayfa.waitForTimeout(150);
  kontrol(`${ad}: Acil Tahkimat uygulanır`, (await tAktif()).tahkimat === true && (await hataToast()) === 0);
  await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Haraç' }).click(); await sayfa.waitForTimeout(150);
  kontrol(`${ad}: Haraç ödenince tehdit biter`, (await tAktif()) === null);

  // 2) Orta Çağ: kuşatma evresi, karar penceresi kendiliğinden açılır
  await hazirla({ cag: 'ortacag', id: 'kusatma', guc: 14, kalan: 3, evre: 'kusatma', karar: true });
  await sayfa.waitForSelector('.tehdit-pencere .t-kus', { timeout: 20000 });
  kontrol(`${ad}: kuşatma kararı varken pencere kendiliğinden açılır`, await sayfa.locator('.tehdit-pencere').count() === 1);
  const kc = await sayfa.locator('.chip.tehdit').innerText();
  kontrol(`${ad}: çip kuşatma evresini ve kalan turu gösterir (${kc.replace(/\s+/g, ' ')})`, /3 tur/.test(kc) && (await sayfa.locator('.chip.tehdit.kusatma.karar').count()) === 1);
  kontrol(`${ad}: aşınma çubuğu ve iki karar düğmesi var`, (await sayfa.locator('.tehdit-pencere .asinma').count()) === 1 && (await sayfa.locator('.tehdit-pencere .t-grid .t-d').count()) === 2);
  await yerlesimKontrol(sayfa, ad, 'kart', 0.67, false); // alttaki savunma/çevre bölümleri kaydırılabilir; eylem düğmeleri ayrıca denetlenir
  const sig2 = await sayfa.evaluate(() => { const g = document.querySelector('.tehdit-pencere .govde'), son = g.querySelector('.t-grid'); return son.getBoundingClientRect().bottom - g.getBoundingClientRect().bottom; });
  kontrol(`${ad}: kuşatma düğmeleri kaydırma gerektirmez`, sig2 <= 1, String(Math.round(sig2)));
  // bildirim: toast + günlük
  await sayfa.evaluate(() => { const o = window.__oyun; const b = [{ kod: 'tehdit_kusatma', seviye: 'uyari', metin: 'Kuşatma sürüyor: ordu 1 güç yitirdi (⚔ 13); 2 tur kaldı.' }]; o.oyun.bildirimEkle(b, 3); o.oyun.yay('bildirim', b); });
  await sayfa.waitForTimeout(150);
  kontrol(`${ad}: tehdit_kusatma bildirimi toast olarak görünür`, (await sayfa.locator('.toast', { hasText: 'Kuşatma sürüyor' }).count()) === 1);
  kontrol(`${ad}: tehdit_kusatma bildirimi günlükte kayıtlı`, await sayfa.evaluate(() => window.__oyun.oyun.gecmis.some((g) => g.kod === 'tehdit_kusatma')));
  if (yaz && ekranAd === 'p1000') await sayfa.screenshot({ path: `${EKRAN}/tehdit-${ekranAd}-kusatma.png` }); // toplam 3 görüntü
  await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Dayan' }).click(); await sayfa.waitForTimeout(150);
  const dk = await tAktif();
  kontrol(`${ad}: Dayan kararı verilir, karar kapanır, kuşatma sürer`, dk && dk.karar === false && dk.evre === 'kusatma' && (await hataToast()) === 0);
  kontrol(`${ad}: karar sonrası Dayan düğmesi devre dışı, Fidye açık`, await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Dayan' }).isDisabled() && !(await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Fidye' }).isDisabled()));
  await sayfa.locator('.tehdit-pencere .t-d', { hasText: 'Fidye' }).click(); await sayfa.waitForTimeout(150);
  kontrol(`${ad}: Fidye kuşatmayı bitirir`, (await tAktif()) === null && (await hataToast()) === 0);
  // kapalı pencere + yeni kuşatma evresi: yeniden açılır
  await hazirla({ cag: 'ortacag', id: 'kusatma', guc: 14, kalan: 3, evre: 'uyari' });
  await sayfa.evaluate(() => { const a = window.__oyun.arayuz; a.tehditAcik = false; a.yenile(); });
  await sayfa.evaluate(() => { const o = window.__oyun, d = o.oyun.durum; d.tehdit.aktif.evre = 'kusatma'; d.tehdit.aktif.karar = true; d.tehdit.aktif.kalan = 3; o.arayuz.yenile(); });
  await sayfa.waitForTimeout(150);
  kontrol(`${ad}: kuşatma evresine geçince kapatılmış pencere yeniden açılır`, await sayfa.locator('.tehdit-pencere .t-kus').count() === 1);
  kontrol(`${ad}: tehdit penceresi konsol hatası vermez`, hatalar.length === 0, hatalar.slice(0, 2).join(' | '));
  await ctx.close();
}

const SADECE = process.env.SADECE === 'tehdit'; // yalnız tehdit senaryoları (hızlı yineleme)
let cikis = 0;
try {
  await bekle();
  const tarayici = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  if (!SADECE) await senaryo(tarayici, 'telefon 844×390', { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }, 'telefon');
  if (!SADECE) await senaryo(tarayici, 'masaüstü 1280×720', { viewport: { width: 1280, height: 720 } }, 'masaustu');
  if (!SADECE) await yerlesimSenaryosu(tarayici, 'yerleşim 1000×450 dpr2', { width: 1000, height: 450 }, 2, 'p1000');
  if (!SADECE) await yerlesimSenaryosu(tarayici, 'yerleşim 844×390', { width: 844, height: 390 }, 1, 'p844');
  if (!SADECE) await yerlesimSenaryosu(tarayici, 'yerleşim 720×360', { width: 720, height: 360 }, 1, 'p720');
  await tehditSenaryosu(tarayici, 'tehdit 1000×450 dpr2', { width: 1000, height: 450 }, 2, 'p1000');
  await tehditSenaryosu(tarayici, 'tehdit 844×390', { width: 844, height: 390 }, 1, 'p844');
  if (!SADECE) { // ?stil=eski: eski düz görünüm (son işleme yok)
    const sayfa = await (await tarayici.newContext({ viewport: { width: 844, height: 390 } })).newPage();
    await sayfa.goto(`${URL}?stil=eski`);
    await sayfa.waitForSelector('.menu');
    kontrol('?stil=eski: son işleme kurulmaz', (await sayfa.evaluate(() => window.__oyun.sahne.stil)) === null);
  }
  await tarayici.close();
} catch (e) {
  console.error('HATA:', e);
  cikis = 1;
} finally { sunucu.kill(); }
const kalan = sonuclar.filter((s) => !s.ok).length;
console.log(`\n${sonuclar.length - kalan}/${sonuclar.length} kontrol geçti`);
process.exit(cikis || (kalan ? 1 : 0));
