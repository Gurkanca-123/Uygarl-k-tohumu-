// Stil BD — "yüksek stilize" (`?stil=bd`, deneme): D'nin görsel arazi katmanı (yükseklik, kıyı, bitki, hayvan, iskele)
// + B'nin cel ışığı ve koyu kahve kenar çizgisi. Temiz renk blokları: boyalı leke/fırça gürültüsü yok; çimde uzaktan
// okunan ince öbek deseni, kayada düz faset bantları, suda düz renk bantları + dalga çizgisi + köpük halkası.
// Performans: ağaç/çalı için iki LOD (uzak zoom'da tek düşük ayrıntılı ağ; yakın zoom'da görüş merkezine yakın öbekler
// yüksek, uzaktakiler düşük ayrıntı), arazi 16×16 karo öbeklerinde; bina eklenince yalnız toprak/patika imzası değişen
// arazi öbeklerinin rengi yeniden hesaplanır (yükseklik alanı yeniden kurulmaz). Kalite: yuksek / standart / performans.
import * as THREE from 'three';
import {
  StilD, araziMat, suMat, birlestir, bozuk, govde, hash, gurultu, ZEMIN, SU_Y, yesil,
} from './stil_d.js';
import { MEVSIM_STIL } from './harita.js';

const LOD_OBEK = 16, ARAZI_OBEK = 16;
// kalite → süs yoğunluğu (0..1)
const YOGUNLUK = {
  yuksek: { ot: 0.15, cicek: 0.6, cali: 1, kaya: 1 },
  standart: { ot: 0.08, cicek: 0.3, cali: 0.5, kaya: 0.7 },
  performans: { ot: 0, cicek: 0, cali: 0.2, kaya: 0.4 },
};

// ---------- gölgelendirici gövdeleri ----------
const ARAZI_BD = `  {
    vec2 p = vDP.xz;
    float cim = vYuzey.y, kaya = vYuzey.x;
    vec3 c = diffuseColor.rgb;
    float fw = length(fwidth(p));
    // temiz iki tonlu lekeler (dar geçiş, gürültü yok)
    float lek = dGur(p * 0.38) * 0.6 + dGur(p * 1.1 + 7.0) * 0.4;
    c *= mix(1.0, mix(0.93, 1.07, smoothstep(0.48, 0.52, lek)), cim);
    // çim deseni: jitterli hücrede ekranda dik duran küçük öbek (koyu taban + açık uç); iki ölçek, piksel yoğunluğuyla söner
    float desen = 0.0;
    for (int k = 0; k < 2; k++) {
      float s = k == 0 ? 2.3 : 5.2;
      vec2 q = p * s, id = floor(q), f = fract(q) - 0.5;
      f -= (vec2(dHash(id), dHash(id + 3.7)) - 0.5) * 0.4;
      vec2 u = vec2(f.x - f.y, f.x + f.y) * 0.7071;  // izometri: u.x ekran yatayı, u.y ekran derinliği
      float taban = smoothstep(0.15, 0.09, length(u * vec2(2.8, 1.0)));
      float uc = smoothstep(0.12, 0.06, length((u + vec2(0.0, 0.1)) * vec2(2.8, 1.25)));
      float sonum = 1.0 - smoothstep(0.16, 0.36, fw * s);
      desen += (uc * 0.8 - taban * 0.35) * step(0.3, dHash(id + 9.1)) * sonum * (k == 0 ? 1.0 : 0.75);
    }
    c *= 1.0 + desen * 0.17 * cim;
    // kaya: düz faset bantları + net çatlak çizgisi
    float bant = dGur(vec2((vDP.x - vDP.z) * 0.9, vDP.y * 9.0));
    float bq = floor(bant * 3.0) * 0.5;
    float catlak = 1.0 - smoothstep(0.0, 0.035, abs(dGur(vec2((vDP.x + vDP.z) * 3.0, vDP.y * 5.0)) - 0.5));
    float dik = 1.0 - smoothstep(0.55, 0.9, vDN.y);
    c = mix(c, c * (0.8 + 0.28 * bq) * (1.0 - 0.38 * catlak), kaya * max(dik, 0.3));
    diffuseColor.rgb = c;
  }`;

const SU_BD = `  {
    vec2 uv = (vSuP.xz - uYukMin) / uYukBoy;
    float hz = texture2D(uYuk, uv).r * YUK_AR + YUK_MN;
    float der = SU_SEV - hz;
    float t = uZaman;
    float dal = dGur(vSuP.xz * 2.2 + vec2(t * 0.2, t * 0.13)) * 0.6 + dGur(vSuP.xz * 4.7 - vec2(t * 0.16, -t * 0.22)) * 0.4;
    float dq = der + (dal - 0.5) * 0.035;
    float fd = max(fwidth(der), 0.002);
    // düz renk bantları: sığ turkuaz / orta mavi / derin lacivert
    vec3 c = mix(uSig, uOrta, smoothstep(0.075 - fd, 0.075 + fd, dq));
    c = mix(c, uDerin, smoothstep(0.24 - fd, 0.24 + fd, dq));
    // dalga çizgileri: akan gürültünün eş-yükselti çizgileri, kesik ve ince
    float wv = dGur(vSuP.xz * vec2(1.1, 2.6) + vec2(t * 0.1, t * 0.04)) * 3.0;
    float fw = max(fwidth(wv), 0.01);
    float cz = 1.0 - smoothstep(0.0, fw * 1.4, abs(fract(wv) - 0.5) - 0.02);
    cz *= step(0.55, dGur(vSuP.xz * 0.9 - t * 0.05)) * smoothstep(0.04, 0.1, der);
    c = mix(c, mix(c, uKopuk, 0.6), cz);
    // köpük: kıyıda dolu şerit + açıkta ikinci ince halka
    float kop = 1.0 - smoothstep(0.024 + 0.01 * dal - fd, 0.024 + 0.01 * dal + fd, der);
    float hk = 0.055 + 0.012 * sin(t * 1.3 + dal * 6.0);
    float halka = 1.0 - smoothstep(0.0, fd * 1.5 + 0.002, abs(der - hk) - 0.004);
    c = mix(c, uKopuk, max(kop, halka * 0.85));
    c = mix(c, vec3(0.82, 0.9, 0.96), uKar * 0.5);
    diffuseColor.rgb = c;
    // parlak vurgu noktaları (küçük, net)
    float pr = dGur(vSuP.xz * 8.0 + vec2(t * 0.5, -t * 0.35)) * dGur(vSuP.xz * 12.0 - vec2(t * 0.4, t * 0.3));
    totalEmissiveRadiance += vec3(1.0, 0.94, 0.8) * smoothstep(0.66, 0.7, pr) * 0.9 + c * 0.12;
  }`;

// ---------- iki LOD'lu bitki geometrileri ----------
// yuvarlak, hacimli tepeler: hafif bozulmuş ikosahedron + küresel normal (cel ışığında net ışık/gölge yarısı)
// loblu tepe: tek ikosahedron (det 1), yöne bağlı yumuşak gürültüyle 3–4 şişkin lob (bulut gibi taç, 80 üçgen)
function lobluTepe(r, x, y, z, t) {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i) / r, vy = p.getY(i) / r, vz = p.getZ(i) / r;
    const f = 0.86 + 0.3 * gurultu(vx * 1.6 + t * 3.1 + 5, vz * 1.6 + vy * 1.2 + 5, t) - (vy < -0.4 ? 0.1 : 0);
    p.setXYZ(i, vx * r * f, vy * r * f * 0.92, vz * r * f);
  }
  return g.translate(x, y, z);
}
const tepe = (r, x, y, z, t, det) => bozuk(new THREE.IcosahedronGeometry(r, det), r * (det ? 0.12 : 0.2), t).translate(x, y, z);
function bitkiGeolari() {
  const yaprak = {
    hi: birlestir([
      { geo: govde(0.035, 0.055, 0.38), renk: 0x6b4a2e, gradyan: [0.7, 1] },
      { geo: lobluTepe(0.33, 0.02, 0.56, 0, 1), renk: 0xffffff, gradyan: [0.78, 1.08], kure: [0.02, 0.56, 0] },
    ]),
    lo: birlestir([
      { geo: govde(0.035, 0.055, 0.38), renk: 0x6b4a2e, gradyan: [0.7, 1] },
      { geo: tepe(0.34, 0.02, 0.56, 0, 1, 0).scale(1.05, 1, 1.05), renk: 0xffffff, gradyan: [0.78, 1.08], kure: [0.02, 0.56, 0] },
    ]),
  };
  const igneP = (seg, kat) => {
    const ig = [{ geo: govde(0.03, 0.045, 0.25), renk: 0x5e4028, gradyan: [0.7, 1] }];
    for (let k = 0; k < kat; k++) {
      const f = kat === 3 ? k : k * 1.5;
      const r = 0.32 - f * 0.08, h = 0.4 - f * 0.04, y = 0.14 + f * 0.21;
      ig.push({ geo: bozuk(new THREE.ConeGeometry(r, h, seg, 1, true), 0.02, 10 + k).translate(0, y + h / 2, 0), renk: 0xffffff, gradyan: [0.66, 1.08 + k * 0.04] });
    }
    return birlestir(ig);
  };
  const igne = { hi: igneP(8, 3), lo: igneP(5, 2) };
  const kavak = {
    hi: birlestir([
      { geo: govde(0.025, 0.035, 0.2), renk: 0x6b4a2e },
      { geo: tepe(0.16, 0, 0.44, 0, 5, 1).scale(1, 2.0, 1), renk: 0xffffff, gradyan: [0.72, 1.12], kure: [0, 0.8, 0] },
    ]),
    lo: birlestir([
      { geo: govde(0.025, 0.035, 0.2), renk: 0x6b4a2e },
      { geo: tepe(0.16, 0, 0.44, 0, 5, 0).scale(1, 2.0, 1), renk: 0xffffff, gradyan: [0.72, 1.12], kure: [0, 0.8, 0] },
    ]),
  };
  const cali = {
    hi: birlestir([
      { geo: tepe(0.12, 0, 0.08, 0, 7, 0), renk: 0xffffff, gradyan: [0.7, 1.08], kure: [0, 0.06, 0] },
      { geo: tepe(0.09, 0.09, 0.05, 0.05, 8, 0), renk: 0xeef4e8, gradyan: [0.7, 1.05], kure: [0.09, 0.04, 0.05] },
    ], 0.4),
    lo: birlestir([{ geo: tepe(0.13, 0.03, 0.07, 0.02, 7, 0), renk: 0xffffff, gradyan: [0.7, 1.08], kure: [0.03, 0.05, 0.02] }], 0.4),
  };
  // kaya / kaya kulesi: düz yüzlü (faset) düşük çokgen
  const kaya = bozuk(new THREE.IcosahedronGeometry(0.13, 0), 0.05, 4).scale(1.1, 0.7, 1).translate(0, 0.05, 0);
  kaya.computeVertexNormals();
  const blok = (r, sx, sy, sz, x, y, z, t) => bozuk(new THREE.IcosahedronGeometry(r, 0), r * 0.25, t).scale(sx, sy, sz).translate(x, y, z);
  const kule = birlestir([
    { geo: blok(0.36, 1.3, 0.6, 1.15, 0, 0.08, 0, 31), renk: 0xb0a898, gradyan: [0.75, 1.0] },
    { geo: blok(0.27, 1.1, 0.85, 0.95, 0.06, 0.32, -0.04, 32), renk: 0xbcb3a2, gradyan: [0.8, 1.05] },
    { geo: blok(0.17, 1, 0.9, 1, -0.02, 0.54, 0.02, 33), renk: 0xc8bfae, gradyan: [0.85, 1.1] },
  ]);
  return { yaprak, igne, kavak, cali, kaya, kule };
}

export class StilBD extends StilD {
  constructor(sahne) {
    super(sahne);
    this.kalite = 'yuksek';
    this.bitki = bitkiGeolari();
    this.araziMat = araziMat(ARAZI_BD, 'bd-arazi');
    this.agac = { ...this.agac, kule: this.bitki.kule };
    this.kayaGeo = this.bitki.kaya;
    this.obekBoy = 32; // LOD'suz süs (ot, çiçek, kaya…) büyük öbekte: daha az çizim çağrısı
    this.lodObek = [];   // { x, z, hi: [mesh], lo: [mesh] }
    this.lodGenel = [];  // uzak zoom: tüm harita tek düşük ayrıntılı ağ
    this.arazi = [];     // { i0, i1, j0, j1, geo, imza }
    this.susMesh = [];
    this.sure = {};
  }

  kaliteAyarla(seviye) {
    if (!YOGUNLUK[seviye] || seviye === this.kalite) return;
    this.kalite = seviye;
    this.anahtar = null;
  }

  suMalzeme(doku) {
    const g = SU_BD.replace('YUK_AR', '2.20').replace('YUK_MN', '-0.30').replace('SU_SEV', SU_Y.toFixed(3));
    const m = suMat(doku, g, 'bd-su');
    const u = m.userData.u;
    u.uSig.value.setHex(0x52e0c8); u.uOrta.value.setHex(0x2aa6dc); u.uDerin.value.setHex(0x1f62b0);
    return m;
  }

  alanHazirla(d) {
    const A = super.alanHazirla(d);
    if (A) { A.toprakKenar = [0.1, 0.2]; A.dagYuksekKaya = 0.25; } // temiz renk bloğu: toprak/çim geçişi dar; teras üstleri yeşil
    return A;
  }

  palet(ms) {
    const P = super.palet(ms);
    const ton = new THREE.Color(ms.ton);
    const C = (hex, m = 1) => new THREE.Color(hex).lerp(ton, ms.k * m);
    // zeytin yeşili çim (limon değil), sıcak kum, temiz toprak
    return Object.assign(P, {
      cim: C(0x4c7834, 0.25), cimA: C(0x5e8a42, 0.25), cimK: C(0x34582c, 0.25), orman: C(0x2a4e28, 0.25),
      verimli: C(0x766a3c, 0.2), verimliY: C(0x5e7c36), yosun: C(0x6e8a3e, 0.6), kum: C(0xe6d6a6, 0.1), kumIslak: C(0xae9a74, 0.1),
      toprak: C(0x7a664e, 0.05), toprakK: C(0x6c5a44, 0.05),
      kaya: C(0x928c84, 0.1), kayaK: C(0x5c5856, 0.1), kayaA: C(0xbab4a8, 0.1), tasli: C(0x9a968a, 0.1),
    });
  }

  isik() {
    super.isik();
    const ms = MEVSIM_STIL[this.mevsimId] || MEVSIM_STIL.yaz;
    const zeytin = new THREE.Color(0x5e7e36);
    for (const t of ['yaprak', 'kavak']) this.agacMat[t].color.lerp(zeytin, ms.kar ? 0 : 0.3);
    this.agacMat.cali.color.setHex(ms.agac.yaprak).lerp(new THREE.Color(0x587a34), 0.5);
    this.otMat.color.lerp(zeytin, 0.45);
    // cel gölge bandı fazla koyulaşmasın: ortam ışığı biraz yüksek, yer rengi serin
    const s = this.s;
    s.hemi.intensity = ms.ortam * 1.05;
    s.hemi.groundColor.lerp(new THREE.Color(0x6a7088), 0.35);
  }

  tik() {
    const s = this.s, h = s.harita;
    if (!h || !s.durum) return;
    if (this.mevsimId !== s.mevsimId) { this.mevsimId = s.mevsimId; this.isik(); }
    const anahtar = `${h.anahtar}|${h.mevsim}|${this.kalite}`;
    const t0 = performance.now();
    if (anahtar !== this.anahtar) {
      this.anahtar = anahtar; this.binaAnahtar = s.anahtarlar.bina;
      this.kur(s.durum);
      this.sure.tam = performance.now() - t0;
      s.renderer.shadowMap.needsUpdate = true;
    } else if (this.binaAnahtar !== s.anahtarlar.bina) {
      this.binaAnahtar = s.anahtarlar.bina;
      this.binaGuncelle(s.durum);
      this.sure.bina = performance.now() - t0;
      s.renderer.shadowMap.needsUpdate = true;
    }
    for (const [k, m] of Object.entries(h.mesh)) if (m && k !== 'sis' && k !== 'yolCikartma') m.visible = false;
    const z = s.kamera.zoom;
    const yakin = z > 1.25;
    for (const m of this.ince) m.visible = yakin;
    // LOD: uzak zoom → tek genel düşük ağ; yakında görüş merkezine yakın öbek yüksek ayrıntı
    for (const m of this.lodGenel) m.visible = !yakin;
    const r = 1.5 + 9 / z, hx = s.hedef.x, hz = s.hedef.z;
    for (const o of this.lodObek) {
      const d = Math.hypot(Math.max(o.x - hx, 0, hx - o.x - LOD_OBEK), Math.max(o.z - hz, 0, hz - o.z - LOD_OBEK));
      const hi = yakin && d < r;
      for (const m of o.hi) m.visible = hi;
      for (const m of o.lo) m.visible = yakin && !hi;
    }
  }

  temizle() {
    super.temizle();
    this.lodObek = []; this.lodGenel = []; this.arazi = []; this.susMesh = [];
    this.A = null;
  }

  // ---------- arazi: öbekli ağ, merkez farklı normaller ----------
  araziKur(A) {
    const { G, H, R, h, sDag } = A;
    const nor = new Float32Array(A.V * 3);
    for (let j = 0; j < H; j++) for (let i = 0; i < G; i++) {
      const v = j * G + i;
      const dx = (h[j * G + Math.min(G - 1, i + 1)] - h[j * G + Math.max(0, i - 1)]) * R / ((i > 0 && i < G - 1) ? 2 : 1);
      const dz = (h[Math.min(H - 1, j + 1) * G + i] - h[Math.max(0, j - 1) * G + i]) * R / ((j > 0 && j < H - 1) ? 2 : 1);
      const l = Math.hypot(dx, 1, dz);
      nor[v * 3] = -dx / l; nor[v * 3 + 1] = 1 / l; nor[v * 3 + 2] = -dz / l;
    }
    A.nor = nor;
    this.dagBoya(A, (v) => nor[v * 3 + 1]);
    A.col0 = A.col.slice(); A.yuz0 = A.yuz.slice();
    const S = ARAZI_OBEK * R;
    for (let j0 = 0; j0 < H - 1; j0 += S) for (let i0 = 0; i0 < G - 1; i0 += S) {
      const i1 = Math.min(G - 1, i0 + S), j1 = Math.min(H - 1, j0 + S), g = i1 - i0 + 1, hh = j1 - j0 + 1;
      const pos = new Float32Array(g * hh * 3), nr = new Float32Array(g * hh * 3);
      let dag = false;
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const v = j * G + i, l = (j - j0) * g + (i - i0);
        for (let q = 0; q < 3; q++) { pos[l * 3 + q] = A.pos[v * 3 + q]; nr[l * 3 + q] = nor[v * 3 + q]; }
        if (sDag[v] > 0) dag = true;
      }
      const idx = new (g * hh > 65535 ? Uint32Array : Uint16Array)((g - 1) * (hh - 1) * 6);
      let k = 0;
      for (let j = 0; j < hh - 1; j++) for (let i = 0; i < g - 1; i++) {
        const a = j * g + i, b = a + 1, c = a + g, e = c + 1;
        if ((i + i0 + j + j0) & 1) { idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = e; }
        else { idx[k++] = a; idx[k++] = c; idx[k++] = e; idx[k++] = a; idx[k++] = e; idx[k++] = b; }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nr, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g * hh * 3), 3));
      geo.setAttribute('aYuzey', new THREE.BufferAttribute(new Float32Array(g * hh * 2), 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      const o = { i0, i1, j0, j1, geo };
      this.obekBoya(A, o);
      const m = new THREE.Mesh(geo, this.araziMat);
      m.castShadow = dag; m.receiveShadow = true;
      this.grup.add(m); this.mesh.push(m);
      this.arazi.push(o);
    }
    for (const o of this.arazi) this.araziRenk(A, o); // ortak kenar köşeleri komşu öbekte boyanır → kopya en sonda
    this.A = A;
  }

  // öbeği etkileyen bina dikdörtgenleri + patikalar (toprak boyası yalnız bunlara bağlı)
  araziEtki(A, o) {
    const { R, x0, z0 } = A, M = 0.7;
    const ax = x0 + o.i0 / R - M, bx = x0 + o.i1 / R + M, az = z0 + o.j0 / R - M, bz = z0 + o.j1 / R + M;
    const ic = (p, q, r, t) => !(Math.max(p, r) < ax || Math.min(p, r) > bx || Math.max(q, t) < az || Math.min(q, t) > bz);
    return [A.rect.filter((r) => ic(...r)), A.yollar.filter((y) => ic(...y))];
  }

  // öbeğin kendi köşeleri (üst kenar komşunun; harita sonu hariç): taban renge dön + yalnız yakın bina/patikayla boya
  obekBoya(A, o) {
    const { G, H } = A, [rect, yollar] = this.araziEtki(A, o);
    o.imza = JSON.stringify([rect, yollar]);
    const i1 = o.i1 === G - 1 ? o.i1 : o.i1 - 1, j1 = o.j1 === H - 1 ? o.j1 : o.j1 - 1;
    for (let j = o.j0; j <= j1; j++) {
      const a = j * G + o.i0, b = j * G + i1 + 1;
      A.col.set(A.col0.subarray(a * 3, b * 3), a * 3); A.yuz.set(A.yuz0.subarray(a * 2, b * 2), a * 2);
    }
    this.toprakBoya(A, o.i0, i1, o.j0, j1, rect, yollar);
  }

  araziRenk(A, o) {
    const { G } = A, g = o.i1 - o.i0 + 1;
    const c = o.geo.getAttribute('color'), y = o.geo.getAttribute('aYuzey');
    for (let j = o.j0; j <= o.j1; j++) for (let i = o.i0; i <= o.i1; i++) {
      const v = j * G + i, l = (j - o.j0) * g + (i - o.i0);
      c.array[l * 3] = A.col[v * 3]; c.array[l * 3 + 1] = A.col[v * 3 + 1]; c.array[l * 3 + 2] = A.col[v * 3 + 2];
      y.array[l * 2] = A.yuz[v * 2]; y.array[l * 2 + 1] = A.yuz[v * 2 + 1];
    }
    c.needsUpdate = true; y.needsUpdate = true;
  }

  // bina değişti: yükseklik alanı aynı; yalnız imzası değişen arazi öbeklerinde toprak/patika boyası + süs listesi
  binaGuncelle(d) {
    const A = this.A, t0 = performance.now();
    A.d = d;
    this.binaBilgi(A);
    const tb = performance.now();
    const degisen = this.arazi.filter((o) => JSON.stringify(this.araziEtki(A, o)) !== o.imza);
    for (const o of degisen) this.obekBoya(A, o);
    for (const o of degisen) this.araziRenk(A, o);
    this.sure.obek = degisen.length;
    const t1 = performance.now();
    // süs: yer listeleri ucuz; ağlar yeniden
    for (const m of this.susMesh) { this.grup.remove(m); if (m.isInstancedMesh && !m.userData.paylasim) m.dispose(); }
    const sus = new Set(this.susMesh);
    this.mesh = this.mesh.filter((m) => !sus.has(m));
    this.ince = []; this.lodObek = []; this.lodGenel = []; this.susMesh = [];
    const L = this.sacilim(A);
    const t2 = performance.now();
    this.susKur(L);
    this.sure.parca = `bilgi ${(tb - t0).toFixed(1)} ms, arazi ${(t1 - tb).toFixed(1)} ms, sacilim ${(t2 - t1).toFixed(1)} ms, süs ${(performance.now() - t2).toFixed(1)} ms`;
  }

  // ---------- süs: yoğunluk + LOD ----------
  instanced(geo, mat, liste, yap, golge = true, ince = false) {
    const once = this.mesh.length;
    super.instanced(geo, mat, liste, yap, golge, ince);
    this.susMesh.push(...this.mesh.slice(once));
  }

  susKur(L) {
    const Y = YOGUNLUK[this.kalite];
    const sec = (liste, y, s) => (y >= 1 ? liste : liste.filter((e) => hash(Math.floor(e.x * 7), Math.floor(e.z * 7), s) < y));
    const { agac, hayvan } = L;
    const yer = (e, ek = 0) => ({ x: e.x, y: (this.hAt(e.x, e.z) ?? ZEMIN) + ek, z: e.z });
    for (const t of ['yaprak', 'igne', 'kavak']) this.lodluKur(t, this.agacMat[t], agac[t], (e) => ({ ...yer(e, -0.01), s: e.s * 1.06, ry: e.ry, renk: yesil(e.v, 0.12) }));
    this.lodluKur('cali', this.agacMat.cali, sec(L.cali, Y.cali, 61), (e) => ({ ...yer(e, -0.01), s: e.s * 1.1, ry: e.v * 6.28, renk: yesil(e.v, 0.14) }));
    // geri kalanlar D ile aynı (yoğunluk süzgeciyle)
    const bos = { yaprak: [], igne: [], kavak: [] };
    super.susKur({ ...L, agac: bos, cali: [], ot: sec(L.ot, Y.ot, 62), cicek: sec(L.cicek, Y.cicek, 63), kaya: sec(L.kaya.filter((e) => hash(Math.floor(e.x * 5), Math.floor(e.z * 5), 65) < (e.t === 'dag' ? 0.35 : 0.6)), Y.kaya, 64),
      kule: L.kule.filter((e) => hash(Math.floor(e.x * 5), Math.floor(e.z * 5), 66) < 0.5), hayvan });
  }

  // iki LOD: öbek başına yüksek + düşük (aynı örnek tamponunu paylaşır) ve uzak zoom için tek genel düşük ağ
  lodluKur(tur, mat, liste, yap) {
    if (!liste.length) return;
    const geo = this.bitki[tur];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color(), Yx = new THREE.Vector3(0, 1, 0);
    const doldur = (im, parca) => {
      parca.forEach((e, i) => {
        const r = yap(e);
        q.setFromAxisAngle(Yx, r.ry || 0);
        m4.compose(p.set(r.x, r.y, r.z), q, sc.setScalar(r.s ?? 1));
        im.setMatrixAt(i, m4);
        if (r.renk) im.setColorAt(i, c.setRGB(...r.renk));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = true; im.receiveShadow = true;
      im.computeBoundingSphere();
      im.boundingSphere.radius += 1.2;
    };
    const ekle = (m) => { this.grup.add(m); this.mesh.push(m); this.susMesh.push(m); };
    const genel = new THREE.InstancedMesh(geo.lo, mat, liste.length);
    doldur(genel, liste);
    ekle(genel); this.lodGenel.push(genel);
    const obek = new Map();
    for (const e of liste) {
      const k = `${Math.floor(e.x / LOD_OBEK)},${Math.floor(e.z / LOD_OBEK)}`;
      if (!obek.has(k)) obek.set(k, []);
      obek.get(k).push(e);
    }
    for (const [k, parca] of obek) {
      const [ox, oz] = k.split(',').map(Number);
      const hi = new THREE.InstancedMesh(geo.hi, mat, parca.length);
      doldur(hi, parca);
      const lo = new THREE.InstancedMesh(geo.lo, mat, parca.length);
      lo.instanceMatrix = hi.instanceMatrix; lo.instanceColor = hi.instanceColor;
      lo.boundingSphere = hi.boundingSphere.clone();
      lo.castShadow = true; lo.receiveShadow = true;
      lo.userData.paylasim = true;
      ekle(hi); ekle(lo);
      let o = this.lodObek.find((b) => b.k === k);
      if (!o) { o = { k, x: ox * LOD_OBEK, z: oz * LOD_OBEK, hi: [], lo: [] }; this.lodObek.push(o); }
      o.hi.push(hi); o.lo.push(lo);
    }
  }
}

