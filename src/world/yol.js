// Yol ağı (TASARIM §3.4, Bronz+). Yol karoları `harita.degisim`te 'yol' kodlu. Merkez binaya kenar komşu yol karolarından
// başlayan BFS ile bağlı ağ bulunur; bina, merkeze doğrudan bitişikse ya da kenar komşusu ağdaysa bağlıdır.
// Saf; sonuç (merkez konumu + yol listesi) anahtarıyla küçük önbellekte tutulur (büyük haritada her üretim çağrısında
// BFS tekrarlanmaz).
import { BINALAR } from '../data/binalar.js';
import { KAROLAR } from '../data/karolar.js';
import { kenarKomsulari, binaHucreleri, icinde } from './izgara.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const YOL_KOD = KAROLAR.find((k) => k.id === 'yol').kod;
const ONBELLEK = new Map();

export function yolHucreleri(d) {
  return Object.entries(d.harita.degisim).filter(([, k]) => k === YOL_KOD).map(([i]) => Number(i)).sort((a, b) => a - b);
}

const merkezi = (d) => d.binalar.find((b) => BINA[b.id]?.tur === 'merkez');

// Merkeze bağlı yol hücreleri (Set<indeks>).
export function yolAgi(d) {
  const n = d.harita.boyut;
  const m = merkezi(d);
  const yollar = yolHucreleri(d);
  if (!m || !yollar.length) return new Set();
  const anahtar = `${n}:${m.id}:${m.x},${m.y}:${yollar.join(',')}`;
  const v = ONBELLEK.get(anahtar);
  if (v) return v;
  const yolMu = new Set(yollar);
  const ag = new Set();
  const kuyruk = [];
  for (const [x, y] of kenarKomsulari(d, m)) {
    const i = y * n + x;
    if (yolMu.has(i) && !ag.has(i)) { ag.add(i); kuyruk.push(i); }
  }
  for (let q = 0; q < kuyruk.length; q++) {
    const i = kuyruk[q], x = i % n, y = (i - x) / n;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!icinde(n, x + a, y + b)) continue;
      const j = (y + b) * n + x + a;
      if (yolMu.has(j) && !ag.has(j)) { ag.add(j); kuyruk.push(j); }
    }
  }
  if (ONBELLEK.size >= 16) ONBELLEK.delete(ONBELLEK.keys().next().value);
  ONBELLEK.set(anahtar, ag);
  return ag;
}

// Bina merkeze bağlı mı? Merkezin kendisi bağlıdır.
export function yolBagli(d, b, ag = yolAgi(d)) {
  const m = merkezi(d);
  if (!m || b.uid === m.uid) return true;
  const n = d.harita.boyut;
  const merkezHucre = new Set(binaHucreleri(m).map(([x, y]) => y * n + x));
  return kenarKomsulari(d, b).some(([x, y]) => merkezHucre.has(y * n + x) || ag.has(y * n + x));
}
