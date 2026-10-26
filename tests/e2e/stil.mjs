// Görsel stil adayları için ekran görüntüsü (Playwright, global kurulu; `npm run build` sonrası).
// Aynı köy durumu (bot + Bronz Çağı binaları, yaz) aynı kamerayla `?stil=a|b|c` ile iki yakınlıkta çekilir.
// Kullanım: npm run build && node tests/e2e/stil.mjs   (STIL_CIKTI=klasör ile başka yere yazılabilir; ?stil'siz kare: STIL_TABAN=1)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { botTuru } from '../yardimci/bot.js';
import { yeniOyun } from '../../src/core/oyun_durumu.js';
import { uygunYerler } from '../../src/world/yerlestir.js';
import { merkezNokta } from '../../src/world/harita.js';

const gerek = createRequire(import.meta.url);
let playwright;
try { playwright = gerek('playwright'); } catch { playwright = gerek(`${process.env.PLAYWRIGHT_DIR || '/node-tools/node_modules'}/playwright`); }
const { chromium } = playwright;

const PORT = 4174, URL = `http://localhost:${PORT}/`, CIKTI = process.env.STIL_CIKTI || 'docs/ekran';
mkdirSync(CIKTI, { recursive: true });

// ---------- köy durumu (deterministik) ----------
function koyDurumu() {
  let d = yeniOyun(7);
  while (d.cag !== 'tasdevri' || d.binalar.length < 10) d = botTuru(d).durum;
  d = JSON.parse(JSON.stringify(d));
  d.cag = 'bronz';
  const m = d.binalar.find((b) => b.id === 'ocak_meydani');
  if (m) m.id = 'koy_meydani';
  let uid = 1 + Math.max(...d.binalar.map((b) => +String(b.uid).replace(/\D/g, '') || 0));
  const ornek = d.binalar[0].uid;
  const yeniUid = () => (typeof ornek === 'number' ? uid++ : `b${uid++}`);
  d.binalar.forEach((b, i) => { if (b.id === 'cadir' && i % 2) b.id = 'kerpic_ev'; });
  const liste = ['mabet', 'pazar_yeri', 'kerpic_ev', 'kuyu', 'demirci', 'eritme_firini', 'kerpic_ev', 'ambar', 'kil_ocagi',
    'muhafiz_kulesi', 'kerpic_ev', 'sulanan_tarla', 'kerpic_ev'];
  for (const id of liste) {
    const yer = uygunYerler(d, id)[0];
    if (yer) d.binalar.push({ uid: yeniUid(), id, x: yer[0], y: yer[1], seviye: id === 'kerpic_ev' ? 2 : 1, insaKalan: 0, hasarli: false });
  }
  d.insaatSirasi = [];
  d.olay = { ...d.olay, aktif: null };
  d.tur = 26; // yaz
  return d;
}

const durum = koyDurumu();
const merkez = merkezNokta(durum);
const sunucu = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const bekle = async () => { for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) return; } catch { /* bekle */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('sunucu açılmadı'); };

const YAKINLIK = { orta: 1.9, yakin: 3.4 };
let cikis = 0;
try {
  await bekle();
  const tarayici = await chromium.launch();
  const stiller = process.env.STIL_LISTE ? process.env.STIL_LISTE.split(',') : ['a', 'b', 'c'];
  if (process.env.STIL_TABAN === '1') stiller.unshift('');
  for (const s of stiller) {
    const ctx = await tarayici.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    const sayfa = await ctx.newPage();
    const hatalar = [];
    sayfa.on('pageerror', (e) => hatalar.push(String(e)));
    sayfa.on('console', (m) => { if (m.type() === 'error') hatalar.push(m.text()); });
    await sayfa.goto(s ? `${URL}?stil=${s}` : URL);
    await sayfa.waitForSelector('.menu');
    await sayfa.addStyleTag({ content: '#arayuz{display:none!important}' });
    await sayfa.evaluate((d) => {
      const { oyun, arayuz, sahne } = window.__oyun;
      arayuz.menuAcik = false;
      oyun.ata(d);
      sahne.guncelle(d);
    }, durum);
    for (const [ad, z] of Object.entries(YAKINLIK)) {
      await sayfa.evaluate(({ z, m, ad }) => {
        const s = window.__oyun.sahne;
        s.kamera.zoom = z; s.kamera.updateProjectionMatrix();
        s.odakla(m.x + (ad === 'yakin' ? 0.5 : 0.5), m.y + (ad === 'yakin' ? 0.5 : 0));
      }, { z, m: merkez, ad });
      await sayfa.waitForTimeout(1800);
      const yol = `${CIKTI}/stil-${s || 'taban'}-${ad}.png`;
      await sayfa.screenshot({ path: yol });
      const ms = await sayfa.evaluate(() => { const k = window.__oyun.sahne.kareSureleri.slice(-10); return k.reduce((a, b) => a + b, 0) / Math.max(1, k.length); });
      console.log(`${yol}  (~${ms.toFixed(0)} ms/kare SwiftShader)`);
    }
    if (hatalar.length) { console.log(`stil ${s}: hata`, hatalar.slice(0, 3).join(' | ')); cikis = 1; }
    await ctx.close();
  }
  await tarayici.close();
} catch (e) {
  console.error('HATA:', e);
  cikis = 1;
} finally { sunucu.kill(); }
process.exit(cikis);
