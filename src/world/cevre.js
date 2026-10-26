// Çevre (çit / sur) zinciri ve kapalı halka tespiti (docs/TEHDIT.md §12). Saf; DOM/Three.js bilmez.
//
// Kurallar:
// - `cevre: true` binalar (Çit, Sur Parçası) duvar hücresidir; yalnız kurulu ve hasarsız olanlar sayılır.
// - Su ve dağ (geçilmez karo) doğal engeldir. GEÇİT: yol karosunun karşılıklı iki kenar komşusu (doğu+batı ya da kuzey+güney)
//   duvarsa yol kapalı sayılır (yol halkayı bozmaz; ayrı "kapı" binası yok).
// - Kapalı = merkez binanın hücrelerinden 4 yönde (çapraz değil) yürüyerek yerleşim sınırının dışına (ya da harita kenarına)
//   çıkılamıyor. Bina hücreleri ve sis geçilebilir (düşman avludan geçer).
// - Boşluk = halkayı kapatmak için en az kaç parça daha gerekir: merkezden dışarıya en küçük köşe kesimi (birim kapasiteli
//   max-flow). Kapasite: çit kurulabilir boş karo 1, kurulamayan geçilir karo (bina, orman, sis…) sonsuz, duvar/engel 0.
//   `bosluklar` = o kesimin hücreleri (arayüz vurgular). Kesim CEVRE.boslukMax'tan büyükse bosluk null (kapatılamaz).
import { BINALAR } from '../data/binalar.js';
import { KAROLAR } from '../data/karolar.js';
import { CEVRE } from '../data/denge.js';
import { izgara, binaHucreleri, icinde } from './izgara.js';
import { karoAt, sinirIcinde } from './harita.js';
import { gorunurKaro } from './kesif.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const KARO = Object.fromEntries(KAROLAR.map((k) => [k.id, k]));
const DX = [1, -1, 0, 0];
const DY = [0, 0, 1, -1];

export const cevreParcasiMi = (id) => !!BINA[id]?.cevre;
const kurulu = (d, b) => !d.insaatSirasi.includes(b.uid);

// Ortak hazırlık: duvar dizisi, engel denetimi, merkez hücreleri, parça sayıları.
function hazirla(d) {
  const n = d.harita.boyut;
  const duvar = new Uint8Array(n * n);
  let parca = 0, insaatta = 0, hasarli = 0;
  for (const b of d.binalar) {
    if (!cevreParcasiMi(b.id)) continue;
    if (!kurulu(d, b)) { insaatta++; continue; }
    if (b.hasarli) { hasarli++; continue; }
    parca++;
    for (const [x, y] of binaHucreleri(b)) if (icinde(n, x, y)) duvar[y * n + x] = 1;
  }
  const engel = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    if (duvar[i]) { engel[i] = 1; continue; }
    const k = karoAt(d, x, y);
    if (!KARO[k].gecilir) { engel[i] = 1; continue; }
    if (k === 'yol') {
      const w = (a, c) => icinde(n, a, c) && duvar[c * n + a];
      if ((w(x - 1, y) && w(x + 1, y)) || (w(x, y - 1) && w(x, y + 1))) engel[i] = 2; // geçit
    }
  }
  const merkez = d.binalar.find((b) => BINA[b.id].tur === 'merkez');
  const kaynak = merkez ? binaHucreleri(merkez).filter(([x, y]) => icinde(n, x, y)).map(([x, y]) => y * n + x) : [];
  return { n, duvar, engel, kaynak, parca, insaatta, hasarli };
}

// Merkezden taşma (BFS). Dönüş: { kapali, ulasilan (Uint8Array) }.
function tasma(d, h) {
  const { n, engel, kaynak } = h;
  const gor = new Uint8Array(n * n);
  const kuyruk = [];
  for (const i of kaynak) { gor[i] = 1; kuyruk.push(i); }
  let kapali = kaynak.length > 0;
  for (let q = 0; q < kuyruk.length; q++) {
    const i = kuyruk[q];
    const x = i % n, y = (i - x) / n;
    for (let k = 0; k < 4; k++) {
      const a = x + DX[k], c = y + DY[k];
      if (!icinde(n, a, c)) { kapali = false; continue; }
      const j = c * n + a;
      if (gor[j] || engel[j]) continue;
      if (!sinirIcinde(d, a, c)) { kapali = false; continue; }
      gor[j] = 1;
      kuyruk.push(j);
    }
  }
  return { kapali, ulasilan: gor };
}

// Kapalı halka içindeki (çevre parçası olmayan) binalar / tümü. Açıkken ic = 0.
function icSayim(d, h, ulasilan, kapali) {
  const n = h.n;
  let ic = 0, toplam = 0;
  for (const b of d.binalar) {
    if (cevreParcasiMi(b.id)) continue;
    toplam++;
    if (kapali && binaHucreleri(b).some(([x, y]) => icinde(n, x, y) && ulasilan[y * n + x])) ic++;
  }
  return { ic, toplam };
}

// Savunma için hızlı özet (max-flow yok). Dönüş: { kapali, parca, ic, toplam }.
export function cevreKapali(d) {
  const h = hazirla(d);
  if (!h.parca) return { kapali: false, parca: 0, ic: 0, toplam: icSayim(d, h, null, false).toplam };
  const t = tasma(d, h);
  return { kapali: t.kapali, parca: h.parca, ...icSayim(d, h, t.ulasilan, t.kapali) };
}

// Tam durum (arayüz): { kapali, bosluk (sayı | null), bosluklar [[x,y]], parca, insaatta, hasarli, ic, toplam }.
export function cevreDurumu(d) {
  const h = hazirla(d);
  const t = tasma(d, h);
  const say = icSayim(d, h, t.ulasilan, t.kapali);
  const temel = { kapali: t.kapali, parca: h.parca, insaatta: h.insaatta, hasarli: h.hasarli, ...say };
  if (t.kapali) return { ...temel, bosluk: 0, bosluklar: [] };
  const kesim = enKucukKesim(d, h, CEVRE.boslukMax);
  return { ...temel, bosluk: kesim ? kesim.length : null, bosluklar: kesim || [] };
}

// Birim kapasiteli köşe kesimi: düğüm bölme (giriş/çıkış), BFS ile artırma yolu. Dönüş: kesim hücreleri [[x,y]] ya da null.
function enKucukKesim(d, h, sinir) {
  const { n, engel, kaynak } = h;
  const N = n * n;
  const SONSUZ = 1e9;
  const hucre = izgara(d);
  const kap = new Int32Array(N);
  const graf = new Uint8Array(N); // 1 = sınır içi, geçilir düğüm
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    if (engel[i] || !sinirIcinde(d, x, y)) continue;
    graf[i] = 1;
    const g = gorunurKaro(d, x, y);
    kap[i] = g !== null && KARO[g].insaEdilir && !hucre[i] ? 1 : SONSUZ;
  }
  for (const i of kaynak) kap[i] = SONSUZ;
  const fv = new Int32Array(N);      // düğüm içi akış
  const fe = new Int32Array(N * 4);  // kenar net akışı (i → komşu k)
  const kaynakMi = new Uint8Array(N);
  for (const i of kaynak) kaynakMi[i] = 1;
  // Durum = i*2 + taraf (0 giriş, 1 çıkış). Havuz (dış) = -2.
  const ebeveyn = new Int32Array(N * 2);
  const ebeveynK = new Int8Array(N * 2);
  const ara = () => {
    ebeveyn.fill(-1);
    const kuyruk = [];
    for (const i of kaynak) { ebeveyn[i * 2] = -3; ebeveyn[i * 2 + 1] = -3; kuyruk.push(i * 2 + 1); }
    for (let q = 0; q < kuyruk.length; q++) {
      const s = kuyruk[q];
      const i = s >> 1, taraf = s & 1;
      const x = i % n, y = (i - x) / n;
      const it = (t, k) => { if (ebeveyn[t] === -1) { ebeveyn[t] = s; ebeveynK[t] = k; kuyruk.push(t); } };
      if (taraf === 0) {
        if (fv[i] < kap[i]) it(i * 2 + 1, -1);
        for (let k = 0; k < 4; k++) { // geri kenar: komşu j → i akışı varsa (fe[i,k] < 0) çıkış_j'ye dön
          if (fe[i * 4 + k] >= 0) continue;
          const j = (y + DY[k]) * n + (x + DX[k]);
          it(j * 2 + 1, k);
        }
      } else {
        if (fv[i] > 0 && !kaynakMi[i]) it(i * 2, -1);
        for (let k = 0; k < 4; k++) {
          const a = x + DX[k], c = y + DY[k];
          if (!icinde(n, a, c)) return { son: s, k };
          const j = c * n + a;
          if (engel[j]) continue;
          if (!graf[j]) return { son: s, k }; // sınır dışı = havuz
          if (kaynakMi[j]) continue;
          it(j * 2, k);
        }
      }
    }
    return null;
  };
  let akis = 0;
  for (;;) {
    const yol = ara();
    if (!yol) break;
    akis++;
    if (akis > sinir) return null;
    // Son çıkış düğümünden havuza: kenar sonsuz, akış tutmaya gerek yok. Geriye yürü.
    let s = yol.son;
    while (ebeveyn[s] !== -3) {
      const p = ebeveyn[s], k = ebeveynK[s];
      const i = s >> 1, pi = p >> 1;
      if (k === -1) {
        if ((s & 1) === 1) fv[i]++; else fv[i]--;
      } else {
        // pi → i (k yönü pi'den i'ye ise ileri; geri kenarsa pi'nin k yönündeki komşu i). İkisinde de: fe[pi→i]++.
        const x = pi % n, y = (pi - x) / n;
        let kk = -1;
        for (let t = 0; t < 4; t++) if ((y + DY[t]) * n + (x + DX[t]) === i && icinde(n, x + DX[t], y + DY[t])) { kk = t; break; }
        fe[pi * 4 + kk]++;
        fe[i * 4 + (kk ^ 1)]--;
      }
      s = p;
    }
  }
  // Kesim: giriş ulaşılır, çıkış ulaşılamaz, kapasite 1 olan düğümler.
  ara();
  const kesim = [];
  for (let i = 0; i < N; i++) {
    if (!graf[i] || kap[i] !== 1) continue;
    if (ebeveyn[i * 2] !== -1 && ebeveyn[i * 2 + 1] === -1) kesim.push([i % n, (i - (i % n)) / n]);
  }
  return kesim.length === akis ? kesim : kesim.slice(0, akis);
}
