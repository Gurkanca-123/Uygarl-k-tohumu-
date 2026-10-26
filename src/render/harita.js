// Harita çizimi: karo türüne göre InstancedMesh (kutu karolar) + süs nesneleri (ağaç, dağ, kaya). Sis = keşfedilmemiş karo.
// Çekirdeği yalnız okur: gorunurKaro(d, x, y) → karo id | null (sis).
import * as THREE from 'three';
import { KAROLAR } from '../data/karolar.js';
import { gorunurKaro } from '../world/kesif.js';

// renk, yükseklik, mevsim duyarlılığı (0..1: mevsim tonu bu oranda karışır)
const STIL = {
  cimen: { renk: 0x6aa047, h: 0.30, m: 1 },
  verimli: { renk: 0x7b6a3c, h: 0.30, m: 0.5 },
  orman: { renk: 0x4f8a3a, h: 0.30, m: 1 },
  tasli: { renk: 0x9a958a, h: 0.36, m: 0.3 },
  su: { renk: 0x3f77b5, h: 0.14, m: 0.5 },
  kil: { renk: 0xb5703f, h: 0.32, m: 0.2 },
  cevher: { renk: 0x7a6a8a, h: 0.38, m: 0.2 },
  mermer: { renk: 0xe6e2da, h: 0.38, m: 0.2 },
  kayalik: { renk: 0x8c8a86, h: 0.46, m: 0.3 },
  dag: { renk: 0x6d6a66, h: 0.9, m: 0.35 },
  yol: { renk: 0xb89a62, h: 0.32, m: 0.1 },
  sis: { renk: 0x1b1812, h: 0.6, m: 0 },
};
const KAYA_RENK = { tasli: 0xaaa59a, kayalik: 0x7d7b77, cevher: 0x9a7ab0, mermer: 0xf2efe8 };

// mevsim tonu: renk, karışım oranı, ışık rengi, ışık şiddeti, ortam şiddeti
export const MEVSIM_STIL = {
  bahar: { ton: 0xa8e070, k: 0.10, isik: 0xfff2dd, siddet: 2.5, ortam: 1.0 },
  yaz: { ton: 0xe8d060, k: 0.16, isik: 0xffe8b0, siddet: 2.8, ortam: 1.0 },
  guz: { ton: 0xd8832e, k: 0.40, isik: 0xffd9a8, siddet: 2.3, ortam: 0.95 },
  kis: { ton: 0xeef3fa, k: 0.70, isik: 0xdfe8ff, siddet: 2.0, ortam: 1.15 },
};

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

export class HaritaCizim {
  constructor(grup) {
    this.grup = grup;
    this.mesh = {};
    this.anahtar = null;
    this.mevsim = 'bahar';
    this.agac = null; this.tepe = null; this.kaya = null;
    this.kutuMat = {};
    for (const [id, s] of Object.entries(STIL)) {
      this.kutuMat[id] = new THREE.MeshLambertMaterial({ color: s.renk });
    }
    this.agacMat = new THREE.MeshLambertMaterial({ color: 0x2f6b2f });
    this.tepeMat = new THREE.MeshLambertMaterial({ color: 0x77736e, flatShading: true });
    this.kayaMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    this.geo = {};
    for (const [id, s] of Object.entries(STIL)) {
      const g = new THREE.BoxGeometry(1, s.h, 1);
      g.translate(0, s.h / 2 - 0.0, 0);
      this.geo[id] = g;
    }
    this.agacGeo = new THREE.ConeGeometry(0.26, 0.8, 6).translate(0, 0.4, 0);
    this.tepeGeo = new THREE.ConeGeometry(0.75, 1.5, 5).translate(0, 0.75, 0);
    this.kayaGeo = new THREE.DodecahedronGeometry(0.15).translate(0, 0.08, 0);
  }

  mevsimAyarla(id) {
    this.mevsim = MEVSIM_STIL[id] ? id : 'bahar';
    const ms = MEVSIM_STIL[this.mevsim];
    for (const [kid, s] of Object.entries(STIL)) {
      const c = new THREE.Color(s.renk);
      if (kid === 'su' && this.mevsim === 'kis') c.lerp(new THREE.Color(0xa8c8e0), 0.55);
      else c.lerp(new THREE.Color(ms.ton), ms.k * s.m);
      this.kutuMat[kid].color.copy(c);
    }
    this.agacMat.color.setHex(0x2f6b2f).lerp(new THREE.Color(ms.ton), ms.k * 0.9);
    this.tepeMat.color.setHex(0x77736e).lerp(new THREE.Color(0xffffff), this.mevsim === 'kis' ? 0.5 : 0);
  }

  temizle() {
    for (const m of [...Object.values(this.mesh), this.agac, this.tepe, this.kaya]) {
      if (m) { this.grup.remove(m); m.dispose?.(); }
    }
    this.mesh = {}; this.agac = this.tepe = this.kaya = null;
  }

  // Dönüş: yeniden çizildi mi.
  guncelle(d) {
    const anahtar = `${d.harita.kesif}|${d.cag}|${JSON.stringify(d.harita.degisim)}`;
    if (anahtar === this.anahtar) return false;
    this.anahtar = anahtar;
    this.temizle();
    const n = d.harita.boyut;
    const gruplar = {};
    for (const id of Object.keys(STIL)) gruplar[id] = [];
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const id = gorunurKaro(d, x, y) ?? 'sis';
        (gruplar[id] || gruplar.cimen).push(x, y);
      }
    }
    const m4 = new THREE.Matrix4();
    const renk = new THREE.Color();
    const agaclar = [], tepeler = [], kayalar = [];
    for (const [id, liste] of Object.entries(gruplar)) {
      const adet = liste.length / 2;
      if (!adet) continue;
      const im = new THREE.InstancedMesh(this.geo[id], this.kutuMat[id], adet);
      im.receiveShadow = id !== 'sis';
      im.castShadow = id === 'dag' || id === 'kayalik';
      for (let i = 0; i < adet; i++) {
        const x = liste[2 * i], y = liste[2 * i + 1];
        const yuksek = id === 'dag' ? 0.85 + hash(x, y, 3) * 0.3 : 1;
        m4.makeScale(1, yuksek, 1).setPosition(x + 0.5, 0, y + 0.5);
        im.setMatrixAt(i, m4);
        const j = 0.93 + hash(x, y, 1) * 0.14;
        im.setColorAt(i, renk.setRGB(j, j, j));
        if (id === 'orman') {
          for (let k = 0; k < 2; k++) {
            agaclar.push([x + 0.28 + k * 0.44 + (hash(x, y, 5 + k) - 0.5) * 0.2, y + 0.3 + (hash(x, y, 7 + k) - 0.2) * 0.45, 0.8 + hash(x, y, 9 + k) * 0.5]);
          }
        } else if (id === 'dag') {
          tepeler.push([x + 0.5, y + 0.5, 0.8 + hash(x, y, 11) * 0.6, STIL.dag.h * yuksek]);
        } else if (KAYA_RENK[id]) {
          for (let k = 0; k < 2; k++) kayalar.push([x + 0.3 + k * 0.4, y + 0.3 + hash(x, y, 13 + k) * 0.4, id, STIL[id].h]);
        }
      }
      im.instanceColor.needsUpdate = true;
      im.instanceMatrix.needsUpdate = true;
      this.mesh[id] = im;
      this.grup.add(im);
    }
    if (agaclar.length) {
      this.agac = new THREE.InstancedMesh(this.agacGeo, this.agacMat, agaclar.length);
      agaclar.forEach(([x, z, s], i) => {
        m4.makeScale(s, s, s).setPosition(x, STIL.orman.h, z);
        this.agac.setMatrixAt(i, m4);
        const j = 0.85 + hash(i, 1, 2) * 0.3;
        this.agac.setColorAt(i, renk.setRGB(j, j, j));
      });
      this.agac.castShadow = true; this.agac.receiveShadow = false;
      this.grup.add(this.agac);
    }
    if (tepeler.length) {
      this.tepe = new THREE.InstancedMesh(this.tepeGeo, this.tepeMat, tepeler.length);
      tepeler.forEach(([x, z, s, h], i) => {
        m4.makeScale(s, s, s).setPosition(x, h, z);
        this.tepe.setMatrixAt(i, m4);
      });
      this.tepe.castShadow = true;
      this.grup.add(this.tepe);
    }
    if (kayalar.length) {
      this.kaya = new THREE.InstancedMesh(this.kayaGeo, this.kayaMat, kayalar.length);
      kayalar.forEach(([x, z, id, h], i) => {
        m4.makeScale(1, 1, 1).setPosition(x, h, z);
        this.kaya.setMatrixAt(i, m4);
        this.kaya.setColorAt(i, renk.setHex(KAYA_RENK[id]));
      });
      this.kaya.castShadow = true;
      this.grup.add(this.kaya);
    }
    this.mevsimAyarla(this.mevsim);
    return true;
  }
}

export const KARO_ADLARI = Object.fromEntries(KAROLAR.map((k) => [k.id, k.ad]));
