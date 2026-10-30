// Mimari motor karşılaştırması (gerçek oyun sahnesi, varsayılan stil BD): aynı Orta Çağ köyü, ?mimari yok (eski) ve ?mimari=yeni.
// Kullanım: npm run build && node tests/e2e/mimari.mjs   (MIMARI_CIKTI=klasör; varsayılan docs/ekran). Playwright global kurulu olmalı.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { botTuru } from '../yardimci/bot.js';
import { yeniOyun } from '../../src/core/oyun_durumu.js';
import { uygunYerler } from '../../src/world/yerlestir.js';
import { merkezNokta } from '../../src/world/harita.js';
import { kesfet } from '../../src/world/kesif.js';

const gerek = createRequire(import.meta.url);
let playwright;
try { playwright = gerek('playwright'); } catch { playwright = gerek(`${process.env.PLAYWRIGHT_DIR || '/node-tools/node_modules'}/playwright`); }
const { chromium } = playwright;
const PORT = 4176, URL = `http://localhost:${PORT}/`, CIKTI = process.env.MIMARI_CIKTI || 'docs/ekran';
mkdirSync(CIKTI, { recursive: true });

let OZEL = {};
function koy() {
  let d = yeniOyun(7);
  while (d.cag !== 'tasdevri' || d.binalar.length < 10) d = botTuru(d).durum;
  d = JSON.parse(JSON.stringify(d));
  d.cag = 'ortacag';
  const m = d.binalar.find((b) => b.id === 'ocak_meydani');
  if (m) m.id = 'sehir_meydani';
  let uid = 1 + Math.max(...d.binalar.map((b) => +String(b.uid).replace(/\D/g, '') || 0));
  const ornek = d.binalar[0].uid;
  const yeniUid = () => (typeof ornek === 'number' ? uid++ : `b${uid++}`);
  for (const b of d.binalar) if (b.id === 'cadir' || b.id === 'kulube') b.id = 'yari_ahsap_ev';
  const ozel = {};
  for (const id of ['katedral', 'degirmen']) {
    const yer = uygunYerler(d, id)[0];
    if (yer) { d.binalar.push({ uid: yeniUid(), id, x: yer[0], y: yer[1], seviye: 1, insaKalan: 0, hasarli: false }); ozel[id] = yer; }
  }
  OZEL = ozel;
  for (const id of ['pazar_yeri', 'yari_ahsap_ev', 'kuyu', 'yari_ahsap_ev', 'ambar', 'yari_ahsap_ev', 'yari_ahsap_ev', 'yari_ahsap_ev', 'yari_ahsap_ev', 'yari_ahsap_ev']) {
    const yer = uygunYerler(d, id)[0];
    if (yer) d.binalar.push({ uid: yeniUid(), id, x: yer[0], y: yer[1], seviye: 1, insaKalan: 0, hasarli: false });
  }
  d.binalar.forEach((b, i) => { if (b.id === 'yari_ahsap_ev' && i % 4 === 0) b.seviye = 2; });
  d.insaatSirasi = []; d.olay = { ...d.olay, aktif: null }; d.tur = 26;
  return d;
}
const durum = koy();
const ozel = OZEL;
const merkez = merkezNokta(durum);
const durumG = kesfet(durum, merkez, 14).durum;
const sunucu = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const bekle = async () => { for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) return; } catch { /* bekle */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('sunucu açılmadı'); };
const YAKIN = { uzak: 1.6, orta: 2.6, yakin: 3.4 };
try {
  await bekle();
  const tarayici = await chromium.launch();
  for (const mod of (process.env.MIMARI_MOD || 'eski,yeni').split(',')) {
    const ctx = await tarayici.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 });
    const sayfa = await ctx.newPage();
    const hatalar = [];
    sayfa.on('pageerror', (e) => hatalar.push(String(e)));
    await sayfa.goto(mod === 'yeni' ? `${URL}?mimari=yeni` : URL);
    await sayfa.waitForSelector('.menu');
    await sayfa.addStyleTag({ content: '#arayuz{display:none!important}' });
    await sayfa.evaluate((d) => { const { oyun, arayuz, sahne } = window.__oyun; arayuz.menuAcik = false; oyun.ata(d); sahne.guncelle(d); }, durumG);
    for (const [ad, z] of Object.entries(YAKIN)) {
      await sayfa.evaluate(({ z, m, ad }) => { const s = window.__oyun.sahne; s.kamera.zoom = z; s.kamera.updateProjectionMatrix(); s.odakla(m.x + (ad === 'uzak' ? 1 : 0.5), m.y + (ad === 'uzak' ? 1 : 0.5)); }, { z, m: merkez, ad });
      await sayfa.waitForTimeout(2200);
      const yol = `${CIKTI}/mimari-${mod}-${ad}.png`;
      await sayfa.screenshot({ path: yol });
      const bilgi = await sayfa.evaluate(() => { const i = window.__oyun.sahne.stil?.bilgi || window.__oyun.sahne.renderer.info.render; return `${i.cagri ?? i.calls} çağrı, ${(((i.ucgen ?? i.triangles)) / 1000).toFixed(0)} bin üçgen`; });
      console.log(`${yol}  [${bilgi}]${hatalar.length ? ' HATA: ' + hatalar[0] : ''}`);
    }
    // yapı odaklı kareler (katedral/değirmen): zoom 2.6, yapının ortasına
    for (const [id, yer] of Object.entries(ozel)) {
      const bs = id === 'katedral' ? 3 : 2;
      await sayfa.evaluate(({ z, x, y }) => { const s = window.__oyun.sahne; s.kamera.zoom = z; s.kamera.updateProjectionMatrix(); s.odakla(x, y); }, { z: id === 'katedral' ? 2.2 : 3.0, x: yer[0] + bs / 2, y: yer[1] + bs / 2 });
      await sayfa.waitForTimeout(2200);
      const yol = `${CIKTI}/mimari-${mod}-${id}.png`;
      await sayfa.screenshot({ path: yol });
      console.log(`${yol}${hatalar.length ? ' HATA: ' + hatalar[0] : ''}`);
    }
    await ctx.close();
  }
  await tarayici.close();
} finally { sunucu.kill(); }
