// Prosedürel canvas dokuları (harici dosya yok). Bina atlası (4×4 hücre, gri tonlu; renk köşe renginden gelir)
// ve karo dokuları (döşenebilir). Hepsi tembel üretilir ve önbellekte tutulur.
import * as THREE from 'three';

export const ATLAS_HUCRE = 4; // 4×4
export const DOKU = {
  duz: 0, saman: 1, deri: 2, kutuk: 3, tahta: 4, kerpic: 5, tasBlok: 6, moloz: 7,
  kiremit: 8, arduvaz: 9, yariAhsap: 10, mermer: 11, kumas: 12, toprak: 13, ekin: 14, hasir: 15,
};

function rastgele(tohum) {
  let s = tohum >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
const gri = (v, a = 1) => `rgba(${v | 0},${v | 0},${v | 0},${a})`;

// t: hücre içinde 0..S çizim; sarma: döşenebilirlik için ±S kaydırmalı tekrar
function sarali(ctx, S, fn) { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { ctx.save(); ctx.translate(dx, dy); fn(); ctx.restore(); } }

function gurultu(ctx, S, R, adet, boy, min, max, alfa) {
  for (let i = 0; i < adet; i++) {
    const x = R() * S, y = R() * S, v = min + R() * (max - min);
    ctx.fillStyle = gri(v, alfa);
    ctx.fillRect(x, y, boy * (0.5 + R()), boy * (0.5 + R()));
  }
}

const CIZ = {
  duz(c, S, R) { c.fillStyle = gri(236); c.fillRect(0, 0, S, S); gurultu(c, S, R, 900, 3, 200, 255, 0.25); },
  saman(c, S, R) {
    c.fillStyle = gri(205); c.fillRect(0, 0, S, S);
    const sira = 6;
    for (let r = 0; r < sira; r++) {
      const y0 = (r * S) / sira;
      for (let i = 0; i < 140; i++) {
        const x = R() * S, v = 150 + R() * 105, h = S / sira * (0.8 + R() * 0.5);
        c.strokeStyle = gri(v, 0.9); c.lineWidth = 1 + R() * 2;
        c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (R() - 0.5) * 6, y0 + h); c.stroke();
      }
      c.fillStyle = gri(110, 0.55); c.fillRect(0, y0 + S / sira - 3, S, 3);
    }
  },
  deri(c, S, R) {
    c.fillStyle = gri(220); c.fillRect(0, 0, S, S);
    const n = 3;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 190 + R() * 60;
      c.fillStyle = gri(v); c.fillRect(i * S / n + 2, j * S / n + 2, S / n - 4, S / n - 4);
    }
    gurultu(c, S, R, 500, 4, 150, 240, 0.25);
    c.strokeStyle = gri(90, 0.8); c.lineWidth = 2; c.setLineDash([5, 5]);
    for (let i = 0; i <= n; i++) {
      c.beginPath(); c.moveTo(i * S / n, 0); c.lineTo(i * S / n, S); c.stroke();
      c.beginPath(); c.moveTo(0, i * S / n); c.lineTo(S, i * S / n); c.stroke();
    }
    c.setLineDash([]);
  },
  kutuk(c, S) {
    const n = 5, h = S / n;
    for (let i = 0; i < n; i++) {
      const g = c.createLinearGradient(0, i * h, 0, i * h + h);
      g.addColorStop(0, gri(120)); g.addColorStop(0.25, gri(225)); g.addColorStop(0.6, gri(200)); g.addColorStop(1, gri(95));
      c.fillStyle = g; c.fillRect(0, i * h, S, h);
      c.strokeStyle = gri(150, 0.5); c.lineWidth = 1;
      for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(0, i * h + 4 + k * (h / 7)); c.lineTo(S, i * h + 4 + k * (h / 7) + 2); c.stroke(); }
    }
  },
  tahta(c, S, R) {
    const n = 6, w = S / n;
    for (let i = 0; i < n; i++) {
      c.fillStyle = gri(185 + R() * 50); c.fillRect(i * w, 0, w, S);
      c.strokeStyle = gri(140, 0.4);
      for (let k = 0; k < 5; k++) { c.beginPath(); const x = i * w + R() * w; c.moveTo(x, 0); c.lineTo(x + (R() - 0.5) * 4, S); c.stroke(); }
      c.fillStyle = gri(70); c.fillRect(i * w, 0, 2, S);
      c.fillStyle = gri(60); c.fillRect(i * w + w / 2 - 2, S * 0.15, 4, 4); c.fillRect(i * w + w / 2 - 2, S * 0.85, 4, 4);
    }
  },
  kerpic(c, S, R) {
    c.fillStyle = gri(175); c.fillRect(0, 0, S, S);
    const sira = 8, h = S / sira, w = S / 4;
    for (let r = 0; r < sira; r++) for (let i = -1; i < 5; i++) {
      const x = i * w + (r % 2) * w / 2;
      c.fillStyle = gri(200 + R() * 45);
      c.fillRect(x + 2, r * h + 2, w - 4, h - 4);
    }
    gurultu(c, S, R, 700, 3, 150, 230, 0.3);
  },
  tasBlok(c, S, R) {
    c.fillStyle = gri(120); c.fillRect(0, 0, S, S);
    const sira = 4, h = S / sira;
    for (let r = 0; r < sira; r++) {
      const w = S / 2, of = (r % 2) * w / 2;
      for (let i = -1; i < 3; i++) {
        const v = 190 + R() * 50;
        c.fillStyle = gri(v); c.fillRect(i * w + of + 3, r * h + 3, w - 6, h - 6);
        c.fillStyle = gri(255, 0.25); c.fillRect(i * w + of + 3, r * h + 3, w - 6, 4);
      }
    }
    gurultu(c, S, R, 600, 3, 140, 220, 0.3);
  },
  moloz(c, S, R) {
    c.fillStyle = gri(110); c.fillRect(0, 0, S, S);
    sarali(c, S, () => {
      const R2 = rastgele(77);
      for (let i = 0; i < 26; i++) {
        const x = R2() * S, y = R2() * S, r = 18 + R2() * 18;
        c.fillStyle = gri(175 + R2() * 70);
        c.beginPath();
        for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; const rr = r * (0.7 + R2() * 0.4); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75); }
        c.closePath(); c.fill();
      }
    });
    gurultu(c, S, R, 400, 3, 130, 230, 0.25);
  },
  kiremit(c, S) {
    c.fillStyle = gri(110); c.fillRect(0, 0, S, S);
    const sira = 6, h = S / sira, n = 6, w = S / n;
    for (let r = 0; r < sira; r++) for (let i = -1; i <= n; i++) {
      const x = i * w + (r % 2) * w / 2;
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, gri(150)); g.addColorStop(0.5, gri(240)); g.addColorStop(1, gri(150));
      c.fillStyle = g;
      c.beginPath(); c.moveTo(x + 1, r * h); c.lineTo(x + w - 1, r * h); c.lineTo(x + w - 1, r * h + h * 0.75);
      c.quadraticCurveTo(x + w / 2, r * h + h * 1.1, x + 1, r * h + h * 0.75); c.closePath(); c.fill();
    }
  },
  arduvaz(c, S, R) {
    c.fillStyle = gri(80); c.fillRect(0, 0, S, S);
    const sira = 8, h = S / sira, n = 8, w = S / n;
    for (let r = 0; r < sira; r++) for (let i = -1; i <= n; i++) {
      const x = i * w + (r % 2) * w / 2;
      c.fillStyle = gri(170 + R() * 60); c.fillRect(x + 1, r * h + 1, w - 2, h - 2);
      c.fillStyle = gri(90, 0.6); c.fillRect(x + 1, r * h + h - 4, w - 2, 3);
    }
  },
  yariAhsap(c, S, R) {
    c.fillStyle = gri(240); c.fillRect(0, 0, S, S);
    gurultu(c, S, R, 600, 3, 210, 255, 0.35);
    c.fillStyle = gri(60);
    const k = S * 0.07;
    c.fillRect(0, 0, S, k); c.fillRect(0, S - k, S, k); c.fillRect(0, 0, k, S); c.fillRect(S / 2 - k / 2, 0, k, S);
    c.save(); c.lineWidth = k * 0.9; c.strokeStyle = gri(60);
    c.beginPath(); c.moveTo(k, S - k); c.lineTo(S / 2 - k / 2, k); c.stroke();
    c.beginPath(); c.moveTo(S / 2 + k / 2, k); c.lineTo(S, S - k); c.stroke();
    c.restore();
  },
  mermer(c, S, R) {
    c.fillStyle = gri(240); c.fillRect(0, 0, S, S);
    gurultu(c, S, R, 500, 4, 215, 255, 0.3);
    c.strokeStyle = gri(170, 0.45); c.lineWidth = 1.5;
    sarali(c, S, () => {
      const R2 = rastgele(19);
      for (let i = 0; i < 5; i++) {
        let x = R2() * S, y = R2() * S; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (R2() - 0.3) * 50; y += (R2() - 0.5) * 40; c.lineTo(x, y); }
        c.stroke();
      }
    });
    c.fillStyle = gri(200, 0.5); c.fillRect(0, S - 3, S, 3); c.fillRect(S - 3, 0, 3, S);
  },
  kumas(c, S, R) {
    c.fillStyle = gri(230); c.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) { c.fillStyle = gri(i % 2 ? 250 : 175); c.fillRect((i * S) / 4, 0, S / 4, S); }
    c.strokeStyle = gri(255, 0.15);
    for (let y = 0; y < S; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(S, y); c.stroke(); }
    gurultu(c, S, R, 300, 2, 160, 255, 0.2);
  },
  toprak(c, S, R) {
    c.fillStyle = gri(190); c.fillRect(0, 0, S, S);
    const n = 8, w = S / n;
    for (let i = 0; i < n; i++) {
      const g = c.createLinearGradient(i * w, 0, i * w + w, 0);
      g.addColorStop(0, gri(130)); g.addColorStop(0.5, gri(230)); g.addColorStop(1, gri(130));
      c.fillStyle = g; c.fillRect(i * w, 0, w, S);
    }
    gurultu(c, S, R, 900, 3, 110, 240, 0.35);
  },
  ekin(c, S, R) {
    c.fillStyle = gri(120); c.fillRect(0, 0, S, S);
    const n = 8, w = S / n;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 60; k++) {
        const x = i * w + w * 0.2 + R() * w * 0.6, y = R() * S;
        c.strokeStyle = gri(190 + R() * 65); c.lineWidth = 1.5 + R() * 1.5;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 6, y - 10 - R() * 10); c.stroke();
      }
    }
  },
  hasir(c, S) {
    c.fillStyle = gri(110); c.fillRect(0, 0, S, S);
    const n = 8, h = S / n;
    for (let r = 0; r < n; r++) for (let i = 0; i < 4; i++) {
      const x = i * S / 4 + (r % 2) * S / 8;
      const g = c.createLinearGradient(0, r * h, 0, r * h + h);
      g.addColorStop(0, gri(150)); g.addColorStop(0.5, gri(235)); g.addColorStop(1, gri(140));
      c.fillStyle = g; c.fillRect(x, r * h + 1, S / 8 + 2, h - 2); c.fillRect(x - S, r * h + 1, S / 8 + 2, h - 2);
    }
    c.fillStyle = gri(70); for (let i = 0; i < 4; i++) c.fillRect((i * S) / 4 + S / 8 - 3, 0, 6, S);
  },
};

let atlas = null;
export function binaAtlasi() {
  if (atlas) return atlas;
  const S = 256, N = ATLAS_HUCRE;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S * N;
  const ctx = cv.getContext('2d');
  for (const [ad, i] of Object.entries(DOKU)) {
    const hx = (i % N) * S, hy = Math.floor(i / N) * S;
    ctx.save(); ctx.beginPath(); ctx.rect(hx, hy, S, S); ctx.clip(); ctx.translate(hx, hy);
    CIZ[ad](ctx, S, rastgele(i * 7919 + 13));
    ctx.restore();
  }
  atlas = new THREE.CanvasTexture(cv);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  atlas.generateMipmaps = true;
  atlas.minFilter = THREE.LinearMipmapLinearFilter;
  return atlas;
}

// ---------- karo dokuları (128 px, döşenebilir, gri/hafif renkli; ton malzeme renginden) ----------
const KARO_CIZ = {
  cimen(c, S, R) {
    c.fillStyle = gri(228); c.fillRect(0, 0, S, S);
    sarali(c, S, () => {
      const R2 = rastgele(5);
      for (let i = 0; i < 420; i++) {
        const x = R2() * S, y = R2() * S, v = 190 + R2() * 65;
        c.strokeStyle = gri(v, 0.8); c.lineWidth = 1;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R2() - 0.5) * 3, y - 3 - R2() * 4); c.stroke();
      }
      for (let i = 0; i < 18; i++) { c.fillStyle = gri(185 + R2() * 40, 0.3); c.beginPath(); c.arc(R2() * S, R2() * S, 6 + R2() * 10, 0, 7); c.fill(); }
    });
  },
  verimli(c, S, R) {
    c.fillStyle = gri(200); c.fillRect(0, 0, S, S);
    for (let i = 0; i < 8; i++) { // sürülmüş sıralar (yumuşak)
      const g = c.createLinearGradient(0, (i * S) / 8, 0, ((i + 1) * S) / 8);
      g.addColorStop(0, gri(192)); g.addColorStop(0.5, gri(218)); g.addColorStop(1, gri(192));
      c.fillStyle = g; c.fillRect(0, (i * S) / 8, S, S / 8);
    }
    sarali(c, S, () => {
      const R2 = rastgele(9);
      for (let i = 0; i < 500; i++) { c.fillStyle = gri(120 + R2() * 135, 0.55); c.fillRect(R2() * S, R2() * S, 2, 2); }
      for (let i = 0; i < 90; i++) {
        const x = R2() * S, y = R2() * S; c.strokeStyle = `rgba(150,190,90,${0.5 + R2() * 0.4})`;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R2() - 0.5) * 3, y - 4); c.stroke();
      }
    });
  },
  orman(c, S, R) {
    KARO_CIZ.cimen(c, S, R);
    sarali(c, S, () => { const R2 = rastgele(31); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(90,70,40,${0.3 + R2() * 0.3})`; c.fillRect(R2() * S, R2() * S, 4, 2); } });
  },
  tasli(c, S, R) {
    c.fillStyle = gri(200); c.fillRect(0, 0, S, S);
    sarali(c, S, () => {
      const R2 = rastgele(41);
      for (let i = 0; i < 30; i++) {
        const x = R2() * S, y = R2() * S, r = 4 + R2() * 9;
        c.fillStyle = gri(150 + R2() * 100); c.beginPath(); c.ellipse(x, y, r, r * 0.7, R2() * 3, 0, 7); c.fill();
        c.fillStyle = gri(255, 0.3); c.beginPath(); c.ellipse(x - 1, y - 1, r * 0.5, r * 0.3, 0, 0, 7); c.fill();
      }
    });
  },
  su(c, S, R) {
    c.fillStyle = gri(220); c.fillRect(0, 0, S, S);
    sarali(c, S, () => {
      const R2 = rastgele(51);
      for (let i = 0; i < 24; i++) {
        const x = R2() * S, y = R2() * S; c.strokeStyle = gri(255, 0.35); c.lineWidth = 1.5;
        c.beginPath(); c.arc(x, y, 6 + R2() * 8, 3.6, 5.8); c.stroke();
      }
    });
  },
  kil(c, S, R) {
    c.fillStyle = gri(215); c.fillRect(0, 0, S, S);
    sarali(c, S, () => {
      const R2 = rastgele(61);
      for (let i = 0; i < 26; i++) {
        c.strokeStyle = gri(130, 0.5); c.lineWidth = 1;
        let x = R2() * S, y = R2() * S; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (R2() - 0.5) * 22; y += (R2() - 0.5) * 22; c.lineTo(x, y); }
        c.stroke();
      }
    });
  },
  cevher(c, S, R) {
    KARO_CIZ.tasli(c, S, R);
    sarali(c, S, () => { const R2 = rastgele(71); for (let i = 0; i < 26; i++) { c.fillStyle = `rgba(${200 + R2() * 55},${120 + R2() * 60},${60},0.85)`; c.fillRect(R2() * S, R2() * S, 3, 3); } });
  },
  mermer(c, S, R) { CIZ.mermer(c, S, R); },
  kayalik(c, S, R) { KARO_CIZ.tasli(c, S, R); },
  dag(c, S, R) { KARO_CIZ.tasli(c, S, R); },
  yol(c, S, R) { KARO_CIZ.verimli(c, S, R); },
  sis(c, S) { c.fillStyle = gri(255); c.fillRect(0, 0, S, S); },
};

const karoDoku = {};
export function karoDokusu(id) {
  if (karoDoku[id]) return karoDoku[id];
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  (KARO_CIZ[id] || KARO_CIZ.cimen)(ctx, S, rastgele(id.length * 131));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  karoDoku[id] = t;
  return t;
}

// Yol çıkartması atlası: 16 bağlantı maskesi (1: -z, 2: +x, 4: +z, 8: -x), 4×4 hücre, 96 px, saydam zemin.
let yolAtlas = null;
export function yolAtlasi() {
  if (yolAtlas) return yolAtlas;
  const S = 96, N = 4;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S * N;
  const c = cv.getContext('2d');
  for (let m = 0; m < 16; m++) {
    const hx = (m % N) * S, hy = Math.floor(m / N) * S;
    c.save(); c.translate(hx, hy); c.beginPath(); c.rect(0, 0, S, S); c.clip();
    // zemin saydam (altında mevsimlik çimen karosu görünür)
    const R = rastgele(m + 11);
    const yol = (fn) => { c.save(); fn(); c.restore(); };
    const w = S * 0.46, o = S / 2;
    const kollar = [];
    if (m & 1) kollar.push([o, 0]); if (m & 2) kollar.push([S, o]); if (m & 4) kollar.push([o, S]); if (m & 8) kollar.push([0, o]);
    if (!kollar.length) kollar.push([o, o]);
    const ciz = (gen, renk) => {
      c.strokeStyle = renk; c.lineWidth = gen; c.lineCap = 'round';
      for (const [x, y] of kollar) { c.beginPath(); c.moveTo(o, o); c.lineTo(x, y); c.stroke(); }
      c.fillStyle = renk; c.beginPath(); c.arc(o, o, gen / 2, 0, 7); c.fill();
    };
    yol(() => {
      ciz(w + 10, 'rgba(120,100,60,0.45)'); // kenar gölgesi / ezilmiş çimen
      ciz(w, 'rgb(196,160,104)');
      // tekerlek izleri + çakıl
      c.globalAlpha = 0.5; ciz(w * 0.62, 'rgb(170,134,84)'); c.globalAlpha = 1;
      ciz(w * 0.3, 'rgb(200,166,110)');
      for (let i = 0; i < 70; i++) {
        const t = R(); const k = kollar[Math.floor(R() * kollar.length)];
        const x = o + (k[0] - o) * t + (R() - 0.5) * w * 0.8, y = o + (k[1] - o) * t + (R() - 0.5) * w * 0.8;
        c.fillStyle = gri(150 + R() * 100, 0.8); c.beginPath(); c.arc(x, y, 1 + R() * 2.2, 0, 7); c.fill();
      }
    });
    c.restore();
  }
  yolAtlas = new THREE.CanvasTexture(cv);
  yolAtlas.colorSpace = THREE.SRGBColorSpace;
  yolAtlas.generateMipmaps = false;
  yolAtlas.minFilter = THREE.LinearFilter;
  return yolAtlas;
}
