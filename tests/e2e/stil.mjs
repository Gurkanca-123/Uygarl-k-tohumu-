// Görsel stil adayları için ekran görüntüsü (Playwright, global kurulu; `npm run build` sonrası).
// Aynı köy durumu (bot + Bronz Çağı binaları, yaz) aynı kamerayla `?stil=a|b|c` ile iki yakınlıkta çekilir
// (`d` = konsept aday, `bd` = yüksek stilize B+D: ayrıca uzak `genis` kare). Varsayılan liste a,b,c; D için: STIL_LISTE=d,
// BD için: STIL_LISTE=bd (ek olarak bina ekleme yeniden kurulum süresi + üç kalitede çağrı/üçgen sayısı yazılır).
// Kullanım: npm run build && node tests/e2e/stil.mjs   (STIL_CIKTI=klasör ile başka yere yazılabilir; ?stil'siz kare: STIL_TABAN=1)
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
// stil d: aynı köy, keşif yarıçapı 28 (göl ve dağlar görünsün; yalnız görüntü düzeneği)
const durumD = kesfet(durum, merkez, 28).durum;
const sunucu = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const bekle = async () => { for (let i = 0; i < 50; i++) { try { if ((await fetch(URL)).ok) return; } catch { /* bekle */ } await new Promise((r) => setTimeout(r, 200)); } throw new Error('sunucu açılmadı'); };

const YAKINLIK = { orta: 1.9, yakin: 3.4 };
const GENIS = 0.75; // yalnız stil d (uzak: arazi/su/dağ)
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
    }, s === 'd' || s === 'bd' ? durumD : durum);
    const yakinliklar = s === 'd' || s === 'bd' || process.env.STIL_GENIS === '1' ? { genis: GENIS, ...YAKINLIK } : { ...YAKINLIK };
    // hata ayıklama: STIL_EK="dx,dy,zoom" → merkeze göre ek kare (stil-<s>-ek.png)
    const ek = process.env.STIL_EK?.split(',').map(Number);
    if (ek) yakinliklar.ek = ek[2];
    for (const [ad, z] of Object.entries(yakinliklar)) {
      await sayfa.evaluate(({ z, m, ad, ek }) => {
        const s = window.__oyun.sahne;
        s.kamera.zoom = z; s.kamera.updateProjectionMatrix();
        if (ad === 'ek') s.odakla(m.x + ek[0], m.y + ek[1]);
        else if (ad === 'genis') s.odakla(m.x - 6, m.y - 6);
        else s.odakla(m.x + (ad === 'yakin' ? 0.5 : 0.5), m.y + (ad === 'yakin' ? 0.5 : 0));
      }, { z, m: merkez, ad, ek });
      await sayfa.waitForTimeout(1800);
      const yol = `${CIKTI}/stil-${s || 'taban'}-${ad}.png`;
      await sayfa.screenshot({ path: yol });
      const ms = await sayfa.evaluate(() => { const k = window.__oyun.sahne.kareSureleri.slice(-10); return k.reduce((a, b) => a + b, 0) / Math.max(1, k.length); });
      const bilgi = await sayfa.evaluate(() => {
        const s = window.__oyun.sahne, i = s.stil?.bilgi || { cagri: s.renderer.info.render.calls, ucgen: s.renderer.info.render.triangles };
        return `${i.cagri} çağrı, ${(i.ucgen / 1000).toFixed(0)} bin üçgen`;
      });
      console.log(`${yol}  (~${ms.toFixed(0)} ms/kare SwiftShader; sahne: ${bilgi})`);
      if (process.env.STIL_SAY === '1') console.log(await sayfa.evaluate(() => {
        const o = {}, S = window.__oyun.sahne; // yalnız görünür + görüş hacmindeki ağlar
        for (const m of (S.stil?.d?.mesh || []).filter((m) => m.visible && S.stil.gorunur(m))) {
          const g = m.geometry, t = (g.index ? g.index.count : g.getAttribute('position').count) / 3, k = m.geometry.uuid.slice(0, 4);
          const ad = `${m.material.customProgramCacheKey?.().slice(0, 14)}|${k}`;
          o[ad] = o[ad] || [0, 0]; o[ad][0] += m.count ?? 1; o[ad][1] += t * (m.count ?? 1);
        }
        return JSON.stringify(Object.fromEntries(Object.entries(o).map(([a, [n, t]]) => [a, `${n} adet ${(t / 1000).toFixed(1)}k`])));
      }));
    }
    if (s === 'bd') {
      // bina ekleme: yalnız etkilenen arazi öbekleri (süre: tik içi yeniden kurulum)
      const yer = uygunYerler(durumD, 'kerpic_ev')[0];
      const d2 = JSON.parse(JSON.stringify(durumD));
      d2.binalar.push({ uid: 'b9999', id: 'kerpic_ev', x: yer[0], y: yer[1], seviye: 1, insaKalan: 0, hasarli: false });
      console.log('bd yeniden kurulum:', await sayfa.evaluate((d2) => {
        const s = window.__oyun.sahne, D = s.stil.d;
        const tam = D.sure.tam;
        s.guncelle(d2); D.tik();
        return `tam ${tam.toFixed(0)} ms; bina ekleme ${D.sure.bina.toFixed(1)} ms (${D.sure.obek}/${D.arazi.length} arazi öbeği; ${D.sure.parca})`;
      }, d2));
      for (const k of ['standart', 'performans', 'yuksek']) {
        for (const [ad, z] of Object.entries(yakinliklar)) {
          await sayfa.evaluate(({ k, z, m, ad }) => {
            const s = window.__oyun.sahne;
            s.kaliteAyarla(k);
            s.kamera.zoom = z; s.kamera.updateProjectionMatrix();
            if (ad === 'genis') s.odakla(m.x - 6, m.y - 6); else s.odakla(m.x + 0.5, m.y + (ad === 'yakin' ? 0.5 : 0));
          }, { k, z, m: merkez, ad });
          await sayfa.waitForTimeout(500);
          if (process.env.STIL_KALITE_EKRAN === '1' && k !== 'yuksek') await sayfa.screenshot({ path: `${CIKTI}/stil-bd-${ad}-${k}.png` });
          console.log(`  ${k} ${ad}:`, await sayfa.evaluate(() => { const i = window.__oyun.sahne.stil.bilgi; return `${i.cagri} çağrı, ${(i.ucgen / 1000).toFixed(0)} bin üçgen`; }));
        }
      }
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
