// Stil BD — "yüksek stilize" (`?stil=bd`, deneme): D'nin görsel arazi katmanı (yükseklik, kıyı, bitki, hayvan, iskele)
// + B'nin cel ışığı ve koyu kahve kenar çizgisi. Temiz renk blokları: boyalı leke/fırça gürültüsü yok; çimde uzaktan
// okunan ince öbek deseni, kayada düz faset bantları, suda düz renk bantları + dalga çizgisi + köpük halkası.
// Performans: ağaç/çalı için iki LOD (uzak zoom'da tek düşük ayrıntılı ağ; yakın zoom'da görüş merkezine yakın öbekler
// yüksek, uzaktakiler düşük ayrıntı), arazi 16×16 karo öbeklerinde; bina eklenince yalnız toprak/patika imzası değişen
// arazi öbeklerinin rengi yeniden hesaplanır (yükseklik alanı yeniden kurulmaz). Kalite: yuksek / standart / performans.
import * as THREE from 'three';
import {
  StilD, araziMat, suMat, birlestir, bozuk, govde, hash, gurultu, fbm, ss, ZEMIN, SU_Y, yesil,
} from './stil_d.js';
import { MEVSIM_STIL } from './harita.js';
import { yamala } from './malzeme.js';
import { BINALAR } from '../data/binalar.js';

const BINA = Object.fromEntries(BINALAR.map((b) => [b.id, b]));
const KOY_COZ = 8; // köy uzaklık dokusu: karo başına 8 teksel (toprak/patika kenarı 1/8 karo, süzgeçle daha keskin)
// mevsime göre: kuru çim yaması rengi / miktarı, çiçek tarlası
const MEVSIM_CAYIR = {
  bahar: { kuru: 0x84904a, m: 0.3, cicek: 1 }, yaz: { kuru: 0x8c884e, m: 0.42, cicek: 0.75 },
  guz: { kuru: 0xa06a34, m: 0.7, cicek: 0.12 }, kis: { kuru: 0xd8dce2, m: 0.3, cicek: 0 },
};

const LOD_OBEK = 20, ARAZI_OBEK = 32;
// kalite → süs yoğunluğu (0..1)
const YOGUNLUK = {
  yuksek: { ot: 0.15, cicek: 0.6, cali: 1, kaya: 1 },
  standart: { ot: 0.08, cicek: 0.3, cali: 0.5, kaya: 0.7 },
  performans: { ot: 0, cicek: 0, cali: 0.2, kaya: 0.4 },
};

// ---------- gölgelendirici gövdeleri ----------
// köy odağı / seçim / inşaat uniform'ları (arazi malzemesine eklenir)
const KOY_GLSL = `
uniform sampler2D uKoyDoku; uniform vec4 uKoyAlan; uniform vec4 uKoy; uniform vec4 uSecim; uniform float uSecimA;
uniform vec3 uAvlu; uniform vec3 uAvluK; uniform vec3 uPatika; uniform vec3 uKuru; uniform vec3 uKayaA; uniform vec3 uKarT;
uniform float uCicek; uniform float uKuruM;
float sdKutu(vec2 p, vec2 b) { vec2 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }`;

// dağ: kaya yüzlerinde üçgen (faset) normali → cel ışığında net ışık/gölge yüzleri
const FASET_GLSL = `
  if (vYuzey.x > 0.04) {
    vec3 fn = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
    normal = normalize(mix(normal, fn, smoothstep(0.04, 0.3, vYuzey.x)));
  }`;

const ARAZI_BD = `  {
    vec2 p = vDP.xz;
    float cim = vYuzey.y, kaya = vYuzey.x;
    vec3 c = diffuseColor.rgb;
    float fw = length(fwidth(p));
    float aa = max(fw * 0.6, 0.003);
    // 1) geniş ölçekli çayır lekeleri (net kenarlı): koyu / açık zeytin, kuru (saman) yamalar
    float g1 = dGur(p * 0.12) * 0.62 + dGur(p * 0.33 + 3.1) * 0.38;
    vec3 cc = c * mix(1.0, 0.78, smoothstep(0.37, 0.35, g1));
    cc = mix(cc, cc * vec3(1.13, 1.12, 0.86), smoothstep(0.61, 0.63, g1));
    float kr = dGur(p * 0.19 + 17.0) * 0.72 + dGur(p * 0.85 + 5.0) * 0.28;
    cc = mix(cc, uKuru * (0.9 + 0.22 * g1) * mix(vec3(1.0), c / max(dot(c, vec3(0.333)), 0.01), 0.25), smoothstep(0.64, 0.66, kr) * uKuruM);
    c = mix(c, cc, cim);
    // temiz iki tonlu küçük lekeler
    float lek = dGur(p * 0.38) * 0.6 + dGur(p * 1.1 + 7.0) * 0.4;
    c *= mix(1.0, mix(0.94, 1.06, smoothstep(0.48, 0.52, lek)), cim);
    // çim deseni: jitterli hücrede ekranda dik duran küçük öbek (koyu taban + açık uç); iki ölçek, piksel yoğunluğuyla söner
    float desen = 0.0;
    for (int k = 0; k < 2; k++) {
      float s = k == 0 ? 2.3 : 5.2;
      vec2 q = p * s, id = floor(q), f = fract(q) - 0.5;
      f -= (vec2(dHash(id), dHash(id + 3.7)) - 0.5) * 0.4;
      vec2 u = vec2(f.x - f.y, f.x + f.y) * 0.7071;
      float taban = smoothstep(0.15, 0.09, length(u * vec2(2.8, 1.0)));
      float uc = smoothstep(0.12, 0.06, length((u + vec2(0.0, 0.1)) * vec2(2.8, 1.25)));
      float sonum = 1.0 - smoothstep(0.16, 0.36, fw * s);
      desen += (uc * 0.8 - taban * 0.35) * step(0.3, dHash(id + 9.1)) * sonum * (k == 0 ? 1.0 : 0.75);
    }
    c *= 1.0 + desen * 0.17 * cim;
    // çiçek tarlası öbekleri: yamada renkli benekler (uzakta pembe/beyaz ton olarak söner)
    float tarla = smoothstep(0.66, 0.68, dGur(p * 0.16 + 41.0) * 0.75 + dGur(p * 0.6 + 9.0) * 0.25) * uCicek * cim;
    if (tarla > 0.001) {
      vec2 q = p * 6.5, id = floor(q), f = fract(q) - 0.5;
      f -= (vec2(dHash(id + 2.2), dHash(id + 7.3)) - 0.5) * 0.5;
      float r = dHash(id + 5.1);
      vec3 cr = r < 0.45 ? vec3(0.95, 0.42, 0.55) : r < 0.7 ? vec3(0.95, 0.93, 0.85) : r < 0.88 ? vec3(0.98, 0.8, 0.2) : vec3(0.6, 0.42, 0.9);
      float son = 1.0 - smoothstep(0.12, 0.3, fw * 6.5);
      float nok = smoothstep(0.17, 0.11, length(f)) * step(0.3, r);
      c = mix(c, cr, nok * tarla * son);
      c = mix(c, c * vec3(1.12, 1.0, 1.06) + vec3(0.03, 0.01, 0.02), tarla * (1.0 - son) * 0.6);
    }
    // kaya: düz faset bantları + net çatlak çizgisi
    float bant = dGur(vec2((vDP.x - vDP.z) * 0.9, vDP.y * 9.0));
    float bq = floor(bant * 3.0) * 0.5;
    float catlak = 1.0 - smoothstep(0.0, 0.035, abs(dGur(vec2((vDP.x + vDP.z) * 3.0, vDP.y * 5.0)) - 0.5));
    float dik = 1.0 - smoothstep(0.55, 0.9, vDN.y);
    c = mix(c, c * (0.78 + 0.3 * bq) * (1.0 - 0.38 * catlak), kaya * max(dik, 0.3));
    // yüksek kaya: açık kaya tonu (dik yüz) + tepe karı (düz üst), net sınır
    float yk = vDP.y + (dGur(p * 1.6) - 0.5) * 0.22;
    float acik = smoothstep(1.5 - aa, 1.5 + aa, yk) * smoothstep(0.05, 0.3, kaya);
    c = mix(c, uKayaA * (0.86 + 0.24 * bq) * (1.0 - 0.3 * catlak), acik * 0.9);
    float kar = smoothstep(1.98 - aa, 1.98 + aa, yk + vDN.y * 0.3) * smoothstep(0.62, 0.7, vDN.y) * smoothstep(0.05, 0.3, kaya);
    c = mix(c, uKarT * (0.94 + 0.06 * bq), kar);
    // 2) köy: avlu / patika / inşaat (yüksek çözünürlüklü uzaklık dokusu → her yakınlıkta keskin kenar)
    if (uKoy.w > 0.5) {
      vec2 kuv = (p - uKoyAlan.xy) * uKoyAlan.zw;
      float kara = smoothstep(0.255, 0.285, vDP.y) * (1.0 - smoothstep(0.38, 0.5, vDP.y));
      // sıcak ışık havuzu: köy toprağı ve yakın çayır hafif sıcak/aydınlık
      float kd = length(p - uKoy.xy) / uKoy.z;
      float havuz = 1.0 - smoothstep(0.5, 1.3, kd);
      c *= mix(vec3(1.0), vec3(1.1, 1.05, 0.9), havuz * kara);
      if (kuv.x > 0.0 && kuv.y > 0.0 && kuv.x < 1.0 && kuv.y < 1.0 && kara > 0.0) {
        vec4 kt = texture2D(uKoyDoku, kuv);
        float dA = (kt.r - 0.5) * 2.0, dP = kt.g * 0.5, dI = (kt.b - 0.5) * 2.0, pk = kt.a;
        float n = (dGur(p * 3.3) - 0.5) * 0.06;
        float avlu = (1.0 - smoothstep(-aa, aa, dA + n)) * kara;
        float pw = 0.07 + 0.03 * pk;
        float pat = (1.0 - smoothstep(pw - aa, pw + aa, dP + n * 0.5)) * step(0.04, pk) * kara;
        // dış dudak: avlu/patika çevresinde ince koyu çim (net geçiş çizgisi)
        float dis = 1.0 - smoothstep(0.0, 0.1, dA + n);
        c *= 1.0 - 0.28 * dis * (1.0 - avlu) * kara;
        c = mix(c, c * vec3(1.08, 1.04, 0.8), (1.0 - smoothstep(0.08, 0.3, dP)) * pk * 0.6 * (1.0 - avlu) * kara);
        vec3 tc = mix(uAvlu, uAvlu * vec3(1.08, 1.06, 1.02), step(0.55, dGur(p * 1.4 + 3.0)));
        float kenar = 1.0 - smoothstep(0.045 - aa, 0.045 + aa, -(dA + n));
        tc = mix(tc, uAvluK, kenar);
        c = mix(c, uPatika * (0.95 + 0.1 * step(0.5, dGur(p * 2.1))), pat * (1.0 - avlu));
        c = mix(c, tc, avlu);
        // inşaat alanı: çapraz şerit (okra / koyu) + açık çerçeve
        float ins = (1.0 - smoothstep(-aa, aa, dI)) * kara;
        float ser = step(0.5, fract((p.x + p.y) * 2.2));
        c = mix(c, mix(vec3(0.62, 0.38, 0.1), vec3(0.2, 0.13, 0.07), ser), ins * 0.8);
        float insK = (1.0 - smoothstep(0.05 - aa, 0.05 + aa, abs(dI + 0.05))) * kara;
        c = mix(c, vec3(0.95, 0.75, 0.3), insK);
        totalEmissiveRadiance += vec3(0.5, 0.3, 0.06) * insK * 0.5;
      }
      // seçim: zeminde net altın çerçeve + hafif ışıklı iç
      if (uSecimA > 0.0) {
        float dS = sdKutu(p - (uSecim.xy + uSecim.zw) * 0.5, (uSecim.zw - uSecim.xy) * 0.5 + 0.14);
        float cz = 1.0 - smoothstep(0.04 - aa, 0.04 + aa, abs(dS));
        float ic = 1.0 - smoothstep(-aa, aa, dS);
        c = mix(c, c * 1.3 + vec3(0.06, 0.05, 0.0), ic * 0.5 * uSecimA);
        c = mix(c, vec3(1.0, 0.82, 0.3), cz * uSecimA);
        totalEmissiveRadiance += vec3(0.9, 0.62, 0.15) * cz * uSecimA * 0.6;
      }
    }
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
  const igne = { hi: igneP(7, 3), lo: igneP(5, 2) };
  // geniş taçlı (çınar / meşe): kalın gövde + yayvan, basık 4 loblu taç (yaşlı tek ağaçlar ve yaprak döken korular)
  const genisLob = [[0.18, 0.0, 0.6, 0.0], [0.16, 0.3, 0.52, 0.08], [0.15, -0.28, 0.5, -0.1], [0.15, 0.06, 0.52, -0.3], [0.14, -0.08, 0.5, 0.3]];
  const genis = {
    hi: birlestir([
      { geo: govde(0.045, 0.075, 0.42), renk: 0x5e4029, gradyan: [0.65, 1] },
      { geo: new THREE.CylinderGeometry(0.018, 0.03, 0.24, 4, 1, true).rotateZ(0.9).translate(0.1, 0.38, 0), renk: 0x5e4029 },
      ...genisLob.map(([r, x, y, z], k) => ({ geo: tepe(r * 1.3, 0, 0, 0, 40 + k, 0).scale(1.15, 0.7, 1.15).translate(x, y, z), renk: k === 0 ? 0xf4f8ee : 0xffffff, gradyan: [0.74, 1.1], kure: [0, 0.42, 0] })),
    ]),
    lo: birlestir([
      { geo: govde(0.045, 0.075, 0.42), renk: 0x5e4029, gradyan: [0.65, 1] },
      { geo: tepe(0.34, 0, 0, 0, 46, 0).scale(1.45, 0.55, 1.4).translate(0, 0.55, 0), renk: 0xffffff, gradyan: [0.74, 1.1], kure: [0, 0.42, 0] },
    ]),
  };
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
  const blok = (r, sx, sy, sz, x, y, z, t, egim = 0) => bozuk(new THREE.IcosahedronGeometry(r, 0), r * 0.25, t).scale(sx, sy, sz).rotateZ(egim).translate(x, y, z);
  // kaya kulesi: geniş taban + eğik uzun sivri + yan sivri + açık tepe (örnek başına boy/en ölçeği ayrıca değişir)
  const kule = birlestir([
    { geo: blok(0.34, 1.3, 0.55, 1.15, 0, 0.06, 0, 31), renk: 0x8e877c, gradyan: [0.7, 0.95] },
    { geo: blok(0.2, 1.0, 2.5, 0.95, 0.05, 0.5, -0.03, 32, -0.12), renk: 0xa8a090, gradyan: [0.78, 1.1] },
    { geo: blok(0.14, 1.0, 1.9, 1.0, -0.2, 0.3, 0.13, 33, 0.22), renk: 0x9c9586, gradyan: [0.8, 1.08] },
    { geo: blok(0.1, 1.1, 0.7, 1.0, 0.1, 0.98, -0.03, 34), renk: 0xcabfa8 },
  ]);
  return { yaprak, igne, kavak, genis, cali, kaya, kule };
}

export class StilBD extends StilD {
  constructor(sahne) {
    super(sahne);
    this.kalite = 'yuksek';
    this.bitki = bitkiGeolari();
    const bos = new THREE.DataTexture(new Uint8Array([255, 255, 255, 0]), 1, 1);
    bos.needsUpdate = true;
    const R = (h) => ({ value: new THREE.Color(h) });
    this.U = {
      uKoyDoku: { value: bos }, uKoyAlan: { value: new THREE.Vector4(0, 0, 1, 1) }, uKoy: { value: new THREE.Vector4(0, 0, 1, 0) },
      uSecim: { value: new THREE.Vector4() }, uSecimA: { value: 0 },
      uAvlu: R(0x8c7456), uAvluK: R(0x584432), uPatika: R(0xa08462), uKuru: R(0xc4a85a), uKayaA: R(0xb8a88e), uKarT: R(0xf2f4f8),
      uCicek: { value: 1 }, uKuruM: { value: 0.75 },
    };
    this.araziMat = araziMat(ARAZI_BD, 'bd-arazi');
    const once = this.araziMat.onBeforeCompile;
    this.araziMat.onBeforeCompile = (sh) => {
      once(sh);
      Object.assign(sh.uniforms, this.U);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>${KOY_GLSL}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>${FASET_GLSL}`);
    };
    this.agacMat.genis = yamala(new THREE.MeshLambertMaterial({ vertexColors: true }), { ruzgar: true, kar: 0.85 });
    this.koyOdak = null; // { x, z, r }: son geçişte köy dışını sakinleştirmek için
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
    if (this.mevsimId) this.isik();
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
      kaya: C(0x8c8478, 0.1), kayaK: C(0x4e4a4c, 0.1), kayaA: C(0xa89c86, 0.1), tasli: C(0x9a968a, 0.1),
    });
  }

  isik() {
    super.isik();
    const ms = MEVSIM_STIL[this.mevsimId] || MEVSIM_STIL.yaz;
    const zeytin = new THREE.Color(0x5e7e36);
    for (const t of ['yaprak', 'kavak']) this.agacMat[t].color.lerp(zeytin, ms.kar ? 0 : 0.3);
    // tür başına ayrı ton: kavak açık sarımsı, geniş taç koyu mavimsi yeşil, iğne yapraklı serin koyu
    this.agacMat.kavak.color.multiply(new THREE.Color(1.12, 1.1, 0.82));
    this.agacMat.genis.color.copy(this.agacMat.yaprak.color).multiply(new THREE.Color(0.78, 0.88, 0.86));
    if (this.mevsimId === 'guz') this.agacMat.genis.color.setHex(0xb85a2a);
    this.agacMat.igne.color.multiply(new THREE.Color(0.9, 0.96, 1.0));
    const cy = MEVSIM_CAYIR[this.mevsimId] || MEVSIM_CAYIR.yaz;
    this.U.uKuru.value.setHex(cy.kuru); this.U.uKuruM.value = cy.m; this.U.uCicek.value = cy.cicek * (this.kalite === 'performans' ? 0 : 1);
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
    // seçim işareti → zeminde altın çerçeve (seçim kutusu sahne işaretinden okunur)
    const si = s.secimIsareti, U = this.U;
    if (si?.visible) {
      U.uSecim.value.set(si.position.x - si.scale.x / 2, si.position.z - si.scale.z / 2, si.position.x + si.scale.x / 2, si.position.z + si.scale.z / 2);
      U.uSecimA.value = 0.85 + Math.sin(performance.now() / 260) * 0.15;
    } else U.uSecimA.value = 0;
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

  // ---------- dağ: sırt gürültüsü + yüksek doruklar, köşe kaydırma (düzensiz faset); su kenarı gür çim ----------
  yukseklikAlani(A) {
    super.yukseklikAlani(A);
    const { G, H, R, h, pos, sDag, sSu, kara, col, P } = A;
    const gur = new THREE.Color(P.cimK).lerp(new THREE.Color(0x2c5a3a), 0.45);
    for (let j = 0; j < H; j++) for (let i = 0; i < G; i++) {
      const v = j * G + i, e = sDag[v], wx = pos[v * 3], wz = pos[v * 3 + 2];
      if (e > 0.05) {
        const sirt = 1 - Math.abs(gurultu(wx * 1.3, wz * 1.3, 41) * 2 - 1);
        const k = ss(0.12, 0.8, e);
        let y = h[v] + k * (sirt * 0.26 - 0.06) + 0.62 * ss(1.5, 2.9, e + (fbm(wx * 0.6, wz * 0.6, 43) - 0.5) * 0.9);
        y = Math.min(2.3, y);
        h[v] = y; pos[v * 3 + 1] = y;
        if (e > 0.25 && i > 0 && j > 0 && i < G - 1 && j < H - 1) {
          pos[v * 3] += (hash(i, j, 44) - 0.5) * 0.45 / R; pos[v * 3 + 2] += (hash(i, j, 45) - 0.5) * 0.45 / R;
        }
      } else if (kara[v] && sSu[v] > -1.1 && sSu[v] < -0.3) { // su kenarı: koyu, gür çim şeridi
        const t = (1 - ss(0.3, 1.1, -sSu[v])) * 0.55;
        col[v * 3] += (gur.r - col[v * 3]) * t; col[v * 3 + 1] += (gur.g - col[v * 3 + 1]) * t; col[v * 3 + 2] += (gur.b - col[v * 3 + 2]) * t;
      }
    }
  }

  // köy toprağı / patikalar artık gölgelendiricide (yüksek çözünürlüklü uzaklık dokusu); köşe rengine boyama yok
  toprakBoya() {}

  // ---------- köy: avlu / patika / inşaat uzaklık dokusu ----------
  koyYollari(A, L) {
    const { n, at, mz, merkez } = A;
    const yollar = A.yollar.map(([ax, az, bx, bz]) => ({ a: [ax, az], b: [bx, bz], s0: 1, s1: 1 }));
    if (!merkez) return yollar;
    let rK = 1.5;
    for (const [ax, az, bx, bz] of A.rect) for (const [x, z] of [[ax, az], [bx, az], [ax, bz], [bx, bz]]) rK = Math.max(rK, Math.hypot(x - mz.x, z - mz.y));
    A.rK = rK;
    // köy dışına çıkan izler: iskele, en yakın orman kıyısı, en yakın taş/dağ (köyden uzaklaştıkça silinir)
    const hedef = [];
    if (L.iskele) hedef.push([L.iskele.x, L.iskele.z, 1]);
    for (const turler of [['orman'], ['tasli', 'kayalik', 'dag', 'mermer', 'cevher']]) {
      let en = null;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (!turler.includes(at(x, y))) continue;
        const u = Math.hypot(x + 0.5 - mz.x, y + 0.5 - mz.y);
        if (u > rK + 1.5 && u < 16 && (!en || u < en.u)) en = { x: x + 0.5, z: y + 0.5, u };
      }
      if (en) hedef.push([en.x, en.z, 0]);
    }
    for (const [hx, hz, iskele] of hedef) {
      // suya / dağa girince kes
      const L2 = Math.hypot(hx - mz.x, hz - mz.y), N = Math.ceil(L2 * 4);
      let t1 = 1;
      for (let k = 1; k <= N; k++) {
        const t = k / N, x = mz.x + (hx - mz.x) * t, z = mz.y + (hz - mz.y) * t, tt = at(Math.floor(x), Math.floor(z));
        if ((tt === 'su' && !iskele) || tt === 'dag' || tt === 'sis') { t1 = Math.max(0, t - 0.5 / L2); break; }
      }
      yollar.push({ a: [mz.x, mz.y], b: [mz.x + (hx - mz.x) * t1, mz.y + (hz - mz.y) * t1], s0: 1, s1: iskele ? 0.8 : 0.05, iz: true });
    }
    return yollar;
  }

  koyDokusu(A, L) {
    const U = this.U;
    if (!A.rect.length || !A.merkez) { U.uKoy.value.w = 0; this.koyOdak = null; this.koyVeri = null; return; }
    const yollar = this.koyYollari(A, L);
    // patika çoklu çizgileri (hafif kıvrımlı)
    const parca = [];
    for (const y of yollar) {
      const [ax, az] = y.a, [bx, bz] = y.b, vx = bx - ax, vz = bz - az, Lb = Math.hypot(vx, vz) || 1;
      const N = Math.max(2, Math.ceil(Lb * 2)), nx = -vz / Lb, nz = vx / Lb;
      let onceki = null;
      for (let k = 0; k <= N; k++) {
        const t = k / N, sap = (Math.sin(t * 9 + ax) * 0.16 + Math.sin(t * 23 + az) * 0.05) * Math.sin(t * Math.PI) * Math.min(1, Lb / 3);
        const q = [ax + vx * t + nx * sap, az + vz * t + nz * sap, y.s0 + (y.s1 - y.s0) * ss(y.iz ? 0.35 : 0.8, 1, t)];
        if (onceki) parca.push([onceki, q]);
        onceki = q;
      }
    }
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    const genislet = (x, z) => { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); };
    for (const [ax, az, bx, bz] of A.rect) { genislet(ax, az); genislet(bx, bz); }
    for (const [p, q] of parca) { genislet(p[0], p[1]); genislet(q[0], q[1]); }
    x0 = Math.floor(x0 - 1.5); z0 = Math.floor(z0 - 1.5); x1 = Math.ceil(x1 + 1.5); z1 = Math.ceil(z1 + 1.5);
    const W = (x1 - x0) * KOY_COZ, H = (z1 - z0) * KOY_COZ, veri = new Uint8Array(W * H * 4);
    for (let k = 0; k < W * H; k++) { veri[k * 4] = 255; veri[k * 4 + 1] = 255; veri[k * 4 + 2] = 255; }
    const bolge = (ax, az, bx, bz, m, f) => {
      const i0 = Math.max(0, Math.floor((ax - m - x0) * KOY_COZ)), i1 = Math.min(W - 1, Math.ceil((bx + m - x0) * KOY_COZ));
      const j0 = Math.max(0, Math.floor((az - m - z0) * KOY_COZ)), j1 = Math.min(H - 1, Math.ceil((bz + m - z0) * KOY_COZ));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f((j * W + i) * 4, x0 + (i + 0.5) / KOY_COZ, z0 + (j + 0.5) / KOY_COZ);
    };
    const kutuSd = (x, z, ax, az, bx, bz, e, r) => {
      const qx = Math.abs(x - (ax + bx) / 2) - ((bx - ax) / 2 + e - r), qz = Math.abs(z - (az + bz) / 2) - ((bz - az) / 2 + e - r);
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
    };
    const kod = (d) => Math.round(Math.min(1, Math.max(0, 0.5 + d / 2)) * 255);
    // avlu: genişletilmiş bina dikdörtgenleri birleşimi (köşe yarıçapı küçük → net köşe)
    for (const [ax, az, bx, bz] of A.rect) bolge(ax, az, bx, bz, 1.6, (o, x, z) => { veri[o] = Math.min(veri[o], kod(kutuSd(x, z, ax, az, bx, bz, 0.4, 0.14))); });
    // inşaat: sıradaki binaların tabanı
    const d = A.d, insa = new Set(d.insaatSirasi || []);
    for (const b of d.binalar) {
      if (!insa.has(b.uid)) continue;
      const [g, hh] = BINA[b.id].boyut;
      bolge(b.x, b.y, b.x + g, b.y + hh, 1.2, (o, x, z) => { veri[o + 2] = Math.min(veri[o + 2], kod(kutuSd(x, z, b.x, b.y, b.x + g, b.y + hh, 0.34, 0.04))); });
    }
    // patika: G = uzaklık (0..0,5 karo), A = iz gücü
    for (const [p, q] of parca) {
      const vx = q[0] - p[0], vz = q[1] - p[1], L2 = vx * vx + vz * vz || 1e-6;
      bolge(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1]), 0.5, (o, x, z) => {
        const t = Math.min(1, Math.max(0, ((x - p[0]) * vx + (z - p[1]) * vz) / L2));
        const m = Math.hypot(x - p[0] - vx * t, z - p[1] - vz * t);
        if (m >= 0.5) return;
        const g = Math.round((m / 0.5) * 255);
        if (g < veri[o + 1]) { veri[o + 1] = g; veri[o + 3] = Math.max(veri[o + 3], Math.round((p[2] + (q[2] - p[2]) * t) * 255)); }
      });
    }
    const doku = new THREE.DataTexture(veri, W, H, THREE.RGBAFormat);
    doku.magFilter = doku.minFilter = THREE.LinearFilter; doku.needsUpdate = true;
    if (U.uKoyDoku.value.image.width > 1) U.uKoyDoku.value.dispose();
    U.uKoyDoku.value = doku;
    U.uKoyAlan.value.set(x0, z0, KOY_COZ / W, KOY_COZ / H);
    U.uKoy.value.set(A.mz.x, A.mz.y, A.rK + 2.5, 1);
    this.koyOdak = { x: A.mz.x, z: A.mz.y, r: A.rK + 3 };
    this.koyVeri = { veri, W, H, x0, z0 };
  }

  // köy dokusundan: [avlu uzaklığı, patika uzaklığı] (doku dışı → uzak)
  koyOrnek(x, z) {
    const K = this.koyVeri;
    if (!K) return [9, 9];
    const i = Math.floor((x - K.x0) * KOY_COZ), j = Math.floor((z - K.z0) * KOY_COZ);
    if (i < 0 || j < 0 || i >= K.W || j >= K.H) return [9, 9];
    const o = (j * K.W + i) * 4;
    return [(K.veri[o] / 255 - 0.5) * 2 + (K.veri[o] === 255 ? 8 : 0), K.veri[o + 3] > 10 ? (K.veri[o + 1] / 255) * 0.5 : 9];
  }

  // ---------- bitki örtüsü: tür koruları, açıklık, yaşlı tek ağaçlar, dağ eteği iğne yapraklılar ----------
  sacilim(A) {
    const L = super.sacilim(A);
    this.koyDokusu(A, L);
    const { at, n, iz, G, R, x0, z0, sSu, rect } = A;
    const rectD = (x, z) => { let m = 99; for (const [ax, az, bx, bz] of rect) m = Math.min(m, Math.hypot(Math.max(ax - x, 0, x - bx), Math.max(az - z, 0, z - bz))); return m; };
    const suU = (x, z) => { const i = Math.round((x - x0) * R), j = Math.round((z - z0) * R); return i < 0 || j < 0 || i >= G || j * G + i >= sSu.length ? -3 : sSu[j * G + i]; };
    const tum = [];
    for (const t of ['yaprak', 'igne', 'kavak']) for (const e of L.agac[t]) tum.push({ ...e, tur: t });
    const agac = { yaprak: [], igne: [], kavak: [], genis: [] };
    for (const e of tum) {
      const tx = Math.floor(e.x), tz = Math.floor(e.z), tt = at(tx, tz), rd = rectD(e.x, e.z);
      // açıklık: köy çevresi temiz; orman karosu köye çok yakınsa seyrek
      if (tt !== 'orman' && tt !== 'dag' && rd < 2.2) continue;
      if (tt === 'orman' && rd < 1.3 && hash(Math.floor(e.x * 7), Math.floor(e.z * 7), 205) < 0.6) continue;
      if (this.koyOrnek(e.x, e.z)[1] < 0.25) continue;
      // ormanda sık / seyrek kümeler
      if (tt === 'orman' && fbm(tx * 0.35, tz * 0.35, 203) < 0.4 && hash(Math.floor(e.x * 7), Math.floor(e.z * 7), 204) < 0.4) continue;
      if (tt === 'dag') { // dağ içi: yalnız kenar karolarda
        const kenar = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(tx + a, tz + b) !== 'dag');
        if (!kenar) continue;
        agac.igne.push(e); continue;
      }
      // tür koruları: düşük frekanslı alan (iğne koru / yaprak döken koru / karışık), su kıyısında kavak
      const g = fbm(e.x * 0.15, e.z * 0.15, 201), r = hash(Math.floor(e.x * 7), Math.floor(e.z * 7), 202), su = suU(e.x, e.z);
      let tur;
      if (su > -1.3 && su < -0.3) tur = r < 0.55 ? 'kavak' : 'yaprak';
      else if (g < 0.42) tur = r < 0.82 ? 'igne' : 'yaprak';
      else if (g > 0.58) tur = r < 0.4 ? 'yaprak' : r < 0.8 ? 'genis' : 'kavak';
      else tur = r < 0.36 ? 'igne' : r < 0.6 ? 'yaprak' : r < 0.84 ? 'genis' : 'kavak';
      e.sy = 0.85 + hash(Math.floor(e.x * 9), Math.floor(e.z * 9), 206) * 0.4;
      e.s *= 0.78 + fbm(e.x * 0.4, e.z * 0.4, 207) * 0.5; // koru içinde genç / yaşlı kümeler
      agac[tur].push(e);
    }
    // dağ eteği: dağa bitişik çayırda iğne yapraklılar; dağ kenarında yamaç ağacı
    for (let y = A.z0; y < A.z1; y++) for (let x = A.x0; x < A.x1; x++) {
      const t = at(x, y);
      const dagKomsu = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => at(x + a, y + b) === 'dag');
      if (t === 'dag') {
        const dis = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([a, b]) => { const u = at(x + a, y + b); return u !== 'dag' && u !== 'su' && u !== 'sis'; });
        if (dis && hash(x, y, 220) > 0.35) agac.igne.push({ x: x + 0.5 + dis[0] * 0.3 + (hash(x, y, 221) - 0.5) * 0.4, z: y + 0.5 + dis[1] * 0.3 + (hash(x, y, 222) - 0.5) * 0.4, s: 0.65 + hash(x, y, 223) * 0.3, ry: hash(x, y, 224) * 6.28, v: hash(x, y, 225), sy: 1.1 });
      } else if ((t === 'cimen' || t === 'tasli') && dagKomsu.length && !iz[y * n + x]) {
        for (let q = 0; q < 2; q++) if (hash(x, y, 230 + q) > 0.4) {
          const px = x + 0.2 + hash(x, y, 232 + q) * 0.6, pz = y + 0.2 + hash(x, y, 234 + q) * 0.6;
          if (rectD(px, pz) > 2.2) agac.igne.push({ x: px, z: pz, s: 0.8 + hash(x, y, 236 + q) * 0.35, ry: hash(x, y, 238 + q) * 6.28, v: hash(x, y, 240 + q), sy: 1.05 + hash(x, y, 242) * 0.3 });
        }
      } else if (t === 'cimen' && !iz[y * n + x] && hash(x, y, 250) > 0.965) {
        // yaşlı tek ağaç: çayırın ortasında iri, yayvan taç
        const px = x + 0.5, pz = y + 0.5;
        const ormanYakin = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => at(x + a, y + b) === 'orman');
        if (!ormanYakin && rectD(px, pz) > 3 && this.koyOrnek(px, pz)[1] > 0.4) agac.genis.push({ x: px, z: pz, s: 1.55 + hash(x, y, 251) * 0.45, ry: hash(x, y, 252) * 6.28, v: hash(x, y, 253), sy: 0.9, yasli: true });
      }
    }
    L.agac = agac;
    // süs: avlu / patika üstünde ot, çalı, çiçek, kaya yok
    const disari = (m, mp) => (e) => { const [a, p] = this.koyOrnek(e.x, e.z); return a > m && p > mp; };
    L.cali = L.cali.filter((e) => rectD(e.x, e.z) > 0.9 && disari(0.2, 0.2)(e));
    L.ot = L.ot.filter(disari(0.1, 0.14));
    L.cicek = L.cicek.filter(disari(0.1, 0.14));
    L.kaya = L.kaya.filter(disari(0.1, 0.14));
    return L;
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
    const guz = this.mevsimId === 'guz';
    // örnek rengi: tür içi ton farkı (sarımsı / serin / koyu) + güzde turuncu-kızıl karışım; hafif eğim
    const ton = (e, a) => {
      const k = yesil(e.v, a), r = hash(Math.floor(e.x * 11), Math.floor(e.z * 11), 260);
      const kor = fbm(e.x * 0.2, e.z * 0.2, 261); // koru tonu: sarımsı ↔ mavimsi yeşil
      k[0] *= 0.86 + kor * 0.3; k[2] *= 1.12 - kor * 0.26;
      const m = r < 0.25 ? [1.1, 1.06, 0.78] : r < 0.5 ? [0.86, 0.95, 1.02] : r < 0.65 ? [0.82, 0.84, 0.8] : [1, 1, 1];
      const g = guz && r > 0.4 ? (r > 0.7 ? [1.35, 0.72, 0.45] : [1.25, 1.05, 0.5]) : [1, 1, 1];
      return [k[0] * m[0] * g[0], k[1] * m[1] * g[1], k[2] * m[2] * g[2]];
    };
    const egim = (e, s) => (hash(Math.floor(e.x * 13), Math.floor(e.z * 13), s) - 0.5) * 0.16;
    for (const t of ['yaprak', 'igne', 'kavak', 'genis']) this.lodluKur(t, this.agacMat[t], agac[t] || [], (e) => ({ ...yer(e, -0.01), s: e.s * 1.06, sy: e.sy ?? 1, ry: e.ry, rx: egim(e, 270), rz: egim(e, 271), renk: ton(e, t === 'igne' ? 0.1 : 0.16) }));
    this.lodluKur('cali', this.agacMat.cali, sec(L.cali, Y.cali, 61), (e) => ({ ...yer(e, -0.01), s: e.s * 1.1, ry: e.v * 6.28, renk: yesil(e.v, 0.14) }));
    // geri kalanlar D ile aynı (yoğunluk süzgeciyle)
    const bos = { yaprak: [], igne: [], kavak: [] };
    super.susKur({ ...L, agac: bos, cali: [], ot: sec(L.ot, Y.ot, 62), cicek: sec(L.cicek, Y.cicek, 63), kaya: sec(L.kaya.filter((e) => hash(Math.floor(e.x * 5), Math.floor(e.z * 5), 65) < (e.t === 'dag' ? 0.2 : 0.45)), Y.kaya, 64),
      kule: [], hayvan });
    // kaya kuleleri: farklı boy / en / yön (uzun sivri, basık, eğik); iç dağda daha uzun
    const kule = L.kule.filter((e) => hash(Math.floor(e.x * 5), Math.floor(e.z * 5), 66) < 0.55);
    this.instanced(this.bitki.kule, this.kuleMat, kule, (e) => {
      const r = hash(Math.floor(e.x * 9), Math.floor(e.z * 9), 67), r2 = hash(Math.floor(e.x * 9), Math.floor(e.z * 9), 68);
      const uzun = r < 0.45, en = (uzun ? 0.75 : 1.25) * (0.85 + r2 * 0.3) * e.s;
      return { ...yer(e, -0.06), sx: en, sz: en * (0.8 + r2 * 0.4), sy: e.s * (uzun ? 1.6 + r2 * 0.6 : 0.65 + r2 * 0.35), ry: e.ry };
    });
  }

  // iki LOD: öbek başına yüksek + düşük (aynı örnek tamponunu paylaşır) ve uzak zoom için tek genel düşük ağ
  lodluKur(tur, mat, liste, yap) {
    if (!liste.length) return;
    const geo = this.bitki[tur];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color(), eu = new THREE.Euler();
    const doldur = (im, parca) => {
      parca.forEach((e, i) => {
        const r = yap(e);
        q.setFromEuler(eu.set(r.rx || 0, r.ry || 0, r.rz || 0, 'YXZ'));
        m4.compose(p.set(r.x, r.y, r.z), q, sc.set(r.s ?? 1, (r.s ?? 1) * (r.sy ?? 1), r.s ?? 1));
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

