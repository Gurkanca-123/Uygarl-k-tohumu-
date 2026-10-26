// Tohumlu harita üretimi ve karo okuma (TASARIM §3.1). Saf; DOM/Three.js bilmez.
//
// Kayıtta yalnız `harita = { tohum, boyut, kesif, degisim }` durur; zemin `tohum`dan her açılışta yeniden üretilir.
// - tohum: harita alt-tohumu (oyun tohumundan türetilir, `durum.rng`'ye DOKUNMAZ → harita oyun akışını kaydırmaz).
// - kesif: keşfedilmiş hücre bit kümesi (base64, bkz. kesif.js).
// - degisim: kalıcı değişimler { '<y*n+x>': karoKodu } (temizlenen orman, yol...). Zemin üstüne yazılır.
// Üretim deterministiktir; sonuç küçük bir önbellekte tutulur (aynı tohum → aynı nesne). Dönen diziyi DEĞİŞTİRMEYİN.
import { KAROLAR } from '../data/karolar.js';
import { BINALAR } from '../data/binalar.js';
import { CAGLAR } from '../data/caglar.js';
import { HARITA_BOYUT, HARITA_URETIM as U, YERLESIM_YARICAP } from '../data/denge.js';
import { rngBaslat, rngSonraki } from '../core/rng.js';
import { yerDenetle, icinde } from './izgara.js';

export const KARO_SIRA = Object.fromEntries(KAROLAR.map((k, i) => [k.id, i]));
const KOD_SIRA = Object.fromEntries(KAROLAR.map((k, i) => [k.kod, i]));
const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const K = KARO_SIRA;
const ILK_MERKEZ = BINA[CAGLAR[0].merkez];

// Oyun tohumundan harita alt-tohumu (uint32).
export const haritaTohumu = (tohum) => rngBaslat(`harita:${tohum}`);

// Merkez binanın sol üst köşesi (haritanın ortası).
export function merkezKonumu(n = HARITA_BOYUT) {
  return { x: n / 2 - ILK_MERKEZ.boyut[0] / 2, y: n / 2 - ILK_MERKEZ.boyut[1] / 2 };
}

// ---------- Üretim yardımcıları (yerel, deterministik) ----------
function rasgele(metin) {
  let s = rngBaslat(metin);
  return () => { const r = rngSonraki(s); s = r.rng; return r.deger; };
}
const aralik = (r, [a, b]) => a + r() * (b - a);
const tamAralik = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
const yumusat = (t) => t * t * (3 - 2 * t);

// Çok katlı değer gürültüsü, [0,1]'e gerilmiş. katmanlar: [[hücre boyu, ağırlık]]
function gurultu(r, n, katmanlar) {
  const out = new Float32Array(n * n);
  for (const [h, w] of katmanlar) {
    const m = Math.ceil(n / h) + 3;
    const lat = new Float32Array(m * m);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    const ox = r() * h, oy = r() * h; // katman kayması: kafes çizgileri üst üste binmesin
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const gx = (x + ox) / h, gy = (y + oy) / h;
      const ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = yumusat(gx - ix), fy = yumusat(gy - iy);
      const a = lat[iy * m + ix], b = lat[iy * m + ix + 1], c = lat[(iy + 1) * m + ix], d = lat[(iy + 1) * m + ix + 1];
      out[y * n + x] += w * ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy);
    }
  }
  let lo = Infinity, hi = -Infinity;
  for (const v of out) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo || 1);
  return out;
}

const KOMSU4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function denemeUret(tohum, n, deneme) {
  const r = rasgele(`zemin:${tohum}:${deneme}`);
  const c = n / 2;
  const R = n / 2;
  const z = new Uint8Array(n * n).fill(K.cimen);
  const uz = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) uz[y * n + x] = Math.hypot(x + 0.5 - c, y + 0.5 - c);
  const guvenli = (i) => uz[i] <= U.guvenliYaricap;
  const yuk = gurultu(r, n, [[15, 0.55], [7.5, 0.3], [3.7, 0.15]]);
  const orm = gurultu(r, n, [[11, 0.5], [5.3, 0.35], [2.7, 0.15]]);
  const ver = gurultu(r, n, [[9.5, 0.6], [4.6, 0.4]]);
  const blob = (gx, gy, rad, karo, kosul = () => true) => {
    for (let y = Math.floor(gy - rad - 2); y <= gy + rad + 2; y++) for (let x = Math.floor(gx - rad - 2); x <= gx + rad + 2; x++) {
      if (!icinde(n, x, y)) continue;
      const i = y * n + x;
      if (guvenli(i) || !kosul(i)) continue;
      if (Math.hypot(x + 0.5 - gx, y + 0.5 - gy) <= rad * (0.75 + 0.5 * yuk[i])) z[i] = karo;
    }
  };

  // 1. Dağ ve kayalık: uzakta, yükseklik + uzaklık eğimi.
  for (let i = 0; i < n * n; i++) {
    if (uz[i] < U.dag.minUzaklik) continue;
    const e = yuk[i] + U.dag.egim * (uz[i] / R - 0.5);
    if (e > U.dag.esik) z[i] = K.dag;
    else if (e > U.dag.kayalikEsik) z[i] = K.kayalik;
  }
  // 2. Göl (merkeze yakın) ve ondan kenara akan nehir.
  const ga = r() * Math.PI * 2;
  const gd = aralik(r, U.gol.uzaklik);
  const gx = c + Math.cos(ga) * gd, gy = c + Math.sin(ga) * gd;
  blob(gx, gy, aralik(r, U.gol.yaricap), K.su);
  if (icinde(n, Math.floor(gx), Math.floor(gy))) z[Math.floor(gy) * n + Math.floor(gx)] = K.su;
  if (r() < U.nehir.olasilik) {
    let px = gx, py = gy, yon = ga;
    for (let adim = 0; adim < n * 4; adim++) {
      yon += (r() - 0.5) * U.nehir.sapma;
      yon = yon * 0.8 + ga * 0.2;
      px += Math.cos(yon) * 0.7; py += Math.sin(yon) * 0.7;
      const x = Math.floor(px), y = Math.floor(py);
      if (!icinde(n, x, y)) break;
      const i = y * n + x;
      if (uz[i] > U.guvenliYaricap + 2) z[i] = K.su;
    }
  }
  // 3. Göletler (uzakta).
  for (let k = tamAralik(r, U.golet.adet); k > 0; k--) {
    const a = r() * Math.PI * 2, d = aralik(r, U.golet.uzaklik);
    blob(c + Math.cos(a) * d, c + Math.sin(a) * d, aralik(r, U.golet.yaricap), K.su);
  }
  // 4. Orman: uzakta daha sık; merkez yakınında garantili küme.
  for (let i = 0; i < n * n; i++) {
    if (z[i] !== K.cimen || guvenli(i)) continue;
    const t = Math.min(1, uz[i] / R);
    if (orm[i] > U.orman.esikYakin + (U.orman.esikUzak - U.orman.esikYakin) * t) z[i] = K.orman;
  }
  {
    const a = r() * Math.PI * 2, d = aralik(r, U.orman.yakinKume.uzaklik);
    blob(c + Math.cos(a) * d, c + Math.sin(a) * d, U.orman.yakinKume.yaricap, K.orman, (i) => z[i] === K.cimen);
  }
  // 5. Verimli toprak: su kenarında + merkez yakınında yama.
  const suYakin = (x, y, m) => {
    for (let b = y - m; b <= y + m; b++) for (let a = x - m; a <= x + m; a++) if (icinde(n, a, b) && z[b * n + a] === K.su) return true;
    return false;
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    if (z[i] === K.cimen && !guvenli(i) && ver[i] > U.verimli.esik && suYakin(x, y, U.verimli.suMesafe)) z[i] = K.verimli;
  }
  {
    const a = r() * Math.PI * 2, d = aralik(r, U.verimli.yama.uzaklik);
    blob(c + Math.cos(a) * d, c + Math.sin(a) * d, U.verimli.yama.yaricap, K.verimli, (i) => z[i] === K.cimen || z[i] === K.orman);
  }
  // 6. Kil: su kenarında.
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    if (![K.cimen, K.verimli, K.orman].includes(z[i]) || uz[i] < U.kil.minUzaklik) continue;
    if (KOMSU4.some(([a, b]) => icinde(n, x + a, y + b) && z[(y + b) * n + x + a] === K.su) && r() < U.kil.olasilik) z[i] = K.kil;
  }
  // 7. Kaynak kümeleri: ilk küme (2×2 çekirdek) belirli uzaklıkta, ek kümeler daha uzakta.
  const kume = (karo, uzAralik, cekirdek, ek) => {
    for (let deneme2 = 0; deneme2 < 40; deneme2++) {
      const a = r() * Math.PI * 2, d = aralik(r, uzAralik);
      const x0 = Math.floor(c + Math.cos(a) * d - cekirdek / 2 + 0.5), y0 = Math.floor(c + Math.sin(a) * d - cekirdek / 2 + 0.5);
      const hucreler = [];
      for (let b = 0; b < cekirdek; b++) for (let e = 0; e < cekirdek; e++) hucreler.push([x0 + e, y0 + b]);
      if (!hucreler.every(([x, y]) => icinde(n, x, y) && z[y * n + x] !== K.su && uz[y * n + x] > U.guvenliYaricap + 1)) continue;
      for (const [x, y] of hucreler) z[y * n + x] = karo;
      for (let k = 0; k < ek; k++) {
        const [x, y] = hucreler[Math.floor(r() * hucreler.length)];
        const [a2, b2] = KOMSU4[Math.floor(r() * 4)];
        const nx = x + a2, ny = y + b2;
        if (!icinde(n, nx, ny) || z[ny * n + nx] === K.su || uz[ny * n + nx] <= U.guvenliYaricap + 1) continue;
        z[ny * n + nx] = karo;
        hucreler.push([nx, ny]);
      }
      return true;
    }
    return false;
  };
  for (const [ad, karo] of [['tasli', K.tasli], ['cevher', K.cevher], ['mermer', K.mermer]]) {
    const u = U[ad];
    kume(karo, u.ilk.uzaklik, 2, u.ilk.ek);
    for (let k = tamAralik(r, u.ekAdet); k > 0; k--) kume(karo, u.uzaklik, 1, tamAralik(r, u.ekKaro));
  }
  // 8. Güvenli merkez: tümü çimen.
  for (let i = 0; i < n * n; i++) if (guvenli(i)) z[i] = K.cimen;
  return z;
}

// ---------- Garanti denetimi ----------
// Merkezden geçilebilir karolarda BFS. Dönüş: { ulasilan: Uint8Array, erisilir(i) }.
function erisimHesapla(z, n) {
  const m = merkezKonumu(n);
  const gecilir = KAROLAR.map((k) => k.gecilir);
  const ulasilan = new Uint8Array(n * n);
  const kuyruk = [m.y * n + m.x];
  ulasilan[kuyruk[0]] = 1;
  for (let q = 0; q < kuyruk.length; q++) {
    const i = kuyruk[q], x = i % n, y = (i - x) / n;
    for (const [a, b] of KOMSU4) {
      const nx = x + a, ny = y + b;
      if (!icinde(n, nx, ny)) continue;
      const j = ny * n + nx;
      if (!ulasilan[j] && gecilir[z[j]]) { ulasilan[j] = 1; kuyruk.push(j); }
    }
  }
  const erisilir = (i) => {
    if (ulasilan[i]) return true;
    const x = i % n, y = (i - x) / n;
    return KOMSU4.some(([a, b]) => icinde(n, x + a, y + b) && ulasilan[(y + b) * n + x + a]);
  };
  return { ulasilan, erisilir };
}

const hucreUzakligi = (n, x, y) => Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2);

// Dönüş: hata listesi (boş = geçerli).
export function haritaDenetle(z, n) {
  const hatalar = [];
  const { ulasilan, erisilir } = erisimHesapla(z, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (hucreUzakligi(n, x, y) <= U.guvenliYaricap && z[y * n + x] !== K.cimen) { hatalar.push('güvenli alan çimen değil'); break; }
  }
  for (const g of U.sayim) {
    let s = 0;
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i - x) / n;
      if (z[i] === K[g.karo] && hucreUzakligi(n, x, y) <= g.yaricap && erisilir(i)) s++;
    }
    if (s < g.enAz) hatalar.push(`${g.karo}: ${g.yaricap} içinde ${s}/${g.enAz}`);
  }
  for (const id of U.erisim) {
    let var_ = false;
    for (let i = 0; i < n * n && !var_; i++) if (z[i] === K[id] && erisilir(i)) var_ = true;
    if (!var_) hatalar.push(`${id}: merkezden erişilemiyor`);
  }
  const m = merkezKonumu(n);
  const [mg, mh] = ILK_MERKEZ.boyut;
  for (const binaId of U.yer) {
    const yr = YERLESIM_YARICAP[BINA[binaId].cag];
    const baglam = {
      n,
      karo: (x, y) => (erisilir(y * n + x) ? KAROLAR[z[y * n + x]].id : null),
      dolu: (x, y) => !ulasilan[y * n + x] || (x >= m.x && x < m.x + mg && y >= m.y && y < m.y + mh),
      sinir: (x, y) => hucreUzakligi(n, x, y) <= yr,
    };
    let bulundu = false;
    const lo = Math.max(0, Math.floor(n / 2 - yr - 1)), hi = Math.min(n - 1, Math.ceil(n / 2 + yr));
    for (let y = lo; y <= hi && !bulundu; y++) for (let x = lo; x <= hi && !bulundu; x++) {
      if (!yerDenetle(baglam, binaId, x, y)) bulundu = true;
    }
    if (!bulundu) hatalar.push(`${binaId}: sınır içinde yer yok`);
  }
  return hatalar;
}

// ---------- Zemin (önbellekli) ----------
const ONBELLEK = new Map();
const ONBELLEK_MAX = 8;

// Önbelleksiz üretim. Dönüş: { tohum, boyut, karo: Uint8Array (KAROLAR sırası), deneme }. Garanti tutmazsa sonraki deneme.
export function haritaUret(tohum, boyut = HARITA_BOYUT) {
  for (let deneme = 0; deneme < U.denemeMax; deneme++) {
    const z = denemeUret(tohum, boyut, deneme);
    if (!haritaDenetle(z, boyut).length) return { tohum, boyut, karo: z, deneme };
  }
  throw new Error(`Harita üretilemedi (tohum ${tohum}, ${U.denemeMax} deneme).`);
}

// Önbellekli üretim (aynı tohum → aynı nesne).
export function zemin(tohum, boyut = HARITA_BOYUT) {
  const anahtar = `${tohum}:${boyut}`;
  const v = ONBELLEK.get(anahtar);
  if (v) return v;
  const sonuc = haritaUret(tohum, boyut);
  if (ONBELLEK.size >= ONBELLEK_MAX) ONBELLEK.delete(ONBELLEK.keys().next().value);
  ONBELLEK.set(anahtar, sonuc);
  return sonuc;
}

// ---------- Durumdaki harita ----------
// Yeni oyunun harita alanı (keşif kümesi boş; açılışı oyun_durumu.js yapar).
export function yeniHarita(oyunTohumu, boyut = HARITA_BOYUT, kesif = '') {
  return { tohum: haritaTohumu(oyunTohumu), boyut, kesif, degisim: {} };
}

// Ham karo kodu (zemin + kalıcı değişim); harita dışında null. Sis/çağ görünürlüğü UYGULANMAZ (bkz. kesif.js gorunurKaro).
export function karoKodu(d, x, y) {
  const h = d.harita;
  const n = h.boyut;
  if (!icinde(n, x, y)) return null;
  const i = y * n + x;
  const deg = h.degisim[i];
  return deg ?? KAROLAR[zemin(h.tohum, n).karo[i]].kod;
}
export function karoAt(d, x, y) {
  const k = karoKodu(d, x, y);
  return k === null ? null : KAROLAR[KOD_SIRA[k]].id;
}
export const zeminKaro = (d, x, y) => KAROLAR[zemin(d.harita.tohum, d.harita.boyut).karo[y * d.harita.boyut + x]].id;

// Kopya üstünde: kalıcı karo değişimi. Zemine eşitse değişim silinir (kayıt sığ kalır).
export function karoDegistir(d, x, y, karoId) {
  const n = d.harita.boyut;
  const i = y * n + x;
  const kod = KAROLAR[K[karoId]].kod;
  const degisim = { ...d.harita.degisim };
  if (zeminKaro(d, x, y) === karoId) delete degisim[i];
  else degisim[i] = kod;
  d.harita = { ...d.harita, degisim };
}

// ---------- Yerleşim sınırı ----------
// Merkez noktası: merkez binanın ortası (sürekli koordinat).
export function merkezNokta(d) {
  const m = d.binalar.find((b) => BINA[b.id]?.tur === 'merkez');
  if (!m) return { x: d.harita.boyut / 2, y: d.harita.boyut / 2 };
  const [g, h] = BINA[m.id].boyut;
  return { x: m.x + g / 2, y: m.y + h / 2 };
}
export const merkezUzakligi = (d, x, y) => { const m = merkezNokta(d); return Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y); };
export const sinirYaricapi = (d) => YERLESIM_YARICAP[d.cag];
export const sinirIcinde = (d, x, y) => icinde(d.harita.boyut, x, y) && merkezUzakligi(d, x, y) <= sinirYaricapi(d);

// Rapor/test: karo dağılımı ve her karo türünün merkeze en yakın uzaklığı.
export function haritaIstatistik(tohum, boyut = HARITA_BOYUT) {
  const z = zemin(tohum, boyut);
  const sayim = Object.fromEntries(KAROLAR.map((k) => [k.id, 0]));
  const enYakin = {};
  for (let i = 0; i < boyut * boyut; i++) {
    const id = KAROLAR[z.karo[i]].id;
    sayim[id]++;
    const x = i % boyut, y = (i - x) / boyut;
    const u = hucreUzakligi(boyut, x, y);
    if (!(enYakin[id] <= u)) enYakin[id] = u;
  }
  return { sayim, enYakin, deneme: z.deneme };
}
