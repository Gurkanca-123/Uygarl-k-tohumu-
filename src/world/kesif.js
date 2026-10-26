// Keşif sisi (aşama 3, kullanıcı kararı): harita başta gizli; keşfedilmiş hücreler `durum.harita.kesif`te bit kümesi
// (base64, n×n bit) olarak saklanır. Sisteki karoya bina kurulamaz, kaynak ipucu verilmez; cevher/mermer kendi çağından
// önce `gizliGorunum` (kayalık) olarak görünür. Saf; DOM/Three.js bilmez. "…Uygula" kopya üstünde çalışır.
import { KAROLAR } from '../data/karolar.js';
import { CAGLAR } from '../data/caglar.js';
import { BINALAR } from '../data/binalar.js';
import { BULUSLAR } from '../data/buluslar.js';
import { KESIF_YARICAP } from '../data/denge.js';
import { karoAt, merkezNokta } from './harita.js';
import { icinde } from './izgara.js';

const KARO = Object.fromEntries(KAROLAR.map((k) => [k.id, k]));
const CAG_SIRA = Object.fromEntries(CAGLAR.map((c) => [c.id, c.sira]));
const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const BULUS = Object.fromEntries(BULUSLAR.map((b) => [b.id, b]));

// ---------- Bit kümesi <-> base64 ----------
const ALFABE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const ALFABE_SIRA = Object.fromEntries([...ALFABE].map((c, i) => [c, i]));
export const kesifBayt = (n) => Math.ceil((n * n) / 8);
export const kesifUzunluk = (n) => Math.ceil(kesifBayt(n) / 3) * 4;
export const kesifGecerli = (s, n) => typeof s === 'string' && s.length === kesifUzunluk(n) && /^[A-Za-z0-9+/]*={0,2}$/.test(s);

export function bitKodla(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 3) {
    const a = u8[i], b = u8[i + 1] ?? 0, c = u8[i + 2] ?? 0;
    const v = (a << 16) | (b << 8) | c;
    s += ALFABE[(v >> 18) & 63] + ALFABE[(v >> 12) & 63]
      + (i + 1 < u8.length ? ALFABE[(v >> 6) & 63] : '=') + (i + 2 < u8.length ? ALFABE[v & 63] : '=');
  }
  return s;
}

const COZ_ONBELLEK = new Map();
// Dönüş: Uint8Array (önbellekten; DEĞİŞTİRMEYİN — kesifUygula kopyalar).
export function bitCoz(s, bayt) {
  const anahtar = `${bayt}:${s}`;
  const v = COZ_ONBELLEK.get(anahtar);
  if (v) return v;
  const u8 = new Uint8Array(bayt);
  let j = 0;
  for (let i = 0; i < s.length && j < bayt; i += 4) {
    const v4 = ((ALFABE_SIRA[s[i]] ?? 0) << 18) | ((ALFABE_SIRA[s[i + 1]] ?? 0) << 12)
      | ((ALFABE_SIRA[s[i + 2]] ?? 0) << 6) | (ALFABE_SIRA[s[i + 3]] ?? 0);
    u8[j++] = (v4 >> 16) & 255;
    if (j < bayt) u8[j++] = (v4 >> 8) & 255;
    if (j < bayt) u8[j++] = v4 & 255;
  }
  if (COZ_ONBELLEK.size >= 16) COZ_ONBELLEK.delete(COZ_ONBELLEK.keys().next().value);
  COZ_ONBELLEK.set(anahtar, u8);
  return u8;
}
export const bosKesif = (n) => bitKodla(new Uint8Array(kesifBayt(n)));

const bitler = (d) => {
  const n = d.harita.boyut;
  return kesifGecerli(d.harita.kesif, n) ? bitCoz(d.harita.kesif, kesifBayt(n)) : new Uint8Array(kesifBayt(n));
};

export function kesifli(d, x, y) {
  const n = d.harita.boyut;
  if (!icinde(n, x, y)) return false;
  const i = y * n + x;
  return (bitler(d)[i >> 3] >> (i & 7) & 1) === 1;
}
export function kesifSayisi(d) {
  let s = 0;
  for (const b of bitler(d)) { let v = b; while (v) { s += v & 1; v >>= 1; } }
  return s;
}

// Oyuncunun gördüğü karo id'si: sis/harita dışı → null; çağından önce cevher/mermer → gizliGorunum.
export function gorunurKaro(d, x, y) {
  if (!kesifli(d, x, y)) return null;
  const id = karoAt(d, x, y);
  const k = KARO[id];
  if (k.gizliGorunum && CAG_SIRA[d.cag] < CAG_SIRA[k.gorunurCag]) return k.gizliGorunum;
  return id;
}
export const karoGorunur = (d, karoId) => CAG_SIRA[d.cag] >= CAG_SIRA[KARO[karoId].gorunurCag];

// ---------- Yön ----------
// y aşağı doğru artar (ekranda güney).
const YONLER = ['Doğuda', 'Güneydoğuda', 'Güneyde', 'Güneybatıda', 'Batıda', 'Kuzeybatıda', 'Kuzeyde', 'Kuzeydoğuda'];
export function yonAdi(dx, dy) {
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 'Yakında';
  const s = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return YONLER[((s % 8) + 8) % 8];
}

// ---------- Keşif ----------
// Kopya üstünde: merkez (sürekli koordinat {x,y}) çevresinde, hücre ortası uzaklığı ≤ yaricap olanları açar.
// Dönüş: { acilan, bulgular:[{ karo, x, y, yon, metin }] } — bulgular yalnız yeni açılan, `kesifBildir`li ve çağında
// görünür karo türleri için, türün merkeze en yakın yeni karosu.
export function kesifUygula(d, merkez, yaricap) {
  const n = d.harita.boyut;
  const u8 = new Uint8Array(bitler(d));
  const yeni = [];
  for (let y = Math.floor(merkez.y - yaricap - 1); y <= merkez.y + yaricap + 1; y++) {
    for (let x = Math.floor(merkez.x - yaricap - 1); x <= merkez.x + yaricap + 1; x++) {
      if (!icinde(n, x, y) || Math.hypot(x + 0.5 - merkez.x, y + 0.5 - merkez.y) > yaricap) continue;
      const i = y * n + x;
      if (u8[i >> 3] >> (i & 7) & 1) continue;
      u8[i >> 3] |= 1 << (i & 7);
      yeni.push([x, y]);
    }
  }
  if (!yeni.length) return { acilan: 0, bulgular: [] };
  d.harita = { ...d.harita, kesif: bitKodla(u8) };
  return { acilan: yeni.length, bulgular: bulgulariBul(d, yeni) };
}

function bulgulariBul(d, hucreler) {
  const m = merkezNokta(d);
  const enYakin = {};
  for (const [x, y] of hucreler) {
    const id = karoAt(d, x, y);
    const k = KARO[id];
    if (!k.kesifBildir || !karoGorunur(d, id)) continue;
    const u = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
    if (!enYakin[id] || u < enYakin[id].u) enYakin[id] = { x, y, u };
  }
  return KAROLAR.filter((k) => enYakin[k.id]).map((k) => {
    const { x, y } = enYakin[k.id];
    const yon = yonAdi(x + 0.5 - m.x, y + 0.5 - m.y);
    return { karo: k.id, x, y, yon, metin: `${yon} ${k.kesifBildir} bulundu.` };
  });
}

// Saf: { durum, acilan, bulgular }.
export function kesfet(durum, merkez, yaricap) {
  const d = structuredClone(durum);
  const r = kesifUygula(d, merkez, yaricap);
  return { durum: r.acilan ? d : durum, ...r };
}

// Keşfet eyleminin yarıçapı: KESIF_YARICAP + çalışan binaların `kesifYaricap`ı + buluş etkileri (tur 'kesifYaricap').
// `calisan`: çalışan bina listesi (çekirdek verir; world çekirdek durum kurallarını bilmez).
export function kesifYaricapi(d, calisan = d.binalar) {
  let r = KESIF_YARICAP;
  for (const b of calisan) r += BINA[b.id].kesifYaricap || 0;
  for (const id of d.buluslar) for (const e of BULUS[id]?.etkiler || []) if (e.tur === 'kesifYaricap') r += e.deger;
  return r;
}

const ALTIN_ACI = Math.PI * (3 - Math.sqrt(5));
// Sisin merkeze en yakın hücresi (sınırdaki sisli bölge). Eşitlikte tercih açısı tur ile döner (RNG kullanmaz).
// Dönüş: { x, y } ya da null (harita tamamen açık).
export function kesifHedefi(d) {
  const n = d.harita.boyut;
  const m = merkezNokta(d);
  const u8 = bitler(d);
  const tercih = (d.tur * ALTIN_ACI) % (Math.PI * 2);
  const aciFarki = (a) => Math.abs((((a - tercih) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  const adaylar = [];
  let enAz = Infinity;
  for (let i = 0; i < n * n; i++) {
    if (u8[i >> 3] >> (i & 7) & 1) continue;
    const x = i % n, y = (i - x) / n;
    const u = Math.hypot(x + 0.5 - m.x, y + 0.5 - m.y);
    if (u > enAz + 0.5) continue;
    enAz = Math.min(enAz, u);
    adaylar.push({ x, y, u });
  }
  let enIyi = null;
  for (const c of adaylar) {
    if (c.u > enAz + 0.5) continue;
    const a = aciFarki(Math.atan2(c.y + 0.5 - m.y, c.x + 0.5 - m.x));
    if (!enIyi || a < enIyi.a) enIyi = { ...c, a };
  }
  return enIyi && { x: enIyi.x, y: enIyi.y };
}

// Kopya üstünde: Keşfet eyleminin harita keşfi. Hedef hücre merkezden dışa doğru (yarıçap − 1) kaydırılarak açılır.
// Dönüş: kesifUygula sonucu + hedef.
export function haritaKesfiUygula(d, yaricap) {
  const h = kesifHedefi(d);
  if (!h) return { acilan: 0, bulgular: [], hedef: null };
  const m = merkezNokta(d);
  const vx = h.x + 0.5 - m.x, vy = h.y + 0.5 - m.y;
  const l = Math.hypot(vx, vy) || 1;
  const kay = Math.max(0, yaricap - 1);
  const merkez = { x: h.x + 0.5 + (vx / l) * kay, y: h.y + 0.5 + (vy / l) * kay };
  return { ...kesifUygula(d, merkez, yaricap), hedef: h };
}
